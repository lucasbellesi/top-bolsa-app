import { useCallback, useMemo } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';

import type { DetailRangeType, MarketType, StockData, StockDetailData } from '@app/types';
import { queryKeys } from '@core/query/queryKeys';
import { fetchStockDetail } from '@services/stockDetail';

import type { WatchlistEntry } from '../types';

interface UseWatchlistStocksResult {
    hasEntries: boolean;
    isError: boolean;
    isFetching: boolean;
    isLoading: boolean;
    items: Array<{ entry: WatchlistEntry; result: StockDetailData }>;
    lastUpdatedAt: number | null;
    refetch: () => Promise<void>;
    stocks: StockData[];
}

export const useWatchlistStocks = (
    entries: WatchlistEntry[],
    market: MarketType,
    range: DetailRangeType,
): UseWatchlistStocksResult => {
    const queryClient = useQueryClient();
    const marketEntries = useMemo(
        () => entries.filter((entry) => entry.market === market),
        [entries, market],
    );

    const queries = useMemo(
        () =>
            marketEntries.map((entry) => ({
                queryKey: queryKeys.stockDetail(entry.ticker, entry.market, range),
                queryFn: () =>
                    fetchStockDetail({
                        ticker: entry.ticker,
                        market: entry.market,
                        range,
                    }),
                staleTime: 30000,
                refetchInterval: 60000,
            })),
        [marketEntries, range],
    );

    const combinedResults = useQueries({
        queries,
        combine: (queryResults) => {
            const items = marketEntries.flatMap((entry, index) => {
                const result = queryResults[index]?.data;
                if (!result) {
                    return [];
                }

                return [{ entry, result }];
            });

            const stocks = items.map(({ entry, result }) => ({
                id: `${entry.market}:${entry.ticker}`,
                ticker: result.ticker,
                companyName: entry.companyName,
                market: result.market,
                price: result.price,
                percentChange: result.percentChange,
                sparkline: result.series,
            }));

            const lastUpdatedAtValues = items
                .map(({ result }) => Date.parse(result.lastUpdatedAt))
                .filter((value) => Number.isFinite(value));

            return {
                hasEntries: marketEntries.length > 0,
                isError: marketEntries.length > 0 && queryResults.every((result) => result.isError),
                isFetching: queryResults.some((result) => result.isFetching),
                isLoading:
                    marketEntries.length > 0 && queryResults.some((result) => result.isLoading),
                items,
                lastUpdatedAt:
                    lastUpdatedAtValues.length > 0 ? Math.max(...lastUpdatedAtValues) : null,
                stocks,
            };
        },
    });

    const refetch = useCallback(async () => {
        await Promise.all(
            marketEntries.map((entry) =>
                queryClient.refetchQueries({
                    queryKey: queryKeys.stockDetail(entry.ticker, entry.market, range),
                    exact: true,
                }),
            ),
        );
    }, [marketEntries, queryClient, range]);

    return {
        hasEntries: combinedResults.hasEntries,
        isError: combinedResults.isError,
        isFetching: combinedResults.isFetching,
        isLoading: combinedResults.isLoading,
        items: combinedResults.items,
        lastUpdatedAt: combinedResults.lastUpdatedAt,
        refetch,
        stocks: combinedResults.stocks,
    };
};
