import * as Haptics from 'expo-haptics';

export const triggerSelectionHaptic = async (): Promise<void> => {
    try {
        await Haptics.selectionAsync();
    } catch {
        // Ignore haptics failures in unsupported environments.
    }
};
