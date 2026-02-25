import "./global.css";
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DefaultTheme, DarkTheme, NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemeProvider, useAppTheme } from './src/theme/ThemeContext';

const queryClient = new QueryClient();

const AppNavigation = () => {
  const { isDark } = useAppTheme();
  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const appNavigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: isDark ? '#000000' : '#f8fafc',
      card: isDark ? '#000000' : '#ffffff',
      text: isDark ? '#ffffff' : '#0f172a',
      border: isDark ? '#171717' : '#e2e8f0',
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
        <AppNavigation />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
