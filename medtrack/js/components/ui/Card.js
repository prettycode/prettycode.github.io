/**
 * Card component for displaying content in a card layout
 * @param {Object} props - Component props
 * @param {string} props.title - Card title
 * @param {React.ReactNode} props.children - Card content
 * @param {string} [props.className=""] - Additional CSS classes
 * @param {React.ReactNode} [props.action] - Action element to display in the header
 * @returns {JSX.Element} Card component
 */
const Card = ({ title, children, className = "", action }) => (
  <div className={`bg-white p-4 rounded-lg shadow-sm ${className}`}>
    <div className="flex justify-between items-center mb-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {action}
    </div>
    {children}
  </div>
); 