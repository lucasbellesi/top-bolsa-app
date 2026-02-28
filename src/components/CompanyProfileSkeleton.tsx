import React from 'react';
import { View } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';

export const CompanyProfileSkeleton = () => {
    const { tokens } = useAppTheme();

    return (
        <View
            className="mx-4 mt-4 p-4 rounded-2xl border"
            style={{ backgroundColor: tokens.bgSurface, borderColor: tokens.borderSubtle }}
        >
            <View className="h-4 w-24 rounded-full mb-4" style={{ backgroundColor: tokens.bgElevated }} />
            <View className="h-3 w-full rounded-full mb-2" style={{ backgroundColor: tokens.bgElevated }} />
            <View className="h-3 w-11/12 rounded-full mb-4" style={{ backgroundColor: tokens.bgElevated }} />
            <View className="flex-row flex-wrap">
                <View className="w-1/2 pr-2 mb-3">
                    <View className="h-3 w-16 rounded-full mb-1" style={{ backgroundColor: tokens.bgElevated }} />
                    <View className="h-4 w-24 rounded-full" style={{ backgroundColor: tokens.bgElevated }} />
                </View>
                <View className="w-1/2 pr-2 mb-3">
                    <View className="h-3 w-16 rounded-full mb-1" style={{ backgroundColor: tokens.bgElevated }} />
                    <View className="h-4 w-28 rounded-full" style={{ backgroundColor: tokens.bgElevated }} />
                </View>
            </View>
        </View>
    );
};
