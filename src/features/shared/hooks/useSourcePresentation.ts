import type { DataSourceType } from '@app/types';
import { useAppTheme } from '@core/theme';
import { getSourcePresentation } from '@shared/lib/sourcePresentation';

export const useSourcePresentation = (source: DataSourceType, stale?: boolean) => {
    const { tokens } = useAppTheme();
    return getSourcePresentation(source, tokens, stale);
};
