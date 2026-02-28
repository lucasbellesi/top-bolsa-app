import { DataSourceType, MarketType, TimeframeType, StockData, SparklinePoint, StockRankingData } from '../types';
import { supabase } from './supabase';
import {
    buildHistoricalSnapshot,
    isAlphaVantageError,
    parseDailySeries,
    parseIntradaySeries,
} from './series';

const ALPHAVANTAGE_KEY = process.env.EXPO_PUBLIC_STOCK_API_KEY || 'demo';
const EXPO_ALLOW_MOCK_FALLBACK = process.env.EXPO_PUBLIC_ALLOW_MOCK_FALLBACK === 'true';
const US_TOP_GAINERS_CACHE_TTL_MS = 60 * 1000;
const US_RANKING_CACHE_TTL_MS = 5 * 60 * 1000;
const US_COMPANY_NAME_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const US_INTRADAY_MAX_REQUESTS = 5;
const US_DAILY_MAX_REQUESTS = 6;
const US_COMPANY_NAME_LOOKUP_LIMIT = 10;
const US_CANDIDATE_POOL_LIMIT = 24;

interface AlphaTopGainerRow {
    ticker: string;
    price: string;
    change_percentage: string;
    name?: string;
}

interface AlphaTopMoversResponse {
    top_gainers?: AlphaTopGainerRow[];
    top_losers?: AlphaTopGainerRow[];
    most_actively_traded?: AlphaTopGainerRow[];
}

let usTopMoversCache: { expiresAt: number; rows: AlphaTopGainerRow[] } | null = null;
const usRankingCache = new Map<TimeframeType, { expiresAt: number; stocks: StockData[] }>();
const usCompanyNameCache = new Map<string, { expiresAt: number; companyName: string }>();

const US_COMPANY_NAME_BY_TICKER: Record<string, string> = {
    NVDA: 'NVIDIA Corporation',
    AAPL: 'Apple Inc.',
    MSFT: 'Microsoft Corporation',
    TSLA: 'Tesla, Inc.',
    AMZN: 'Amazon.com, Inc.',
    META: 'Meta Platforms, Inc.',
    GOOGL: 'Alphabet Inc.',
    AMD: 'Advanced Micro Devices, Inc.',
    NFLX: 'Netflix, Inc.',
    INTC: 'Intel Corporation',
    BMA: 'Banco Macro S.A.',
    GGAL: 'Grupo Financiero Galicia S.A.',
    SUPV: 'Grupo Supervielle S.A.',
    TXAR: 'Ternium Argentina S.A.',
    PAMP: 'Pampa Energia S.A.',
    LOMA: 'Loma Negra C.I.A.S.A.',
};

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

const resolveUSCompanyName = (ticker: string, rawName?: string): string =>
    (rawName && rawName.trim()) || US_COMPANY_NAME_BY_TICKER[ticker.toUpperCase()] || ticker.toUpperCase();

const parsePercentString = (rawValue?: string): number => {
    const normalizedValue = (rawValue || '').replace('%', '').trim();
    const parsedValue = Number(normalizedValue);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const buildFallbackSparkline = (currentPrice: number, percentChange: number): SparklinePoint[] => {
    const now = Date.now();
    const baselinePrice = percentChange <= -100
        ? currentPrice
        : currentPrice / (1 + (percentChange / 100));

    if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
        return [];
    }

    const safeBaselinePrice = Number.isFinite(baselinePrice) && baselinePrice > 0
        ? baselinePrice
        : currentPrice;

    return [
        { timestamp: now - (60 * 60 * 1000), value: safeBaselinePrice },
        { timestamp: now, value: currentPrice },
    ];
};

const buildFallbackUSStock = (row: AlphaTopGainerRow): StockData | null => {
    const price = Number(row.price);
    if (!Number.isFinite(price) || price <= 0) {
        return null;
    }

    const percentChange = parsePercentString(row.change_percentage);
    return {
        id: row.ticker,
        ticker: row.ticker,
        companyName: resolveUSCompanyName(row.ticker, row.name),
        market: 'US',
        price,
        percentChange,
        sparkline: buildFallbackSparkline(price, percentChange),
    };
};

