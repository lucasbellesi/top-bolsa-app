import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useAppTheme } from '@core/theme';

interface FeedbackStateProps {
    actionLabel?: string;
    description?: string;
    onAction?: () => void;
    title: string;
    tone?: 'negative' | 'warning';
}

export const FeedbackState = ({
    actionLabel,
    description,
    onAction,
    title,
    tone = 'warning',
}: FeedbackStateProps) => {
    const { tokens } = useAppTheme();
    const toneColor = tone === 'negative' ? tokens.negative : tokens.warning;

    return (
        <View className="flex-1 justify-center items-center px-8">
            <Text className="font-bold mb-3 text-center" style={{ color: toneColor }}>
                {title}
            </Text>
            {description ? (
                <Text className="mt-2 text-center" style={{ color: tokens.textMuted }}>
                    {description}
                </Text>
            ) : null}
            {actionLabel && onAction ? (
                <Pressable onPress={onAction} className="mt-4" hitSlop={8}>
                    <Text className="font-semibold" style={{ color: tokens.accent }}>
                        {actionLabel}
                    </Text>
                </Pressable>
            ) : null}
        </View>
    );
};
