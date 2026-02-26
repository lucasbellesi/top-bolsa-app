export type MarketType = 'US' | 'AR';
export type TimeframeType = '1H' | '1D' | '1W' | '1M' | '3M' | 'YTD';
export type DetailRangeType = '1H' | '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'YTD';
export type DataSourceType = 'LIVE' | 'CACHE' | 'MOCK' | 'UNAVAILABLE';
export type CurrencyType = 'USD' | 'ARS';
export type DataFreshnessType = 'fresh' | 'stale' | 'delayed';

export interface SparklinePoint {
    timestamp: number;
    value: number;
}

export interface StockData {
    id: string; // Ticker symbol
    ticker: string;
    companyName?: string;
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

export interface StockDetailData {
    ticker: string;
    market: MarketType;
    price: number;
    percentChange: number;
    series: SparklinePoint[];
    range: DetailRangeType;
    source: DataSourceType;
    lastUpdatedAt: string;
}
