import { DataSourceType, MarketType, TimeframeType, StockData, SparklinePoint, StockRankingData } from '../types';
import { supabase } from './supabase';

const ALPHAVANTAGE_KEY = process.env.EXPO_PUBLIC_STOCK_API_KEY || 'demo';
const EXPO_ALLOW_MOCK_FALLBACK = process.env.EXPO_PUBLIC_ALLOW_MOCK_FALLBACK === 'true';
const US_ONE_HOUR_CACHE_TTL_MS = 5 * 60 * 1000;

interface AlphaTopGainerRow {
    ticker: string;
    price: string;
    change_percentage: string;
}

interface USOneHourSnapshot {
    price: number;
    percentChange: number;
    sparkline: SparklinePoint[];
}

let usOneHourCache: { expiresAt: number; stocks: StockData[] } | null = null;

const shouldUseMockFallback = (): boolean => {
    const runtimeDevFlag = typeof globalThis !== 'undefined'
        && '__DEV__' in globalThis
        && Boolean((globalThis as Record<string, unknown>).__DEV__);

    return runtimeDevFlag || EXPO_ALLOW_MOCK_FALLBACK;
};

// Helper to generate mock sparkline
const generateMockSparkline = (basePrice: number, points: number = 20): SparklinePoint[] => {
    const line: SparklinePoint[] = [];
    let currentPrice = basePrice * 0.9;
    const now = Date.now();
    for (let i = 0; i < points; i++) {
        currentPrice = currentPrice + (Math.random() - 0.45) * (basePrice * 0.02);
        line.push({ timestamp: now - (points - i) * 3600000, value: currentPrice });
    }
    line.push({ timestamp: now, value: basePrice });
    return line;
};

const parseIntradayPoints = (payload: Record<string, unknown>): Array<{ timestamp: number; close: number }> => {
    const seriesKey = Object.keys(payload).find((key) => key.startsWith('Time Series ('));
    if (!seriesKey) {
        return [];
    }

    const series = payload[seriesKey];
    if (!series || typeof series !== 'object') {
        return [];
    }

    return Object.entries(series as Record<string, unknown>)
        .map(([timestampRaw, row]) => {
            const timestamp = new Date(timestampRaw).getTime();
            const closeRaw = row && typeof row === 'object'
                ? (row as Record<string, unknown>)['4. close']
                : undefined;
            const close = Number(closeRaw);

            if (!Number.isFinite(timestamp) || !Number.isFinite(close)) {
                return null;
            }

            return { timestamp, close };
        })
        .filter((point): point is { timestamp: number; close: number } => point !== null)
        .sort((a, b) => a.timestamp - b.timestamp);
};

const toUSStockFromTopGainer = (item: AlphaTopGainerRow): StockData | null => {
    const price = Number(item.price);
    const changePercent = Number((item.change_percentage || '').replace('%', ''));
    if (!Number.isFinite(price) || !Number.isFinite(changePercent)) {
        return null;
    }

    return {
        id: item.ticker,
        ticker: item.ticker,
        market: 'US',
        price,
        percentChange: changePercent,
        sparkline: generateMockSparkline(price),
    };
};

const fetchUSOneHourSnapshot = async (ticker: string): Promise<USOneHourSnapshot | null> => {
    const res = await fetch(
        `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${ticker}&interval=5min&outputsize=compact&apikey=${ALPHAVANTAGE_KEY}`
    );
    const payload = (await res.json()) as Record<string, unknown>;
    if (payload.Note || payload['Error Message'] || payload.Information) {
        return null;
    }

    const points = parseIntradayPoints(payload);
    if (points.length < 2) {
        return null;
    }

    const latest = points[points.length - 1];
    const oneHourAgoTs = latest.timestamp - 60 * 60 * 1000;
    const baseline = [...points].reverse().find((point) => point.timestamp <= oneHourAgoTs) ?? points[0];
    if (baseline.close <= 0 || latest.close <= 0) {
        return null;
    }

    return {
        price: latest.close,
        percentChange: ((latest.close - baseline.close) / baseline.close) * 100,
        sparkline: points.map((point) => ({ timestamp: point.timestamp, value: point.close })),
    };
};

