/**
 * Loading State Component
 * Displays a loading spinner and message
 */
import React, { memo } from 'react';

export const LoadingState = memo(() => {
    return (
        <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" aria-hidden="true"></div>
                <p className="text-gray-600">Loading ETF data and finding highest yields...</p>
            </div>
        </div>
    );
});

LoadingState.displayName = 'LoadingState';
