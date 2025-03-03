import React, { useRef } from 'react';
import { Modal } from '../ui/Modal';
import { useMedication } from '../../context/MedicationContext';

/**
 * Modal for adding new medication doses
 */
export const AddDoseModal: React.FC = () => {
    const { showAddModal, setShowAddModal, addDose, dateUtils } = useMedication();
    const dateTimeInputRef = useRef<HTMLInputElement>(null);

    if (!showAddModal) {
        return null;
    }

    const handleAddDose = () => {
        const selectedDateTime = new Date(dateTimeInputRef.current?.value ?? Date.now());
        addDose(selectedDateTime);
        setShowAddModal(false);
    };

    return (
        <Modal
            title="Record New Dose"
            onClose={() => setShowAddModal(false)}
            actions={
                <button onClick={handleAddDose} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Save
                </button>
            }
        >
            <div>
                <label className="block text-gray-700 mb-2">Date and Time:</label>
                <input
                    type="datetime-local"
                    className="w-full p-2 border border-gray-300 rounded"
                    defaultValue={dateUtils.getCurrentDateTimeForInput()}
                    ref={dateTimeInputRef}
                />
            </div>
        </Modal>
    );
};
