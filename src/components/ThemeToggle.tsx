import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';

export const ThemeToggle = () => {
    const { mode, setMode, isDark } = useAppTheme();

    const containerClass = isDark ? 'bg-neutral-900' : 'bg-slate-100 border border-slate-200';
    const inactiveTextClass = isDark ? 'text-neutral-400' : 'text-slate-600';

    return (
        <View className={`flex-row justify-between px-4 mb-4 gap-x-2 ${containerClass} rounded-xl py-2 mx-4`}>
            {(['dark', 'light'] as const).map((themeMode) => {
                const isActive = mode === themeMode;
                return (
                    <TouchableOpacity
                        key={themeMode}
                        onPress={() => setMode(themeMode)}
                        className={`flex-1 items-center py-2 rounded-full ${isActive ? 'bg-indigo-600' : isDark ? 'bg-neutral-800' : 'bg-slate-200'}`}
                    >
                        <Text className={`font-medium capitalize ${isActive ? 'text-white' : inactiveTextClass}`}>
                            {themeMode}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};
