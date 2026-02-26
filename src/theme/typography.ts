import { Platform, TextStyle } from 'react-native';

export const appTypography = {
    heading: {
        fontFamily: Platform.select({
            android: 'sans-serif',
            ios: 'System',
            default: 'System',
        }),
    } satisfies TextStyle,
    numbers: {
        fontFamily: Platform.select({
            android: 'monospace',
            ios: 'Menlo',
            default: 'monospace',
        }),
        fontVariant: ['tabular-nums'],
    } satisfies TextStyle,
};
