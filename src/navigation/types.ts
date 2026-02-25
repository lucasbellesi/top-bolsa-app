import { CurrencyType, DataSourceType, DetailRangeType, MarketType } from '../types';

export type RootStackParamList = {
    Home: undefined;
    StockDetail: {
        ticker: string;
        market: MarketType;
        currency: CurrencyType;
        initialRange: DetailRangeType;
        source?: DataSourceType;
    };
};
