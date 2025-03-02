// Constants for local storage keys
const STORAGE_KEYS = {
  DOSES: 'medicationDoses',
  INTERVAL: 'medicationInterval'
};

// Medication interval options
const INTERVAL_OPTIONS = [
  { label: "3x per Day (Every 8 hours)", value: 8 * 60 },
  { label: "2x per Day (Every 12 hours)", value: 12 * 60 },
  { label: "ED (Every 24 hours)", value: 24 * 60 },
  { label: "EOD (Every 48 hours)", value: 48 * 60 },
  { label: "3x per Week (Every 56 hours)", value: 56 * 60 },
  { label: "2x per Week (Every 84 hours)", value: 84 * 60 },
  { label: "EW (Every 7 days)", value: 168 * 60 }
];

// Standardized adherence levels
const ADHERENCE_LEVELS = {
  EXCELLENT: 'excellent',
  FAIR: 'fair',
  POOR: 'poor'
};

// Tailwind CSS classes for adherence status
const ADHERENCE_COLORS = {
  [ADHERENCE_LEVELS.EXCELLENT]: 'bg-green-500',
  [ADHERENCE_LEVELS.FAIR]: 'bg-yellow-500',
  [ADHERENCE_LEVELS.POOR]: 'bg-red-500'
};

const ADHERENCE_TEXT_COLORS = {
  [ADHERENCE_LEVELS.EXCELLENT]: 'text-green-600',
  [ADHERENCE_LEVELS.FAIR]: 'text-yellow-600',
  [ADHERENCE_LEVELS.POOR]: 'text-red-600'
};

const ADHERENCE_BG_COLORS = {
  [ADHERENCE_LEVELS.EXCELLENT]: 'bg-green-100',
  [ADHERENCE_LEVELS.FAIR]: 'bg-yellow-100',
  [ADHERENCE_LEVELS.POOR]: 'bg-red-100'
};

// Action types for reducer
const ACTION_TYPES = {
  ADD_DOSE: 'ADD_DOSE',
  UPDATE_DOSE: 'UPDATE_DOSE',
  DELETE_DOSE: 'DELETE_DOSE',
  RESET_DOSES: 'RESET_DOSES',
  SET_INTERVAL: 'SET_INTERVAL',
  SET_NEXT_DOSE: 'SET_NEXT_DOSE'
};

// Thresholds for adherence calculations
const ADHERENCE_THRESHOLDS = {
  EXCELLENT: 5, // 5% deviation or less
  FAIR: 10      // 10% deviation or less
}; 