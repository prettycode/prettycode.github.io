import { FormattedDateTime } from '../types';

/**
 * Date formatting utility functions
 */
export const dateUtils = {
    formatTimeDifference: (milliseconds: number): string => {
        const ms = Math.max(0, milliseconds);
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));
        const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((ms % (1000 * 60)) / 1000);

        if (days > 0) return `${days}d ${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
        return `${minutes}m ${seconds}s`;
    },

    formatDateTime: (dateString: string): string => {
        const date = new Date(dateString);
        const options: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZoneName: 'short'
        };

        return date.toLocaleString(undefined, options);
    },

    formatDateTimeWithDayOfWeek: (dateString: string): FormattedDateTime => {
        const date = new Date(dateString);
        const dayOfWeek = date.toLocaleString(undefined, { weekday: 'long' });

        const timeOptions: Intl.DateTimeFormatOptions = {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        };

        const timeOfDay = date.toLocaleString(undefined, timeOptions);
        const timeZone = date.toLocaleString(undefined, { timeZoneName: 'short' }).split(' ').pop() || '';

        return { dayOfWeek, timeOfDay, timeZone };
    },

    getCurrentDateTimeForInput: (): string => {
        const now = new Date();
        return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    },

    getDateTimeForEditInput: (timeString: string): string => {
        const date = new Date(timeString);
        return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }
};
