import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { getThemeTokens, ResolvedThemeMode, ThemeTokens } from './tokens';
import { PersistedThemeMode, resolveThemeMode } from './resolveThemeMode';
import { ThemeMode } from './ThemeMode';

const THEME_STORAGE_KEY = '@app/theme_mode';

const isValidThemeMode = (value: string): value is ThemeMode =>
    value === 'dark' || value === 'light';

interface ThemeContextValue {
    mode: ThemeMode;
    resolvedMode: ResolvedThemeMode;
    isDark: boolean;
    tokens: ThemeTokens;
    setMode: (mode: ThemeMode) => void;
    toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [mode, setModeState] = useState<ThemeMode>('dark');
    const systemColorScheme = useColorScheme();
    const resolvedMode = mode;

    useEffect(() => {
        let isMounted = true;

        const restoreTheme = async () => {
            try {
                const storedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                if (!isMounted || !storedMode) {
                    return;
                }

                if (isValidThemeMode(storedMode)) {
                    setModeState(storedMode);
                    return;
                }

                if (storedMode === 'system') {
                    const migratedMode = resolveThemeMode(storedMode as PersistedThemeMode, systemColorScheme);
                    setModeState(migratedMode);
                    await AsyncStorage.setItem(THEME_STORAGE_KEY, migratedMode);
                }
            } catch {
                // Ignore storage errors and keep default mode.
            }
        };

        restoreTheme();

        return () => {
            isMounted = false;
        };
    }, [systemColorScheme]);

    const setMode = useCallback((nextMode: ThemeMode) => {
        setModeState(nextMode);
        AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode).catch(() => {
            // Ignore storage errors and keep in-memory preference.
        });
    }, []);

    const value = useMemo<ThemeContextValue>(() => ({
        mode,
        resolvedMode,
        isDark: resolvedMode === 'dark',
        tokens: getThemeTokens(resolvedMode),
        setMode,
        toggleMode: () => setMode(resolvedMode === 'dark' ? 'light' : 'dark'),
    }), [mode, resolvedMode, setMode]);

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
