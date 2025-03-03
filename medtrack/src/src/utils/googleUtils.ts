/**
 * Google authentication and backup utilities
 */

// Google API configuration
export const GOOGLE_API_CONFIG = {
    // You'll need to replace these with your actual Google API credentials
    CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID',
    API_KEY: 'YOUR_GOOGLE_API_KEY',
    DISCOVERY_DOCS: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    SCOPES: 'https://www.googleapis.com/auth/drive.appdata',
    BACKUP_FILENAME: 'medtrack_backup.json'
};

// Define interface for user profile
export interface UserProfile {
    id: string;
    name: string;
    email: string;
    imageUrl: string;
}

// Define interface for Google API client
export interface GoogleApiClient {
    load(service: string, callback: () => void): void;
    client: {
        init(config: { apiKey: string; clientId: string; discoveryDocs: string[]; scope: string }): Promise<void>;
        drive: {
            files: {
                list(params: { spaces: string; fields: string; q: string }): Promise<{
                    result: {
                        files?: Array<{ id: string; name: string }>;
                    };
                }>;
                get(params: { fileId: string; alt: string }): Promise<{
                    result: Record<string, unknown>;
                }>;
            };
        };
        request(params: {
            path: string;
            method: string;
            params?: Record<string, string>;
            headers?: Record<string, string>;
            body?: unknown;
        }): Promise<{
            result: Record<string, unknown>;
        }>;
    };
    auth2: {
        getAuthInstance(): {
            isSignedIn: {
                get(): boolean;
            };
            signIn(): Promise<void>;
            signOut(): Promise<void>;
            currentUser: {
                get(): {
                    getBasicProfile(): {
                        getId(): string;
                        getName(): string;
                        getEmail(): string;
                        getImageUrl(): string;
                    };
                };
            };
        };
    };
}

// Initialize the Google API client
export const initGoogleApi = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            window.gapi.load('client:auth2', () => {
                window.gapi.client
                    .init({
                        apiKey: GOOGLE_API_CONFIG.API_KEY,
                        clientId: GOOGLE_API_CONFIG.CLIENT_ID,
                        discoveryDocs: GOOGLE_API_CONFIG.DISCOVERY_DOCS,
                        scope: GOOGLE_API_CONFIG.SCOPES
                    })
                    .then(() => {
                        resolve();
                    })
                    .catch((error: unknown) => {
                        reject(error);
                    });
            });
        };
        script.onerror = (error: unknown) => {
            reject(error);
        };
        document.body.appendChild(script);
    });
};

// Check if user is signed in
export const isSignedIn = (): boolean => {
    if (!window.gapi || !window.gapi.auth2) {
        return false;
    }
    return window.gapi.auth2.getAuthInstance().isSignedIn.get();
};

// Sign in the user
export const signIn = (): Promise<void> => {
    return window.gapi.auth2.getAuthInstance().signIn();
};

// Sign out the user
export const signOut = (): Promise<void> => {
    return window.gapi.auth2.getAuthInstance().signOut();
};

// Get user profile information
export const getUserProfile = (): UserProfile | null => {
    if (!isSignedIn()) {
        return null;
    }
    const user = window.gapi.auth2.getAuthInstance().currentUser.get();
    const profile = user.getBasicProfile();
    return {
        id: profile.getId(),
        name: profile.getName(),
        email: profile.getEmail(),
        imageUrl: profile.getImageUrl()
    };
};

// Define interface for data to be saved
export interface BackupData {
    [key: string]: unknown;
}

// Save data to Google Drive appdata folder
export const saveToGoogleDrive = async (data: BackupData): Promise<string> => {
    if (!isSignedIn()) {
        throw new Error('User not signed in');
    }

    try {
        // Check if backup file already exists
        const existingFiles = await window.gapi.client.drive.files.list({
            spaces: 'appDataFolder',
            fields: 'files(id, name)',
            q: `name='${GOOGLE_API_CONFIG.BACKUP_FILENAME}'`
        });

        const fileMetadata = {
            name: GOOGLE_API_CONFIG.BACKUP_FILENAME,
            mimeType: 'application/json',
            parents: ['appDataFolder']
        };

        const fileContent = JSON.stringify(data);
        const file = new Blob([fileContent], { type: 'application/json' });

        if (existingFiles.result.files && existingFiles.result.files.length > 0) {
            // Update existing file
            const fileId = existingFiles.result.files[0].id;
            await window.gapi.client.request({
                path: `/upload/drive/v3/files/${fileId}`,
                method: 'PATCH',
                params: { uploadType: 'media' },
                body: file
            });
            return fileId;
        } else {
            // Create new file
            const response = await window.gapi.client.request({
                path: '/upload/drive/v3/files',
                method: 'POST',
                params: { uploadType: 'media' },
                headers: {
                    'Content-Type': 'application/json'
                },
                body: fileMetadata
            });

            const uploadResponse = await window.gapi.client.request({
                path: `/upload/drive/v3/files/${response.result.id}`,
                method: 'PATCH',
                params: { uploadType: 'media' },
                body: file
            });

            console.log('File uploaded successfully:', uploadResponse.result);

            return response.result.id as string;
        }
    } catch (error) {
        console.error('Error saving to Google Drive:', error);
        throw error;
    }
};

// Load data from Google Drive appdata folder
export const loadFromGoogleDrive = async (): Promise<BackupData | null> => {
    if (!isSignedIn()) {
        throw new Error('User not signed in');
    }

    try {
        // Find the backup file
        const response = await window.gapi.client.drive.files.list({
            spaces: 'appDataFolder',
            fields: 'files(id, name)',
            q: `name='${GOOGLE_API_CONFIG.BACKUP_FILENAME}'`
        });

        if (response.result.files && response.result.files.length > 0) {
            const fileId = response.result.files[0].id;

            // Get the file content
            const fileResponse = await window.gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });

            return fileResponse.result as BackupData;
        } else {
            return null; // No backup found
        }
    } catch (error) {
        console.error('Error loading from Google Drive:', error);
        throw error;
    }
};

// Add TypeScript declarations for the global window object
declare global {
    interface Window {
        gapi: GoogleApiClient;
    }
}
