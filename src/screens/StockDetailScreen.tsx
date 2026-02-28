import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    AccessibilityInfo,
    Dimensions,
    Pressable,
    StatusBar,
    Text,
    View,
} from 'react-native';
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
import { useAppTheme } from '../theme/ThemeContext';
import { formatClockTime, formatCurrencyValue, formatPercent, formatRelativeTime } from '../utils/format';
import { appTypography } from '../theme/typography';
import { getSourceHint, mapSourceToFreshness } from '../utils/freshness';
import { StockDetailSkeleton } from '../components/StockDetailSkeleton';
import { useCompanyProfile } from '../hooks/useCompanyProfile';
import { CompanyProfileCard } from '../components/CompanyProfileCard';

type Props = NativeStackScreenProps<RootStackParamList, 'StockDetail'>;

export const StockDetailScreen = ({ route }: Props) => {
    const { isDark, tokens } = useAppTheme();
    const { ticker, market, currency, initialRange, companyName: initialCompanyName } = route.params;
    const [range, setRange] = useState<DetailRangeType>(initialRange);

    const nativeCurrency = getNativeCurrencyForMarket(market);
    const needsFxConversion = currency !== nativeCurrency;
    const { data: usdToArsRate, isLoading: isFxLoading } = useUsdArsRate(needsFxConversion);
    const conversionFactor = getConversionFactor(market, currency, usdToArsRate ?? null);
    const effectiveCurrency: CurrencyType = conversionFactor === null ? nativeCurrency : currency;
    const showFxUnavailableWarning = needsFxConversion && !isFxLoading && conversionFactor === null;

    const {
        data,
        isLoading,
        isError,
        isFetching,
        refetch,
        dataUpdatedAt,
    } = useStockDetail(ticker, market, range, currency);
    const {
        data: companyProfile,
        isLoading: isProfileLoading,
        isError: isProfileError,
    } = useCompanyProfile(ticker, market, initialCompanyName);

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

    const source = displayData?.source ?? 'UNAVAILABLE';
    const freshness = mapSourceToFreshness(source, source === 'CACHE');
    const sourceHint = getSourceHint(source, source === 'CACHE');

    const sourceBadgeStyle: Record<DataSourceType, { bg: string; border: string; text: string }> = {
        LIVE: { bg: `${tokens.positive}26`, border: `${tokens.positive}66`, text: tokens.positive },
        CACHE: { bg: `${tokens.warning}26`, border: `${tokens.warning}66`, text: tokens.warning },
        MOCK: { bg: `${tokens.textMuted}26`, border: `${tokens.textMuted}66`, text: tokens.textSecondary },
        UNAVAILABLE: { bg: `${tokens.negative}26`, border: `${tokens.negative}66`, text: tokens.negative },
    };

    const chartWidth = Math.max(280, Dimensions.get('window').width - 48);

    if (isLoadingWithFx && !displayData) {
        return (
            <SafeAreaView className="flex-1" style={{ backgroundColor: tokens.bgPrimary }}>
                <StockDetailSkeleton />
            </SafeAreaView>
        );
    }

    if (isError || !displayData) {
        return (
            <SafeAreaView className="flex-1" style={{ backgroundColor: tokens.bgPrimary }}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={tokens.bgPrimary} />
                <View className="flex-1 justify-center items-center px-8">
                    <Text className="font-bold mb-3 text-center" style={{ color: tokens.negative }}>
                        Failed to load stock details for {range}.
                    </Text>
                    <Pressable onPress={() => refetch()} hitSlop={8}>
                        <Text className="font-semibold" style={{ color: tokens.accent }}>Tap to retry</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    const isPositive = displayData.percentChange >= 0;
    const chartColor = isPositive ? tokens.positive : tokens.negative;
    const formattedPrice = formatCurrencyValue(displayData.price, effectiveCurrency);
    const formattedPercent = formatPercent(displayData.percentChange);
    const displayCompanyName = companyProfile?.companyName || initialCompanyName || displayData.ticker;

    const series = displayData.series;
    const firstValue = series[0]?.value ?? displayData.price;
    const absoluteChange = displayData.price - firstValue;
    const formattedAbsoluteChange = `${absoluteChange >= 0 ? '+' : '-'}${formatCurrencyValue(
        Math.abs(absoluteChange),
        effectiveCurrency
    )}`;

    const minValue = series.length ? Math.min(...series.map((point) => point.value)) : displayData.price;
    const maxValue = series.length ? Math.max(...series.map((point) => point.value)) : displayData.price;
    const startValue = series[0]?.value ?? displayData.price;
    const endValue = series[series.length - 1]?.value ?? displayData.price;

    const updateTimestamp = dataUpdatedAt || new Date(displayData.lastUpdatedAt).getTime();
    const handleRangeSelect = (nextRange: DetailRangeType) => {
        setRange(nextRange);
        AccessibilityInfo.announceForAccessibility(`Detail range set to ${nextRange}`);
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: tokens.bgPrimary }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={tokens.bgPrimary} />

            <View className="px-4 pt-4 pb-2">
                <Text className="text-4xl font-extrabold tracking-tight" style={[appTypography.heading, { color: tokens.textPrimary }]}>
                    {displayData.ticker}
                </Text>
                <Text
                    className="mt-1 text-lg font-semibold"
                    style={{ color: tokens.textSecondary }}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                >
                    {displayCompanyName}
                </Text>
                <Text className="mt-1 text-base" style={{ color: tokens.textSecondary }}>
                    Market: {displayData.market} • {freshness}
                </Text>
                <Text className="mt-1 text-xs" style={{ color: tokens.textMuted }}>
                    Updated {formatRelativeTime(updateTimestamp)} ({formatClockTime(updateTimestamp)})
                </Text>

                <View className="mt-3 flex-row items-center flex-wrap gap-2">
                    <View
                        className="self-start px-2 py-1 rounded-md border"
                        style={{
                            backgroundColor: sourceBadgeStyle[displayData.source].bg,
                            borderColor: sourceBadgeStyle[displayData.source].border,
                        }}
                    >
                        <Text className="text-xs font-bold" style={{ color: sourceBadgeStyle[displayData.source].text }}>
                            {displayData.source}
                        </Text>
                    </View>
                    {isFetching ? (
                        <View className="flex-row items-center">
                            <ActivityIndicator size="small" color={tokens.accent} />
                            <Text className="ml-1 text-xs font-medium" style={{ color: tokens.accent }}>
                                Updating...
                            </Text>
                        </View>
                    ) : null}
                </View>
                {sourceHint ? (
                    <Text className="mt-2 text-xs" style={{ color: tokens.textMuted }}>
                        {sourceHint}
                    </Text>
                ) : null}
                {showFxUnavailableWarning ? (
                    <Text className="mt-2 text-xs" style={{ color: tokens.warning }}>
                        FX unavailable. Showing {nativeCurrency} values.
                    </Text>
                ) : null}
                {needsFxConversion && conversionFactor !== null && usdToArsRate ? (
                    <Text className="mt-2 text-xs" style={{ color: tokens.textMuted }}>
                        FX USD/ARS: {usdToArsRate.toFixed(2)}
                    </Text>
                ) : null}
            </View>

            <DetailRangeFilters activeRange={range} onSelect={handleRangeSelect} />

            <View
                className="mx-4 p-4 rounded-2xl border"
                style={{ backgroundColor: tokens.bgSurface, borderColor: tokens.borderSubtle }}
            >
                <Text className="text-sm" style={{ color: tokens.textMuted }}>Current price</Text>
                <Text className="text-3xl font-bold mt-2" style={[appTypography.numbers, { color: tokens.textPrimary }]}>
                    {formattedPrice}
                </Text>

                <View className="flex-row items-center justify-between mt-3">
                    <View className="flex-row items-center px-2 py-1 rounded-md" style={{ backgroundColor: `${chartColor}24` }}>
                        {isPositive ? (
                            <TrendingUp color={chartColor} size={16} />
                        ) : (
                            <TrendingDown color={chartColor} size={16} />
                        )}
                        <Text className="ml-1 font-bold text-sm" style={[appTypography.numbers, { color: chartColor }]}>
                            {formattedPercent}
                        </Text>
                    </View>

                    <Text className="font-semibold text-sm" style={[appTypography.numbers, { color: chartColor }]}>
                        {formattedAbsoluteChange}
                    </Text>
                </View>
            </View>

            <CompanyProfileCard
                profile={companyProfile}
                isLoading={isProfileLoading}
                isError={isProfileError}
                fallbackCompanyName={displayCompanyName}
            />

            <View
                className="mx-4 mt-4 p-4 rounded-2xl border"
                style={{ backgroundColor: tokens.bgSurface, borderColor: tokens.borderSubtle }}
            >
                {series.length > 1 ? (
                    <>
                        <LineChart.Provider data={series}>
                            <LineChart height={240} width={chartWidth}>
                                <LineChart.Path color={chartColor} width={2} />
                            </LineChart>
                        </LineChart.Provider>

                        <View className="mt-4 flex-row flex-wrap">
                            <View className="w-1/2 mb-2">
                                <Text className="text-xs" style={{ color: tokens.textMuted }}>Start</Text>
                                <Text className="text-sm font-semibold" style={[appTypography.numbers, { color: tokens.textSecondary }]}>
                                    {formatCurrencyValue(startValue, effectiveCurrency)}
                                </Text>
                            </View>
                            <View className="w-1/2 mb-2 items-end">
                                <Text className="text-xs" style={{ color: tokens.textMuted }}>End</Text>
                                <Text className="text-sm font-semibold" style={[appTypography.numbers, { color: tokens.textSecondary }]}>
                                    {formatCurrencyValue(endValue, effectiveCurrency)}
                                </Text>
                            </View>
                            <View className="w-1/2">
                                <Text className="text-xs" style={{ color: tokens.textMuted }}>Min</Text>
                                <Text className="text-sm font-semibold" style={[appTypography.numbers, { color: tokens.textSecondary }]}>
                                    {formatCurrencyValue(minValue, effectiveCurrency)}
                                </Text>
                            </View>
                            <View className="w-1/2 items-end">
                                <Text className="text-xs" style={{ color: tokens.textMuted }}>Max</Text>
                                <Text className="text-sm font-semibold" style={[appTypography.numbers, { color: tokens.textSecondary }]}>
                                    {formatCurrencyValue(maxValue, effectiveCurrency)}
                                </Text>
                            </View>
                        </View>
                    </>
                ) : (
                    <View className="py-20 items-center">
                        <Text style={{ color: tokens.textSecondary }}>
                            No chart data available for {range}.
                        </Text>
                        <Pressable onPress={() => refetch()} className="mt-4" hitSlop={8}>
                            <Text className="font-semibold" style={{ color: tokens.accent }}>
                                Retry
                            </Text>
                        </Pressable>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
};
