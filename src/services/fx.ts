export interface FxResponse {
    rates?: Record<string, number>;
}

export const fetchUsdArsRate = async (): Promise<number> => {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!response.ok) {
        throw new Error(`FX request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as FxResponse;
    const arsRate = payload.rates?.ARS;

    if (!arsRate || !Number.isFinite(arsRate) || arsRate <= 0) {
        throw new Error('FX response missing valid ARS rate');
    }

    return arsRate;
};
