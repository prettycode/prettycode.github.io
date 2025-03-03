import { useState, useCallback } from 'react';
import { STORAGE_PREFIX } from '../utils/constants';

/**
 * Custom hook for storing and retrieving data from localStorage
 * @param key The localStorage key to use
 * @param initialValue The initial value if no value exists in localStorage
 * @returns A tuple with the value and a function to set the value
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = localStorage.getItem(STORAGE_PREFIX + key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error('Error loading from localStorage', error);
            return initialValue;
        }
    });

    const setValue = useCallback(
        (value: T | ((val: T) => T)) => {
            try {
                const valueToStore = value instanceof Function ? value(storedValue) : value;
                setStoredValue(valueToStore);
                localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(valueToStore));
            } catch (error) {
                console.error('Error saving to localStorage', error);
            }
        },
        [key, storedValue]
    );

    return [storedValue, setValue];
}
