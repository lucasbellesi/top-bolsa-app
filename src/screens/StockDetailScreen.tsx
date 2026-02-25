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

type Props = NativeStackScreenProps<RootStackParamList, 'StockDetail'>;

const sourceBadgeClasses: Record<DataSourceType, string> = {
    LIVE: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
    CACHE: 'bg-amber-500/20 border-amber-500/40 text-amber-400',
    MOCK: 'bg-neutral-600/20 border-neutral-500/40 text-neutral-300',
    UNAVAILABLE: 'bg-rose-500/20 border-rose-500/40 text-rose-400',
};

export const StockDetailScreen = ({ route }: Props) => {
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
            <SafeAreaView className="flex-1 bg-black justify-center items-center">
                <ActivityIndicator size="large" color="#10b981" />
            </SafeAreaView>
        );
    }

    if (isError || !displayData) {
        return (
            <SafeAreaView className="flex-1 bg-black">
                <StatusBar barStyle="light-content" backgroundColor="#000" />
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
        <SafeAreaView className="flex-1 bg-black">
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            <View className="px-4 pt-4 pb-2">
                <Text className="text-white text-3xl font-extrabold tracking-tight">{displayData.ticker}</Text>
                <Text className="text-neutral-400 mt-1">Market: {displayData.market}</Text>
                <Text className="text-neutral-500 mt-1 text-xs">Last update: {lastUpdatedText}</Text>
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
                    <Text className="text-neutral-500 mt-2 text-xs">
                        FX USD/ARS: {usdToArsRate.toFixed(2)}
                    </Text>
                ) : null}
            </View>

            <DetailRangeFilters activeRange={range} onSelect={setRange} />

            <View className="mx-4 p-4 bg-neutral-900 rounded-2xl border border-neutral-800">
                <Text className="text-neutral-400 text-sm">Current price</Text>
                <Text className="text-white text-3xl font-bold mt-2">{formattedPrice}</Text>
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

            <View className="mx-4 mt-4 p-4 bg-neutral-900 rounded-2xl border border-neutral-800">
                {displayData.series.length > 0 ? (
                    <LineChart.Provider data={displayData.series}>
                        <LineChart height={240} width={chartWidth}>
                            <LineChart.Path color={chartColor} width={2} />
                        </LineChart>
                    </LineChart.Provider>
                ) : (
                    <View className="py-20 items-center">
                        <Text className="text-neutral-400">No chart data available.</Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
};
