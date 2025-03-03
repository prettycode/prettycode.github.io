import React from 'react';
import { Card } from '../ui/Card';
import { useMedication } from '../../context/MedicationContext';
import { INTERVAL_OPTIONS } from '../../types';

/**
 * Component for selecting medication frequency
 */
export const FrequencySelector: React.FC = () => {
  const { 
    intervalMinutes, 
    setIntervalMinutes 
  } = useMedication();
  
  return (
    <Card title="Frequency" className="mb-4">
      <select
        value={intervalMinutes}
        onChange={(e) => setIntervalMinutes(parseInt(e.target.value))}
        className="block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      >
        {INTERVAL_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Card>
  );
}; 