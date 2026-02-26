import React, { useMemo, useState } from 'react';
import {
    AccessibilityInfo,
    FlatList,
    Pressable,
    StatusBar,
    Text,
    View,
} from 'react-native';
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
import { mapSourceToFreshness, getSourceHint } from '../utils/freshness';
import { formatClockTime } from '../utils/format';
import { StockListSkeleton } from '../components/StockListSkeleton';
import { appTypography } from '../theme/typography';

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
    const { tokens, isDark } = useAppTheme();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Home'>>();
    const [market, setMarket] = useState<MarketType>('AR');
    const [timeframe, setTimeframe] = useState<TimeframeType>('1D');
    const [currency, setCurrency] = useState<CurrencyType>('ARS');

    const {
        data: rankingData,
        isLoading,
        isError,
        isFetching,
        refetch,
        dataUpdatedAt,
    } = useStockRanking(market, timeframe);

    const stocks = rankingData?.stocks ?? [];
    const source: DataSourceType = rankingData?.source ?? 'UNAVAILABLE';
    const freshness = mapSourceToFreshness(source, rankingData?.stale);
    const sourceHint = getSourceHint(source, rankingData?.stale);

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

    const sourceBadgeStyle: Record<DataSourceType, { bg: string; border: string; text: string }> = {
        LIVE: { bg: `${tokens.positive}26`, border: `${tokens.positive}66`, text: tokens.positive },
        CACHE: { bg: `${tokens.warning}26`, border: `${tokens.warning}66`, text: tokens.warning },
        MOCK: { bg: `${tokens.textMuted}26`, border: `${tokens.textMuted}66`, text: tokens.textSecondary },
        UNAVAILABLE: { bg: `${tokens.negative}26`, border: `${tokens.negative}66`, text: tokens.negative },
    };

    const handleMarketSelect = (nextMarket: MarketType) => {
        setMarket(nextMarket);
        AccessibilityInfo.announceForAccessibility(
            `Market set to ${nextMarket === 'AR' ? 'Argentina BYMA' : 'US Wall Street'}`
        );
    };

    const handleTimeframeSelect = (nextTimeframe: TimeframeType) => {
        setTimeframe(nextTimeframe);
        AccessibilityInfo.announceForAccessibility(`Timeframe set to ${nextTimeframe}`);
    };

    const handleCurrencySelect = (nextCurrency: CurrencyType) => {
        setCurrency(nextCurrency);
        AccessibilityInfo.announceForAccessibility(`Currency set to ${nextCurrency}`);
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: tokens.bgPrimary }}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={tokens.bgPrimary}
            />

            <View className="px-4 pt-4 pb-2">
                <Text className="text-4xl font-extrabold tracking-tight" style={[appTypography.heading, { color: tokens.textPrimary }]}>
                    Top Gainers
                </Text>
                <Text className="mt-1 text-lg" style={{ color: tokens.textSecondary }}>
                    Real-time market leaders
                </Text>

                <View className="mt-3 flex-row items-center flex-wrap gap-2">
                    <View
                        className="self-start px-2 py-1 rounded-md border"
                        style={{
                            backgroundColor: sourceBadgeStyle[source].bg,
                            borderColor: sourceBadgeStyle[source].border,
                        }}
                    >
                        <Text className="text-xs font-bold" style={{ color: sourceBadgeStyle[source].text }}>
                            {source.toUpperCase()}
                        </Text>
                    </View>
                    {dataUpdatedAt ? (
                        <Text className="text-xs" style={{ color: tokens.textMuted }}>
                            Last update: {formatClockTime(dataUpdatedAt)}
                        </Text>
                    ) : null}
                    {isFetching && displayStocks.length > 0 ? (
                        <Text className="text-xs font-medium" style={{ color: tokens.accent }}>
                            Updating...
                        </Text>
                    ) : null}
                </View>

                <Text className="mt-2 text-xs" style={{ color: tokens.textMuted }}>
                    {sourceHint}
                </Text>
                {source === 'MOCK' ? (
                    <Text className="mt-1 text-xs" style={{ color: tokens.textMuted }}>
                        Demo mode: showing simulated prices.
                    </Text>
                ) : null}
                {showFxUnavailableWarning ? (
                    <Text className="mt-1 text-xs" style={{ color: tokens.warning }}>
                        FX unavailable. Showing {nativeCurrency} values.
                    </Text>
                ) : null}
                {needsFxConversion && conversionFactor !== null && usdToArsRate ? (
                    <Text className="mt-1 text-xs" style={{ color: tokens.textMuted }}>
                        FX USD/ARS: {usdToArsRate.toFixed(2)}
                    </Text>
                ) : null}
            </View>

            <View className="px-4 flex-row gap-2 mb-3 items-start">
                <MarketTabs compact activeMarket={market} onSelect={handleMarketSelect} />
                <View style={{ width: 128 }}>
                    <ThemeToggle variant="compact" />
                </View>
            </View>

            <CurrencyToggle activeCurrency={currency} onSelect={handleCurrencySelect} />
            <TimeFilters activeTimeframe={timeframe} onSelect={handleTimeframeSelect} />

            <View
                className="mx-4 mb-3 rounded-xl border px-3 py-2"
                style={{ backgroundColor: tokens.bgElevated, borderColor: tokens.borderSubtle }}
            >
                <Text className="text-xs" style={{ color: tokens.textMuted }}>
                    Informational use only. Not investment advice.
                </Text>
            </View>

            {displayStocks.length === 0 ? (
                isLoadingWithFx ? (
                    <StockListSkeleton rows={10} />
                ) : isError ? (
                    <View className="flex-1 justify-center items-center px-8">
                        <Text className="font-bold mb-3 text-center" style={{ color: tokens.negative }}>
                            Failed to load data.
                        </Text>
                        <Pressable onPress={() => refetch()} hitSlop={8}>
                            <Text className="font-semibold" style={{ color: tokens.accent }}>Tap to retry</Text>
                        </Pressable>
                    </View>
                ) : (
                    <View className="flex-1 justify-center items-center px-6">
                        <Text className="font-semibold text-center" style={{ color: tokens.warning }}>
                            Market data temporarily unavailable.
                        </Text>
                        <Text className="mt-2 text-center" style={{ color: tokens.textMuted }}>
                            Try again in a few minutes.
                        </Text>
                        <Pressable onPress={() => refetch()} className="mt-4" hitSlop={8}>
                            <Text className="font-semibold" style={{ color: tokens.accent }}>Retry now</Text>
                        </Pressable>
                    </View>
                )
            ) : (
                <FlatList
                    data={displayStocks}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => (
                        <StockListItem
                            stock={item}
                            index={index}
                            currency={effectiveCurrency}
                            freshness={freshness}
                            lastUpdatedAt={dataUpdatedAt || undefined}
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
                    refreshing={isFetching && !isLoadingWithFx}
                    onRefresh={refetch}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 44 }}
                    initialNumToRender={10}
                    windowSize={5}
                />
            )}
        </SafeAreaView>
    );
};
