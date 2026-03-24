import type { DataFreshnessType, DataSourceType } from '@app/types';
import { getSourceHint, mapSourceToFreshness } from '@app/utils/freshness';
import type { ThemeTokens } from '@core/theme';

export interface SourceBadgePalette {
    bg: string;
    border: string;
    text: string;
}

export interface SourcePresentationModel {
    badgePalette: SourceBadgePalette;
    freshness: DataFreshnessType;
    hint: string | null;
    label: string;
}

export const getSourceBadgePalette = (
    source: DataSourceType,
    tokens: ThemeTokens,
): SourceBadgePalette => {
    switch (source) {
        case 'LIVE':
            return {
                bg: `${tokens.positive}26`,
                border: `${tokens.positive}66`,
                text: tokens.positive,
            };
        case 'CACHE':
            return {
                bg: `${tokens.warning}26`,
                border: `${tokens.warning}66`,
                text: tokens.warning,
            };
        case 'MOCK':
            return {
                bg: `${tokens.textMuted}26`,
                border: `${tokens.textMuted}66`,
                text: tokens.textSecondary,
            };
        case 'UNAVAILABLE':
        default:
            return {
                bg: `${tokens.negative}26`,
                border: `${tokens.negative}66`,
                text: tokens.negative,
            };
    }
};

export const getSourcePresentation = (
    source: DataSourceType,
    tokens: ThemeTokens,
    stale?: boolean,
): SourcePresentationModel => ({
    badgePalette: getSourceBadgePalette(source, tokens),
    freshness: mapSourceToFreshness(source, stale),
    hint: getSourceHint(source, stale) || null,
    label: source.toUpperCase(),
});
