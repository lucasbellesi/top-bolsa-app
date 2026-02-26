import React from 'react';
import { AccessibilityInfo, Pressable, Text, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';
import { ThemeMode } from '../theme/ThemeMode';
import { triggerSelectionHaptic } from '../utils/feedback';

interface ThemeToggleProps {
    variant?: 'full' | 'compact';
}

const themeModes: ThemeMode[] = ['dark', 'light', 'system'];

export const ThemeToggle = ({ variant = 'full' }: ThemeToggleProps) => {
    const { mode, setMode, tokens } = useAppTheme();
    const compact = variant === 'compact';

    return (
        <View
            className={`flex-row ${compact ? 'p-1 rounded-xl' : 'p-1 rounded-2xl'}`}
            style={{ backgroundColor: tokens.bgElevated, borderColor: tokens.borderSubtle, borderWidth: 1 }}
        >
            {themeModes.map((themeMode) => {
                const isActive = mode === themeMode;
                const label = compact ? themeMode.slice(0, 1).toUpperCase() : themeMode;

                return (
                    <Pressable
                        key={themeMode}
                        onPress={async () => {
                            if (mode === themeMode) {
                                return;
                            }

                            await triggerSelectionHaptic();
                            setMode(themeMode);
                            AccessibilityInfo.announceForAccessibility(`Theme set to ${themeMode}`);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Set ${themeMode} theme`}
                        accessibilityState={{ selected: isActive }}
                        android_ripple={{ color: `${tokens.accent}33`, borderless: false }}
                        hitSlop={8}
                        className={`items-center justify-center ${compact ? 'px-3 h-12 rounded-lg' : 'flex-1 h-12 rounded-xl'}`}
                        style={{
                            backgroundColor: isActive ? tokens.accent : 'transparent',
                        }}
                    >
                        <Text
                            className={`font-semibold ${compact ? 'text-sm uppercase' : 'text-base capitalize'}`}
                            style={{ color: isActive ? '#ffffff' : tokens.textSecondary }}
                        >
                            {label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
};
