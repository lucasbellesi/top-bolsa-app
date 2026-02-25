import React, { useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStockRanking } from '../hooks/useStockRanking';
import { DataSourceType, MarketType, TimeframeType } from '../types';
import { MarketTabs } from '../components/MarketTabs';
import { TimeFilters } from '../components/TimeFilters';
import { StockListItem } from '../components/StockListItem';

export const HomeScreen = () => {
    const [market, setMarket] = useState<MarketType>('AR');
    const [timeframe, setTimeframe] = useState<TimeframeType>('1D');

    const { data: rankingData, isLoading, isError, refetch } = useStockRanking(market, timeframe);
    const stocks = rankingData?.stocks ?? [];
    const source = rankingData?.source;

    const sourceBadgeClasses: Record<DataSourceType, string> = {
        LIVE: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
        CACHE: 'bg-amber-500/20 border-amber-500/40 text-amber-400',
        MOCK: 'bg-neutral-600/20 border-neutral-500/40 text-neutral-300',
    };

    return (
        <SafeAreaView className="flex-1 bg-black">
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            <View className="px-4 pt-6 pb-4">
                <Text className="text-white text-3xl font-extrabold tracking-tight">Top Gainers</Text>
                <Text className="text-neutral-400 mt-1">Real-time market leaders</Text>
                {source ? (
                    <View className="mt-3 self-start">
                        <Text className={`text-xs font-bold px-2 py-1 rounded-md border ${sourceBadgeClasses[source]}`}>
                            {source}
                        </Text>
                    </View>
                ) : null}
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
