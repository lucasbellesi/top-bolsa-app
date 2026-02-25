export type MarketType = 'US' | 'AR';
export type TimeframeType = '1D' | '1W' | '1M' | 'YTD';
export type DataSourceType = 'LIVE' | 'CACHE' | 'MOCK' | 'UNAVAILABLE';

export interface SparklinePoint {
    timestamp: number;
    value: number;
}

export interface StockData {
    id: string; // Ticker symbol
    ticker: string;
    market: MarketType;
    price: number;
    percentChange: number;
    sparkline: SparklinePoint[];
}

export interface StockRankingData {
    stocks: StockData[];
    source: DataSourceType;
    stale?: boolean;
}
