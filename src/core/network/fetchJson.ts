import { AppError, createAppError, type AppError as AppErrorType } from '@core/errors/AppError';

export interface FetchJsonOptions extends RequestInit {
    timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 12000;

const createTimeoutSignal = (timeoutMs: number): { cleanup: () => void; signal?: AbortSignal } => {
    if (typeof AbortController === 'undefined') {
        return { cleanup: () => undefined };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    return {
        cleanup: () => clearTimeout(timeoutId),
        signal: controller.signal,
    };
};

export const fetchJson = async <TResponse>(
    url: string,
    options?: FetchJsonOptions,
): Promise<TResponse> => {
    const { timeoutMs = DEFAULT_TIMEOUT_MS, ...requestInit } = options || {};
    const timeout = createTimeoutSignal(timeoutMs);

    try {
        const response = await fetch(url, {
            ...requestInit,
            signal: requestInit.signal || timeout.signal,
        });

        if (response.ok === false) {
            throw createAppError({
                kind: 'network',
                message: `Request failed with status ${response.status}`,
                status: response.status,
            });
        }

        return (await response.json()) as TResponse;
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }

        const networkError: AppErrorType =
            error instanceof Error && error.name === 'AbortError'
                ? createAppError({
                      kind: 'network',
                      message: `Request timed out after ${timeoutMs}ms`,
                      cause: error,
                  })
                : createAppError({
                      kind: 'network',
                      message: 'Network request failed',
                      cause: error,
                  });

        throw networkError;
    } finally {
        timeout.cleanup();
    }
};
