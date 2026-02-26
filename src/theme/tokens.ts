export type ResolvedThemeMode = 'light' | 'dark';

export interface ThemeSpacing {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
}

export interface ThemeRadii {
    sm: number;
    md: number;
    lg: number;
    xl: number;
}

export interface ThemeTokens {
    bgPrimary: string;
    bgSurface: string;
    bgElevated: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    accent: string;
    positive: string;
    negative: string;
    warning: string;
    borderSubtle: string;
    spacing: ThemeSpacing;
    radii: ThemeRadii;
}

const spacing: ThemeSpacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
};

const radii: ThemeRadii = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
};

const darkTokens: ThemeTokens = {
    bgPrimary: '#000000',
    bgSurface: '#0f1115',
    bgElevated: '#171a21',
    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    accent: '#14b8a6',
    positive: '#10b981',
    negative: '#ef4444',
    warning: '#f59e0b',
    borderSubtle: '#1f2937',
    spacing,
    radii,
};

const lightTokens: ThemeTokens = {
    bgPrimary: '#f8fafc',
    bgSurface: '#ffffff',
    bgElevated: '#f1f5f9',
    textPrimary: '#0f172a',
    textSecondary: '#334155',
    textMuted: '#64748b',
    accent: '#0d9488',
    positive: '#059669',
    negative: '#dc2626',
    warning: '#b45309',
    borderSubtle: '#e2e8f0',
    spacing,
    radii,
};

export const getThemeTokens = (mode: ResolvedThemeMode): ThemeTokens =>
    mode === 'dark' ? darkTokens : lightTokens;
