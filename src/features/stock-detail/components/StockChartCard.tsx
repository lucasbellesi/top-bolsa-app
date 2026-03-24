import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { LineChart } from 'react-native-wagmi-charts';

import type { CurrencyType, DetailRangeType, SparklinePoint } from '@app/types';
import { formatCurrencyValue } from '@app/utils/format';
import { useAppTheme, appTypography } from '@core/theme';

interface StockChartCardProps {
    chartColor: string;
    chartWidth: number;
    currency: CurrencyType;
    maxValue: number;
    minValue: number;
    onRetry: () => void;
    range: DetailRangeType;
    series: SparklinePoint[];
    startValue: number;
    endValue: number;
}

export const StockChartCard = ({
    chartColor,
    chartWidth,
    currency,
    endValue,
    maxValue,
    minValue,
    onRetry,
    range,
    series,
    startValue,
}: StockChartCardProps) => {
    const { tokens } = useAppTheme();

    return (
        <View
            className="mx-4 mt-4 p-4 rounded-2xl border"
            style={{ backgroundColor: tokens.bgSurface, borderColor: tokens.borderSubtle }}
        >
            {series.length > 1 ? (
                <>
                    <LineChart.Provider data={series}>
                        <LineChart height={240} width={chartWidth}>
                            <LineChart.Path color={chartColor} width={2} />
                        </LineChart>
                    </LineChart.Provider>

                    <View className="mt-4 flex-row flex-wrap">
                        <View className="w-1/2 mb-2">
                            <Text className="text-xs" style={{ color: tokens.textMuted }}>
                                Start
                            </Text>
                            <Text
                                className="text-sm font-semibold"
                                style={[appTypography.numbers, { color: tokens.textSecondary }]}
                            >
                                {formatCurrencyValue(startValue, currency)}
                            </Text>
                        </View>
                        <View className="w-1/2 mb-2 items-end">
                            <Text className="text-xs" style={{ color: tokens.textMuted }}>
                                End
                            </Text>
                            <Text
                                className="text-sm font-semibold"
                                style={[appTypography.numbers, { color: tokens.textSecondary }]}
                            >
                                {formatCurrencyValue(endValue, currency)}
                            </Text>
                        </View>
                        <View className="w-1/2">
                            <Text className="text-xs" style={{ color: tokens.textMuted }}>
                                Min
                            </Text>
                            <Text
                                className="text-sm font-semibold"
                                style={[appTypography.numbers, { color: tokens.textSecondary }]}
                            >
                                {formatCurrencyValue(minValue, currency)}
                            </Text>
                        </View>
                        <View className="w-1/2 items-end">
                            <Text className="text-xs" style={{ color: tokens.textMuted }}>
                                Max
                            </Text>
                            <Text
                                className="text-sm font-semibold"
                                style={[appTypography.numbers, { color: tokens.textSecondary }]}
                            >
                                {formatCurrencyValue(maxValue, currency)}
                            </Text>
                        </View>
                    </View>
                </>
            ) : (
                <View className="py-20 items-center">
                    <Text style={{ color: tokens.textSecondary }}>
                        No chart data available for {range}.
                    </Text>
                    <Pressable onPress={onRetry} className="mt-4" hitSlop={8}>
                        <Text className="font-semibold" style={{ color: tokens.accent }}>
                            Retry
                        </Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
};
