import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CurrencyType } from '../types';

interface CurrencyToggleProps {
    activeCurrency: CurrencyType;
    onSelect: (currency: CurrencyType) => void;
}

export const CurrencyToggle = ({ activeCurrency, onSelect }: CurrencyToggleProps) => {
    const currencies: CurrencyType[] = ['ARS', 'USD'];

    return (
        <View className="flex-row justify-between px-4 mb-4 gap-x-2">
            {currencies.map((currency) => {
                const isActive = activeCurrency === currency;
                return (
                    <TouchableOpacity
                        key={currency}
                        onPress={() => onSelect(currency)}
                        className={`flex-1 items-center py-2 rounded-full ${isActive ? 'bg-cyan-600' : 'bg-neutral-800'}`}
                    >
                        <Text className={`font-medium ${isActive ? 'text-white' : 'text-neutral-400'}`}>
                            {currency}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};
