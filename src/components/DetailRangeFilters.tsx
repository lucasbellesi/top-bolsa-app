import React from 'react';
import { LayoutAnimation, Pressable, ScrollView, Text, View } from 'react-native';
import { DetailRangeType } from '../types';
import { useAppTheme } from '../theme/ThemeContext';
import { triggerSelectionHaptic } from '../utils/feedback';

interface DetailRangeFiltersProps {
    activeRange: DetailRangeType;
    onSelect: (range: DetailRangeType) => void;
}

export const DetailRangeFilters = ({ activeRange, onSelect }: DetailRangeFiltersProps) => {
    const { tokens } = useAppTheme();
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
                        <Pressable
                            key={range}
                            onPress={async () => {
                                if (range === activeRange) {
                                    return;
                                }

                                LayoutAnimation.configureNext({
                                    duration: 160,
                                    update: { type: LayoutAnimation.Types.easeInEaseOut },
                                    create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
                                    delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
                                });
                                await triggerSelectionHaptic();
                                onSelect(range);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Select detail range ${range}`}
                            accessibilityState={{ selected: isActive }}
                            android_ripple={{ color: `${tokens.accent}33`, borderless: false }}
                            hitSlop={8}
                            className="px-4 h-12 rounded-full items-center justify-center"
                            style={{
                                backgroundColor: isActive ? tokens.accent : tokens.bgElevated,
                                borderColor: isActive ? tokens.accent : tokens.borderSubtle,
                                borderWidth: 1,
                            }}
                        >
                            <Text className="font-semibold text-sm" style={{ color: isActive ? '#ffffff' : tokens.textSecondary }}>
                                {range}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );
};
