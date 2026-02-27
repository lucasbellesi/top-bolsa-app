import { ResolvedThemeMode } from './tokens';

export type SystemColorScheme = 'light' | 'dark' | null | undefined;

export const resolveThemeMode = (
    systemColorScheme: SystemColorScheme
): ResolvedThemeMode => {
    return systemColorScheme === 'dark' ? 'dark' : 'light';
};
