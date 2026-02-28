import { DataSourceType, DetailRangeType, MarketType, SparklinePoint, StockData, StockDetailData } from '../types';
import { supabase } from './supabase';
import {
    computePercentChangeFromSeries,
    isAlphaVantageError,
    parseDailySeries,
    parseIntradaySeries,
    sliceSeriesByRange,
} from './series';

export { computePercentChangeFromSeries } from './series';

const ALPHAVANTAGE_KEY = process.env.EXPO_PUBLIC_STOCK_API_KEY || 'demo';
const DETAIL_CACHE_TTL_MS = 60 * 1000;

interface AlphaVantageErrorResponse {
  Note?: string;
  Information?: string;
  ['Error Message']?: string;
}

interface EdgeFunctionResponse {
    source?: string;
    stale?: boolean;
    stocks?: StockData[];
}

const detailCache = new Map<string, { expiresAt: number; data: StockDetailData }>();

const getDetailCacheKey = (market: MarketType, ticker: string, range: DetailRangeType) =>
    `${market}:${ticker.toUpperCase()}:${range}`;

const mapFunctionSourceToUiSource = (source?: string): DataSourceType => {
    switch ((source || '').toLowerCase()) {
        case 'live':
            return 'LIVE';
        case 'cache':
        case 'cache_fallback':
            return 'CACHE';
        case 'mock':
            return 'MOCK';
        default:
            return 'UNAVAILABLE';
    }
};

export const sliceSeriesByDetailRange = (
    series: SparklinePoint[],
    range: DetailRangeType,
    referenceTimestamp?: number
): SparklinePoint[] => sliceSeriesByRange(series, range, referenceTimestamp);

const toDetailPayload = (
    ticker: string,
    market: MarketType,
    range: DetailRangeType,
    source: DataSourceType,
    series: SparklinePoint[]
): StockDetailData => {
    const normalizedSeries = [...series].sort((a, b) => a.timestamp - b.timestamp);
    const price = normalizedSeries[normalizedSeries.length - 1]?.value ?? 0;

    return {
        ticker: ticker.toUpperCase(),
        market,
        price,
        percentChange: computePercentChangeFromSeries(normalizedSeries),
        series: normalizedSeries,
        range,
        source,
        lastUpdatedAt: new Date().toISOString(),
    };
};

const fetchUSSeries = async (ticker: string, range: DetailRangeType): Promise<SparklinePoint[]> => {
    const isIntradayRange = range === '1H' || range === '1D';
    const endpoint = isIntradayRange
        ? `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${ticker}&interval=5min&outputsize=compact&apikey=${ALPHAVANTAGE_KEY}`
        : `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&outputsize=full&apikey=${ALPHAVANTAGE_KEY}`;

    const res = await fetch(endpoint);
    if (!res.ok) {
        throw new Error(`Alpha Vantage request failed with status ${res.status}`);
    }

    const payload = (await res.json()) as Record<string, unknown>;
    if (isAlphaVantageError(payload)) {
        const errorMessage =
            typeof payload.Note === 'string'
                ? payload.Note
                : typeof payload.Information === 'string'
                    ? payload.Information
                    : typeof payload['Error Message'] === 'string'
                        ? payload['Error Message']
                        : 'Alpha Vantage error';
        throw new Error(errorMessage);
    }

    const parsedSeries = isIntradayRange ? parseIntradaySeries(payload) : parseDailySeries(payload);
    const slicedSeries = sliceSeriesByDetailRange(parsedSeries, range);

    if (slicedSeries.length < 2) {
        throw new Error(`Insufficient US detail data for ${ticker} in range ${range}`);
    }

    return slicedSeries;
};

export const mapEdgeFunctionStockToDetail = (
    payload: EdgeFunctionResponse,
    ticker: string,
    range: DetailRangeType
): StockDetailData | null => {
    if (!payload.stocks || payload.stocks.length === 0) {
        return null;
    }

    const normalizedTicker = ticker.toUpperCase();
    const matched = payload.stocks.find((stock) => stock.ticker.toUpperCase() === normalizedTicker)
        ?? payload.stocks[0];

    const series = sliceSeriesByDetailRange(matched.sparkline ?? [], range);
    if (series.length === 0) {
        return null;
    }

    return {
        ticker: matched.ticker,
        market: matched.market,
        price: Number(matched.price),
        percentChange: Number(matched.percentChange),
        series,
        range,
        source: mapFunctionSourceToUiSource(payload.source),
        lastUpdatedAt: new Date().toISOString(),
    };
};

const fetchARDetail = async (ticker: string, range: DetailRangeType): Promise<StockDetailData> => {
    if (!supabase) {
        throw new Error('Supabase client is not configured');
    }

    const { data, error } = await supabase.functions.invoke<EdgeFunctionResponse>('fetch-argentina-market', {
        body: { timeframe: range, ticker: ticker.toUpperCase() },
    });

    if (error || !data) {
        throw new Error(error?.message || 'Argentina detail request failed');
    }

    const mapped = mapEdgeFunctionStockToDetail(data, ticker, range);
    if (!mapped) {
        throw new Error(`No Argentina detail data found for ${ticker}`);
    }

    return mapped;
};

const fetchUSDetail = async (ticker: string, range: DetailRangeType): Promise<StockDetailData> => {
    const series = await fetchUSSeries(ticker, range);
    return toDetailPayload(ticker, 'US', range, 'LIVE', series);
};

interface FetchStockDetailParams {
    ticker: string;
    market: MarketType;
    range: DetailRangeType;
}

export const fetchStockDetail = async ({ ticker, market, range }: FetchStockDetailParams): Promise<StockDetailData> => {
    const cacheKey = getDetailCacheKey(market, ticker, range);
    const cached = detailCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return {
            ...cached.data,
            source: 'CACHE',
        };
    }

    const data = market === 'US'
        ? await fetchUSDetail(ticker, range)
        : await fetchARDetail(ticker, range);

    detailCache.set(cacheKey, {
        expiresAt: Date.now() + DETAIL_CACHE_TTL_MS,
        data,
    });

    return data;
};
