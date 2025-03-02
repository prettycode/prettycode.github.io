import React, { createContext, useContext, useReducer, useState, useEffect, useRef, useCallback } from 'react';
import { 
  MedicationState, 
  MedicationAction, 
  MedicationContextType, 
  Dose,
  AdherenceLevel,
  NextDoseInfo,
  DoseAdherenceInfo,
  AdherenceInfo
} from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { STORAGE_KEYS } from '../types';
import { dateUtils } from '../utils/dateUtils';
import { triggerAlarmNotification } from '../utils/notificationUtils';

// Create Context
const MedicationContext = createContext<MedicationContextType | null>(null);

// Define reducer for state management
const medicationReducer = (state: MedicationState, action: MedicationAction): MedicationState => {
  switch (action.type) {
    case 'ADD_DOSE':
      return { 
        ...state, 
        doses: [...state.doses, action.payload] 
      };
    case 'UPDATE_DOSE':
      return { 
        ...state, 
        doses: state.doses
          .map(dose => dose.id === action.payload.id 
            ? { ...dose, time: action.payload.time } 
            : dose
          )
          .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      };
    case 'DELETE_DOSE':
      return { 
        ...state, 
        doses: state.doses.filter(dose => dose.id !== action.payload) 
      };
    case 'RESET_DOSES':
      return { 
        ...state, 
        doses: [] 
      };
    case 'SET_INTERVAL':
      return { 
        ...state, 
        intervalMinutes: action.payload 
      };
    case 'SET_NEXT_DOSE':
      return { 
        ...state, 
        nextDoseTime: action.payload 
      };
    default:
      return state;
  }
};

// Provider Props
interface MedicationProviderProps {
  children: React.ReactNode;
}

