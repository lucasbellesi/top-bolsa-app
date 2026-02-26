import { ThemeMode } from './ThemeMode';
import { ResolvedThemeMode } from './tokens';

export type SystemColorScheme = 'light' | 'dark' | null | undefined;
export type PersistedThemeMode = ThemeMode | 'system';

export const resolveThemeMode = (
    mode: PersistedThemeMode,
    systemColorScheme: SystemColorScheme
): ResolvedThemeMode => {
    if (mode === 'system') {
        return systemColorScheme === 'dark' ? 'dark' : 'light';
    }

    return mode;
};
