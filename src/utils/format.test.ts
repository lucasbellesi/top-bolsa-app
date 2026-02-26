import { describe, expect, it } from 'vitest';
import { formatCurrencyValue, formatPercent } from './format';

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
});
