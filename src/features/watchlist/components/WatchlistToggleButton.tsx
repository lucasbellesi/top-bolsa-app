import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Bookmark } from 'lucide-react-native';

import { useAppTheme } from '@core/theme';

interface WatchlistToggleButtonProps {
    isSaved: boolean;
    onPress: () => void;
}

export const WatchlistToggleButton = ({ isSaved, onPress }: WatchlistToggleButtonProps) => {
    const { tokens } = useAppTheme();
    const color = isSaved ? tokens.accent : tokens.textMuted;

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={isSaved ? 'Remove from watchlist' : 'Add to watchlist'}
            accessibilityHint={
                isSaved
                    ? 'Removes this stock from your watchlist.'
                    : 'Saves this stock to your watchlist.'
            }
            accessibilityState={{ selected: isSaved }}
            android_ripple={{ color: `${tokens.accent}22`, borderless: false }}
            className="rounded-xl"
            hitSlop={8}
            onPress={onPress}
            style={({ pressed }) => ({ opacity: pressed ? 0.84 : 1 })}
        >
            <View
                className="px-3 py-2 rounded-xl border flex-row items-center"
                style={{
                    backgroundColor: isSaved ? `${tokens.accent}14` : tokens.bgElevated,
                    borderColor: isSaved ? `${tokens.accent}44` : tokens.borderSubtle,
                }}
            >
                <Bookmark color={color} size={16} />
                <Text className="ml-2 text-xs font-semibold" style={{ color }}>
                    {isSaved ? 'Saved' : 'Save'}
                </Text>
            </View>
        </Pressable>
    );
};
