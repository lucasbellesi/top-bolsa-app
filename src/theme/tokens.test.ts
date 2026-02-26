import { describe, expect, it } from 'vitest';
import { getThemeTokens } from './tokens';

describe('theme tokens', () => {
    it('returns dark palette tokens', () => {
        const tokens = getThemeTokens('dark');

        expect(tokens.bgPrimary).toBe('#000000');
        expect(tokens.textPrimary).toBe('#f8fafc');
        expect(tokens.spacing.lg).toBe(16);
        expect(tokens.radii.xl).toBe(20);
    });

    it('returns light palette tokens', () => {
        const tokens = getThemeTokens('light');

        expect(tokens.bgPrimary).toBe('#f8fafc');
        expect(tokens.textPrimary).toBe('#0f172a');
        expect(tokens.spacing.sm).toBe(8);
        expect(tokens.radii.md).toBe(12);
    });
});
