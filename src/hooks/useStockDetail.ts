import { useQuery } from '@tanstack/react-query';
import { DetailRangeType, MarketType, StockDetailData } from '../types';
import { fetchStockDetail } from '../services/stockDetail';

export const useStockDetail = (
    ticker: string,
    market: MarketType,
    range: DetailRangeType
) => {
    return useQuery<StockDetailData, Error>({
        queryKey: ['stockDetail', ticker, market, range],
        queryFn: () => fetchStockDetail({ ticker, market, range }),
        enabled: Boolean(ticker),
        refetchInterval: 60000,
        staleTime: 30000,
    });
};
