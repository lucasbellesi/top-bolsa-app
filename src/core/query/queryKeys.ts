import type { DetailRangeType, MarketType, TimeframeType } from '@app/types';

export const queryKeys = {
    companyProfile: (market: MarketType, ticker: string, fallbackCompanyName?: string) =>
        ['companyProfile', market, ticker.toUpperCase(), fallbackCompanyName || ''] as const,
    fxRate: () => ['fxRate', 'USD_ARS'] as const,
    stockDetail: (ticker: string, market: MarketType, range: DetailRangeType) =>
        ['stockDetail', ticker.toUpperCase(), market, range] as const,
    stockRanking: (market: MarketType, timeframe: TimeframeType) =>
        ['stockRanking', market, timeframe] as const,
};