const fetchUSOneHourGainers = async (candidateTickers: string[]): Promise<{ stocks: StockData[]; source: DataSourceType }> => {
    if (usOneHourCache && usOneHourCache.expiresAt > Date.now()) {
        return { stocks: usOneHourCache.stocks, source: 'CACHE' };
    }

    const uniqueTickers = [...new Set(candidateTickers)].slice(0, 12);
    const stocks: StockData[] = [];

    for (const ticker of uniqueTickers) {
        try {
            const snapshot = await fetchUSOneHourSnapshot(ticker);
            if (!snapshot) {
                continue;
            }

            stocks.push({
                id: ticker,
                ticker,
                market: 'US',
                price: snapshot.price,
                percentChange: snapshot.percentChange,
                sparkline: snapshot.sparkline,
            });
        } catch (error) {
            console.warn(`US 1H fetch failed for ${ticker}:`, error);
        }
    }

    const ranked = stocks
        .filter((stock) => Number.isFinite(stock.percentChange))
        .sort((a, b) => b.percentChange - a.percentChange)
        .slice(0, 10);

    if (ranked.length > 0) {
        usOneHourCache = {
            stocks: ranked,
            expiresAt: Date.now() + US_ONE_HOUR_CACHE_TTL_MS,
        };
    }

    return { stocks: ranked, source: 'LIVE' };
};

export const fetchUSMarketGainers = async (timeframe: TimeframeType): Promise<StockRankingData> => {
    if (timeframe === '1H' && usOneHourCache && usOneHourCache.expiresAt > Date.now()) {
        return { stocks: usOneHourCache.stocks, source: 'CACHE' };
    }

    try {
        const res = await fetch(`https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${ALPHAVANTAGE_KEY}`);
        const data = await res.json() as { top_gainers?: AlphaTopGainerRow[] };

        if (Array.isArray(data.top_gainers) && data.top_gainers.length > 0) {
            if (timeframe === '1H') {
                const hourlyResult = await fetchUSOneHourGainers(data.top_gainers.map((row) => row.ticker));
                if (hourlyResult.stocks.length > 0) {
                    return { stocks: hourlyResult.stocks, source: hourlyResult.source };
                }
            } else {
                const stocks = data.top_gainers
                    .slice(0, 10)
                    .map((item) => toUSStockFromTopGainer(item))
                    .filter((stock): stock is StockData => stock !== null);

                if (stocks.length > 0) {
                    return { stocks, source: 'LIVE' };
                }
            }
        }
    } catch (error) {
        console.error("US Market Fetch Error", error);
    }

    // Avoid fabricated prices in production releases.
    if (shouldUseMockFallback()) {
        return { stocks: getMockUSData(), source: 'MOCK' };
    }

    return { stocks: [], source: 'UNAVAILABLE', stale: true };
};

export const fetchARMarketGainers = async (timeframe: TimeframeType): Promise<StockRankingData> => {
    if (supabase) {
        try {
            const { data, error } = await supabase.functions.invoke<{ stocks?: StockData[]; source?: string; stale?: boolean }>(
                'fetch-argentina-market',
                {
                    body: { timeframe },
                }
            );

            if (!error && data?.stocks?.length) {
                return {
                    stocks: data.stocks.sort((a, b) => b.percentChange - a.percentChange).slice(0, 10),
                    source: mapFunctionSourceToUiSource(data.source),
                    stale: data.stale ?? false,
                };
            }

            if (error) {
                console.warn('Argentina market edge function error:', error.message);
            }
        } catch (error) {
            console.warn('Argentina market edge function invocation failed:', error);
        }
    } else {
        console.warn('Supabase client is not configured. Falling back to cache/mock data.');
    }

    const cached = await fetchArgentinaFromCache(timeframe);
    if (cached.length > 0) {
        return { stocks: cached, source: 'CACHE', stale: true };
    }

    if (shouldUseMockFallback()) {
        return { stocks: getMockARData(), source: 'MOCK' };
    }

    return { stocks: [], source: 'UNAVAILABLE', stale: true };
};

