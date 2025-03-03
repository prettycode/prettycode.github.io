import React from 'react';
import { useMedication } from '../context/MedicationContext';
import { FrequencySelector } from './features/FrequencySelector';
import { NextDoseCard } from './features/NextDoseCard';
import { AdherenceCard } from './features/AdherenceCard';
import { DoseHistory } from './features/DoseHistory';
import { AddDoseModal } from './modals/AddDoseModal';
import { EditDoseModal } from './modals/EditDoseModal';
import { ResetConfirmModal } from './modals/ResetConfirmModal';
import { DeleteDoseConfirmModal } from './modals/DeleteDoseConfirmModal';

/**
 * Main Medication Tracker component
 */
export const MedicationTracker: React.FC = () => {
  const { 
    setShowAddModal 
  } = useMedication();
  const fullYearCreated = 2025;
  
  return (
    <div className="max-w-md mx-auto p-4 bg-gray-50 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4 text-center">Medication Tracker</h1>
      
      <FrequencySelector />
      <NextDoseCard />
      
      <div className="mb-4">
        <button 
          onClick={() => setShowAddModal(true)} 
          className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center justify-center"
        >
          Record Dose
        </button>
      </div>
      
      <AdherenceCard />
      <DoseHistory />

      <p className="text-xs text-gray-600 mt-3">
          &copy; {fullYearCreated}{new Date().getFullYear() > fullYearCreated ? "–" + new Date().getFullYear() : ''} {window.location.host + window.location.pathname}
      </p>

      <AddDoseModal />
      <EditDoseModal />
      <ResetConfirmModal />
      <DeleteDoseConfirmModal />
    </div>
  );
}; 