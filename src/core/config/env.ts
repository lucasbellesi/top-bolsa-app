export interface AppConfig {
    stockApiKey: string;
    allowMockFallback: boolean;
    supabaseUrl: string;
    supabaseAnonKey: string;
}

const getEnvValue = (envName: string): string => process.env[envName] || '';

export const appConfig: AppConfig = {
    stockApiKey: getEnvValue('EXPO_PUBLIC_STOCK_API_KEY') || 'demo',
    allowMockFallback: getEnvValue('EXPO_PUBLIC_ALLOW_MOCK_FALLBACK') === 'true',
    supabaseUrl: getEnvValue('EXPO_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey: getEnvValue('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
};

export const isRuntimeDev = (): boolean =>
    typeof globalThis !== 'undefined' &&
    '__DEV__' in globalThis &&
    Boolean((globalThis as Record<string, unknown>).__DEV__);
