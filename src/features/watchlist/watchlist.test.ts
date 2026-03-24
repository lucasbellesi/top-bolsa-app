import { describe, expect, it } from 'vitest';

import type { WatchlistEntry } from './types';
import { addOrUpdateWatchlistEntry, isWatchlistedTicker, removeWatchlistEntry } from './utils';

describe('watchlist utils', () => {
    it('adds new entries at the front of the list', () => {
        const nextEntries = addOrUpdateWatchlistEntry({
            entries: [],
            market: 'AR',
            ticker: 'ggal',
            companyName: 'Grupo Galicia',
        });

        expect(nextEntries).toHaveLength(1);
        expect(nextEntries[0]).toMatchObject({
            ticker: 'GGAL',
            market: 'AR',
            companyName: 'Grupo Galicia',
        });
    });

    it('replaces duplicates instead of appending them', () => {
        const nextEntries = addOrUpdateWatchlistEntry({
            entries: [
                { ticker: 'GGAL', market: 'AR', companyName: 'Old Name', addedAt: '2025-01-01' },
                { ticker: 'AAPL', market: 'US', addedAt: '2025-01-02' },
            ],
            market: 'AR',
            ticker: 'ggal',
            companyName: 'Grupo Galicia',
        });

        expect(nextEntries).toHaveLength(2);
        expect(nextEntries[0]).toMatchObject({
            ticker: 'GGAL',
            market: 'AR',
            companyName: 'Grupo Galicia',
        });
        expect(nextEntries[1]).toMatchObject({
            ticker: 'AAPL',
            market: 'US',
        });
    });

    it('detects and removes saved entries by market and ticker', () => {
        const entries: WatchlistEntry[] = [
            { ticker: 'GGAL', market: 'AR', addedAt: '2025-01-01' },
            { ticker: 'GGAL', market: 'US', addedAt: '2025-01-02' },
        ];

        expect(isWatchlistedTicker(entries, 'ggal', 'AR')).toBe(true);
        expect(isWatchlistedTicker(entries, 'ggal', 'US')).toBe(true);

        const nextEntries = removeWatchlistEntry(entries, 'GGAL', 'AR');
        expect(nextEntries).toEqual([{ ticker: 'GGAL', market: 'US', addedAt: '2025-01-02' }]);
    });
});
