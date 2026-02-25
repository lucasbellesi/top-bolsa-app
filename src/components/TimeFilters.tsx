import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { TimeframeType } from '../types';

interface TimeFiltersProps {
    activeTimeframe: TimeframeType;
    onSelect: (timeframe: TimeframeType) => void;
}

export const TimeFilters = ({ activeTimeframe, onSelect }: TimeFiltersProps) => {
    const timeframes: TimeframeType[] = ['1H', '1D', '1W', '1M', 'YTD'];
    return (
        <View className="flex-row justify-between px-4 mb-4 gap-x-2">
            {timeframes.map((tf) => {
                const isActive = activeTimeframe === tf;
                return (
                    <TouchableOpacity
                        key={tf}
                        onPress={() => onSelect(tf)}
                        className={`flex-1 items-center py-2 rounded-full ${isActive ? 'bg-emerald-600' : 'bg-neutral-800'}`}
                    >
                        <Text className={`font-medium ${isActive ? 'text-white' : 'text-neutral-400'}`}>
                            {tf}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};
