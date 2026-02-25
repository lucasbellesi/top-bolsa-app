import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { StockDetailScreen } from '../screens/StockDetailScreen';
import { RootStackParamList } from './types';
import { useAppTheme } from '../theme/ThemeContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
    const { isDark } = useAppTheme();

    return (
        <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
                headerStyle: { backgroundColor: isDark ? '#000000' : '#ffffff' },
                headerTintColor: isDark ? '#ffffff' : '#0f172a',
                headerTitleStyle: { color: isDark ? '#ffffff' : '#0f172a' },
                contentStyle: { backgroundColor: isDark ? '#000000' : '#f8fafc' },
            }}
        >
            <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="StockDetail"
                component={StockDetailScreen}
                options={({ route }) => ({
                    title: route.params.ticker,
                    headerBackTitle: 'Back',
                })}
            />
        </Stack.Navigator>
    );
};
