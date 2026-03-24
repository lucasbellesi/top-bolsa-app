import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@core/query/queryKeys';
import { fetchStockDetail } from '@services/stockDetail';
import type { DetailRangeType, MarketType, StockDetailData } from '../types';

export const useStockDetail = (ticker: string, market: MarketType, range: DetailRangeType) => {
    return useQuery<StockDetailData, Error>({
        queryKey: queryKeys.stockDetail(ticker, market, range),
        queryFn: () => fetchStockDetail({ ticker, market, range }),
        enabled: Boolean(ticker),
        refetchInterval: 60000,
        staleTime: 30000,
    });
};
