import { describe, expect, it } from 'vitest';
import { convertValue, getConversionFactor, getNativeCurrencyForMarket } from './currency';

describe('currency utils', () => {
    it('returns native currency for each market', () => {
        expect(getNativeCurrencyForMarket('US')).toBe('USD');
        expect(getNativeCurrencyForMarket('AR')).toBe('ARS');
    });

    it('returns identity factor when selected currency matches native market currency', () => {
        expect(getConversionFactor('US', 'USD', 1200)).toBe(1);
        expect(getConversionFactor('AR', 'ARS', 1200)).toBe(1);
    });

    it('converts US values to ARS using usdToArs rate', () => {
        expect(getConversionFactor('US', 'ARS', 1200)).toBe(1200);
    });

    it('converts AR values to USD using inverse usdToArs rate', () => {
        expect(getConversionFactor('AR', 'USD', 1000)).toBe(0.001);
    });

    it('returns null when conversion is needed but rate is missing', () => {
        expect(getConversionFactor('US', 'ARS', null)).toBeNull();
        expect(getConversionFactor('AR', 'USD', 0)).toBeNull();
    });

    it('multiplies values with the provided factor', () => {
        expect(convertValue(10, 2.5)).toBe(25);
    });
});
