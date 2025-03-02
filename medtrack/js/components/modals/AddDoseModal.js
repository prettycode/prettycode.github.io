/**
 * Modal for adding a new medication dose
 * @returns {JSX.Element|null} AddDoseModal component or null if not shown
 */
const AddDoseModal = () => {
  const { showAddModal, setShowAddModal, addDose, dateUtils } = useMedication();
  const dateTimeInputRef = useRef(null);
  
  if (!showAddModal) return null;
  
  const handleAddDose = () => {
    const selectedDateTimeStr = dateTimeInputRef.current?.value;
    const selectedDateTime = selectedDateTimeStr ? new Date(selectedDateTimeStr) : new Date();
    
    // Validate that the date is not in the future
    if (dateUtils.isFutureDate(selectedDateTime)) {
      alert("Cannot record doses in the future. Please select a current or past date.");
      return;
    }
    
    addDose(selectedDateTime);
    setShowAddModal(false);
  };
  
  return (
    <Modal 
      title="Record New Dose"
      onClose={() => setShowAddModal(false)}
      actions={
        <button
          onClick={handleAddDose}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
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
          max={dateUtils.getCurrentDateTimeForInput()}
        />
      </div>
    </Modal>
  );
}; 