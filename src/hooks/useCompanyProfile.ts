import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@core/query/queryKeys';
import { fetchCompanyProfile } from '@services/companyProfile';
import type { CompanyProfileData, MarketType } from '../types';

export const useCompanyProfile = (
    ticker: string,
    market: MarketType,
    fallbackCompanyName?: string,
) => {
    return useQuery<CompanyProfileData, Error>({
        queryKey: queryKeys.companyProfile(market, ticker, fallbackCompanyName),
        queryFn: () => fetchCompanyProfile({ ticker, market, fallbackCompanyName }),
        enabled: Boolean(ticker),
        staleTime: 12 * 60 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
    });
};
