import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { CurrencyType, DataFreshnessType, StockData } from '../types';
import { LineChart } from 'react-native-wagmi-charts';
import { TrendingDown, TrendingUp } from 'lucide-react-native';
import { useAppTheme } from '../theme/ThemeContext';
import { appTypography } from '../theme/typography';
import { formatCurrencyValue, formatPercent } from '../utils/format';

interface StockListItemProps {
    stock: StockData;
    index: number;
    currency: CurrencyType;
    onPress?: () => void;
    freshness?: DataFreshnessType;
    lastUpdatedAt?: number;
}

export const StockListItem = ({ stock, index, currency, onPress, freshness = 'fresh', lastUpdatedAt }: StockListItemProps) => {
    const { tokens } = useAppTheme();
    const isPositive = stock.percentChange >= 0;
    const color = isPositive ? tokens.positive : tokens.negative;
    const formattedPrice = formatCurrencyValue(stock.price, currency);
    const formattedChange = formatPercent(stock.percentChange);
    const companyName = stock.companyName?.trim() || stock.ticker;

    const containerOpacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(10)).current;

    useEffect(() => {
        const delay = Math.min(index * 35, 280);
        Animated.parallel([
            Animated.timing(containerOpacity, {
                toValue: 1,
                duration: 180,
                delay,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 180,
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, [containerOpacity, index, translateY]);

    const cardStyle = useMemo(
        () => ({
            backgroundColor: tokens.bgSurface,
            borderColor: tokens.borderSubtle,
            opacity: containerOpacity,
            transform: [{ translateY }],
        }),
        [containerOpacity, tokens.bgSurface, tokens.borderSubtle, translateY]
    );

    return (
        <Animated.View style={cardStyle} className="mx-4 mb-3 rounded-2xl border">
            <Pressable
                disabled={!onPress}
                onPress={onPress}
                android_ripple={{ color: `${tokens.accent}22`, borderless: false }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Open details for ${stock.ticker} (${companyName}), ${formattedChange}, ${freshness}${lastUpdatedAt ? `, updated at ${new Date(lastUpdatedAt).toLocaleTimeString()}` : ''}`}
                className="min-h-[118px] px-4 py-4 flex-row items-center"
                style={({ pressed }) => ({ opacity: pressed ? 0.94 : 1 })}
            >
                <View className="w-8 items-start mr-2">
                    <View
                        className="h-7 min-w-7 px-2 rounded-full items-center justify-center"
                        style={{ backgroundColor: tokens.bgElevated }}
                    >
                        <Text className="text-xs font-bold" style={{ color: tokens.textMuted }}>
                            {index + 1}
                        </Text>
                    </View>
                </View>

                <View className="flex-1 min-w-0 pr-3">
                    <Text
                        className="text-xl font-extrabold"
                        style={[appTypography.heading, { color: tokens.textPrimary }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {stock.ticker}
                    </Text>
                    <Text
                        className="text-xs mt-1 leading-5"
                        style={{ color: tokens.textMuted }}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                    >
                        {companyName}
                    </Text>
                    <Text
                        className="text-xs mt-1"
                        style={{ color: tokens.textMuted }}
                        numberOfLines={1}
                    >
                        {stock.market}
                    </Text>
                </View>

                <View className="w-[72px] h-14 justify-center items-center mr-3 shrink">
                    {stock.sparkline && stock.sparkline.length > 0 ? (
                        <LineChart.Provider data={stock.sparkline}>
                            <LineChart height={46} width={72}>
                                <LineChart.Path color={color} width={2} />
                            </LineChart>
                        </LineChart.Provider>
                    ) : null}
                </View>

                <View className="min-w-[112px] max-w-[132px] items-end shrink-0">
                    <Text
                        className="text-lg font-bold"
                        style={[appTypography.numbers, { color: tokens.textPrimary }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.85}
                    >
                        {formattedPrice}
                    </Text>
                    <View
                        className="flex-row items-center mt-1.5 px-2 py-1 rounded-lg"
                        style={{ backgroundColor: `${color}24` }}
                    >
                        {isPositive ? (
                            <TrendingUp color={color} size={14} />
                        ) : (
                            <TrendingDown color={color} size={14} />
                        )}
                        <Text className="ml-1 font-bold text-xs" style={[appTypography.numbers, { color }]}>
                            {formattedChange}
                        </Text>
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
};
