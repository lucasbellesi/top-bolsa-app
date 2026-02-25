import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { TimeframeType } from '../types';
import { useAppTheme } from '../theme/ThemeContext';

interface TimeFiltersProps {
    activeTimeframe: TimeframeType;
    onSelect: (timeframe: TimeframeType) => void;
}

export const TimeFilters = ({ activeTimeframe, onSelect }: TimeFiltersProps) => {
    const { isDark } = useAppTheme();
    const timeframes: TimeframeType[] = ['1H', '1D', '1W', '1M', 'YTD'];
    return (
        <View className="flex-row justify-between px-4 mb-4 gap-x-2">
            {timeframes.map((tf) => {
                const isActive = activeTimeframe === tf;
                return (
                    <TouchableOpacity
                        key={tf}
                        onPress={() => onSelect(tf)}
                        className={`flex-1 items-center py-2 rounded-full ${isActive ? 'bg-emerald-600' : isDark ? 'bg-neutral-800' : 'bg-slate-200'}`}
                    >
                        <Text className={`font-medium ${isActive ? 'text-white' : isDark ? 'text-neutral-400' : 'text-slate-600'}`}>
                            {tf}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};
