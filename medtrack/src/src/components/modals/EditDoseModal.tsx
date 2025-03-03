import React, { useRef } from 'react';
import { Modal } from '../ui/Modal';
import { useMedication } from '../../context/MedicationContext';

/**
 * Modal for editing existing medication doses
 */
export const EditDoseModal: React.FC = () => {
    const { showEditModal, setShowEditModal, editingDose, setEditingDose, updateDose, dateUtils } = useMedication();
    const editDateTimeInputRef = useRef<HTMLInputElement>(null);

    if (!showEditModal || !editingDose) {
        return null;
    }

    const handleEditDose = () => {
        const selectedDateTime = new Date(editDateTimeInputRef.current?.value ?? editingDose.time);
        updateDose(editingDose.id, selectedDateTime);
        setShowEditModal(false);
        setEditingDose(null);
    };

    return (
        <Modal
            title="Edit Historical Dose"
            onClose={() => {
                setShowEditModal(false);
                setEditingDose(null);
            }}
            actions={
                <button onClick={handleEditDose} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Update
                </button>
            }
        >
            <div>
                <label className="block text-gray-700 mb-2">Date and Time:</label>
                <input
                    type="datetime-local"
                    className="w-full p-2 border border-gray-300 rounded"
                    defaultValue={dateUtils.getDateTimeForEditInput(editingDose.time)}
                    ref={editDateTimeInputRef}
                />
            </div>
        </Modal>
    );
};
