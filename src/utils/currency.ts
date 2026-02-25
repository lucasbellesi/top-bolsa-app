import { CurrencyType, MarketType } from '../types';

export const getNativeCurrencyForMarket = (market: MarketType): CurrencyType =>
    market === 'AR' ? 'ARS' : 'USD';

export const getConversionFactor = (
    market: MarketType,
    selectedCurrency: CurrencyType,
    usdToArsRate: number | null
): number | null => {
    const nativeCurrency = getNativeCurrencyForMarket(market);
    if (selectedCurrency === nativeCurrency) {
        return 1;
    }

    if (!usdToArsRate || !Number.isFinite(usdToArsRate) || usdToArsRate <= 0) {
        return null;
    }

    if (market === 'US' && selectedCurrency === 'ARS') {
        return usdToArsRate;
    }

    if (market === 'AR' && selectedCurrency === 'USD') {
        return 1 / usdToArsRate;
    }

    return null;
};

export const convertValue = (value: number, factor: number): number => value * factor;
