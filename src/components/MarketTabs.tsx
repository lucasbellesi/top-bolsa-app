import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MarketType } from '../types';
import { useAppTheme } from '../theme/ThemeContext';

interface MarketTabsProps {
    activeMarket: MarketType;
    onSelect: (market: MarketType) => void;
}

export const MarketTabs = ({ activeMarket, onSelect }: MarketTabsProps) => {
    const { isDark } = useAppTheme();

    return (
        <View className={`flex-row p-1 rounded-xl mx-4 my-2 mb-4 ${isDark ? 'bg-neutral-900' : 'bg-slate-100 border border-slate-200'}`}>
            {(['AR', 'US'] as MarketType[]).map((market) => {
                const isActive = activeMarket === market;
                return (
                    <TouchableOpacity
                        key={market}
                        onPress={() => onSelect(market)}
                        className={`flex-1 py-3 items-center rounded-lg ${isActive ? (isDark ? 'bg-neutral-700' : 'bg-white border border-slate-200') : 'bg-transparent'}`}
                    >
                        <Text className={`font-semibold text-base ${isActive ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-neutral-500' : 'text-slate-500')}`}>
                            {market === 'AR' ? 'Argentina (BYMA)' : 'Wall Street (US)'}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};