// Provider component
export const MedicationProvider: React.FC<MedicationProviderProps> = ({ children }) => {
  // Local storage state management
  const [storedDoses, setStoredDoses] = useLocalStorage<Dose[]>(STORAGE_KEYS.DOSES, []);
  const [storedInterval, setStoredInterval] = useLocalStorage<number>(STORAGE_KEYS.INTERVAL, 84 * 60); // Default: 2x per Week
  
  // Main application state
  const [state, dispatch] = useReducer(medicationReducer, {
    doses: storedDoses,
    intervalMinutes: storedInterval,
    nextDoseTime: null
  });
  
  // UI state
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingDose, setEditingDose] = useState<Dose | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [deletingDose, setDeletingDose] = useState<Dose | null>(null);
  
  // Refs
  const hasNotifiedRef = useRef<boolean>(false);
  
  // Business logic for dose timing calculations
  const calculateNextDoseTime = useCallback((dosesArray: Dose[] = state.doses) => {
    if (dosesArray.length === 0) {
      dispatch({ 
        type: 'SET_NEXT_DOSE', 
        payload: null 
      });
      return;
    }
    
    const firstDose = new Date(dosesArray[0].time);
    const nextDose = new Date(firstDose.getTime() + (dosesArray.length * state.intervalMinutes * 60 * 1000));
    dispatch({ 
      type: 'SET_NEXT_DOSE', 
      payload: nextDose 
    });
    
    hasNotifiedRef.current = false;
  }, [state.doses, state.intervalMinutes]);
  
  // Time tracking and notification effects
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      if (!state.nextDoseTime || hasNotifiedRef.current) {
        return;
      }
      
      if (now >= state.nextDoseTime) {
        const { 
          dayOfWeek, 
          timeOfDay, 
          timeZone 
        } = dateUtils.formatDateTimeWithDayOfWeek(state.nextDoseTime.toISOString());
        
        const alarmTitle = "Medication Due";
        const alarmBody = `Your next dose of medication is due ${dayOfWeek}, ${timeOfDay} ${timeZone}`;
        triggerAlarmNotification(alarmTitle, alarmBody);
        hasNotifiedRef.current = true;
      }
    }, 500);
    
    return () => clearInterval(timer);
  }, [state.nextDoseTime]);
  
  // Syncing state to localStorage
  useEffect(() => {
    setStoredDoses(state.doses);
  }, [state.doses, setStoredDoses]);
  
  useEffect(() => {
    setStoredInterval(state.intervalMinutes);
    if (state.doses.length > 0) {
      calculateNextDoseTime();
    }
  }, [state.intervalMinutes, calculateNextDoseTime, setStoredInterval, state.doses.length]);
  
  // Calculate next dose when doses change
  useEffect(() => {
    if (state.doses.length > 0) {
      calculateNextDoseTime();
    } else {
      dispatch({ 
        type: 'SET_NEXT_DOSE', 
        payload: null 
      });
    }
  }, [calculateNextDoseTime, state.doses.length]);
  
  // Action handlers
  const addDose = useCallback((time: Date) => {
    const newDose: Dose = { 
      time: time.toISOString(), 
      id: Date.now() 
    };
    dispatch({ 
      type: 'ADD_DOSE', 
      payload: newDose 
    });
    
    if (state.doses.length === 0) {
      const nextTime = new Date(time.getTime() + state.intervalMinutes * 60 * 1000);
      dispatch({ 
        type: 'SET_NEXT_DOSE', 
        payload: nextTime 
      });
    } else {
      calculateNextDoseTime([...state.doses, newDose]);
    }
    
    hasNotifiedRef.current = false;
  }, [state.doses, state.intervalMinutes, calculateNextDoseTime]);
  
  const updateDose = useCallback((id: number, time: Date) => {
    dispatch({ 
      type: 'UPDATE_DOSE', 
      payload: { 
        id, 
        time: time.toISOString() 
      } 
    });
    hasNotifiedRef.current = false;
  }, []);
  
  const deleteDose = useCallback((id: number) => {
    dispatch({ 
      type: 'DELETE_DOSE', 
      payload: id 
    });
    hasNotifiedRef.current = false;
  }, []);
  
  const resetDoses = useCallback(() => {
    dispatch({ 
      type: 'RESET_DOSES' 
    });
    dispatch({ 
      type: 'SET_NEXT_DOSE', 
      payload: null 
    });
    hasNotifiedRef.current = false;
  }, []);
  
  const setIntervalMinutes = useCallback((minutes: number) => {
    dispatch({ 
      type: 'SET_INTERVAL', 
      payload: minutes 
    });
    hasNotifiedRef.current = false;
  }, []);
  
  // Analysis functions
  const calculateAdherence = useCallback((): AdherenceInfo => {
    if (state.doses.length === 0) {
      return { 
        percentage: 100, 
        status: AdherenceLevel.EXCELLENT 
      };
    }
    
    let totalDeviations = 0;
    const firstDose = new Date(state.doses[0]?.time);
    
    for (let i = 1; i < state.doses.length; i++) {
      const expectedTime = new Date(firstDose.getTime() + (i * state.intervalMinutes * 60 * 1000));
      const actualTime = new Date(state.doses[i]?.time);
      const deviation = Math.abs(actualTime.getTime() - expectedTime.getTime()) / (1000 * 60);
      
      totalDeviations += deviation;
    }
    
    let totalIntervals = state.doses.length - 1;
    if (state.nextDoseTime) {
      totalIntervals += 1;
      
      const now = currentTime;
      if (now > state.nextDoseTime) {
        const overdueMinutes = (now.getTime() - state.nextDoseTime.getTime()) / (1000 * 60);
        totalDeviations += overdueMinutes;
      }
    }
    
    const avgDeviation = totalIntervals > 0 ? totalDeviations / totalIntervals : 0;
    const totalExpectedTime = totalIntervals * state.intervalMinutes;
    
    if (totalExpectedTime === 0) {
      return { 
        percentage: 100, 
        status: AdherenceLevel.EXCELLENT, 
        avgDeviation: 0 
      };
    }
    
    const deviationPercentage = (totalDeviations / totalExpectedTime) * 100;
    const percentage = Math.max(0, Math.min(100, 100 - deviationPercentage));
    
    let status: AdherenceLevel;
    if (percentage >= 95) {
      status = AdherenceLevel.EXCELLENT; // Within 5% of target
    } else if (percentage >= 90) {
      status = AdherenceLevel.FAIR; // Within 10% of target
    } else {
      status = AdherenceLevel.POOR; // Greater than 10% deviation
    }
    
    return { 
      percentage: Math.round(percentage), 
      status, 
      avgDeviation
    };
  }, [state.doses, state.intervalMinutes, state.nextDoseTime, currentTime]);
  
  const getTimeUntilNextDose = useCallback((): NextDoseInfo | null => {
    if (!state.nextDoseTime) {
      return null;
    }
    
    const diff = state.nextDoseTime.getTime() - currentTime.getTime();
    let missedIntervals = 0;
    
    if (diff <= 0) {
      missedIntervals = Math.floor(Math.abs(diff) / (state.intervalMinutes * 60 * 1000));
      return { 
        overdue: true, 
        time: dateUtils.formatTimeDifference(Math.abs(diff)),
        missedIntervals
      };
    }
    
    return { 
      overdue: false, 
      time: dateUtils.formatTimeDifference(diff), 
      missedIntervals: 0 
    };
  }, [state.nextDoseTime, currentTime, state.intervalMinutes]);
  
  const getDoseAdherence = useCallback((doseTime: string, doseIndex: number): DoseAdherenceInfo => {
    const actualTime = new Date(doseTime);
    const firstDose = new Date(state.doses[0]?.time);
    const expectedTime = new Date(firstDose.getTime() + (doseIndex * state.intervalMinutes * 60 * 1000));
    const diffMinutes = Math.abs(actualTime.getTime() - expectedTime.getTime()) / (1000 * 60);
    
    const percentageOfInterval = (diffMinutes / state.intervalMinutes) * 100;
    const roundedPercentage = Math.round(percentageOfInterval);
    const exceedsCap = roundedPercentage > 999;
    
    let category: AdherenceLevel;
    if (roundedPercentage <= 5) {
      category = AdherenceLevel.EXCELLENT; // Within 5% of target
    } else if (roundedPercentage <= 10) {
      category = AdherenceLevel.FAIR; // Within 10% of target
    } else {
      category = AdherenceLevel.POOR; // Greater than 10% deviation
    }
    
    return {
      adherencePercentage: exceedsCap ? 999 : roundedPercentage,
      exceedsCap,
      isEarly: actualTime < expectedTime,
      isLate: actualTime > expectedTime,
      category
    };
  }, [state.doses, state.intervalMinutes]);

  const calculateStreak = useCallback((): number => {
    if (state.doses.length <= 1) {
      return 0;
    }
    
    let currentStreak = 0;
    const firstDose = new Date(state.doses[0]?.time);
    
    // Start from the most recent dose and go backwards
    for (let i = state.doses.length - 1; i > 0; i--) {
      const expectedTime = new Date(firstDose.getTime() + (i * state.intervalMinutes * 60 * 1000));
      const actualTime = new Date(state.doses[i]?.time);
      const diffMinutes = Math.abs(actualTime.getTime() - expectedTime.getTime()) / (1000 * 60);
      
      const percentageOfInterval = (diffMinutes / state.intervalMinutes) * 100;
      const isExcellent = percentageOfInterval <= 5; // Same threshold as AdherenceLevel.EXCELLENT
      
      if (isExcellent) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    // Check if next dose breaks streak
    if (state.nextDoseTime && currentTime > state.nextDoseTime) {
      const overdueMinutes = (currentTime.getTime() - state.nextDoseTime.getTime()) / (1000 * 60);
      const overduePercentage = (overdueMinutes / state.intervalMinutes) * 100;
      
      // Reset streak if significantly overdue
      return overduePercentage > 5 ? 0 : currentStreak;
    }
    
    return currentStreak;
  }, [state.doses, state.intervalMinutes, state.nextDoseTime, currentTime]);

  // Create context value
  const value: MedicationContextType = {
    doses: state.doses,
    intervalMinutes: state.intervalMinutes,
    nextDoseTime: state.nextDoseTime,
    currentTime,
    showAddModal,
    setShowAddModal,
    showEditModal,
    setShowEditModal,
    editingDose,
    setEditingDose,
    showResetConfirm,
    setShowResetConfirm,
    showDeleteConfirm,
    setShowDeleteConfirm,
    deletingDose,
    setDeletingDose,
    addDose,
    updateDose,
    deleteDose,
    resetDoses,
    setIntervalMinutes,
    calculateAdherence,
    getTimeUntilNextDose,
    getDoseAdherence,
    calculateStreak,
    dateUtils
  };
  
  return (
    <MedicationContext.Provider value={value}>
      {children}
    </MedicationContext.Provider>
  );
};

// Custom hook for medication context
export const useMedication = (): MedicationContextType => {
  const context = useContext(MedicationContext);
  if (!context) {
    throw new Error('useMedication must be used within a MedicationProvider');
  }
  return context;
}; 