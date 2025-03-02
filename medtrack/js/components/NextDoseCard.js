/**
 * Component for displaying next dose information
 * @returns {JSX.Element} NextDoseCard component
 */
const NextDoseCard = () => {
  const { nextDoseTime, doses, getTimeUntilNextDose, dateUtils } = useMedication();
  const nextDoseInfo = getTimeUntilNextDose();
  
  return (
    <Card title="Next Dose" className="mb-4">
      {nextDoseTime && doses.length > 0 ? (
        <div className="mt-2">
          {(() => {
            const { dayOfWeek, timeOfDay, timeZone } = dateUtils.formatDateTimeWithDayOfWeek(nextDoseTime);

            return (
              <p className={`flex items-center text-2xl font-bold ${nextDoseInfo.overdue ? 'text-red-500' : 'text-blue-500'}`}>
                {nextDoseInfo.overdue && <Icon type="AlertTriangle" className="mr-2 text-red-500" />}
                {!nextDoseInfo.overdue && <Icon type="Clock" className="mr-2" />}
                {dayOfWeek}, {timeOfDay} {timeZone}
              </p>
            );
          })()}
          <div className="mt-2 text-gray-700">
            {nextDoseInfo.overdue 
              ? nextDoseInfo.missedIntervals > 0 
                ? <><span className="text-red-500"><strong>Overdue</strong></span> by <strong>{nextDoseInfo.time}</strong> (<strong>{nextDoseInfo.missedIntervals + 1}</strong> doses needed)</>
                : <><span className="text-red-500"><strong>Overdue</strong></span> by <strong>{nextDoseInfo.time}</strong></>
              : <>Due in <strong>{nextDoseInfo.time}</strong></>
            }
          </div>
        </div>
      ) : (
        <p className="text-gray-500 mt-2">No doses recorded yet. Add your first dose to start tracking.</p>
      )}
    </Card>
  );
}; 