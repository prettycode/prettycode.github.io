import React from 'react';
import { useMedication } from '../context/MedicationContext';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { dateUtils } from '../utils/dateUtils';

/**
 * Component to display the backup status
 */
export const BackupStatus: React.FC = () => {
    const { isBackupInProgress, lastBackupTime, backupError, isRestoringData, backupToGoogleDrive, restoreFromGoogleDrive } =
        useMedication();

    const { isInitialized, isAuthenticated, userProfile, signInWithGoogle } = useGoogleAuth();

    if (!isInitialized) {
        return <span className="text-xs text-gray-500">&hellip;</span>;
    }

    if (!isAuthenticated) {
        return (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg shadow-sm">
                <p className="text-sm text-gray-500 mb-2">Sign in to enable automatic backup to Google Drive</p>
                <button
                    onClick={() => signInWithGoogle()}
                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                >
                    Sign in with Google
                </button>
            </div>
        );
    }

    return (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium">{userProfile?.name ? `Signed in as ${userProfile.name}` : 'Signed in to Google'}</p>

                    {lastBackupTime && (
                        <p className="text-xs text-gray-500">Last backup: {dateUtils.formatDateTime(lastBackupTime.toISOString())}</p>
                    )}

                    {backupError && <p className="text-xs text-red-500 mt-1">Error: {backupError}</p>}
                </div>

                <div className="flex space-x-2">
                    <button
                        onClick={() => backupToGoogleDrive()}
                        disabled={isBackupInProgress || isRestoringData}
                        className={`px-3 py-1 text-xs rounded transition-colors ${
                            isBackupInProgress ? 'bg-gray-300 text-gray-500' : 'bg-green-500 text-white hover:bg-green-600'
                        }`}
                    >
                        {isBackupInProgress ? 'Backing up...' : 'Backup Now'}
                    </button>

                    <button
                        onClick={() => restoreFromGoogleDrive()}
                        disabled={isBackupInProgress || isRestoringData}
                        className={`px-3 py-1 text-xs rounded transition-colors ${
                            isRestoringData ? 'bg-gray-300 text-gray-500' : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                    >
                        {isRestoringData ? 'Restoring...' : 'Restore'}
                    </button>
                </div>
            </div>
        </div>
    );
};
