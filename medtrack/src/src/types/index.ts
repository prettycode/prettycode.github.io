import React from 'react';

/**
 * Type definitions for the Medication Tracker application
 */

// Storage keys for localStorage
export const STORAGE_KEYS = {
    DOSES: 'medicationDoses',
    INTERVAL: 'medicationInterval'
};

// Medication interval options
export const INTERVAL_OPTIONS = [
    { label: '3x per Day (Every 8 hours)', value: 8 * 60 },
    { label: '2x per Day (Every 12 hours)', value: 12 * 60 },
    { label: 'ED (Every 24 hours)', value: 24 * 60 },
    { label: 'EOD (Every 48 hours)', value: 48 * 60 },
    { label: '3x per Week (Every 56 hours)', value: 56 * 60 },
    { label: '2x per Week (Every 84 hours)', value: 84 * 60 },
    { label: 'EW (Every 7 days)', value: 168 * 60 }
];

// Adherence level constants
export enum AdherenceLevel {
    EXCELLENT = 'excellent',
    FAIR = 'fair',
    POOR = 'poor'
}

export const ADHERENCE_COLORS = {
    [AdherenceLevel.EXCELLENT]: 'bg-green-500',
    [AdherenceLevel.FAIR]: 'bg-yellow-500',
    [AdherenceLevel.POOR]: 'bg-red-500'
};

export const ADHERENCE_TEXT_COLORS = {
    [AdherenceLevel.EXCELLENT]: 'text-green-600',
    [AdherenceLevel.FAIR]: 'text-yellow-600',
    [AdherenceLevel.POOR]: 'text-red-600'
};

export const ADHERENCE_BG_COLORS = {
    [AdherenceLevel.EXCELLENT]: 'bg-green-100',
    [AdherenceLevel.FAIR]: 'bg-yellow-100',
    [AdherenceLevel.POOR]: 'bg-red-100'
};

// Interfaces
export interface Dose {
    id: number;
    time: string;
}

export interface IntervalOption {
    label: string;
    value: number;
}

export interface AdherenceInfo {
    percentage: number;
    status: AdherenceLevel;
    avgDeviation?: number;
}

export interface NextDoseInfo {
    overdue: boolean;
    time: string;
    missedIntervals: number;
}

export interface DoseAdherenceInfo {
    adherencePercentage: number;
    exceedsCap: boolean;
    isEarly: boolean;
    isLate: boolean;
    category: AdherenceLevel;
}

export interface FormattedDateTime {
    dayOfWeek: string;
    timeOfDay: string;
    timeZone: string;
}

// State interfaces
export interface MedicationState {
    doses: Dose[];
    intervalMinutes: number;
    nextDoseTime: Date | null;
}

export type MedicationAction =
    | { type: 'ADD_DOSE'; payload: Dose }
    | { type: 'UPDATE_DOSE'; payload: { id: number; time: string } }
    | { type: 'DELETE_DOSE'; payload: number }
    | { type: 'RESET_DOSES' }
    | { type: 'SET_INTERVAL'; payload: number }
    | { type: 'SET_NEXT_DOSE'; payload: Date | null };

// Context interface
export interface MedicationContextType {
    doses: Dose[];
    intervalMinutes: number;
    nextDoseTime: Date | null;
    currentTime: Date;
    showAddModal: boolean;
    setShowAddModal: (show: boolean) => void;
    showEditModal: boolean;
    setShowEditModal: (show: boolean) => void;
    editingDose: Dose | null;
    setEditingDose: (dose: Dose | null) => void;
    showResetConfirm: boolean;
    setShowResetConfirm: (show: boolean) => void;
    showDeleteConfirm: boolean;
    setShowDeleteConfirm: (show: boolean) => void;
    deletingDose: Dose | null;
    setDeletingDose: (dose: Dose | null) => void;
    addDose: (time: Date) => void;
    updateDose: (id: number, time: Date) => void;
    deleteDose: (id: number) => void;
    resetDoses: () => void;
    setIntervalMinutes: (minutes: number) => void;
    calculateAdherence: () => AdherenceInfo;
    getTimeUntilNextDose: () => NextDoseInfo | null;
    getDoseAdherence: (doseTime: string, doseIndex: number) => DoseAdherenceInfo;
    calculateStreak: () => number;
    dateUtils: {
        formatTimeDifference: (milliseconds: number, showZeros?: boolean) => string;
        formatDateTime: (dateString: string) => string;
        formatDateTimeWithDayOfWeek: (dateString: string) => FormattedDateTime;
        getCurrentDateTimeForInput: () => string;
        getDateTimeForEditInput: (timeString: string) => string;
    };
    // Google backup related properties
    isBackupInProgress: boolean;
    lastBackupTime: Date | null;
    backupError: string | null;
    isRestoringData: boolean;
    backupToGoogleDrive: () => Promise<void>;
    restoreFromGoogleDrive: () => Promise<void>;
}

// Component Props
export interface CardProps {
    title: string;
    children: React.ReactNode;
    className?: string;
    action?: React.ReactNode;
}

export interface ModalProps {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
    actions: React.ReactNode;
}

export interface IconProps {
    type: 'Clock' | 'Delete' | 'AlertTriangle' | 'Edit';
    size?: number;
    className?: string;
}
