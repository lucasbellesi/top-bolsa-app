import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const missingSupabaseEnv = [
    ['EXPO_PUBLIC_SUPABASE_URL', supabaseUrl],
    ['EXPO_PUBLIC_SUPABASE_ANON_KEY', supabaseAnonKey],
].filter(([, value]) => !value).map(([envName]) => envName);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export interface SupabaseConfigStatus {
    mode: 'configured' | 'degraded';
    isConfigured: boolean;
    missingEnv: string[];
    message: string;
}

export const supabaseConfigStatus: SupabaseConfigStatus = isSupabaseConfigured
    ? {
        mode: 'configured',
        isConfigured: true,
        missingEnv: [],
        message: 'Supabase is configured.',
    }
    : {
        mode: 'degraded',
        isConfigured: false,
        missingEnv: missingSupabaseEnv,
        message: `Supabase is not configured. Missing env vars: ${missingSupabaseEnv.join(', ') || 'unknown'}. App will run with degraded data sources.`,
    };

if (!isSupabaseConfigured) {
    console.warn('[SUPABASE_DEGRADED_MODE]', supabaseConfigStatus.message);
}

export const supabase: SupabaseClient | null = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const getSupabaseConfigStatus = (): SupabaseConfigStatus => ({
    ...supabaseConfigStatus,
    missingEnv: [...supabaseConfigStatus.missingEnv],
});
