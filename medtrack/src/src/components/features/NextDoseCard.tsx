import React from 'react';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { useMedication } from '../../context/MedicationContext';

/**
 * Component for displaying information about the next dose
 */
export const NextDoseCard: React.FC = () => {
    const { nextDoseTime, doses, getTimeUntilNextDose, dateUtils } = useMedication();
    const nextDoseInfo = getTimeUntilNextDose();

    if (!nextDoseTime || !doses.length) {
        return (
            <Card title="Next Dose" className="mb-4">
                <p className="text-gray-500 mt-2">No doses recorded yet. Add your first dose to start tracking.</p>
            </Card>
        );
    }

    const { dayOfWeek, timeOfDay, timeZone } = dateUtils.formatDateTimeWithDayOfWeek(nextDoseTime.toISOString());

    return (
        <Card title="Next Dose" className="mb-4">
            <div className="mt-2">
                <p className={`flex items-center text-2xl font-bold ${nextDoseInfo?.overdue ? 'text-red-500' : 'text-blue-500'}`}>
                    {nextDoseInfo?.overdue ? (
                        <Icon type="AlertTriangle" className="mr-2 text-red-500" />
                    ) : (
                        <Icon type="Clock" className="mr-2" />
                    )}
                    {dayOfWeek}, {timeOfDay} {timeZone}
                </p>
                <div className="mt-2 text-gray-700">
                    {nextDoseInfo?.overdue ? (
                        nextDoseInfo.missedIntervals > 0 ? (
                            <>
                                <span className="text-red-500">
                                    <strong>Overdue</strong>
                                </span>{' '}
                                by <strong>{nextDoseInfo.time}</strong> (<strong>{nextDoseInfo.missedIntervals + 1}</strong> doses behind)
                            </>
                        ) : (
                            <>
                                <span className="text-red-500">
                                    <strong>Overdue</strong>
                                </span>{' '}
                                by <strong>{nextDoseInfo.time}</strong>
                            </>
                        )
                    ) : (
                        <>
                            Due in <strong>{nextDoseInfo?.time}</strong>
                        </>
                    )}
                </div>
            </div>
        </Card>
    );
};
