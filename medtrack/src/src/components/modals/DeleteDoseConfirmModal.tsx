import React from 'react';
import { Modal } from '../ui/Modal';
import { useMedication } from '../../context/MedicationContext';

/**
 * Modal for confirming deletion of a medication dose
 */
export const DeleteDoseConfirmModal: React.FC = () => {
  const { 
    showDeleteConfirm, 
    setShowDeleteConfirm, 
    deletingDose, 
    setDeletingDose, 
    deleteDose, 
    dateUtils 
  } = useMedication();
  
  if (!showDeleteConfirm || !deletingDose) {
    return null;
  }
  
  const handleDeleteDose = () => {
    deleteDose(deletingDose.id);
    setShowDeleteConfirm(false);
    setDeletingDose(null);
  };
  
  return (
    <Modal
      title="Delete Dose"
      onClose={() => {
        setShowDeleteConfirm(false);
        setDeletingDose(null);
      }}
      actions={
        <button
          onClick={handleDeleteDose}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Delete
        </button>
      }
    >
      <p>Are you sure you want to delete this dose from {dateUtils.formatDateTime(deletingDose.time)}?</p>
    </Modal>
  );
}; 