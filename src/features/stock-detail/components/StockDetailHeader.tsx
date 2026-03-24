import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import type { DataFreshnessType, DataSourceType } from '@app/types';
import { formatClockTime, formatRelativeTime } from '@app/utils/format';
import { useAppTheme, appTypography } from '@core/theme';
import { SourceBadge } from '@shared/ui/SourceBadge';

interface StockDetailHeaderProps {
    companyName: string;
    freshness: DataFreshnessType;
    isFetching: boolean;
    marketLabel: string;
    source: DataSourceType;
    sourceHint: string | null;
    ticker: string;
    updateTimestamp: number;
}

export const StockDetailHeader = ({
    companyName,
    freshness,
    isFetching,
    marketLabel,
    source,
    sourceHint,
    ticker,
    updateTimestamp,
}: StockDetailHeaderProps) => {
    const { tokens } = useAppTheme();

    return (
        <View className="px-4 pt-4 pb-2">
            <Text
                className="text-4xl font-extrabold tracking-tight"
                style={[appTypography.heading, { color: tokens.textPrimary }]}
            >
                {ticker}
            </Text>
            <Text
                className="mt-1 text-lg font-semibold"
                style={{ color: tokens.textSecondary }}
                numberOfLines={2}
                ellipsizeMode="tail"
            >
                {companyName}
            </Text>
            <Text className="mt-1 text-base" style={{ color: tokens.textSecondary }}>
                Market: {marketLabel} • {freshness}
            </Text>
            <Text className="mt-1 text-xs" style={{ color: tokens.textMuted }}>
                Updated {formatRelativeTime(updateTimestamp)} ({formatClockTime(updateTimestamp)})
            </Text>

            <View className="mt-3 flex-row items-center flex-wrap gap-2">
                <SourceBadge source={source} />
                {isFetching ? (
                    <View className="flex-row items-center">
                        <ActivityIndicator size="small" color={tokens.accent} />
                        <Text className="ml-1 text-xs font-medium" style={{ color: tokens.accent }}>
                            Updating...
                        </Text>
                    </View>
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
