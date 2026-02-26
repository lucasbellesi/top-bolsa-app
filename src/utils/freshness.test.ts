import { describe, expect, it } from 'vitest';
import { getFreshnessLabel, getSourceHint, mapSourceToFreshness } from './freshness';

describe('freshness utils', () => {
    it('maps LIVE to fresh when not stale', () => {
        expect(mapSourceToFreshness('LIVE', false)).toBe('fresh');
    });

    it('maps CACHE or stale to stale', () => {
        expect(mapSourceToFreshness('CACHE', false)).toBe('stale');
        expect(mapSourceToFreshness('LIVE', true)).toBe('stale');
    });

    it('maps unavailable sources to delayed', () => {
        expect(mapSourceToFreshness('UNAVAILABLE')).toBe('delayed');
        expect(mapSourceToFreshness('MOCK')).toBe('delayed');
    });

    it('returns human-readable labels and hints', () => {
        expect(getFreshnessLabel('fresh')).toBe('Fresh');
        expect(getFreshnessLabel('stale')).toBe('Cached');
        expect(getSourceHint('CACHE')).toBe('');
    });
});
