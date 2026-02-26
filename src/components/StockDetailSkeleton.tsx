import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';

export const StockDetailSkeleton = () => {
    const { tokens } = useAppTheme();
    const pulse = useRef(new Animated.Value(0.55)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 0.55, duration: 700, useNativeDriver: true }),
            ])
        ).start();
    }, [pulse]);

    return (
        <View className="px-4 pt-4">
            <Animated.View
                className="h-40 rounded-2xl border mb-4"
                style={{
                    opacity: pulse,
                    backgroundColor: tokens.bgSurface,
                    borderColor: tokens.borderSubtle,
                }}
            />
            <Animated.View
                className="h-72 rounded-2xl border"
                style={{
                    opacity: pulse,
                    backgroundColor: tokens.bgSurface,
                    borderColor: tokens.borderSubtle,
                }}
            />
        </View>
    );
};
