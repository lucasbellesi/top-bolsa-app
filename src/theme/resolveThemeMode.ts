import { ThemeMode } from './ThemeMode';
import { ResolvedThemeMode } from './tokens';

export type SystemColorScheme = 'light' | 'dark' | null | undefined;

export const resolveThemeMode = (
    mode: ThemeMode,
    systemColorScheme: SystemColorScheme
): ResolvedThemeMode => {
    if (mode === 'system') {
        return systemColorScheme === 'dark' ? 'dark' : 'light';
    }

    return mode;
};
