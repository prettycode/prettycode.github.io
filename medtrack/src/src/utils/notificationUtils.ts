/**
 * Notification utilities for the application
 */

// Setup notifications and request permission
export async function setupNotifications(): Promise<ServiceWorkerRegistration> {
    // Check if notifications are supported
    if (!('Notification' in window)) {
        throw new Error('This browser does not support notifications');
    }

    // Request permission
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
        throw new Error('Notification permission denied');
    }

    // Register service worker
    if (!('serviceWorker' in navigator)) {
        throw new Error('This browser does not support service workers');
    }

    return navigator.serviceWorker.register('service-worker.js');
}

// Initialize notification setup
export const notificationSetup = setupNotifications();

// Trigger a notification
export function triggerAlarmNotification(alarmTitle?: string, alarmBody?: string): void {
    notificationSetup.then(() => {
        if (Notification.permission !== 'granted') {
            throw new Error("Can't send notification. Permission has not been granted.");
        }

        if (!navigator.serviceWorker.controller) {
            throw new Error("Can't send notification. Service worker is not registered.");
        }

        navigator.serviceWorker.controller.postMessage({
            type: 'ALARM_TRIGGERED',
            title: alarmTitle ?? 'Notification title',
            body: alarmBody ?? 'Notification body.',
            icon: 'favicon.svg'
        });
    });
}
