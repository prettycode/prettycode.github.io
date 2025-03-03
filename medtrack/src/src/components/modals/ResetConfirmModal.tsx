import React from 'react';
import { Modal } from '../ui/Modal';
import { useMedication } from '../../context/MedicationContext';

/**
 * Modal for confirming reset of all medication history
 */
export const ResetConfirmModal: React.FC = () => {
    const { showResetConfirm, setShowResetConfirm, resetDoses } = useMedication();

    if (!showResetConfirm) {
        return null;
    }

    const handleReset = () => {
        resetDoses();
        setShowResetConfirm(false);
    };

    return (
        <Modal
            title="Reset Medication History"
            onClose={() => setShowResetConfirm(false)}
            actions={
                <button onClick={handleReset} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                    Reset All Data
                </button>
            }
        >
            <p>Are you sure you want to clear all dose history? This cannot be undone.</p>
        </Modal>
    );
};
