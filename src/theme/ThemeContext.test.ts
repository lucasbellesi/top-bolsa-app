import { describe, expect, it } from 'vitest';
import { resolveThemeMode } from './resolveThemeMode';

describe('resolveThemeMode', () => {
    it('maps dark system scheme to dark mode', () => {
        expect(resolveThemeMode('dark')).toBe('dark');
    });

    it('maps light system scheme to light mode', () => {
        expect(resolveThemeMode('light')).toBe('light');
    });

    it('falls back to light when system scheme is not available', () => {
        expect(resolveThemeMode(null)).toBe('light');
        expect(resolveThemeMode(undefined)).toBe('light');
    });
});
