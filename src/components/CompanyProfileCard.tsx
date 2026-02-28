import React from 'react';
import { Text, View } from 'react-native';
import { CompanyProfileData } from '../types';
import { useAppTheme } from '../theme/ThemeContext';
import { appTypography } from '../theme/typography';
import { formatMarketCap } from '../utils/format';
import { CompanyProfileSkeleton } from './CompanyProfileSkeleton';

interface CompanyProfileCardProps {
    profile?: CompanyProfileData | null;
    isLoading?: boolean;
    isError?: boolean;
    fallbackCompanyName: string;
}

export const CompanyProfileCard = ({
    profile,
    isLoading = false,
    isError = false,
    fallbackCompanyName,
}: CompanyProfileCardProps) => {
    const { tokens } = useAppTheme();

    if (isLoading) {
        return <CompanyProfileSkeleton />;
    }

    if (isError) {
        return (
            <View
                className="mx-4 mt-4 p-4 rounded-2xl border"
                style={{ backgroundColor: tokens.bgSurface, borderColor: tokens.borderSubtle }}
            >
                <Text className="text-sm font-semibold" style={{ color: tokens.textPrimary }}>
                    Company
                </Text>
                <Text className="mt-3 text-sm" style={{ color: tokens.textMuted }}>
                    Company information temporarily unavailable.
                </Text>
            </View>
        );
    }

    const companyName = profile?.companyName || fallbackCompanyName;
    const facts = [
        profile?.marketCap
            ? { label: 'Market cap', value: formatMarketCap(profile.marketCap, profile.market === 'US' ? 'USD' : 'ARS') }
            : null,
        profile?.sector ? { label: 'Sector', value: profile.sector } : null,
        profile?.industry ? { label: 'Industry', value: profile.industry } : null,
        profile?.exchange ? { label: 'Exchange', value: profile.exchange } : null,
        profile?.country ? { label: 'Country', value: profile.country } : null,
    ].filter((item): item is { label: string; value: string } => Boolean(item && item.value));

    const hasDescription = Boolean(profile?.description);
    const hasFacts = facts.length > 0;
    const hasWebsite = Boolean(profile?.website);

    return (
        <View
            className="mx-4 mt-4 p-4 rounded-2xl border"
            style={{ backgroundColor: tokens.bgSurface, borderColor: tokens.borderSubtle }}
        >
            <Text className="text-sm font-semibold" style={{ color: tokens.textPrimary }}>
                Company
            </Text>

            <Text
                className="mt-2 text-lg font-bold"
                style={[appTypography.heading, { color: tokens.textPrimary }]}
                numberOfLines={2}
                ellipsizeMode="tail"
            >
                {companyName}
            </Text>

            {hasDescription ? (
                <Text
                    className="mt-3 text-sm leading-5"
                    style={{ color: tokens.textSecondary }}
                    numberOfLines={4}
                    ellipsizeMode="tail"
                >
                    {profile?.description}
                </Text>
            ) : null}

            {hasFacts ? (
                <View className="mt-4 flex-row flex-wrap">
                    {facts.map((fact) => (
                        <View key={fact.label} className="w-1/2 pr-2 mb-3">
                            <Text className="text-xs" style={{ color: tokens.textMuted }}>
                                {fact.label}
                            </Text>
                            <Text className="mt-1 text-sm font-semibold" style={{ color: tokens.textSecondary }} numberOfLines={2}>
                                {fact.value}
                            </Text>
                        </View>
                    ))}
                </View>
            ) : null}

            {hasWebsite ? (
                <View className="mt-1">
                    <Text className="text-xs" style={{ color: tokens.textMuted }}>
                        Website
                    </Text>
                    <Text className="mt-1 text-sm" style={{ color: tokens.textSecondary }} numberOfLines={1} ellipsizeMode="tail">
                        {profile?.website}
                    </Text>
                </View>
            ) : null}

            {!hasDescription && !hasFacts && !hasWebsite ? (
                <Text className="mt-3 text-sm" style={{ color: tokens.textMuted }}>
                    Company information unavailable.
                </Text>
            ) : null}
        </View>
    );
};
