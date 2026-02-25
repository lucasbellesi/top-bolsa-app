import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StatusBar, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStockRanking } from '../hooks/useStockRanking';
import { CurrencyType, DataSourceType, DetailRangeType, MarketType, TimeframeType } from '../types';
import { MarketTabs } from '../components/MarketTabs';
import { TimeFilters } from '../components/TimeFilters';
import { CurrencyToggle } from '../components/CurrencyToggle';
import { ThemeToggle } from '../components/ThemeToggle';
import { StockListItem } from '../components/StockListItem';
import { useUsdArsRate } from '../hooks/useUsdArsRate';
import { convertValue, getConversionFactor, getNativeCurrencyForMarket } from '../utils/currency';
import { RootStackParamList } from '../navigation/types';
import { useAppTheme } from '../theme/ThemeContext';

const mapTimeframeToDetailRange = (timeframe: TimeframeType): DetailRangeType => {
    switch (timeframe) {
        case '1H':
        case '1D':
        case '1W':
        case '1M':
        case 'YTD':
            return timeframe;
        default:
            return '1D';
    }
};

export const HomeScreen = () => {
    const { isDark } = useAppTheme();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Home'>>();
    const [market, setMarket] = useState<MarketType>('AR');
    const [timeframe, setTimeframe] = useState<TimeframeType>('1D');
    const [currency, setCurrency] = useState<CurrencyType>('ARS');

    const { data: rankingData, isLoading, isError, refetch } = useStockRanking(market, timeframe);
    const stocks = rankingData?.stocks ?? [];
    const source = rankingData?.source;
    const nativeCurrency = getNativeCurrencyForMarket(market);
    const needsFxConversion = currency !== nativeCurrency;
    const { data: usdToArsRate, isLoading: isFxLoading } = useUsdArsRate(needsFxConversion);
    const conversionFactor = getConversionFactor(market, currency, usdToArsRate ?? null);
    const effectiveCurrency: CurrencyType = conversionFactor === null ? nativeCurrency : currency;
    const isLoadingWithFx = isLoading || (needsFxConversion && isFxLoading && conversionFactor === null);
    const showFxUnavailableWarning = needsFxConversion && !isFxLoading && conversionFactor === null;

    const displayStocks = useMemo(() => {
        if (conversionFactor === null || conversionFactor === 1) {
            return stocks;
        }

        return stocks.map((stock) => ({
            ...stock,
            price: convertValue(stock.price, conversionFactor),
            sparkline: stock.sparkline.map((point) => ({
                ...point,
                value: convertValue(point.value, conversionFactor),
            })),
        }));
    }, [stocks, conversionFactor]);

    const sourceBadgeClasses: Record<DataSourceType, string> = {
        LIVE: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
        CACHE: 'bg-amber-500/20 border-amber-500/40 text-amber-400',
        MOCK: 'bg-neutral-600/20 border-neutral-500/40 text-neutral-300',
        UNAVAILABLE: 'bg-rose-500/20 border-rose-500/40 text-rose-400',
    };

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-black' : 'bg-slate-50'}`}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#000' : '#f8fafc'} />

            <View className="px-4 pt-6 pb-4">
                <Text className={`text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Top Gainers</Text>
                <Text className={`mt-1 ${isDark ? 'text-neutral-400' : 'text-slate-600'}`}>Real-time market leaders</Text>
                <Text className={`mt-1 text-xs ${isDark ? 'text-neutral-500' : 'text-slate-500'}`}>
                    Informational use only. Not investment advice.
                </Text>
                {source ? (
                    <View className="mt-3 self-start">
                        <Text className={`text-xs font-bold px-2 py-1 rounded-md border ${sourceBadgeClasses[source]}`}>
                            {source}
                        </Text>
                    </View>
                ) : null}
                {source === 'MOCK' ? (
                    <Text className={`mt-2 text-xs ${isDark ? 'text-neutral-400' : 'text-slate-600'}`}>
                        Demo mode: showing simulated prices.
                    </Text>
                ) : null}
                {showFxUnavailableWarning ? (
                    <Text className="text-amber-400 mt-2 text-xs">
                        FX unavailable. Showing {nativeCurrency} values.
                    </Text>
                ) : null}
                {needsFxConversion && conversionFactor !== null && usdToArsRate ? (
                    <Text className={`mt-2 text-xs ${isDark ? 'text-neutral-500' : 'text-slate-500'}`}>
                        FX USD/ARS: {usdToArsRate.toFixed(2)}
                    </Text>
                ) : null}
            </View>

            <MarketTabs activeMarket={market} onSelect={setMarket} />
            <ThemeToggle />
            <TimeFilters activeTimeframe={timeframe} onSelect={setTimeframe} />
            <CurrencyToggle activeCurrency={currency} onSelect={setCurrency} />

            {isLoadingWithFx ? (
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
                displayStocks.length === 0 ? (
                    <View className="flex-1 justify-center items-center px-6">
                        <Text className="text-amber-400 font-semibold text-center">
                            Market data temporarily unavailable.
                        </Text>
                        <Text className={`mt-2 text-center ${isDark ? 'text-neutral-400' : 'text-slate-600'}`}>
                            Try again in a few minutes.
                        </Text>
                        <TouchableOpacity onPress={() => refetch()} className="mt-4">
                            <Text className="text-emerald-500 font-semibold">Retry now</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={displayStocks}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item, index }) => (
                            <StockListItem
                                stock={item}
                                index={index}
                                currency={effectiveCurrency}
                                onPress={() =>
                                    navigation.navigate('StockDetail', {
                                        ticker: item.ticker,
                                        market: item.market,
                                        currency: effectiveCurrency,
                                        initialRange: mapTimeframeToDetailRange(timeframe),
                                        source,
                                    })
                                }
                            />
                        )}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        // Ensure fast layout and no shifts:
                        initialNumToRender={10}
                        windowSize={5}
                    />
                )
            )}
        </SafeAreaView>
    );
};
