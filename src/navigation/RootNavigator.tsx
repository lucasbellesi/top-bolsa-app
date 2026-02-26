import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { StockDetailScreen } from '../screens/StockDetailScreen';
import { RootStackParamList } from './types';
import { useAppTheme } from '../theme/ThemeContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
    const { tokens } = useAppTheme();

    return (
        <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
                headerStyle: { backgroundColor: tokens.bgSurface },
                headerTintColor: tokens.textPrimary,
                headerTitleStyle: { color: tokens.textPrimary },
                contentStyle: { backgroundColor: tokens.bgPrimary },
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
