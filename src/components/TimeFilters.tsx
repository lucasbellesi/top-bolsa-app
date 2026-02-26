import React from 'react';
import { LayoutAnimation, Pressable, ScrollView, Text, View } from 'react-native';
import { TimeframeType } from '../types';
import { useAppTheme } from '../theme/ThemeContext';
import { triggerSelectionHaptic } from '../utils/feedback';

interface TimeFiltersProps {
    activeTimeframe: TimeframeType;
    onSelect: (timeframe: TimeframeType) => void;
}

export const TimeFilters = ({ activeTimeframe, onSelect }: TimeFiltersProps) => {
    const { tokens } = useAppTheme();
    const timeframes: TimeframeType[] = ['1H', '1D', '1W', '1M', '3M', 'YTD'];

    return (
        <View className="mb-3">
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            >
                {timeframes.map((tf) => {
                    const isActive = activeTimeframe === tf;
                    return (
                        <Pressable
                            key={tf}
                            onPress={async () => {
                                if (activeTimeframe === tf) {
                                    return;
                                }

                                LayoutAnimation.configureNext({
                                    duration: 160,
                                    update: { type: LayoutAnimation.Types.easeInEaseOut },
                                    create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
                                    delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
                                });
                                await triggerSelectionHaptic();
                                onSelect(tf);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Select timeframe ${tf}`}
                            accessibilityState={{ selected: isActive }}
                            android_ripple={{ color: `${tokens.accent}33`, borderless: false }}
                            hitSlop={8}
                            className="h-12 px-5 rounded-full items-center justify-center"
                            style={{
                                backgroundColor: isActive ? tokens.accent : tokens.bgElevated,
                                borderColor: isActive ? tokens.accent : tokens.borderSubtle,
                                borderWidth: 1,
                            }}
                        >
                            <Text className="font-semibold text-sm" style={{ color: isActive ? '#ffffff' : tokens.textSecondary }}>
                                {tf}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );
};
