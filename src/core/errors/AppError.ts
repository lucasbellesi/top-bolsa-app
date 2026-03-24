export type AppErrorKind = 'config' | 'network' | 'remote' | 'parsing' | 'not_found' | 'unknown';

export interface AppErrorOptions {
    cause?: unknown;
    details?: Record<string, unknown>;
    kind: AppErrorKind;
    message: string;
    status?: number;
}

export class AppError extends Error {
    cause?: unknown;
    details?: Record<string, unknown>;
    kind: AppErrorKind;
    status?: number;

    constructor({ cause, details, kind, message, status }: AppErrorOptions) {
        super(message);
        this.name = 'AppError';
        this.kind = kind;
        this.status = status;
        this.cause = cause;
        this.details = details;
    }
}

export const createAppError = (options: AppErrorOptions): AppError => new AppError(options);

export const toAppError = (
    error: unknown,
    fallback: Pick<AppErrorOptions, 'kind' | 'message'>,
): AppError => {
    if (error instanceof AppError) {
        return error;
    }

    if (error instanceof Error) {
        return createAppError({
            ...fallback,
            cause: error,
            message: error.message || fallback.message,
        });
    }

    return createAppError({
        ...fallback,
        cause: error,
    });
};

export const getErrorMessage = (error: unknown, fallback = 'Unknown error'): string => {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    if (typeof error === 'string' && error.trim().length > 0) {
        return error.trim();
    }

    return fallback;
};