const getMockUSData = (): StockData[] => {
    return ([
        { id: 'NVDA', ticker: 'NVDA', market: 'US', price: 850.20, percentChange: 8.5, sparkline: generateMockSparkline(850.20) },
        { id: 'AAPL', ticker: 'AAPL', market: 'US', price: 175.50, percentChange: 2.1, sparkline: generateMockSparkline(175.50) },
        { id: 'MSFT', ticker: 'MSFT', market: 'US', price: 420.30, percentChange: 1.8, sparkline: generateMockSparkline(420.30) },
        { id: 'TSLA', ticker: 'TSLA', market: 'US', price: 210.00, percentChange: 1.5, sparkline: generateMockSparkline(210.00) },
        { id: 'AMZN', ticker: 'AMZN', market: 'US', price: 180.50, percentChange: 1.2, sparkline: generateMockSparkline(180.50) },
        { id: 'META', ticker: 'META', market: 'US', price: 500.00, percentChange: 1.0, sparkline: generateMockSparkline(500.00) },
        { id: 'GOOGL', ticker: 'GOOGL', market: 'US', price: 145.20, percentChange: 0.8, sparkline: generateMockSparkline(145.20) },
        { id: 'AMD', ticker: 'AMD', market: 'US', price: 160.00, percentChange: 0.5, sparkline: generateMockSparkline(160.00) },
        { id: 'NFLX', ticker: 'NFLX', market: 'US', price: 610.20, percentChange: 0.3, sparkline: generateMockSparkline(610.20) },
        { id: 'INTC', ticker: 'INTC', market: 'US', price: 45.10, percentChange: 0.1, sparkline: generateMockSparkline(45.10) },
    ] as StockData[]).sort((a, b) => b.percentChange - a.percentChange);
};

const mapFunctionSourceToUiSource = (source?: string): DataSourceType => {
    switch ((source || '').toLowerCase()) {
        case 'live':
            return 'LIVE';
        case 'cache':
        case 'cache_fallback':
            return 'CACHE';
        default:
            return 'CACHE';
    }
};

interface ArgentinaCacheRow {
    ticker: string;
    market: MarketType;
    price: number;
    percent_change: number;
    sparkline: SparklinePoint[] | null;
}

const fetchArgentinaFromCache = async (timeframe: TimeframeType): Promise<StockData[]> => {
    if (!supabase) {
        return [];
    }

    try {
        const { data, error } = await supabase
            .from('argentina_market_cache')
            .select('ticker,market,price,percent_change,sparkline')
            .eq('timeframe', timeframe)
            .order('percent_change', { ascending: false })
            .limit(10);

        if (error || !data) {
            if (error) {
                console.warn('Argentina market cache read failed:', error.message);
            }
            return [];
        }

        return (data as ArgentinaCacheRow[])
            .map((row) => ({
                id: row.ticker,
                ticker: row.ticker,
                market: 'AR' as const,
                price: Number(row.price),
                percentChange: Number(row.percent_change),
                sparkline: Array.isArray(row.sparkline) ? row.sparkline : [],
            }))
            .filter((row) => Number.isFinite(row.price) && Number.isFinite(row.percentChange))
            .sort((a, b) => b.percentChange - a.percentChange)
            .slice(0, 10);
    } catch (error) {
        console.warn('Argentina market cache fallback failed:', error);
        return [];
    }
};

const getMockARData = (): StockData[] => {
    return ([
        { id: 'GGAL', ticker: 'GGAL', market: 'AR', price: 4500.50, percentChange: 5.2, sparkline: generateMockSparkline(4500.50) },
        { id: 'YPFD', ticker: 'YPFD', market: 'AR', price: 21500.00, percentChange: 4.8, sparkline: generateMockSparkline(21500.00) },
        { id: 'PAMP', ticker: 'PAMP', market: 'AR', price: 2800.75, percentChange: 3.5, sparkline: generateMockSparkline(2800.75) },
        { id: 'BMA', ticker: 'BMA', market: 'AR', price: 6200.00, percentChange: 2.1, sparkline: generateMockSparkline(6200.00) },
        { id: 'TXAR', ticker: 'TXAR', market: 'AR', price: 980.00, percentChange: 1.8, sparkline: generateMockSparkline(980.00) },
        { id: 'LOMA', ticker: 'LOMA', market: 'AR', price: 1550.00, percentChange: 1.5, sparkline: generateMockSparkline(1550.00) },
        { id: 'CEPU', ticker: 'CEPU', market: 'AR', price: 1200.00, percentChange: 1.2, sparkline: generateMockSparkline(1200.00) },
        { id: 'EDN', ticker: 'EDN', market: 'AR', price: 850.50, percentChange: 0.9, sparkline: generateMockSparkline(850.50) },
        { id: 'CRES', ticker: 'CRES', market: 'AR', price: 1100.25, percentChange: 0.5, sparkline: generateMockSparkline(1100.25) },
        { id: 'SUPV', ticker: 'SUPV', market: 'AR', price: 480.00, percentChange: 0.2, sparkline: generateMockSparkline(480.00) },
    ] as StockData[]).sort((a, b) => b.percentChange - a.percentChange);
};
