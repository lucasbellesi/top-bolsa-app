import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';

export const StockListSkeleton = ({ rows = 10 }: { rows?: number }) => {
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
        <View className="px-4 pt-1">
            {Array.from({ length: rows }).map((_, index) => (
                <Animated.View
                    key={`skeleton-row-${index}`}
                    className="h-24 rounded-2xl mb-3 border"
                    style={{
                        opacity: pulse,
                        backgroundColor: tokens.bgSurface,
                        borderColor: tokens.borderSubtle,
                    }}
                />
            ))}
        </View>
    );
};
