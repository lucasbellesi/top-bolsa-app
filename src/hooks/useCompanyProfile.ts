import { useQuery } from '@tanstack/react-query';
import { CompanyProfileData, MarketType } from '../types';
import { fetchCompanyProfile } from '../services/companyProfile';

export const useCompanyProfile = (
    ticker: string,
    market: MarketType,
    fallbackCompanyName?: string,
) => {
    return useQuery<CompanyProfileData, Error>({
        queryKey: ['companyProfile', market, ticker],
        queryFn: () => fetchCompanyProfile({ ticker, market, fallbackCompanyName }),
        enabled: Boolean(ticker),
        staleTime: 12 * 60 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
    });
};
