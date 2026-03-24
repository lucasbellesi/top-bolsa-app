import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@core/query/queryKeys';
import { fetchUsdArsRate } from '../services/fx';

export const useUsdArsRate = (enabled: boolean) =>
    useQuery<number, Error>({
        queryKey: queryKeys.fxRate(),
        queryFn: fetchUsdArsRate,
        enabled,
        staleTime: 4 * 60 * 1000,
        refetchInterval: 5 * 60 * 1000,
    });
