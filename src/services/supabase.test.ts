import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native-url-polyfill/auto', () => ({}));

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({ mocked: true })),
}));

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
    vi.resetModules();
});

describe('supabase config diagnostics', () => {
    it('reports degraded mode and missing env vars when config is absent', async () => {
        delete process.env.EXPO_PUBLIC_SUPABASE_URL;
        delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const module = await import('./supabase');

        expect(module.isSupabaseConfigured).toBe(false);
        expect(module.supabase).toBeNull();
        expect(module.supabaseConfigStatus.mode).toBe('degraded');
        expect(module.supabaseConfigStatus.missingEnv).toEqual([
            'EXPO_PUBLIC_SUPABASE_URL',
            'EXPO_PUBLIC_SUPABASE_ANON_KEY',
        ]);
        expect(module.getSupabaseConfigStatus().message).toContain('degraded data sources');
        expect(warnSpy).toHaveBeenCalledWith(
            '[SUPABASE_DEGRADED_MODE]',
            expect.stringContaining('Missing env vars:'),
        );
    });

    it('reports configured mode and creates supabase client when env is present', async () => {
        process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

        const module = await import('./supabase');
        const sdk = await import('@supabase/supabase-js');

        expect(module.isSupabaseConfigured).toBe(true);
        expect(module.supabase).toEqual({ mocked: true });
        expect(module.supabaseConfigStatus.mode).toBe('configured');
        expect(module.supabaseConfigStatus.missingEnv).toEqual([]);
        expect(sdk.createClient).toHaveBeenCalledWith('https://example.supabase.co', 'anon-key');
    });
});
