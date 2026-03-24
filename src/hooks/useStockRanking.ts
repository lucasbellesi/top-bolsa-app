import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@core/query/queryKeys';
import { fetchARMarketGainers, fetchUSMarketGainers } from '@services/api';
import type { MarketType, StockRankingData, TimeframeType } from '../types';

export const useStockRanking = (market: MarketType, timeframe: TimeframeType) => {
    return useQuery<StockRankingData, Error>({
        queryKey: queryKeys.stockRanking(market, timeframe),
        queryFn: () =>
            market === 'US' ? fetchUSMarketGainers(timeframe) : fetchARMarketGainers(timeframe),
        refetchInterval: 60000, // Refetch every minute
        staleTime: 30000,
    });
};
