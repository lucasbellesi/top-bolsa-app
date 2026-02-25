import { MarketType, TimeframeType, StockData, SparklinePoint } from '../types';
import { supabase } from './supabase';

const ALPHAVANTAGE_KEY = process.env.EXPO_PUBLIC_STOCK_API_KEY || 'demo';

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

export const fetchUSMarketGainers = async (timeframe: TimeframeType): Promise<StockData[]> => {
    try {
        const res = await fetch(`https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${ALPHAVANTAGE_KEY}`);
        const data = await res.json();

        if (data.top_gainers && Array.isArray(data.top_gainers)) {
            return data.top_gainers.slice(0, 10).map((item: any) => {
                const price = parseFloat(item.price);
                const changePercent = parseFloat(item.change_percentage.replace('%', ''));
                return {
                    id: item.ticker,
                    ticker: item.ticker,
                    market: 'US',
                    price,
                    percentChange: changePercent,
                    sparkline: generateMockSparkline(price) // API doesn't return points so we mock intra-day line
                };
            });
        }
    } catch (error) {
        console.error("US Market Fetch Error", error);
    }

    // Fallback to mock data if API limits or errors occur
    return getMockUSData();
};

export const fetchARMarketGainers = async (timeframe: TimeframeType): Promise<StockData[]> => {
    try {
        const { data, error } = await supabase.functions.invoke<{ stocks?: StockData[] }>(
            'fetch-argentina-market',
            {
                body: { timeframe },
            }
        );

        if (!error && data?.stocks?.length) {
            return data.stocks.sort((a, b) => b.percentChange - a.percentChange).slice(0, 10);
        }

        if (error) {
            console.warn('Argentina market edge function error:', error.message);
        }
    } catch (error) {
        console.warn('Argentina market edge function invocation failed:', error);
    }

    const cached = await fetchArgentinaFromCache(timeframe);
    if (cached.length > 0) {
        return cached;
    }

    return getMockARData();
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

interface ArgentinaCacheRow {
    ticker: string;
    market: MarketType;
    price: number;
    percent_change: number;
    sparkline: SparklinePoint[] | null;
}

const fetchArgentinaFromCache = async (timeframe: TimeframeType): Promise<StockData[]> => {
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
