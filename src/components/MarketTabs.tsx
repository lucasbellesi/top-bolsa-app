import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MarketType } from '../types';

interface MarketTabsProps {
    activeMarket: MarketType;
    onSelect: (market: MarketType) => void;
}

export const MarketTabs = ({ activeMarket, onSelect }: MarketTabsProps) => {
    return (
        <View className="flex-row bg-neutral-900 p-1 rounded-xl mx-4 my-2 mb-4">
            {(['AR', 'US'] as MarketType[]).map((market) => {
                const isActive = activeMarket === market;
                return (
                    <TouchableOpacity
                        key={market}
                        onPress={() => onSelect(market)}
                        className={`flex-1 py-3 items-center rounded-lg ${isActive ? 'bg-neutral-700' : 'bg-transparent'}`}
                    >
                        <Text className={`font-semibold text-base ${isActive ? 'text-white' : 'text-neutral-500'}`}>
                            {market === 'AR' ? 'Argentina (BYMA)' : 'Wall Street (US)'}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};
