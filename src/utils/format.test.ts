import { describe, expect, it } from 'vitest';
import { formatCurrencyValue, formatMarketCap, formatPercent } from './format';

describe('format utils', () => {
    it('formats ARS and USD values consistently', () => {
        expect(formatCurrencyValue(1234.5, 'ARS')).toContain('$');
        expect(formatCurrencyValue(1234.5, 'USD')).toContain('$');
    });

    it('formats percent with explicit sign', () => {
        expect(formatPercent(2.349)).toBe('+2.35%');
        expect(formatPercent(-2.349)).toBe('-2.35%');
        expect(formatPercent(0)).toBe('0.00%');
    });

    it('formats market cap with currency prefix and suffix', () => {
        expect(formatMarketCap(1_250_000_000, 'USD')).toContain('US$');
        expect(formatMarketCap(1_250_000_000, 'USD')).toContain('B');
        expect(formatMarketCap(520_000_000, 'ARS')).toContain('$');
        expect(formatMarketCap(520_000_000, 'ARS')).toContain('M');
    });
});
