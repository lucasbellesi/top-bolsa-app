import { DetailRangeType, SparklinePoint, TimeframeType } from '../types';

export type HistoricalRange = TimeframeType | DetailRangeType;

export const getRangeStartTimestamp = (range: HistoricalRange, referenceTimestamp: number): number => {
    const referenceDate = new Date(referenceTimestamp);

    switch (range) {
        case '1H':
            return referenceTimestamp - (60 * 60 * 1000);
        case '1D':
            return referenceTimestamp - (24 * 60 * 60 * 1000);
        case '1W':
            return referenceTimestamp - (7 * 24 * 60 * 60 * 1000);
        case '1M': {
            const start = new Date(referenceDate);
            start.setMonth(start.getMonth() - 1);
            return start.getTime();
        }
        case '3M': {
            const start = new Date(referenceDate);
            start.setMonth(start.getMonth() - 3);
            return start.getTime();
        }
        case '6M': {
            const start = new Date(referenceDate);
            start.setMonth(start.getMonth() - 6);
            return start.getTime();
        }
        case '1Y': {
            const start = new Date(referenceDate);
            start.setFullYear(start.getFullYear() - 1);
            return start.getTime();
        }
        case 'YTD':
            return new Date(referenceDate.getFullYear(), 0, 1).getTime();
    }
};

export const sliceSeriesByRange = (
    series: SparklinePoint[],
    range: HistoricalRange,
    referenceTimestamp?: number
): SparklinePoint[] => {
    const sorted = [...series]
        .filter((point) => Number.isFinite(point.timestamp) && Number.isFinite(point.value))
        .sort((a, b) => a.timestamp - b.timestamp);

    if (sorted.length <= 2) {
        return sorted;
    }

    const latestTs = referenceTimestamp ?? sorted[sorted.length - 1].timestamp;
    const startTs = getRangeStartTimestamp(range, latestTs);
    const filtered = sorted.filter((point) => point.timestamp >= startTs && point.timestamp <= latestTs);

    if (filtered.length >= 2) {
        return filtered;
    }

    return sorted.slice(-2);
};

export const computePercentChangeFromSeries = (series: SparklinePoint[]): number => {
    if (series.length < 2) {
        return 0;
    }

    const first = series[0].value;
    const last = series[series.length - 1].value;

    if (!Number.isFinite(first) || !Number.isFinite(last) || first <= 0) {
        return 0;
    }

    return ((last - first) / first) * 100;
};

export const parseIntradaySeries = (payload: Record<string, unknown>): SparklinePoint[] => {
    const seriesKey = Object.keys(payload).find((key) => key.startsWith('Time Series ('));
    if (!seriesKey) {
        return [];
    }

    const rawSeries = payload[seriesKey];
    if (!rawSeries || typeof rawSeries !== 'object') {
        return [];
    }

    return Object.entries(rawSeries as Record<string, unknown>)
        .map(([timestampRaw, row]) => {
            const timestamp = new Date(timestampRaw).getTime();
            const closeRaw = row && typeof row === 'object'
                ? (row as Record<string, unknown>)['4. close']
                : undefined;
            const value = Number(closeRaw);

            if (!Number.isFinite(timestamp) || !Number.isFinite(value)) {
                return null;
            }

            return { timestamp, value };
        })
        .filter((point): point is SparklinePoint => point !== null)
        .sort((a, b) => a.timestamp - b.timestamp);
};

export const parseDailySeries = (payload: Record<string, unknown>): SparklinePoint[] => {
    const rawSeries = payload['Time Series (Daily)'];
    if (!rawSeries || typeof rawSeries !== 'object') {
        return [];
    }

    return Object.entries(rawSeries as Record<string, unknown>)
        .map(([dateRaw, row]) => {
            const timestamp = new Date(`${dateRaw}T00:00:00Z`).getTime();
            const closeRaw = row && typeof row === 'object'
                ? (row as Record<string, unknown>)['4. close']
                : undefined;
            const value = Number(closeRaw);

            if (!Number.isFinite(timestamp) || !Number.isFinite(value)) {
                return null;
            }

            return { timestamp, value };
        })
        .filter((point): point is SparklinePoint => point !== null)
        .sort((a, b) => a.timestamp - b.timestamp);
};

export const isAlphaVantageError = (payload: Record<string, unknown>): boolean =>
    Boolean(payload.Note || payload.Information || payload['Error Message']);

export const buildHistoricalSnapshot = (
    series: SparklinePoint[],
    range: HistoricalRange,
    options?: {
        referenceTimestamp?: number;
        requireFullCoverage?: boolean;
    }
): { price: number; percentChange: number; sparkline: SparklinePoint[] } | null => {
    const sorted = [...series]
        .filter((point) => Number.isFinite(point.timestamp) && Number.isFinite(point.value))
        .sort((a, b) => a.timestamp - b.timestamp);

    if (sorted.length < 2) {
        return null;
    }

    const latestTimestamp = options?.referenceTimestamp ?? sorted[sorted.length - 1].timestamp;
    const requiredStartTimestamp = getRangeStartTimestamp(range, latestTimestamp);

    if (options?.requireFullCoverage && sorted[0].timestamp > requiredStartTimestamp) {
        return null;
    }

    const slicedSeries = sliceSeriesByRange(sorted, range, latestTimestamp);

    if (slicedSeries.length < 2) {
        return null;
    }

    return {
        price: slicedSeries[slicedSeries.length - 1].value,
        percentChange: computePercentChangeFromSeries(slicedSeries),
        sparkline: slicedSeries,
    };
};
