/**
 * Centralized logging service
 * Provides consistent logging across the application
 */

export interface Logger {
    error: (message: string, error?: unknown) => void;
    warn: (message: string, data?: unknown) => void;
    info: (message: string, data?: unknown) => void;
    debug: (message: string, data?: unknown) => void;
}

class LoggerImpl implements Logger {
    error(message: string, error?: unknown): void {
        console.error(`[ERROR] ${message}`, error);
        // In production, you could send this to a service like Sentry
    }

    warn(message: string, data?: unknown): void {
        console.warn(`[WARN] ${message}`, data);
    }

    info(message: string, data?: unknown): void {
        console.info(`[INFO] ${message}`, data);
    }

    debug(message: string, data?: unknown): void {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[DEBUG] ${message}`, data);
        }
    }
}

export const logger = new LoggerImpl();
