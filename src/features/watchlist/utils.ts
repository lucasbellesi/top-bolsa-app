import type { MarketType } from '@app/types';

import type { WatchlistEntry } from './types';

const normalizeTicker = (ticker: string): string => ticker.trim().toUpperCase();

export const getWatchlistEntryId = (ticker: string, market: MarketType): string =>
    `${market}:${normalizeTicker(ticker)}`;

export const isWatchlistedTicker = (
    entries: WatchlistEntry[],
    ticker: string,
    market: MarketType,
): boolean =>
    entries.some(
        (entry) =>
            getWatchlistEntryId(entry.ticker, entry.market) === getWatchlistEntryId(ticker, market),
    );

interface AddOrUpdateWatchlistEntryParams {
    companyName?: string;
    entries: WatchlistEntry[];
    market: MarketType;
    ticker: string;
}

export const addOrUpdateWatchlistEntry = ({
    companyName,
    entries,
    market,
    ticker,
}: AddOrUpdateWatchlistEntryParams): WatchlistEntry[] => {
    const nextEntry: WatchlistEntry = {
        ticker: normalizeTicker(ticker),
        market,
        companyName: companyName?.trim() || undefined,
        addedAt: new Date().toISOString(),
    };

    return [
        nextEntry,
        ...entries.filter(
            (entry) =>
                getWatchlistEntryId(entry.ticker, entry.market) !==
                getWatchlistEntryId(ticker, market),
        ),
    ];
};

export const removeWatchlistEntry = (
    entries: WatchlistEntry[],
    ticker: string,
    market: MarketType,
): WatchlistEntry[] =>
    entries.filter(
        (entry) =>
            getWatchlistEntryId(entry.ticker, entry.market) !== getWatchlistEntryId(ticker, market),
    );
