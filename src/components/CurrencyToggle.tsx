import React from 'react';
import { LayoutAnimation, Pressable, Text, View } from 'react-native';
import { CurrencyType } from '../types';
import { useAppTheme } from '../theme/ThemeContext';
import { triggerSelectionHaptic } from '../utils/feedback';

interface CurrencyToggleProps {
    activeCurrency: CurrencyType;
    onSelect: (currency: CurrencyType) => void;
}

export const CurrencyToggle = ({ activeCurrency, onSelect }: CurrencyToggleProps) => {
    const { tokens } = useAppTheme();
    const currencies: CurrencyType[] = ['ARS', 'USD'];

    return (
        <View
            className="flex-row mx-4 mb-3 p-1 rounded-2xl"
            style={{ backgroundColor: tokens.bgElevated, borderColor: tokens.borderSubtle, borderWidth: 1 }}
        >
            {currencies.map((currency) => {
                const isActive = activeCurrency === currency;
                return (
                    <Pressable
                        key={currency}
                        onPress={async () => {
                            if (activeCurrency === currency) {
                                return;
                            }

                            LayoutAnimation.configureNext({
                                duration: 160,
                                update: { type: LayoutAnimation.Types.easeInEaseOut },
                                create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
                                delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
                            });
                            await triggerSelectionHaptic();
                            onSelect(currency);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Switch currency to ${currency}`}
                        accessibilityState={{ selected: isActive }}
                        android_ripple={{ color: `${tokens.accent}33`, borderless: false }}
                        hitSlop={8}
                        className="flex-1 h-12 items-center justify-center rounded-xl"
                        style={{
                            backgroundColor: isActive ? tokens.accent : 'transparent',
                        }}
                    >
                        <Text className="font-semibold text-base" style={{ color: isActive ? '#ffffff' : tokens.textSecondary }}>
                            {currency}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
};
