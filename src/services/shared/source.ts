import type { DataSourceType } from '@app/types';
import { logger } from '@core/logging/logger';

export const mapRemoteSourceToUiSource = (
    source?: string,
    options?: {
        allowMock?: boolean;
        logUnknownSource?: boolean;
        unknownSourceLabel?: string;
    },
): DataSourceType => {
    switch ((source || '').toLowerCase()) {
        case 'live':
            return 'LIVE';
        case 'cache':
        case 'cache_fallback':
            return 'CACHE';
        case 'mock':
            return options?.allowMock ? 'MOCK' : 'UNAVAILABLE';
        default:
            if (source && options?.logUnknownSource) {
                logger.warn(options.unknownSourceLabel || 'Unknown remote source received', source);
            }
            return 'UNAVAILABLE';
    }
};
