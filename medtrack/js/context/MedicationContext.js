const { useState, useEffect, useRef, useCallback, createContext, useContext, useReducer } = React;

// Custom hook for localStorage
const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error loading from localStorage', error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error saving to localStorage', error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
};

// Define reducer for state management
const medicationReducer = (state, action) => {
  switch (action.type) {
    case ACTION_TYPES.ADD_DOSE:
      return { 
        ...state, 
        doses: [...state.doses, action.payload] 
      };
    case ACTION_TYPES.UPDATE_DOSE:
      return { 
        ...state, 
        doses: state.doses.map(dose => 
          dose.id === action.payload.id ? { ...dose, time: action.payload.time } : dose
        ).sort((a, b) => new Date(a.time) - new Date(b.time))
      };
    case ACTION_TYPES.DELETE_DOSE:
      return { 
        ...state, 
        doses: state.doses.filter(dose => dose.id !== action.payload) 
      };
    case ACTION_TYPES.RESET_DOSES:
      return { 
        ...state, 
        doses: [] 
      };
    case ACTION_TYPES.SET_INTERVAL:
      return { 
        ...state, 
        intervalMinutes: action.payload 
      };
    case ACTION_TYPES.SET_NEXT_DOSE:
      return { 
        ...state, 
        nextDoseTime: action.payload 
      };
    default:
      return state;
  }
};

// Create Context
const MedicationContext = createContext();

