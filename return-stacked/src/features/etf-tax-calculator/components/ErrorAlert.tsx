/**
 * Error Alert Component
 * Displays error messages to the user
 */
import React, { memo } from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorAlertProps {
    message: string;
}

export const ErrorAlert = memo<ErrorAlertProps>(({ message }) => {
    return (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start" role="alert">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div className="text-sm text-yellow-700">{message}</div>
        </div>
    );
});

ErrorAlert.displayName = 'ErrorAlert';