const fetchYahooCompanyName = async (ticker: string): Promise<string | null> => {
    const normalizedTicker = ticker.toUpperCase();

    try {
        const response = await fetch(
            `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(normalizedTicker)}&quotesCount=5&newsCount=0`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                },
            }
        );
        const payload = await response.json() as {
            quotes?: Array<{
                symbol?: string;
                shortname?: string;
                longname?: string;
                quoteType?: string;
            }>;
        };

        const exactQuote = payload.quotes?.find((quote) =>
            quote.symbol?.toUpperCase() === normalizedTicker
            && quote.quoteType !== 'OPTION'
            && quote.quoteType !== 'CRYPTOCURRENCY'
        );

        const yahooName = exactQuote?.longname?.trim() || exactQuote?.shortname?.trim() || '';
        return yahooName || null;
    } catch (error) {
        console.warn(`Yahoo company name fetch failed for ${normalizedTicker}:`, error);
        return null;
    }
};

const fetchUSCompanyName = async (ticker: string): Promise<string> => {
    const normalizedTicker = ticker.toUpperCase();
    const cached = usCompanyNameCache.get(normalizedTicker);

    if (cached && cached.expiresAt > Date.now()) {
        return cached.companyName;
    }

    const mappedName = US_COMPANY_NAME_BY_TICKER[normalizedTicker];
    if (mappedName) {
        usCompanyNameCache.set(normalizedTicker, {
            companyName: mappedName,
            expiresAt: Date.now() + US_COMPANY_NAME_CACHE_TTL_MS,
        });
        return mappedName;
    }

    const yahooName = await fetchYahooCompanyName(normalizedTicker);
    if (yahooName) {
        usCompanyNameCache.set(normalizedTicker, {
            companyName: yahooName,
            expiresAt: Date.now() + US_COMPANY_NAME_CACHE_TTL_MS,
        });
        return yahooName;
    }

    try {
        const response = await fetch(
            `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${normalizedTicker}&apikey=${ALPHAVANTAGE_KEY}`
        );
        const payload = await response.json() as Record<string, unknown>;
        const overviewName = typeof payload.Name === 'string' ? payload.Name.trim() : '';

        const companyName = overviewName || normalizedTicker;
        usCompanyNameCache.set(normalizedTicker, {
            companyName,
            expiresAt: Date.now() + US_COMPANY_NAME_CACHE_TTL_MS,
        });

        return companyName;
    } catch (error) {
        console.warn(`US company name fetch failed for ${normalizedTicker}:`, error);
        return normalizedTicker;
    }
};

const enrichUSStocksWithCompanyNames = async (
    stocks: StockData[],
    maxLookups: number = US_COMPANY_NAME_LOOKUP_LIMIT,
): Promise<StockData[]> => {
    const enrichedStocks: StockData[] = [];
    let lookupCount = 0;

    for (const stock of stocks) {
        const hasResolvedCompanyName = Boolean(stock.companyName && stock.companyName !== stock.ticker);
        let companyName = stock.companyName || stock.ticker;

        if (!hasResolvedCompanyName) {
            const cached = usCompanyNameCache.get(stock.ticker.toUpperCase());
            if (cached && cached.expiresAt > Date.now()) {
                companyName = cached.companyName;
            } else if (lookupCount < maxLookups) {
                companyName = await fetchUSCompanyName(stock.ticker);
                lookupCount += 1;
            }
        }

        enrichedStocks.push({
            ...stock,
            companyName,
        });
    }

    return enrichedStocks;
};

const fetchUSTopMovers = async (): Promise<AlphaTopGainerRow[]> => {
    if (usTopMoversCache && usTopMoversCache.expiresAt > Date.now()) {
        return usTopMoversCache.rows;
    }

    const res = await fetch(`https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${ALPHAVANTAGE_KEY}`);
    const data = await res.json() as AlphaTopMoversResponse;

    const mergedRows = [
        ...(Array.isArray(data.top_gainers) ? data.top_gainers : []),
        ...(Array.isArray(data.most_actively_traded) ? data.most_actively_traded : []),
        ...(Array.isArray(data.top_losers) ? data.top_losers : []),
    ];

    const seen = new Set<string>();
    const rows = mergedRows.filter((row) => {
        const ticker = row.ticker?.toUpperCase();
        if (!ticker || seen.has(ticker)) {
            return false;
        }
        seen.add(ticker);
        return true;
    }).slice(0, US_CANDIDATE_POOL_LIMIT);

    if (rows.length > 0) {
        usTopMoversCache = {
            rows,
            expiresAt: Date.now() + US_TOP_GAINERS_CACHE_TTL_MS,
        };
    }

    return rows;
};

