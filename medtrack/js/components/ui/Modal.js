/**
 * Modal component for displaying dialogs
 * @param {Object} props - Component props
 * @param {string} props.title - Modal title
 * @param {React.ReactNode} props.children - Modal content
 * @param {Function} props.onClose - Function to call when modal is closed
 * @param {React.ReactNode} props.actions - Action buttons to display in the footer
 * @returns {JSX.Element} Modal component
 */
const Modal = ({ title, children, onClose, actions }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-md">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {children}
      <div className="flex justify-end space-x-2 mt-4">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </button>
        {actions}
      </div>
    </div>
  </div>
); 