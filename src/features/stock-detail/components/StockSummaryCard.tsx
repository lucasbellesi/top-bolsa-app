import React from 'react';
import { Text, View } from 'react-native';
import { TrendingDown, TrendingUp } from 'lucide-react-native';

import type { CurrencyType } from '@app/types';
import { formatCurrencyValue, formatPercent } from '@app/utils/format';
import { useAppTheme, appTypography } from '@core/theme';

interface StockSummaryCardProps {
    absoluteChange: number;
    currency: CurrencyType;
    percentChange: number;
    price: number;
}

export const StockSummaryCard = ({
    absoluteChange,
    currency,
    percentChange,
    price,
}: StockSummaryCardProps) => {
    const { tokens } = useAppTheme();
    const isPositive = percentChange >= 0;
    const chartColor = isPositive ? tokens.positive : tokens.negative;
    const formattedAbsoluteChange = `${absoluteChange >= 0 ? '+' : '-'}${formatCurrencyValue(
        Math.abs(absoluteChange),
        currency,
    )}`;

    return (
        <View
            className="mx-4 p-4 rounded-2xl border"
            style={{ backgroundColor: tokens.bgSurface, borderColor: tokens.borderSubtle }}
        >
            <Text className="text-sm" style={{ color: tokens.textMuted }}>
                Current price
            </Text>
            <Text
                className="text-3xl font-bold mt-2"
                style={[appTypography.numbers, { color: tokens.textPrimary }]}
            >
                {formatCurrencyValue(price, currency)}
            </Text>

            <View className="flex-row items-center justify-between mt-3">
                <View
                    className="flex-row items-center px-2 py-1 rounded-md"
                    style={{ backgroundColor: `${chartColor}24` }}
                >
                    {isPositive ? (
                        <TrendingUp color={chartColor} size={16} />
                    ) : (
                        <TrendingDown color={chartColor} size={16} />
                    )}
                    <Text
                        className="ml-1 font-bold text-sm"
                        style={[appTypography.numbers, { color: chartColor }]}
                    >
                        {formatPercent(percentChange)}
                    </Text>
                </View>

                <Text
                    className="font-semibold text-sm"
                    style={[appTypography.numbers, { color: chartColor }]}
                >
                    {formattedAbsoluteChange}
                </Text>
            </View>
        </View>
    );
};
