import React from 'react';
import { Text, View } from 'react-native';

import type { DataSourceType } from '@app/types';
import { formatClockTime } from '@app/utils/format';
import { useAppTheme, appTypography } from '@core/theme';
import { SourceBadge } from '@shared/ui/SourceBadge';

interface MarketScreenHeaderProps {
    isFetching: boolean;
    lastUpdatedAt: number | null;
    source?: DataSourceType;
    sourceHint: string | null;
    subtitle?: string;
    title?: string;
}

export const MarketScreenHeader = ({
    isFetching,
    lastUpdatedAt,
    source,
    sourceHint,
    subtitle = 'Real-time market leaders',
    title = 'Top Gainers',
}: MarketScreenHeaderProps) => {
    const { tokens } = useAppTheme();

    return (
        <View className="px-4 pt-4 pb-2">
            <Text
                className="text-4xl font-extrabold tracking-tight"
                style={[appTypography.heading, { color: tokens.textPrimary }]}
            >
                {title}
            </Text>
            <Text className="mt-1 text-lg" style={{ color: tokens.textSecondary }}>
                {subtitle}
            </Text>

            <View className="mt-3 flex-row items-center flex-wrap gap-2">
                {source ? <SourceBadge source={source} /> : null}
                {lastUpdatedAt ? (
                    <Text className="text-xs" style={{ color: tokens.textMuted }}>
                        Last update: {formatClockTime(lastUpdatedAt)}
                    </Text>
                ) : null}
                {isFetching ? (
                    <Text className="text-xs font-medium" style={{ color: tokens.accent }}>
                        Updating...
                    </Text>
                ) : null}
            </View>

            {sourceHint ? (
                <Text className="mt-2 text-xs" style={{ color: tokens.textMuted }}>
                    {sourceHint}
                </Text>
            ) : null}
        </View>
    );
};
