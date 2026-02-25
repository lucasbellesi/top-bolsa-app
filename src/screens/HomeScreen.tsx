import React, { useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStockRanking } from '../hooks/useStockRanking';
import { MarketType, TimeframeType } from '../types';
import { MarketTabs } from '../components/MarketTabs';
import { TimeFilters } from '../components/TimeFilters';
import { StockListItem } from '../components/StockListItem';

export const HomeScreen = () => {
    const [market, setMarket] = useState<MarketType>('AR');
    const [timeframe, setTimeframe] = useState<TimeframeType>('1D');

    const { data: stocks, isLoading, isError, refetch } = useStockRanking(market, timeframe);

    return (
        <SafeAreaView className="flex-1 bg-black">
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            <View className="px-4 py-6">
                <Text className="text-white text-3xl font-extrabold tracking-tight">Top Gainers</Text>
                <Text className="text-neutral-400 mt-1">Real-time market leaders</Text>
            </View>

            <MarketTabs activeMarket={market} onSelect={setMarket} />
            <TimeFilters activeTimeframe={timeframe} onSelect={setTimeframe} />

            {isLoading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#10b981" />
                </View>
            ) : isError ? (
                <View className="flex-1 justify-center items-center">
                    <Text className="text-red-500 font-bold mb-4">Failed to load data.</Text>
                    <TouchableOpacity onPress={() => refetch()}>
                        <Text className="text-emerald-500 font-semibold">Tap to retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={stocks}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => <StockListItem stock={item} index={index} />}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    // Ensure fast layout and no shifts:
                    initialNumToRender={10}
                    windowSize={5}
                />
            )}
        </SafeAreaView>
    );
};
