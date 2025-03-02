/**
 * Component for displaying adherence information
 * @returns {JSX.Element|null} AdherenceCard component or null if not enough data
 */
const AdherenceCard = () => {
  const { doses, nextDoseTime, currentTime, calculateAdherence, calculateStreak } = useMedication();
  
  // Only show adherence if we have more than one dose or if we have one dose and it's overdue
  if (!(doses.length > 1 || (doses.length > 0 && nextDoseTime && currentTime > nextDoseTime))) {
    return null;
  }
  
  const adherence = calculateAdherence();
  const currentStreak = calculateStreak();
  
  return (
    <Card 
      title="Adherence" 
      className="mb-4"
      action={
        <div className="flex items-center">
          <span className={`text-lg font-bold ${currentStreak > 0 ? 'text-green-600' : 'text-gray-600'}`}>
            {currentStreak > 0 && '🔥 '}{currentStreak}
          </span>
        </div>
      }
    >
      <div className="w-full bg-gray-200 rounded-full h-4">
        <div 
          className={`h-4 rounded-full ${ADHERENCE_COLORS[adherence.status]}`}
          style={{ width: `${adherence.percentage}%` }}
        ></div>
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-sm text-gray-500">0%</span>
        <span className="text-sm font-medium">{adherence.percentage}%</span>
        <span className="text-sm text-gray-500">100%</span>
      </div>
      <div className="mt-3">
        <p className="text-sm text-gray-600">
          Average deviation: {Math.round(adherence.avgDeviation * 10) / 10} minutes
        </p>
      </div>
      {currentStreak > 0 && (
        <div className="mt-2 p-2 bg-green-50 rounded-md border border-green-100">
          <p className="text-sm text-green-700 flex items-center">
            <Icon type="Check" size={16} className="mr-1" />
            {currentStreak === 1 
              ? "1 dose taken on time!" 
              : `${currentStreak} consecutive doses taken on time!`}
          </p>
        </div>
      )}
    </Card>
  );
}; 