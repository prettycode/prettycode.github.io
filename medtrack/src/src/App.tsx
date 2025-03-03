import React from 'react';
import { MedicationProvider } from './context/MedicationContext';
import { GoogleAuthProvider } from './context/GoogleAuthContext';
import { MedicationTracker } from './components/MedicationTracker';

/**
 * Main App component
 */
export const App: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-100 sm:py-8">
            <GoogleAuthProvider>
                <MedicationProvider>
                    <MedicationTracker />
                </MedicationProvider>
            </GoogleAuthProvider>
        </div>
    );
};