const fetchUSHistoricalSnapshot = async (ticker: string, timeframe: TimeframeType) => {
    const useIntradaySeries = timeframe === '1H';
    const endpoint = useIntradaySeries
        ? `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${ticker}&interval=5min&outputsize=compact&apikey=${ALPHAVANTAGE_KEY}`
        : `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&outputsize=full&apikey=${ALPHAVANTAGE_KEY}`;

    const response = await fetch(endpoint);
    const payload = await response.json() as Record<string, unknown>;

    if (isAlphaVantageError(payload)) {
        return null;
    }

    const series = useIntradaySeries ? parseIntradaySeries(payload) : parseDailySeries(payload);
    return buildHistoricalSnapshot(series, timeframe);
};

const fetchUSRankingByTimeframe = async (
    timeframe: TimeframeType,
    candidateRows: AlphaTopGainerRow[],
): Promise<{ stocks: StockData[]; source: DataSourceType }> => {
    const cached = usRankingCache.get(timeframe);
    if (cached && cached.expiresAt > Date.now()) {
        return { stocks: cached.stocks, source: 'CACHE' };
    }

    const isIntradayRange = timeframe === '1H';
    const maxRequests = isIntradayRange ? US_INTRADAY_MAX_REQUESTS : US_DAILY_MAX_REQUESTS;
    const stocks: StockData[] = [];
    let requestCount = 0;

    for (const row of candidateRows) {
        if (requestCount >= maxRequests || stocks.length >= 10) {
            break;
        }

        try {
            requestCount += 1;
            const snapshot = await fetchUSHistoricalSnapshot(row.ticker, timeframe);
            if (!snapshot) {
                continue;
            }

            stocks.push({
                id: row.ticker,
                ticker: row.ticker,
                companyName: resolveUSCompanyName(row.ticker, row.name),
                market: 'US',
                price: snapshot.price,
                percentChange: snapshot.percentChange,
                sparkline: snapshot.sparkline,
            });
        } catch (error) {
            console.warn(`US ${timeframe} fetch failed for ${row.ticker}:`, error);
        }
    }

    const ranked = stocks
        .filter((stock) => Number.isFinite(stock.percentChange))
        .sort((a, b) => b.percentChange - a.percentChange)
        .slice(0, 10);

    if (ranked.length < 10) {
        const existingTickers = new Set(ranked.map((stock) => stock.ticker.toUpperCase()));
        const fallbackStocks = candidateRows
            .filter((row) => !existingTickers.has(row.ticker.toUpperCase()))
            .map((row) => buildFallbackUSStock(row))
            .filter((stock): stock is StockData => stock !== null)
            .slice(0, 10 - ranked.length);

        ranked.push(...fallbackStocks);
    }

    const enrichedRanked = ranked.length > 0
        ? await enrichUSStocksWithCompanyNames(ranked, timeframe === '1H' ? 0 : US_COMPANY_NAME_LOOKUP_LIMIT)
        : ranked;

    if (enrichedRanked.length > 0) {
        usRankingCache.set(timeframe, {
            stocks: enrichedRanked,
            expiresAt: Date.now() + US_RANKING_CACHE_TTL_MS,
        });
        return { stocks: enrichedRanked, source: 'LIVE' };
    }

    if (cached?.stocks.length) {
        return { stocks: cached.stocks, source: 'CACHE' };
    }

    return { stocks: [], source: 'UNAVAILABLE' };
};

