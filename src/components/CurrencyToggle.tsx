import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CurrencyType } from '../types';
import { useAppTheme } from '../theme/ThemeContext';

interface CurrencyToggleProps {
    activeCurrency: CurrencyType;
    onSelect: (currency: CurrencyType) => void;
}

export const CurrencyToggle = ({ activeCurrency, onSelect }: CurrencyToggleProps) => {
    const { isDark } = useAppTheme();
    const currencies: CurrencyType[] = ['ARS', 'USD'];

    return (
        <View className="flex-row justify-between px-4 mb-4 gap-x-2">
            {currencies.map((currency) => {
                const isActive = activeCurrency === currency;
                return (
                    <TouchableOpacity
                        key={currency}
                        onPress={() => onSelect(currency)}
                        className={`flex-1 items-center py-2 rounded-full ${isActive ? 'bg-cyan-600' : isDark ? 'bg-neutral-800' : 'bg-slate-200'}`}
                    >
                        <Text className={`font-medium ${isActive ? 'text-white' : isDark ? 'text-neutral-400' : 'text-slate-600'}`}>
                            {currency}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};
