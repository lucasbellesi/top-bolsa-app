import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CurrencyType, StockData } from '../types';
import { LineChart } from 'react-native-wagmi-charts';
import { TrendingUp, TrendingDown } from 'lucide-react-native';

interface StockListItemProps {
    stock: StockData;
    index: number;
    currency: CurrencyType;
    onPress?: () => void;
}

export const StockListItem = ({ stock, index, currency, onPress }: StockListItemProps) => {
    const isPositive = stock.percentChange >= 0;
    const color = isPositive ? '#10b981' : '#ef4444'; // emerald-500 : red-500
    const formattedPrice = new Intl.NumberFormat(currency === 'ARS' ? 'es-AR' : 'en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(stock.price);

    return (
        <TouchableOpacity
            disabled={!onPress}
            onPress={onPress}
            activeOpacity={0.85}
            className="flex-row items-center justify-between p-4 mb-3 mx-4 bg-neutral-900 rounded-2xl border border-neutral-800"
        >

            {/* Rank & Ticker */}
            <View className="flex-row items-center w-1/4">
                <Text className="text-neutral-500 font-bold text-lg mr-3 min-w-[20px]">
                    {index + 1}
                </Text>
                <View>
                    <Text className="text-white font-bold text-lg">{stock.ticker}</Text>
                    <Text className="text-neutral-500 text-xs">{stock.market}</Text>
                </View>
            </View>

            {/* Sparkline Chart */}
            <View className="w-1/4 h-12 justify-center">
                {stock.sparkline && stock.sparkline.length > 0 ? (
                    <LineChart.Provider data={stock.sparkline}>
                        <LineChart height={48} width={80}>
                            <LineChart.Path color={color} width={2} />
                        </LineChart>
                    </LineChart.Provider>
                ) : null}
            </View>

            {/* Price & Change */}
            <View className="items-end w-1/3">
                <Text
                    className="text-white font-bold text-xl"
                    style={{ fontFamily: 'Courier', letterSpacing: -0.5 }}
                >
                    {formattedPrice}
                </Text>
                <View className={`flex-row items-center mt-1 px-2 py-1 rounded-md ${isPositive ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                    {isPositive ? (
                        <TrendingUp color="#10b981" size={14} />
                    ) : (
                        <TrendingDown color="#ef4444" size={14} />
                    )}
                    <Text className={`ml-1 font-bold text-xs ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                        {Math.abs(stock.percentChange).toFixed(2)}%
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};
