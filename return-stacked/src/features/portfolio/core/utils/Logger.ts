/**
 * Centralized logging service
 */

export const logger = {
    error(message: string, error?: unknown): void {
        console.error(`[ERROR] ${message}`, error);
    },
};
