import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { StockDetailScreen } from '../screens/StockDetailScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
    return (
        <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
                headerStyle: { backgroundColor: '#000000' },
                headerTintColor: '#ffffff',
                contentStyle: { backgroundColor: '#000000' },
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
