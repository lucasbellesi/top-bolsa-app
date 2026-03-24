import React, { useMemo, useState } from 'react';
import { AccessibilityInfo, Dimensions, StatusBar, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from '@core/navigation';
import { useAppTheme } from '@core/theme';
import { StockDetailHeader } from '@features/stock-detail/components/StockDetailHeader';
import { StockChartCard } from '@features/stock-detail/components/StockChartCard';
import { StockSummaryCard } from '@features/stock-detail/components/StockSummaryCard';
import { useDetailHeaderState } from '@features/stock-detail/hooks/useDetailHeaderState';
import { useDisplayCurrency } from '@features/shared/hooks/useDisplayCurrency';
import { WatchlistToggleButton } from '@features/watchlist/components/WatchlistToggleButton';
import { useWatchlist } from '@features/watchlist/WatchlistContext';
import { convertStockDetailForDisplayCurrency } from '@shared/lib/currencyDisplay';
import { FeedbackState } from '@shared/ui/FeedbackState';

import { CompanyProfileCard } from '../components/CompanyProfileCard';
import { DetailRangeFilters } from '../components/DetailRangeFilters';
import { StockDetailSkeleton } from '../components/StockDetailSkeleton';
import { useCompanyProfile } from '../hooks/useCompanyProfile';
import { useStockDetail } from '../hooks/useStockDetail';
import type { DetailRangeType } from '../types';
import { triggerSelectionHaptic } from '../utils/feedback';

type Props = NativeStackScreenProps<RootStackParamList, 'StockDetail'>;

export const StockDetailScreen = ({ route }: Props) => {
    const { isDark, tokens } = useAppTheme();
    const { isInWatchlist, toggleWatchlist } = useWatchlist();
    const {
        ticker,
        market,
        currency,
        initialRange,
        companyName: initialCompanyName,
    } = route.params;
    const [range, setRange] = useState<DetailRangeType>(initialRange);

    const {
        conversionFactor,
        effectiveCurrency,
        isFxLoading,
        nativeCurrency,
        needsFxConversion,
        showFxUnavailableWarning,
        usdToArsRate,
    } = useDisplayCurrency(market, currency);
    const { data, isLoading, isError, isFetching, refetch } = useStockDetail(ticker, market, range);
    const {
        data: companyProfile,
        isLoading: isProfileLoading,
        isError: isProfileError,
    } = useCompanyProfile(ticker, market, initialCompanyName);

    const isLoadingWithFx =
        isLoading || (needsFxConversion && isFxLoading && conversionFactor === null);
    const displayData = useMemo(
        () => convertStockDetailForDisplayCurrency(data, conversionFactor),
        [data, conversionFactor],
    );
    const { freshness, source, sourceHint, updateTimestamp } = useDetailHeaderState(displayData);
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
                <StatusBar
                    barStyle={isDark ? 'light-content' : 'dark-content'}
                    backgroundColor={tokens.bgPrimary}
                />
                <FeedbackState
                    actionLabel="Tap to retry"
                    onAction={refetch}
                    title={`Failed to load stock details for ${range}.`}
                    tone="negative"
                />
            </SafeAreaView>
        );
    }

    const chartColor = displayData.percentChange >= 0 ? tokens.positive : tokens.negative;
    const displayCompanyName =
        companyProfile?.companyName || initialCompanyName || displayData.ticker;
    const isWatchlisted = isInWatchlist(displayData.ticker, displayData.market);
    const series = displayData.series;
    const firstValue = series[0]?.value ?? displayData.price;
    const absoluteChange = displayData.price - firstValue;
    const minValue = series.length
        ? Math.min(...series.map((point) => point.value))
        : displayData.price;
    const maxValue = series.length
        ? Math.max(...series.map((point) => point.value))
        : displayData.price;
    const startValue = series[0]?.value ?? displayData.price;
    const endValue = series[series.length - 1]?.value ?? displayData.price;

    const handleRangeSelect = (nextRange: DetailRangeType) => {
        setRange(nextRange);
        AccessibilityInfo.announceForAccessibility(`Detail range set to ${nextRange}`);
    };

    const handleWatchlistToggle = async () => {
        await triggerSelectionHaptic();
        const wasAdded = toggleWatchlist({
            ticker: displayData.ticker,
            market: displayData.market,
            companyName: displayCompanyName,
        });

        AccessibilityInfo.announceForAccessibility(
            wasAdded
                ? `${displayData.ticker} added to watchlist`
                : `${displayData.ticker} removed from watchlist`,
        );
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: tokens.bgPrimary }}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={tokens.bgPrimary}
            />

            <StockDetailHeader
                companyName={displayCompanyName}
                freshness={freshness}
                isFetching={isFetching}
                marketLabel={displayData.market}
                rightContent={
                    <WatchlistToggleButton
                        isSaved={isWatchlisted}
                        onPress={handleWatchlistToggle}
                    />
                }
                source={source}
                sourceHint={sourceHint}
                ticker={displayData.ticker}
                updateTimestamp={updateTimestamp}
            />

            <View className="px-4 pb-2">
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

            <StockSummaryCard
                absoluteChange={absoluteChange}
                currency={effectiveCurrency}
                percentChange={displayData.percentChange}
                price={displayData.price}
            />

            <CompanyProfileCard
                profile={companyProfile}
                isLoading={isProfileLoading}
                isError={isProfileError}
                fallbackCompanyName={displayCompanyName}
            />

            <StockChartCard
                chartColor={chartColor}
                chartWidth={chartWidth}
                currency={effectiveCurrency}
                endValue={endValue}
                maxValue={maxValue}
                minValue={minValue}
                onRetry={refetch}
                range={range}
                series={series}
                startValue={startValue}
            />
        </SafeAreaView>
    );
};
