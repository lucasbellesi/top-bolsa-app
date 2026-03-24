import type { DetailRangeType, TimeframeType } from '@app/types';

export const TIMEFRAME_TO_DETAIL_RANGE: Record<TimeframeType, DetailRangeType> = {
    '1H': '1H',
    '1D': '1D',
    '1W': '1W',
    '1M': '1M',
    '3M': '3M',
    YTD: 'YTD',
};
