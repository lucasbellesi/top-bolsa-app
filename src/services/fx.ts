import { fetchJson } from '@core/network/fetchJson';

export interface FxResponse {
    rates?: Record<string, number>;
}

export const fetchUsdArsRate = async (): Promise<number> => {
    const payload = await fetchJson<FxResponse>('https://open.er-api.com/v6/latest/USD');
    const arsRate = payload.rates?.ARS;

    if (!arsRate || !Number.isFinite(arsRate) || arsRate <= 0) {
        throw new Error('FX response missing valid ARS rate');
    }

    return arsRate;
};
