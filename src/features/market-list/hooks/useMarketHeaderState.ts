import type { StockRankingData } from '@app/types';
import { useSourcePresentation } from '@features/shared/hooks/useSourcePresentation';

export const useMarketHeaderState = (rankingData?: StockRankingData) => {
    const source = rankingData?.source ?? 'UNAVAILABLE';
    const presentation = useSourcePresentation(source, rankingData?.stale);
    const parsedLastUpdatedAt = rankingData?.lastUpdatedAt
        ? new Date(rankingData.lastUpdatedAt).getTime()
        : null;
    const lastUpdatedAt =
        parsedLastUpdatedAt !== null && Number.isFinite(parsedLastUpdatedAt)
            ? parsedLastUpdatedAt
            : null;

    return {
        lastUpdatedAt,
        source,
        sourceBadgePalette: presentation.badgePalette,
        sourceHint: presentation.hint,
        freshness: presentation.freshness,
    };
};
