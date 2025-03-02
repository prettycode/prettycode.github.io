/**
 * Main App component that wraps the MedicationTracker with the MedicationProvider
 * @returns {JSX.Element} App component
 */
const App = () => (
  <div className="min-h-screen bg-gray-100 sm:py-8">
    <MedicationProvider>
      <MedicationTracker />
    </MedicationProvider>
  </div>
);

// Render the app
ReactDOM.render(<App />, document.getElementById('root')); 