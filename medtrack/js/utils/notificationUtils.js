/**
 * Set up browser notifications and service worker
 * @returns {Promise<ServiceWorkerRegistration>} Promise resolving to service worker registration
 */
async function setupNotifications() {
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
const notificationSetup = setupNotifications();

/**
 * Trigger an alarm notification via service worker
 * @param {string} alarmTitle - Title for the notification
 * @param {string} alarmBody - Body text for the notification
 */
function triggerAlarmNotification(alarmTitle, alarmBody) {
  notificationSetup.then(() => {
    if (Notification.permission !== 'granted') {
      console.error("Can't send notification. Permission has not been granted.");
      return;
    }

    if (!navigator.serviceWorker.controller) {
      console.error("Can't send notification. Service worker is not registered.");
      return;
    }

    navigator.serviceWorker.controller.postMessage({
      type: 'ALARM_TRIGGERED',
      title: alarmTitle || 'Medication Due',
      body: alarmBody || 'Your next dose of medication is due now.',
      icon: 'favicon.svg'
    });
  }).catch(error => {
    console.error('Failed to trigger notification:', error);
  });
} 