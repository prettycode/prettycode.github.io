/**
 * Modal for confirming deletion of a single dose
 * @returns {JSX.Element|null} DeleteDoseConfirmModal component or null if not shown
 */
const DeleteDoseConfirmModal = () => {
  const { showDeleteConfirm, setShowDeleteConfirm, deletingDose, setDeletingDose, deleteDose, dateUtils } = useMedication();
  
  if (!showDeleteConfirm || !deletingDose) return null;
  
  const handleDeleteDose = () => {
    deleteDose(deletingDose.id);
    setShowDeleteConfirm(false);
    setDeletingDose(null);
  };
  
  const handleClose = () => {
    setShowDeleteConfirm(false);
    setDeletingDose(null);
  };
  
  return (
    <Modal
      title="Delete Dose"
      onClose={handleClose}
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