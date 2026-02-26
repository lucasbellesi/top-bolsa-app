import { DataFreshnessType, DataSourceType } from '../types';

export const mapSourceToFreshness = (
    source: DataSourceType,
    stale?: boolean
): DataFreshnessType => {
    if (source === 'LIVE' && !stale) {
        return 'fresh';
    }

    if (source === 'CACHE' || stale) {
        return 'stale';
    }

    return 'delayed';
};

export const getFreshnessLabel = (freshness: DataFreshnessType): string => {
    switch (freshness) {
        case 'fresh':
            return 'Fresh';
        case 'stale':
            return 'Cached';
        case 'delayed':
            return 'Delayed';
    }
};

export const getSourceHint = (source: DataSourceType, stale?: boolean): string => {
    if (source === 'LIVE' && !stale) {
        return 'Live market data';
    }

    if (source === 'CACHE' || stale) {
        return 'Puede tener retraso';
    }

    if (source === 'MOCK') {
        return 'Demo data';
    }

    return 'Data unavailable right now';
};
