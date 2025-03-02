/**
 * Modal for editing an existing medication dose
 * @returns {JSX.Element|null} EditDoseModal component or null if not shown
 */
const EditDoseModal = () => {
  const { showEditModal, setShowEditModal, editingDose, setEditingDose, updateDose, dateUtils } = useMedication();
  const editDateTimeInputRef = useRef(null);
  
  if (!showEditModal || !editingDose) return null;
  
  const handleEditDose = () => {
    const selectedDateTimeStr = editDateTimeInputRef.current?.value;
    const selectedDateTime = selectedDateTimeStr ? new Date(selectedDateTimeStr) : new Date();
    
    // Validate that the date is not in the future
    if (dateUtils.isFutureDate(selectedDateTime)) {
      alert("Cannot record doses in the future. Please select a current or past date.");
      return;
    }
    
    updateDose(editingDose.id, selectedDateTime);
    setShowEditModal(false);
    setEditingDose(null);
  };
  
  const handleClose = () => {
    setShowEditModal(false);
    setEditingDose(null);
  };
  
  return (
    <Modal 
      title="Edit Historical Dose"
      onClose={handleClose}
      actions={
        <button
          onClick={handleEditDose}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
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
          max={dateUtils.getCurrentDateTimeForInput()}
        />
      </div>
    </Modal>
  );
}; 