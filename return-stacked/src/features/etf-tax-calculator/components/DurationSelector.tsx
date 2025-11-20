/**
 * Duration Selector Component
 * Allows users to select bond duration which automatically selects corresponding Municipal and Treasury ETFs
 */
import React, { memo } from 'react';
import { Clock } from 'lucide-react';
import type { Duration } from '../../types/etf-calculator';
import { DURATION_LABELS } from '../../constants/etf-data';

interface DurationSelectorProps {
    selectedDuration: Duration;
    onDurationChange: (duration: Duration) => void;
}

export const DurationSelector = memo<DurationSelectorProps>(({ selectedDuration, onDurationChange }) => {
    const durations: Duration[] = ['any', 'cash', 'ultra-short', 'short', 'intermediate', 'long', 'extended', 'total-market'];

    return (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6 mb-8 border-2 border-purple-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-purple-600" aria-hidden="true" />
                Bond Duration
            </h2>

            <div>
                <label htmlFor="duration-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Select bond duration to filter ETFs and auto-select matching pairs
                </label>
                <select
                    id="duration-select"
                    value={selectedDuration}
                    onChange={(e) => onDurationChange(e.target.value as Duration)}
                    className="w-full px-4 py-3 bg-white border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800 font-medium shadow-sm hover:border-purple-400 transition-colors"
                    aria-label="Select bond duration"
                >
                    {durations.map((duration) => (
                        <option key={duration} value={duration}>
                            {DURATION_LABELS[duration]}
                        </option>
                    ))}
                </select>
            </div>

            {selectedDuration && selectedDuration !== 'any' && (
                <div className="mt-4 bg-white rounded-lg p-4 border border-purple-200" role="status" aria-live="polite">
                    <p className="text-sm text-gray-600">
                        <span className="font-semibold text-purple-700">Selected: </span>
                        {DURATION_LABELS[selectedDuration]} bonds
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        Both Municipal and Treasury ETFs will be automatically selected to match this duration.
                    </p>
                </div>
            )}
            {selectedDuration === 'any' && (
                <div className="mt-4 bg-white rounded-lg p-4 border border-purple-200" role="status" aria-live="polite">
                    <p className="text-sm text-gray-600">
                        <span className="font-semibold text-purple-700">Showing all durations. </span>
                        Select a specific duration to auto-select matching ETF pairs.
                    </p>
                </div>
            )}
        </div>
    );
});

DurationSelector.displayName = 'DurationSelector';