// Provider component
const MedicationProvider = ({ children }) => {
  const [storedDoses, setStoredDoses] = useLocalStorage(STORAGE_KEYS.DOSES, []);
  const [storedInterval, setStoredInterval] = useLocalStorage(STORAGE_KEYS.INTERVAL, 84 * 60); // Default: 2x per Week
  
  const [state, dispatch] = useReducer(medicationReducer, {
    doses: storedDoses,
    intervalMinutes: storedInterval,
    nextDoseTime: null
  });
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDose, setEditingDose] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingDose, setDeletingDose] = useState(null);
  
  // Track if we've already triggered a notification for current dose
  const hasNotifiedRef = useRef(false);
  
  // Calculate next dose time
  const calculateNextDoseTime = useCallback((dosesArray = state.doses) => {
    if (dosesArray.length === 0) {
      dispatch({ type: ACTION_TYPES.SET_NEXT_DOSE, payload: null });
      return;
    }
    
    const firstDose = new Date(dosesArray[0].time);
    const nextDose = new Date(firstDose.getTime() + (dosesArray.length * state.intervalMinutes * 60 * 1000));
    dispatch({ type: ACTION_TYPES.SET_NEXT_DOSE, payload: nextDose });
    
    // Reset notification flag when next dose time changes
    hasNotifiedRef.current = false;
  }, [state.doses, state.intervalMinutes, dispatch]);
  
  // Set up timer for current time and check for notifications
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Check if we need to trigger an alarm notification
      if (state.nextDoseTime && !hasNotifiedRef.current) {
        if (now >= state.nextDoseTime) {
          const alarmTitle = "Medication Due";
          const alarmBody = "Your next dose of medication is due now.";
          triggerAlarmNotification(alarmTitle, alarmBody);
          hasNotifiedRef.current = true;
        }
      }
    }, 500);
    
    return () => clearInterval(timer);
  }, [state.nextDoseTime]);
  
  // Save doses to localStorage when they change
  useEffect(() => {
    setStoredDoses(state.doses);
  }, [state.doses, setStoredDoses]);
  
  // Save interval to localStorage when it changes
  useEffect(() => {
    setStoredInterval(state.intervalMinutes);
    if (state.doses.length > 0) calculateNextDoseTime();
  }, [state.intervalMinutes, calculateNextDoseTime, setStoredInterval, state.doses.length]);
  
  // Calculate initial next dose time when component mounts
  useEffect(() => {
    if (state.doses.length > 0) calculateNextDoseTime();
    else dispatch({ type: ACTION_TYPES.SET_NEXT_DOSE, payload: null });
  }, [calculateNextDoseTime, state.doses.length, dispatch]);
  
  // Handler functions
  const addDose = useCallback((time) => {
    const newDose = { time: time.toISOString(), id: Date.now() };
    dispatch({ type: ACTION_TYPES.ADD_DOSE, payload: newDose });
    
    if (state.doses.length === 0) {
      const nextTime = new Date(time.getTime() + state.intervalMinutes * 60 * 1000);
      dispatch({ type: ACTION_TYPES.SET_NEXT_DOSE, payload: nextTime });
    } else {
      calculateNextDoseTime([...state.doses, newDose]);
    }
    
    // Reset notification flag when a new dose is added
    hasNotifiedRef.current = false;
  }, [state.doses, state.intervalMinutes, calculateNextDoseTime, dispatch]);
  
  const updateDose = useCallback((id, time) => {
    dispatch({ 
      type: ACTION_TYPES.UPDATE_DOSE, 
      payload: { id, time: time.toISOString() } 
    });
    // Reset notification flag when doses are updated
    hasNotifiedRef.current = false;
  }, [dispatch]);
  
  const deleteDose = useCallback((id) => {
    dispatch({ type: ACTION_TYPES.DELETE_DOSE, payload: id });
    // Reset notification flag when doses are deleted
    hasNotifiedRef.current = false;
  }, [dispatch]);
  
  const resetDoses = useCallback(() => {
    dispatch({ type: ACTION_TYPES.RESET_DOSES });
    dispatch({ type: ACTION_TYPES.SET_NEXT_DOSE, payload: null });
    // Reset notification flag when doses are reset
    hasNotifiedRef.current = false;
  }, [dispatch]);
  
  const setIntervalMinutes = useCallback((minutes) => {
    dispatch({ type: ACTION_TYPES.SET_INTERVAL, payload: minutes });
    // Reset notification flag when interval changes
    hasNotifiedRef.current = false;
  }, [dispatch]);
  
  // Calculate adherence
  const calculateAdherence = useCallback(() => {
    if (state.doses.length === 0) {
      return { percentage: 100, status: ADHERENCE_LEVELS.EXCELLENT };
    }
    
    let totalDeviations = 0;
    const firstDose = new Date(state.doses[0].time);
    
    for (let i = 1; i < state.doses.length; i++) {
      const expectedTime = new Date(firstDose.getTime() + (i * state.intervalMinutes * 60 * 1000));
      const actualTime = new Date(state.doses[i].time);
      const deviation = Math.abs(actualTime - expectedTime) / (1000 * 60);
      
      totalDeviations += deviation;
    }
    
    let totalIntervals = state.doses.length - 1;
    if (state.nextDoseTime) {
      totalIntervals += 1;
      
      const now = currentTime;
      if (now > state.nextDoseTime) {
        const overdueMinutes = (now - state.nextDoseTime) / (1000 * 60);
        totalDeviations += overdueMinutes;
      }
    }
    
    const avgDeviation = totalIntervals > 0 ? totalDeviations / totalIntervals : 0;
    const totalExpectedTime = totalIntervals * state.intervalMinutes;
    
    if (totalExpectedTime === 0) {
      return { percentage: 100, status: ADHERENCE_LEVELS.EXCELLENT, avgDeviation: 0 };
    }
    
    const deviationPercentage = (totalDeviations / totalExpectedTime) * 100;
    const percentage = Math.max(0, Math.min(100, 100 - deviationPercentage));
    
    // Apply the standardized adherence levels
    let status;
    if (percentage >= 95) {
      status = ADHERENCE_LEVELS.EXCELLENT; // Within 5% of target
    } else if (percentage >= 90) {
      status = ADHERENCE_LEVELS.FAIR; // Within 10% of target
    } else {
      status = ADHERENCE_LEVELS.POOR; // Greater than 10% deviation
    }
    
    return { 
      percentage: Math.round(percentage), 
      status, 
      avgDeviation
    };
  }, [state.doses, state.intervalMinutes, state.nextDoseTime, currentTime]);
  
  // Calculate time until next dose
  const getTimeUntilNextDose = useCallback(() => {
    if (!state.nextDoseTime) return null;
    
    const diff = state.nextDoseTime - currentTime;
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
  
  // Calculate dose adherence
  const getDoseAdherence = useCallback((doseTime, doseIndex) => {
    const actualTime = new Date(doseTime);
    const firstDose = new Date(state.doses[0].time);
    const expectedTime = new Date(firstDose.getTime() + (doseIndex * state.intervalMinutes * 60 * 1000));
    const diffMinutes = Math.abs(actualTime - expectedTime) / (1000 * 60);
    
    const percentageOfInterval = (diffMinutes / state.intervalMinutes) * 100;
    const roundedPercentage = Math.round(percentageOfInterval);
    const exceedsCap = roundedPercentage > 999;
    
    // Apply the standardized adherence levels
    let category;
    if (roundedPercentage <= ADHERENCE_THRESHOLDS.EXCELLENT) {
      category = ADHERENCE_LEVELS.EXCELLENT;
    } else if (roundedPercentage <= ADHERENCE_THRESHOLDS.FAIR) {
      category = ADHERENCE_LEVELS.FAIR;
    } else {
      category = ADHERENCE_LEVELS.POOR;
    }
    
    return {
      adherencePercentage: exceedsCap ? 999 : roundedPercentage,
      exceedsCap,
      isEarly: actualTime < expectedTime,
      isLate: actualTime > expectedTime,
      category
    };
  }, [state.doses, state.intervalMinutes]);

  // Calculate current streak of on-time doses
  const calculateStreak = useCallback(() => {
    if (state.doses.length <= 1) return 0;
    
    let currentStreak = 0;
    const firstDose = new Date(state.doses[0].time);
    
    // Start from the most recent dose and go backwards
    for (let i = state.doses.length - 1; i > 0; i--) {
      const expectedTime = new Date(firstDose.getTime() + (i * state.intervalMinutes * 60 * 1000));
      const actualTime = new Date(state.doses[i].time);
      const diffMinutes = Math.abs(actualTime - expectedTime) / (1000 * 60);
      
      // Consider a dose on-time if its adherence category is "excellent" (within 5% of target)
      const percentageOfInterval = (diffMinutes / state.intervalMinutes) * 100;
      const isExcellent = percentageOfInterval <= ADHERENCE_THRESHOLDS.EXCELLENT;
      
      if (isExcellent) {
        currentStreak++;
      } else {
        // Break the streak if a dose was not excellent
        break;
      }
    }
    
    // Check if the next dose is overdue, which would break the streak
    if (state.nextDoseTime) {
      const now = currentTime;
      if (now > state.nextDoseTime) {
        const overdueMinutes = (now - state.nextDoseTime) / (1000 * 60);
        const overduePercentage = (overdueMinutes / state.intervalMinutes) * 100;
        
        if (overduePercentage > ADHERENCE_THRESHOLDS.EXCELLENT) {
          // If significantly overdue (not excellent), reset streak
          return 0;
        }
      }
    }
    
    return currentStreak;
  }, [state.doses, state.intervalMinutes, state.nextDoseTime, currentTime]);

  // Context value
  const value = {
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
const useMedication = () => {
  const context = useContext(MedicationContext);
  if (!context) {
    throw new Error('useMedication must be used within a MedicationProvider');
  }
  return context;
}; 