import React from 'react';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { useMedication } from '../../context/MedicationContext';
import { ADHERENCE_BG_COLORS, ADHERENCE_TEXT_COLORS } from '../../types';

/**
 * Component for displaying medication dose history
 */
export const DoseHistory: React.FC = () => {
    const {
        doses,
        setShowDeleteConfirm,
        setDeletingDose,
        setShowEditModal,
        setEditingDose,
        setShowResetConfirm,
        getDoseAdherence,
        dateUtils
    } = useMedication();

    if (!doses.length) {
        return null;
    }

    return (
        <Card
            title="History"
            action={
                doses.length > 0 && (
                    <button onClick={() => setShowResetConfirm(true)} className="text-red-500 text-sm hover:text-red-700">
                        <Icon type="Delete" size={16} />
                    </button>
                )
            }
        >
            <ul className="mt-2 divide-y divide-gray-100">
                {[...doses]
                    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
                    .map((dose, index) => {
                        const reversedIndex = doses.length - 1 - index;
                        const isFirstDose = reversedIndex === 0;
                        const adherenceInfo = !isFirstDose ? getDoseAdherence(dose.time, reversedIndex) : null;

                        return (
                            <li key={dose.id} className="py-2 flex items-start">
                                <div className="flex-grow">
                                    <div className="flex items-center">
                                        <p className="text-gray-700">{dateUtils.formatDateTime(dose.time)}</p>
                                        <button
                                            onClick={() => {
                                                setEditingDose(dose);
                                                setShowEditModal(true);
                                            }}
                                            className="text-blue-500 hover:text-blue-700 ml-2"
                                        >
                                            <Icon type="Edit" size={16} />
                                        </button>
                                    </div>
                                    {!isFirstDose && adherenceInfo && (
                                        <div className="mt-1">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ADHERENCE_BG_COLORS[adherenceInfo.category]} ${ADHERENCE_TEXT_COLORS[adherenceInfo.category]}`}
                                            >
                                                {adherenceInfo.exceedsCap ? '> 999' : adherenceInfo.adherencePercentage}%{' '}
                                                {adherenceInfo.isEarly ? 'early' : 'late'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => {
                                        setDeletingDose(dose);
                                        setShowDeleteConfirm(true);
                                    }}
                                    className="text-red-500 hover:text-red-700 ml-4 mt-1"
                                >
                                    <Icon type="Delete" size={16} />
                                </button>
                            </li>
                        );
                    })}
            </ul>
        </Card>
    );
};