export const fetchUSMarketGainers = async (timeframe: TimeframeType): Promise<StockRankingData> => {
    const cached = usRankingCache.get(timeframe);
    if (cached && cached.expiresAt > Date.now()) {
        return { stocks: cached.stocks, source: 'CACHE' };
    }

    try {
        const topMovers = await fetchUSTopMovers();
        if (topMovers.length > 0) {
            const result = await fetchUSRankingByTimeframe(timeframe, topMovers);
            if (result.stocks.length > 0) {
                return result;
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

export const __resetUsApiCachesForTests = (): void => {
    usTopMoversCache = null;
    usRankingCache.clear();
    usCompanyNameCache.clear();
};

const getMockUSData = (): StockData[] => {
    return ([
        { id: 'NVDA', ticker: 'NVDA', companyName: 'NVIDIA Corporation', market: 'US', price: 850.20, percentChange: 8.5, sparkline: generateMockSparkline(850.20) },
        { id: 'AAPL', ticker: 'AAPL', companyName: 'Apple Inc.', market: 'US', price: 175.50, percentChange: 2.1, sparkline: generateMockSparkline(175.50) },
        { id: 'MSFT', ticker: 'MSFT', companyName: 'Microsoft Corporation', market: 'US', price: 420.30, percentChange: 1.8, sparkline: generateMockSparkline(420.30) },
        { id: 'TSLA', ticker: 'TSLA', companyName: 'Tesla, Inc.', market: 'US', price: 210.00, percentChange: 1.5, sparkline: generateMockSparkline(210.00) },
        { id: 'AMZN', ticker: 'AMZN', companyName: 'Amazon.com, Inc.', market: 'US', price: 180.50, percentChange: 1.2, sparkline: generateMockSparkline(180.50) },
        { id: 'META', ticker: 'META', companyName: 'Meta Platforms, Inc.', market: 'US', price: 500.00, percentChange: 1.0, sparkline: generateMockSparkline(500.00) },
        { id: 'GOOGL', ticker: 'GOOGL', companyName: 'Alphabet Inc.', market: 'US', price: 145.20, percentChange: 0.8, sparkline: generateMockSparkline(145.20) },
        { id: 'AMD', ticker: 'AMD', companyName: 'Advanced Micro Devices, Inc.', market: 'US', price: 160.00, percentChange: 0.5, sparkline: generateMockSparkline(160.00) },
        { id: 'NFLX', ticker: 'NFLX', companyName: 'Netflix, Inc.', market: 'US', price: 610.20, percentChange: 0.3, sparkline: generateMockSparkline(610.20) },
        { id: 'INTC', ticker: 'INTC', companyName: 'Intel Corporation', market: 'US', price: 45.10, percentChange: 0.1, sparkline: generateMockSparkline(45.10) },
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
    company_name?: string | null;
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
            .select('ticker,market,company_name,price,percent_change,sparkline')
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
                companyName: row.company_name || row.ticker,
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
        { id: 'GGAL', ticker: 'GGAL', companyName: 'Grupo Financiero Galicia S.A.', market: 'AR', price: 4500.50, percentChange: 5.2, sparkline: generateMockSparkline(4500.50) },
        { id: 'YPFD', ticker: 'YPFD', companyName: 'YPF S.A.', market: 'AR', price: 21500.00, percentChange: 4.8, sparkline: generateMockSparkline(21500.00) },
        { id: 'PAMP', ticker: 'PAMP', companyName: 'Pampa Energia S.A.', market: 'AR', price: 2800.75, percentChange: 3.5, sparkline: generateMockSparkline(2800.75) },
        { id: 'BMA', ticker: 'BMA', companyName: 'Banco Macro S.A.', market: 'AR', price: 6200.00, percentChange: 2.1, sparkline: generateMockSparkline(6200.00) },
        { id: 'TXAR', ticker: 'TXAR', companyName: 'Ternium Argentina S.A.', market: 'AR', price: 980.00, percentChange: 1.8, sparkline: generateMockSparkline(980.00) },
        { id: 'LOMA', ticker: 'LOMA', companyName: 'Loma Negra C.I.A.S.A.', market: 'AR', price: 1550.00, percentChange: 1.5, sparkline: generateMockSparkline(1550.00) },
        { id: 'CEPU', ticker: 'CEPU', companyName: 'Central Puerto S.A.', market: 'AR', price: 1200.00, percentChange: 1.2, sparkline: generateMockSparkline(1200.00) },
        { id: 'EDN', ticker: 'EDN', companyName: 'Edenor S.A.', market: 'AR', price: 850.50, percentChange: 0.9, sparkline: generateMockSparkline(850.50) },
        { id: 'CRES', ticker: 'CRES', companyName: 'Cresud S.A.C.I.F. y A.', market: 'AR', price: 1100.25, percentChange: 0.5, sparkline: generateMockSparkline(1100.25) },
        { id: 'SUPV', ticker: 'SUPV', companyName: 'Grupo Supervielle S.A.', market: 'AR', price: 480.00, percentChange: 0.2, sparkline: generateMockSparkline(480.00) },
    ] as StockData[]).sort((a, b) => b.percentChange - a.percentChange);
};
