import { useQuery } from '@tanstack/react-query';
import { MarketType, TimeframeType, StockData } from '../types';
import { fetchUSMarketGainers, fetchARMarketGainers } from '../services/api';

export const useStockRanking = (market: MarketType, timeframe: TimeframeType) => {
    return useQuery<StockData[], Error>({
        queryKey: ['stockRanking', market, timeframe],
        queryFn: () => market === 'US' ? fetchUSMarketGainers(timeframe) : fetchARMarketGainers(timeframe),
        refetchInterval: 60000, // Refetch every minute
        staleTime: 30000,
    });
};
