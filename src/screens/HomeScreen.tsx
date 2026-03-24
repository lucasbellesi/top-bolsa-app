import React, { useMemo, useState } from 'react';
import { AccessibilityInfo, FlatList, StatusBar, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from '@core/navigation';
import { useAppTheme } from '@core/theme';
import { MarketScreenHeader } from '@features/market-list/components/MarketScreenHeader';
import { useMarketHeaderState } from '@features/market-list/hooks/useMarketHeaderState';
import { useDisplayCurrency } from '@features/shared/hooks/useDisplayCurrency';
import { FeedModeTabs } from '@features/watchlist/components/FeedModeTabs';
import { useWatchlist } from '@features/watchlist/WatchlistContext';
import { useWatchlistStocks } from '@features/watchlist/hooks/useWatchlistStocks';
import type { FeedMode } from '@features/watchlist/types';
import { TIMEFRAME_TO_DETAIL_RANGE } from '@shared/constants/market';
import { convertStockListForDisplayCurrency } from '@shared/lib/currencyDisplay';
import { FeedbackState } from '@shared/ui/FeedbackState';

import { CurrencyToggle } from '../components/CurrencyToggle';
import { MarketTabs } from '../components/MarketTabs';
import { StockListItem } from '../components/StockListItem';
import { StockListSkeleton } from '../components/StockListSkeleton';
import { TimeFilters } from '../components/TimeFilters';
import { useStockRanking } from '../hooks/useStockRanking';
import type { CurrencyType, MarketType, TimeframeType } from '../types';

export const HomeScreen = () => {
    const { tokens, isDark } = useAppTheme();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Home'>>();
    const { entries, isHydrating, isInWatchlist } = useWatchlist();
    const [feedMode, setFeedMode] = useState<FeedMode>('MARKET');
    const [market, setMarket] = useState<MarketType>('AR');
    const [timeframe, setTimeframe] = useState<TimeframeType>('1D');
    const [currency, setCurrency] = useState<CurrencyType>('ARS');
    const detailRange = TIMEFRAME_TO_DETAIL_RANGE[timeframe];

    const {
        data: rankingData,
        isLoading,
        isError,
        isFetching,
        refetch,
    } = useStockRanking(market, timeframe);

    const { freshness, lastUpdatedAt, source, sourceHint } = useMarketHeaderState(rankingData);
    const {
        conversionFactor,
        effectiveCurrency,
        isFxLoading,
        nativeCurrency,
        needsFxConversion,
        showFxUnavailableWarning,
        usdToArsRate,
    } = useDisplayCurrency(market, currency);
    const {
        hasEntries: hasWatchlistEntries,
        isError: isWatchlistError,
        isFetching: isWatchlistFetching,
        isLoading: isWatchlistLoading,
        lastUpdatedAt: watchlistLastUpdatedAt,
        refetch: refetchWatchlist,
        stocks: watchlistStocks,
    } = useWatchlistStocks(entries, market, detailRange);
    const isWatchlistMode = feedMode === 'WATCHLIST';

    const marketDisplayStocks = useMemo(() => {
        const rankingStocks = rankingData?.stocks ?? [];
        return convertStockListForDisplayCurrency(rankingStocks, conversionFactor);
    }, [rankingData?.stocks, conversionFactor]);
    const watchlistDisplayStocks = useMemo(
        () => convertStockListForDisplayCurrency(watchlistStocks, conversionFactor),
        [watchlistStocks, conversionFactor],
    );
    const displayStocks = isWatchlistMode ? watchlistDisplayStocks : marketDisplayStocks;
    const headerLastUpdatedAt = isWatchlistMode ? watchlistLastUpdatedAt : lastUpdatedAt;
    const headerIsFetching = isWatchlistMode
        ? isWatchlistFetching && displayStocks.length > 0
        : isFetching && displayStocks.length > 0;
    const isLoadingWithFx =
        (isWatchlistMode ? isHydrating || isWatchlistLoading : isLoading) ||
        (needsFxConversion && isFxLoading && conversionFactor === null);
    const handleRefresh = isWatchlistMode ? refetchWatchlist : refetch;

    const handleMarketSelect = (nextMarket: MarketType) => {
        setMarket(nextMarket);
        AccessibilityInfo.announceForAccessibility(
            `Market set to ${nextMarket === 'AR' ? 'Argentina BYMA' : 'US Wall Street'}`,
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

    const handleFeedModeSelect = (nextMode: FeedMode) => {
        setFeedMode(nextMode);
        AccessibilityInfo.announceForAccessibility(
            nextMode === 'WATCHLIST' ? 'Watchlist feed selected' : 'Market feed selected',
        );
    };

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: tokens.bgPrimary }}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={tokens.bgPrimary}
            />

            <MarketScreenHeader
                isFetching={headerIsFetching}
                lastUpdatedAt={headerLastUpdatedAt}
                source={isWatchlistMode ? undefined : source}
                sourceHint={isWatchlistMode ? null : sourceHint}
                subtitle={
                    isWatchlistMode
                        ? 'Your saved stocks for this market'
                        : 'Real-time market leaders'
                }
                title={isWatchlistMode ? 'Watchlist' : 'Top Gainers'}
            />

            <View className="px-4 pb-2">
                {source === 'MOCK' && !isWatchlistMode ? (
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

            <FeedModeTabs activeMode={feedMode} onSelect={handleFeedModeSelect} />
            <MarketTabs activeMarket={market} onSelect={handleMarketSelect} />
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
                ) : isWatchlistMode && !hasWatchlistEntries ? (
                    <FeedbackState
                        description={`Open any ${market === 'AR' ? 'BYMA' : 'US'} stock and save it to your watchlist.`}
                        title="Your watchlist is empty."
                    />
                ) : isWatchlistMode && isWatchlistError ? (
                    <FeedbackState
                        actionLabel="Tap to retry"
                        onAction={handleRefresh}
                        title="Failed to load your watchlist."
                        tone="negative"
                    />
                ) : isError ? (
                    <FeedbackState
                        actionLabel="Tap to retry"
                        onAction={refetch}
                        title="Failed to load data."
                        tone="negative"
                    />
                ) : (
                    <FeedbackState
                        actionLabel="Retry now"
                        description="Try again in a few minutes."
                        onAction={handleRefresh}
                        title={
                            isWatchlistMode
                                ? 'Watchlist data temporarily unavailable.'
                                : 'Market data temporarily unavailable.'
                        }
                    />
                )
            ) : (
                <FlatList
                    data={displayStocks}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => (
                        <StockListItem
                            stock={item}
                            isWatchlisted={isInWatchlist(item.ticker, item.market)}
                            index={index}
                            currency={effectiveCurrency}
                            freshness={isWatchlistMode ? 'fresh' : freshness}
                            lastUpdatedAt={headerLastUpdatedAt || undefined}
                            onPress={() =>
                                navigation.navigate('StockDetail', {
                                    ticker: item.ticker,
                                    market: item.market,
                                    currency: effectiveCurrency,
                                    initialRange: detailRange,
                                    source: isWatchlistMode ? undefined : source,
                                    companyName: item.companyName,
                                })
                            }
                        />
                    )}
                    refreshing={
                        (isWatchlistMode ? isWatchlistFetching : isFetching) && !isLoadingWithFx
                    }
                    onRefresh={handleRefresh}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 56 }}
                    initialNumToRender={10}
                    windowSize={5}
                />
            )}
        </SafeAreaView>
    );
};
