import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useAppTheme } from '@core/theme';
import { triggerSelectionHaptic } from '@app/utils/feedback';

import type { FeedMode } from '../types';

interface FeedModeTabsProps {
    activeMode: FeedMode;
    onSelect: (mode: FeedMode) => void;
}

const FEED_MODES: FeedMode[] = ['MARKET', 'WATCHLIST'];

export const FeedModeTabs = ({ activeMode, onSelect }: FeedModeTabsProps) => {
    const { tokens } = useAppTheme();

    return (
        <View
            className="flex-row mx-4 mb-3 p-1 rounded-2xl"
            style={{
                backgroundColor: tokens.bgElevated,
                borderColor: tokens.borderSubtle,
                borderWidth: 1,
            }}
        >
            {FEED_MODES.map((mode) => {
                const isActive = activeMode === mode;
                const label = mode === 'MARKET' ? 'Market' : 'Watchlist';

                return (
                    <Pressable
                        key={mode}
                        onPress={async () => {
                            if (activeMode === mode) {
                                return;
                            }

                            await triggerSelectionHaptic();
                            onSelect(mode);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Switch feed to ${label}`}
                        accessibilityState={{ selected: isActive }}
                        android_ripple={{ color: `${tokens.accent}33`, borderless: false }}
                        hitSlop={8}
                        className="flex-1 h-12 items-center justify-center rounded-xl"
                        style={{
                            backgroundColor: isActive ? tokens.bgSurface : 'transparent',
                            borderWidth: isActive ? 1 : 0,
                            borderColor: tokens.borderSubtle,
                        }}
                    >
                        <Text
                            className="font-semibold text-[15px]"
                            style={{ color: isActive ? tokens.textPrimary : tokens.textMuted }}
                        >
                            {label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
};
