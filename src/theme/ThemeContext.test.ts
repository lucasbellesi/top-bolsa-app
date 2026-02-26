import { describe, expect, it } from 'vitest';
import { resolveThemeMode } from './resolveThemeMode';

describe('resolveThemeMode', () => {
    it('returns explicit mode when mode is dark or light', () => {
        expect(resolveThemeMode('dark', 'light')).toBe('dark');
        expect(resolveThemeMode('light', 'dark')).toBe('light');
    });

    it('maps system mode to current system scheme', () => {
        expect(resolveThemeMode('system', 'dark')).toBe('dark');
        expect(resolveThemeMode('system', 'light')).toBe('light');
    });

    it('falls back to light when system scheme is not available', () => {
        expect(resolveThemeMode('system', null)).toBe('light');
    });
});
