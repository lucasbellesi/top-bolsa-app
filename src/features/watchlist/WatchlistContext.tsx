import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { MarketType } from '@app/types';

import { loadWatchlistEntries, persistWatchlistEntries } from './storage';
import type { WatchlistEntry } from './types';
import { addOrUpdateWatchlistEntry, isWatchlistedTicker, removeWatchlistEntry } from './utils';

interface ToggleWatchlistParams {
    companyName?: string;
    market: MarketType;
    ticker: string;
}

interface WatchlistContextValue {
    entries: WatchlistEntry[];
    isHydrating: boolean;
    isInWatchlist: (ticker: string, market: MarketType) => boolean;
    removeFromWatchlist: (ticker: string, market: MarketType) => void;
    toggleWatchlist: (params: ToggleWatchlistParams) => boolean;
}

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

export const WatchlistProvider = ({ children }: React.PropsWithChildren) => {
    const [entries, setEntries] = useState<WatchlistEntry[]>([]);
    const [isHydrating, setIsHydrating] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const hydrateWatchlist = async () => {
            const hydratedEntries = await loadWatchlistEntries();
            if (!isMounted) {
                return;
            }

            setEntries(hydratedEntries);
            setIsHydrating(false);
        };

        void hydrateWatchlist();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (isHydrating) {
            return;
        }

        void persistWatchlistEntries(entries);
    }, [entries, isHydrating]);

    const isInWatchlist = useCallback(
        (ticker: string, market: MarketType) => isWatchlistedTicker(entries, ticker, market),
        [entries],
    );

    const removeFromWatchlist = useCallback((ticker: string, market: MarketType) => {
        setEntries((currentEntries) => removeWatchlistEntry(currentEntries, ticker, market));
    }, []);

    const toggleWatchlist = useCallback(
        ({ companyName, market, ticker }: ToggleWatchlistParams): boolean => {
            let wasAdded = false;

            setEntries((currentEntries) => {
                const isAlreadySaved = isWatchlistedTicker(currentEntries, ticker, market);
                wasAdded = !isAlreadySaved;

                return isAlreadySaved
                    ? removeWatchlistEntry(currentEntries, ticker, market)
                    : addOrUpdateWatchlistEntry({
                          companyName,
                          entries: currentEntries,
                          market,
                          ticker,
                      });
            });

            return wasAdded;
        },
        [],
    );

    const value = useMemo<WatchlistContextValue>(
        () => ({
            entries,
            isHydrating,
            isInWatchlist,
            removeFromWatchlist,
            toggleWatchlist,
        }),
        [entries, isHydrating, isInWatchlist, removeFromWatchlist, toggleWatchlist],
    );

    return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
};

export const useWatchlist = (): WatchlistContextValue => {
    const context = useContext(WatchlistContext);
    if (!context) {
        throw new Error('useWatchlist must be used inside WatchlistProvider');
    }

    return context;
};
