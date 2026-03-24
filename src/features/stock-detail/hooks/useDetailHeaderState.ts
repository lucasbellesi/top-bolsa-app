import type { StockDetailData } from '@app/types';
import { useSourcePresentation } from '@features/shared/hooks/useSourcePresentation';

export const useDetailHeaderState = (detail?: StockDetailData | null) => {
    const source = detail?.source ?? 'UNAVAILABLE';
    const stale = detail?.stale ?? source === 'CACHE';
    const presentation = useSourcePresentation(source, stale);
    const parsedUpdateTimestamp = detail?.lastUpdatedAt
        ? new Date(detail.lastUpdatedAt).getTime()
        : NaN;

    return {
        freshness: presentation.freshness,
        source,
        sourceHint: presentation.hint,
        updateTimestamp: Number.isFinite(parsedUpdateTimestamp)
            ? parsedUpdateTimestamp
            : Date.now(),
    };
};
