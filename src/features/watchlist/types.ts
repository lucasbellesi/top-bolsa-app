import type { MarketType } from '@app/types';

export interface WatchlistEntry {
    addedAt: string;
    companyName?: string;
    market: MarketType;
    ticker: string;
}

export type FeedMode = 'MARKET' | 'WATCHLIST';
