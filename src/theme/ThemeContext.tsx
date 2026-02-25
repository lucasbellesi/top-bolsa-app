import React, { createContext, useContext, useMemo, useState } from 'react';

export type ThemeMode = 'dark' | 'light';

interface ThemeContextValue {
    mode: ThemeMode;
    isDark: boolean;
    setMode: (mode: ThemeMode) => void;
    toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [mode, setMode] = useState<ThemeMode>('dark');

    const value = useMemo<ThemeContextValue>(() => ({
        mode,
        isDark: mode === 'dark',
        setMode,
        toggleMode: () => setMode((prev) => (prev === 'dark' ? 'light' : 'dark')),
    }), [mode]);

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
