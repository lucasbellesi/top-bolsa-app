import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { DetailRangeType } from '../types';

interface DetailRangeFiltersProps {
    activeRange: DetailRangeType;
    onSelect: (range: DetailRangeType) => void;
}

export const DetailRangeFilters = ({ activeRange, onSelect }: DetailRangeFiltersProps) => {
    const ranges: DetailRangeType[] = ['1H', '1D', '1W', '1M', '3M', '6M', '1Y', 'YTD'];

    return (
        <View className="mb-4">
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            >
                {ranges.map((range) => {
                    const isActive = range === activeRange;
                    return (
                        <TouchableOpacity
                            key={range}
                            onPress={() => onSelect(range)}
                            className={`px-4 py-2 rounded-full ${isActive ? 'bg-emerald-600' : 'bg-neutral-800'}`}
                        >
                            <Text className={`font-medium ${isActive ? 'text-white' : 'text-neutral-400'}`}>
                                {range}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};
