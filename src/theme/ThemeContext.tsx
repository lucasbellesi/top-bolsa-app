import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { getThemeTokens, ResolvedThemeMode, ThemeTokens } from './tokens';
import { resolveThemeMode } from './resolveThemeMode';

interface ThemeContextValue {
    resolvedMode: ResolvedThemeMode;
    isDark: boolean;
    tokens: ThemeTokens;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const systemColorScheme = useColorScheme();
    const resolvedMode = resolveThemeMode(systemColorScheme);

    const value = useMemo<ThemeContextValue>(() => ({
        resolvedMode,
        isDark: resolvedMode === 'dark',
        tokens: getThemeTokens(resolvedMode),
    }), [resolvedMode]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useAppTheme = (): ThemeContextValue => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useAppTheme must be used inside ThemeProvider');
    }

    return context;
};
