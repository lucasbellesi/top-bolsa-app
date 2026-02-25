import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-wagmi-charts';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TrendingDown, TrendingUp } from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { CurrencyType, DataSourceType, DetailRangeType } from '../types';
import { useStockDetail } from '../hooks/useStockDetail';
import { useUsdArsRate } from '../hooks/useUsdArsRate';
import { convertValue, getConversionFactor, getNativeCurrencyForMarket } from '../utils/currency';
import { DetailRangeFilters } from '../components/DetailRangeFilters';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAppTheme } from '../theme/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'StockDetail'>;

const sourceBadgeClasses: Record<DataSourceType, string> = {
    LIVE: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
    CACHE: 'bg-amber-500/20 border-amber-500/40 text-amber-400',
    MOCK: 'bg-neutral-600/20 border-neutral-500/40 text-neutral-300',
    UNAVAILABLE: 'bg-rose-500/20 border-rose-500/40 text-rose-400',
};

export const StockDetailScreen = ({ route }: Props) => {
    const { isDark } = useAppTheme();
    const { ticker, market, currency, initialRange } = route.params;
    const [range, setRange] = useState<DetailRangeType>(initialRange);

    const nativeCurrency = getNativeCurrencyForMarket(market);
    const needsFxConversion = currency !== nativeCurrency;
    const { data: usdToArsRate, isLoading: isFxLoading } = useUsdArsRate(needsFxConversion);
    const conversionFactor = getConversionFactor(market, currency, usdToArsRate ?? null);
    const effectiveCurrency: CurrencyType = conversionFactor === null ? nativeCurrency : currency;
    const showFxUnavailableWarning = needsFxConversion && !isFxLoading && conversionFactor === null;

    const { data, isLoading, isError, refetch } = useStockDetail(ticker, market, range, currency);
    const isLoadingWithFx = isLoading || (needsFxConversion && isFxLoading && conversionFactor === null);

    const displayData = useMemo(() => {
        if (!data) {
            return null;
        }

        if (conversionFactor === null || conversionFactor === 1) {
            return data;
        }

        return {
            ...data,
            price: convertValue(data.price, conversionFactor),
            series: data.series.map((point) => ({
                ...point,
                value: convertValue(point.value, conversionFactor),
            })),
        };
    }, [data, conversionFactor]);

    if (isLoadingWithFx) {
        return (
            <SafeAreaView className={`flex-1 justify-center items-center ${isDark ? 'bg-black' : 'bg-slate-50'}`}>
                <ActivityIndicator size="large" color="#10b981" />
            </SafeAreaView>
        );
    }

    if (isError || !displayData) {
        return (
            <SafeAreaView className={`flex-1 ${isDark ? 'bg-black' : 'bg-slate-50'}`}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#000' : '#f8fafc'} />
                <View className="flex-1 justify-center items-center px-8">
                    <Text className="text-red-500 font-bold mb-4 text-center">
                        Failed to load stock details.
                    </Text>
                    <TouchableOpacity onPress={() => refetch()}>
                        <Text className="text-emerald-500 font-semibold">Tap to retry</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const isPositive = displayData.percentChange >= 0;
    const chartColor = isPositive ? '#10b981' : '#ef4444';
    const formattedPrice = new Intl.NumberFormat(effectiveCurrency === 'ARS' ? 'es-AR' : 'en-US', {
        style: 'currency',
        currency: effectiveCurrency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(displayData.price);

    const chartWidth = Math.max(280, Dimensions.get('window').width - 48);
    const lastUpdatedText = new Date(displayData.lastUpdatedAt).toLocaleString();

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-black' : 'bg-slate-50'}`}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#000' : '#f8fafc'} />

            <View className="px-4 pt-4 pb-2">
                <Text className={`text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{displayData.ticker}</Text>
                <Text className={`mt-1 ${isDark ? 'text-neutral-400' : 'text-slate-600'}`}>Market: {displayData.market}</Text>
                <Text className={`mt-1 text-xs ${isDark ? 'text-neutral-500' : 'text-slate-500'}`}>Last update: {lastUpdatedText}</Text>
                <View className="mt-3 self-start">
                    <Text className={`text-xs font-bold px-2 py-1 rounded-md border ${sourceBadgeClasses[displayData.source]}`}>
                        {displayData.source}
                    </Text>
                </View>
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

            <ThemeToggle />
            <DetailRangeFilters activeRange={range} onSelect={setRange} />

            <View className={`mx-4 p-4 rounded-2xl border ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'}`}>
                <Text className={`text-sm ${isDark ? 'text-neutral-400' : 'text-slate-600'}`}>Current price</Text>
                <Text className={`text-3xl font-bold mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{formattedPrice}</Text>
                <View className={`self-start flex-row items-center mt-3 px-2 py-1 rounded-md ${isPositive ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                    {isPositive ? (
                        <TrendingUp color="#10b981" size={16} />
                    ) : (
                        <TrendingDown color="#ef4444" size={16} />
                    )}
                    <Text className={`ml-1 font-bold text-sm ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                        {Math.abs(displayData.percentChange).toFixed(2)}%
                    </Text>
                </View>
            </View>

            <View className={`mx-4 mt-4 p-4 rounded-2xl border ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'}`}>
                {displayData.series.length > 0 ? (
                    <LineChart.Provider data={displayData.series}>
                        <LineChart height={240} width={chartWidth}>
                            <LineChart.Path color={chartColor} width={2} />
                        </LineChart>
                    </LineChart.Provider>
                ) : (
                    <View className="py-20 items-center">
                        <Text className={isDark ? 'text-neutral-400' : 'text-slate-600'}>No chart data available.</Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
};
