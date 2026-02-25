import { describe, expect, it, vi } from 'vitest';
import { SparklinePoint } from '../types';

vi.mock('./supabase', () => ({
    supabase: null,
}));

import { computePercentChangeFromSeries, mapEdgeFunctionStockToDetail, sliceSeriesByDetailRange } from './stockDetail';

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

    it('maps AR edge-function response to stock detail payload', () => {
        const result = mapEdgeFunctionStockToDetail({
            source: 'cache_fallback',
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
        expect(result?.series.length).toBeGreaterThan(0);
    });
});
