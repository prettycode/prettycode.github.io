import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    initGoogleApi,
    isSignedIn,
    signIn,
    signOut,
    getUserProfile,
    saveToGoogleDrive,
    loadFromGoogleDrive,
    UserProfile,
    BackupData
} from '../utils/googleUtils';

// Define the context type
interface GoogleAuthContextType {
    isInitialized: boolean;
    isAuthenticated: boolean;
    userProfile: UserProfile | null;
    isBackupInProgress: boolean;
    lastBackupTime: Date | null;
    lastBackupError: string | null;
    signInWithGoogle: () => Promise<void>;
    signOutFromGoogle: () => Promise<void>;
    backupData: (data: BackupData) => Promise<void>;
    restoreData: () => Promise<BackupData | null>;
}

// Create the context
const GoogleAuthContext = createContext<GoogleAuthContextType | null>(null);

// Provider Props
interface GoogleAuthProviderProps {
    children: React.ReactNode;
}

// Provider component
export const GoogleAuthProvider: React.FC<GoogleAuthProviderProps> = ({ children }) => {
    const [isInitialized, setIsInitialized] = useState<boolean>(false);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isBackupInProgress, setIsBackupInProgress] = useState<boolean>(false);
    const [lastBackupTime, setLastBackupTime] = useState<Date | null>(null);
    const [lastBackupError, setLastBackupError] = useState<string | null>(null);

    // Initialize Google API
    useEffect(() => {
        const initialize = async () => {
            try {
                await initGoogleApi();
                setIsInitialized(true);

                // Check if user is already signed in
                if (isSignedIn()) {
                    setIsAuthenticated(true);
                    setUserProfile(getUserProfile());
                }
            } catch (error) {
                console.error('Failed to initialize Google API:', error);
            }
        };

        initialize();
    }, []);

    // Sign in with Google
    const signInWithGoogle = useCallback(async () => {
        if (!isInitialized) {
            throw new Error('Google API not initialized');
        }

        try {
            await signIn();
            setIsAuthenticated(true);
            setUserProfile(getUserProfile());
        } catch (error) {
            console.error('Failed to sign in with Google:', error);
            throw error;
        }
    }, [isInitialized]);

    // Sign out from Google
    const signOutFromGoogle = useCallback(async () => {
        if (!isInitialized) {
            throw new Error('Google API not initialized');
        }

        try {
            await signOut();
            setIsAuthenticated(false);
            setUserProfile(null);
        } catch (error) {
            console.error('Failed to sign out from Google:', error);
            throw error;
        }
    }, [isInitialized]);

    // Backup data to Google Drive
    const backupData = useCallback(
        async (data: BackupData) => {
            if (!isInitialized) {
                throw new Error('Google API not initialized');
            }

            if (!isAuthenticated) {
                await signInWithGoogle();
            }

            setIsBackupInProgress(true);
            setLastBackupError(null);

            try {
                await saveToGoogleDrive(data);
                setLastBackupTime(new Date());
            } catch (error) {
                console.error('Failed to backup data:', error);
                setLastBackupError('Failed to backup data: ' + (error as Error).message);
                throw error;
            } finally {
                setIsBackupInProgress(false);
            }
        },
        [isInitialized, isAuthenticated, signInWithGoogle]
    );

    // Restore data from Google Drive
    const restoreData = useCallback(async (): Promise<BackupData | null> => {
        if (!isInitialized) {
            throw new Error('Google API not initialized');
        }

        if (!isAuthenticated) {
            await signInWithGoogle();
        }

        setIsBackupInProgress(true);
        setLastBackupError(null);

        try {
            const data = await loadFromGoogleDrive();
            return data;
        } catch (error) {
            console.error('Failed to restore data:', error);
            setLastBackupError('Failed to restore data: ' + (error as Error).message);
            throw error;
        } finally {
            setIsBackupInProgress(false);
        }
    }, [isInitialized, isAuthenticated, signInWithGoogle]);

    // Context value
    const contextValue: GoogleAuthContextType = {
        isInitialized,
        isAuthenticated,
        userProfile,
        isBackupInProgress,
        lastBackupTime,
        lastBackupError,
        signInWithGoogle,
        signOutFromGoogle,
        backupData,
        restoreData
    };

    return <GoogleAuthContext.Provider value={contextValue}>{children}</GoogleAuthContext.Provider>;
};

// Hook for using the Google Auth context
export const useGoogleAuth = (): GoogleAuthContextType => {
    const context = useContext(GoogleAuthContext);
    if (!context) {
        throw new Error('useGoogleAuth must be used within a GoogleAuthProvider');
    }
    return context;
};
