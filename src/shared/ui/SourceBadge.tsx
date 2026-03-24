import React, { memo } from 'react';
import { Text, View } from 'react-native';

import type { DataSourceType } from '@app/types';
import { useAppTheme } from '@core/theme';
import { getSourceBadgePalette } from '@shared/lib/sourcePresentation';

interface SourceBadgeProps {
    source: DataSourceType;
}

const SourceBadgeComponent = ({ source }: SourceBadgeProps) => {
    const { tokens } = useAppTheme();
    const palette = getSourceBadgePalette(source, tokens);

    return (
        <View
            className="self-start px-2 py-1 rounded-md border"
            style={{
                backgroundColor: palette.bg,
                borderColor: palette.border,
            }}
        >
            <Text className="text-xs font-bold" style={{ color: palette.text }}>
                {source.toUpperCase()}
            </Text>
        </View>
    );
};

export const SourceBadge = memo(SourceBadgeComponent);
