import { isRuntimeDev } from '@core/config/env';

type LogContext = unknown;
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const shouldLogDebug = (): boolean => isRuntimeDev() || process.env.NODE_ENV === 'test';

const writeLog = (level: LogLevel, message: string, context?: LogContext): void => {
    if ((level === 'debug' || level === 'info') && !shouldLogDebug()) {
        return;
    }

    if (context) {
        console[level](message, context);
        return;
    }

    console[level](message);
};

export const logger = {
    debug: (message: string, context?: LogContext): void => writeLog('debug', message, context),
    info: (message: string, context?: LogContext): void => writeLog('info', message, context),
    warn: (message: string, context?: LogContext): void => writeLog('warn', message, context),
    error: (message: string, context?: LogContext): void => writeLog('error', message, context),
};
