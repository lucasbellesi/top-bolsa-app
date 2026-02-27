import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MarketType } from '../types';
import { useAppTheme } from '../theme/ThemeContext';
import { triggerSelectionHaptic } from '../utils/feedback';

interface MarketTabsProps {
    activeMarket: MarketType;
    onSelect: (market: MarketType) => void;
    compact?: boolean;
}

export const MarketTabs = ({ activeMarket, onSelect, compact = false }: MarketTabsProps) => {
    const { tokens } = useAppTheme();

    return (
        <View
            className={`flex-row p-1 ${compact ? 'rounded-xl flex-1' : 'rounded-2xl mx-4 mb-3'}`}
            style={{ backgroundColor: tokens.bgElevated, borderColor: tokens.borderSubtle, borderWidth: 1 }}
        >
            {(['AR', 'US'] as MarketType[]).map((market) => {
                const isActive = activeMarket === market;
                return (
                    <Pressable
                        key={market}
                        onPress={async () => {
                            if (activeMarket === market) {
                                return;
                            }

                            await triggerSelectionHaptic();
                            onSelect(market);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Switch market to ${market === 'AR' ? 'Argentina BYMA' : 'US Wall Street'}`}
                        accessibilityState={{ selected: isActive }}
                        android_ripple={{ color: `${tokens.accent}33`, borderless: false }}
                        hitSlop={8}
                        className={`flex-1 h-12 items-center justify-center rounded-xl ${compact ? 'px-2' : 'px-3'}`}
                        style={{
                            backgroundColor: isActive ? tokens.bgSurface : 'transparent',
                            borderWidth: isActive ? 1 : 0,
                            borderColor: tokens.borderSubtle,
                        }}
                    >
                        <Text
                            className={`font-semibold ${compact ? 'text-sm' : 'text-[15px]'}`}
                            style={{ color: isActive ? tokens.textPrimary : tokens.textMuted }}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.85}
                        >
                            {market === 'AR' ? 'Argentina (BYMA)' : 'Wall Street (US)'}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
};
