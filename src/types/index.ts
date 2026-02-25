export type MarketType = 'US' | 'AR';
export type TimeframeType = '1D' | '1W' | '1M' | 'YTD';

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
