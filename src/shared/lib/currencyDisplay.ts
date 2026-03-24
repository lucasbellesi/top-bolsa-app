import type { StockData, StockDetailData } from '@app/types';
import { convertValue } from '@app/utils/currency';

export const convertStockListForDisplayCurrency = (
    stocks: StockData[],
    conversionFactor: number | null,
): StockData[] => {
    if (conversionFactor === null || conversionFactor === 1) {
        return stocks;
    }

    return stocks.map((stock) => ({
        ...stock,
        price: convertValue(stock.price, conversionFactor),
        sparkline: stock.sparkline.map((point) => ({
            ...point,
            value: convertValue(point.value, conversionFactor),
        })),
    }));
};

export const convertStockDetailForDisplayCurrency = (
    detail: StockDetailData | null | undefined,
    conversionFactor: number | null,
): StockDetailData | null => {
    if (!detail) {
        return null;
    }

    if (conversionFactor === null || conversionFactor === 1) {
        return detail;
    }

    return {
        ...detail,
        price: convertValue(detail.price, conversionFactor),
        series: detail.series.map((point) => ({
            ...point,
            value: convertValue(point.value, conversionFactor),
        })),
    };
};
