/**
 * Main component for the medication tracker application
 * @returns {JSX.Element} MedicationTracker component
 */
const MedicationTracker = () => {
  const { setShowAddModal } = useMedication();
  const fullYearCreated = 2025;
  const currentYear = new Date().getFullYear();
  
  return (
    <div className="max-w-md mx-auto p-4 bg-gray-50 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4 text-center">Medication Tracker</h1>
      
      <FrequencySelector />
      <NextDoseCard />
      
      {/* Primary Action Button */}
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
        &copy; {fullYearCreated}{currentYear > fullYearCreated ? "–" + currentYear : ''} {window.location.host + window.location.pathname}
      </p>

      <AddDoseModal />
      <EditDoseModal />
      <ResetConfirmModal />
      <DeleteDoseConfirmModal />
    </div>
  );
}; 