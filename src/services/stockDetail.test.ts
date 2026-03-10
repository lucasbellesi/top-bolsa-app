import { describe, expect, it, vi } from 'vitest';
import { SparklinePoint } from '../types';

vi.mock('./supabase', () => ({
    supabase: null,
    supabaseConfigStatus: {
        mode: 'degraded',
        isConfigured: false,
        missingEnv: ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'],
        message: 'Supabase is not configured.',
    },
}));

import { computePercentChangeFromSeries, mapEdgeFunctionStockToDetail, sliceSeriesByDetailRange } from './stockDetail';
import { buildHistoricalSnapshot } from './series';

const buildDailySeries = (days: number): SparklinePoint[] => {
    const now = Date.now();
    return Array.from({ length: days }, (_, idx) => ({
        timestamp: now - (days - idx) * 24 * 60 * 60 * 1000,
        value: 100 + idx,
    }));
};

describe('stock detail helpers', () => {
    it('slices series correctly for 3M/6M/1Y', () => {
        const series = buildDailySeries(500);

        const threeMonths = sliceSeriesByDetailRange(series, '3M');
        const sixMonths = sliceSeriesByDetailRange(series, '6M');
        const oneYear = sliceSeriesByDetailRange(series, '1Y');

        expect(threeMonths.length).toBeGreaterThan(50);
        expect(threeMonths.length).toBeLessThan(110);
        expect(sixMonths.length).toBeGreaterThan(120);
        expect(sixMonths.length).toBeLessThan(220);
        expect(oneYear.length).toBeGreaterThan(250);
        expect(oneYear.length).toBeLessThan(380);
    });

    it('computes percent change using first and last points', () => {
        const series: SparklinePoint[] = [
            { timestamp: 1, value: 100 },
            { timestamp: 2, value: 110 },
        ];

        expect(computePercentChangeFromSeries(series)).toBe(10);
    });

    it('rejects historical snapshots when the requested range is not fully covered', () => {
        const now = Date.now();
        const shortIntradaySeries: SparklinePoint[] = [
            { timestamp: now - (10 * 60 * 1000), value: 100 },
            { timestamp: now, value: 105 },
        ];

        expect(buildHistoricalSnapshot(shortIntradaySeries, '1D', { requireFullCoverage: true })).toBeNull();
    });

    it('maps AR edge-function response to stock detail payload', () => {
        const lastUpdatedAt = '2026-03-01T12:30:00.000Z';
        const result = mapEdgeFunctionStockToDetail({
            source: 'cache_fallback',
            stale: true,
            lastUpdatedAt,
            stocks: [
                {
                    id: 'GGAL',
                    ticker: 'GGAL',
                    market: 'AR',
                    price: 4200,
                    percentChange: 3.25,
                    sparkline: [
                        { timestamp: Date.now() - 3600000, value: 4000 },
                        { timestamp: Date.now(), value: 4200 },
                    ],
                },
            ],
        }, 'GGAL', '1H');

        expect(result).not.toBeNull();
        expect(result?.ticker).toBe('GGAL');
        expect(result?.market).toBe('AR');
        expect(result?.source).toBe('CACHE');
        expect(result?.stale).toBe(true);
        expect(result?.lastUpdatedAt).toBe(lastUpdatedAt);
        expect(result?.series.length).toBeGreaterThan(0);
    });

    it('defaults stale flag to false when edge payload omits it', () => {
        const result = mapEdgeFunctionStockToDetail({
            source: 'live',
            stocks: [
                {
                    id: 'PAMP',
                    ticker: 'PAMP',
                    market: 'AR',
                    price: 3000,
                    percentChange: 1.1,
                    sparkline: [
                        { timestamp: Date.now() - 3600000, value: 2950 },
                        { timestamp: Date.now(), value: 3000 },
                    ],
                },
            ],
        }, 'PAMP', '1H');

        expect(result).not.toBeNull();
        expect(result?.source).toBe('LIVE');
        expect(result?.stale).toBe(false);
    });
});
