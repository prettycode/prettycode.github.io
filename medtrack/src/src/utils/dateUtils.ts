import { FormattedDateTime } from '../types';

/**
 * Date formatting utility functions
 */
export const dateUtils = {
    formatTimeDifference: (milliseconds: number, showZeros: boolean = true): string => {
        const ms = Math.max(0, milliseconds);
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));
        const weeks = Math.floor(days / 7);
        const years = Math.floor(weeks / 52);
        const remainingWeeks = weeks % 52;
        const remainingDays = days % 7;
        const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((ms % (1000 * 60)) / 1000);

        // Define all possible time unit scales
        const timeScales = {
            years: [
                { value: years, label: 'y' },
                { value: remainingWeeks, label: 'w' },
                { value: remainingDays, label: 'd' }
            ],
            weeks: [
                { value: weeks, label: 'w' },
                { value: remainingDays, label: 'd' },
                { value: hours, label: 'h' }
            ],
            days: [
                { value: days, label: 'd' },
                { value: hours, label: 'h' },
                { value: minutes, label: 'm' }
            ],
            hours: [
                { value: hours, label: 'h' },
                { value: minutes, label: 'm' },
                { value: seconds, label: 's' }
            ],
            minutes: [
                { value: minutes, label: 'm' },
                { value: seconds, label: 's' }
            ]
        };

        // Determine the appropriate scale based on the time values
        let timeUnits;

        if (years > 0) {
            timeUnits = timeScales.years;
        } else if (weeks > 0) {
            timeUnits = timeScales.weeks;
        } else if (days > 0) {
            timeUnits = timeScales.days;
        } else if (hours > 0) {
            timeUnits = timeScales.hours;
        } else {
            timeUnits = timeScales.minutes;
        }

        if (showZeros) {
            // Format with all units including zeros
            return timeUnits.map(unit => `${unit.value}${unit.label}`).join(' ');
        } else {
            // Only include non-zero values
            const parts = timeUnits.filter(unit => unit.value > 0).map(unit => `${unit.value}${unit.label}`);

            // Return at least the smallest unit if everything is zero
            return parts.length > 0 ? parts.join(' ') : `0${timeUnits[timeUnits.length - 1].label}`;
        }
    },

    formatDateTime: (dateString: string): string => {
        const date = new Date(dateString);
        const options: Intl.DateTimeFormatOptions = {
            weekday: 'short',
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
