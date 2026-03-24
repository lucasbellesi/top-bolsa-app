import AsyncStorage from '@react-native-async-storage/async-storage';

import { logger } from '@core/logging/logger';

import type { WatchlistEntry } from './types';

const WATCHLIST_STORAGE_KEY = 'top-bolsa-app:watchlist';

const isValidWatchlistEntry = (value: unknown): value is WatchlistEntry => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const candidate = value as Partial<WatchlistEntry>;
    return (
        typeof candidate.ticker === 'string' &&
        (candidate.market === 'AR' || candidate.market === 'US') &&
        typeof candidate.addedAt === 'string' &&
        (candidate.companyName === undefined || typeof candidate.companyName === 'string')
    );
};

export const loadWatchlistEntries = async (): Promise<WatchlistEntry[]> => {
    try {
        const rawValue = await AsyncStorage.getItem(WATCHLIST_STORAGE_KEY);
        if (!rawValue) {
            return [];
        }

        const parsed = JSON.parse(rawValue);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter(isValidWatchlistEntry);
    } catch (error) {
        logger.warn('Failed to load watchlist entries from storage', error);
        return [];
    }
};

export const persistWatchlistEntries = async (entries: WatchlistEntry[]): Promise<void> => {
    try {
        await AsyncStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
        logger.warn('Failed to persist watchlist entries', error);
    }
};
