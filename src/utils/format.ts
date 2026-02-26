import { CurrencyType } from '../types';

export const formatCurrencyValue = (value: number, currency: CurrencyType): string => {
    return new Intl.NumberFormat(currency === 'ARS' ? 'es-AR' : 'en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

export const formatPercent = (value: number): string => {
    const sign = value > 0 ? '+' : value < 0 ? '-' : '';
    return `${sign}${Math.abs(value).toFixed(2)}%`;
};

export const formatClockTime = (timestamp: number): string =>
    new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

export const formatRelativeTime = (timestamp: number): string => {
    const secondsAgo = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

    if (secondsAgo < 30) {
        return 'just now';
    }

    if (secondsAgo < 60) {
        return `${secondsAgo}s ago`;
    }

    const minutesAgo = Math.floor(secondsAgo / 60);
    if (minutesAgo < 60) {
        return `${minutesAgo}m ago`;
    }

    const hoursAgo = Math.floor(minutesAgo / 60);
    if (hoursAgo < 24) {
        return `${hoursAgo}h ago`;
    }

    const daysAgo = Math.floor(hoursAgo / 24);
    return `${daysAgo}d ago`;
};
