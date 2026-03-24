import type { CurrencyType, MarketType } from '@app/types';
import { useUsdArsRate } from '@app/hooks/useUsdArsRate';
import { getConversionFactor, getNativeCurrencyForMarket } from '@app/utils/currency';

export const useDisplayCurrency = (market: MarketType, selectedCurrency: CurrencyType) => {
    const nativeCurrency = getNativeCurrencyForMarket(market);
    const needsFxConversion = selectedCurrency !== nativeCurrency;
    const { data: usdToArsRate, isLoading: isFxLoading } = useUsdArsRate(needsFxConversion);
    const conversionFactor = getConversionFactor(market, selectedCurrency, usdToArsRate ?? null);
    const effectiveCurrency: CurrencyType =
        conversionFactor === null ? nativeCurrency : selectedCurrency;
    const showFxUnavailableWarning = needsFxConversion && !isFxLoading && conversionFactor === null;

    return {
        conversionFactor,
        effectiveCurrency,
        isFxLoading,
        nativeCurrency,
        needsFxConversion,
        showFxUnavailableWarning,
        usdToArsRate,
    };
};
