import { useQuery } from '@tanstack/react-query';
import { fetchUsdArsRate } from '../services/fx';

export const useUsdArsRate = (enabled: boolean) =>
    useQuery<number, Error>({
        queryKey: ['fxRate', 'USD_ARS'],
        queryFn: fetchUsdArsRate,
        enabled,
        staleTime: 4 * 60 * 1000,
        refetchInterval: 5 * 60 * 1000,
    });
