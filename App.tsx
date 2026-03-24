import './global.css';
import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DefaultTheme, DarkTheme, NavigationContainer } from '@react-navigation/native';
import { Platform, UIManager } from 'react-native';
import { RootNavigator } from '@core/navigation';
import { ThemeProvider, useAppTheme } from '@core/theme';
import { WatchlistProvider } from '@features/watchlist/WatchlistContext';

const queryClient = new QueryClient();

const AppNavigation = () => {
    const { isDark, tokens } = useAppTheme();

    useEffect(() => {
        if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
            UIManager.setLayoutAnimationEnabledExperimental(true);
        }
    }, []);

    const baseTheme = isDark ? DarkTheme : DefaultTheme;
    const appNavigationTheme = {
        ...baseTheme,
        colors: {
            ...baseTheme.colors,
            background: tokens.bgPrimary,
            card: tokens.bgSurface,
            text: tokens.textPrimary,
            border: tokens.borderSubtle,
            primary: tokens.accent,
        },
    };

    return (
        <NavigationContainer theme={appNavigationTheme}>
            <RootNavigator />
        </NavigationContainer>
    );
};

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <WatchlistProvider>
                    <AppNavigation />
                </WatchlistProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
}
