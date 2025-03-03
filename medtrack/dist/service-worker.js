self.addEventListener('install', (event) => {
    self.skipWaiting();
  });
  
  self.addEventListener('activate', (event) => {
    return self.clients.claim();
  });
  
  self.addEventListener('message', (event) => {
    if (event.data?.type !== 'ALARM_TRIGGERED') {
        console.log(`Unrecognized event type: ${event.data.type}`);
        return;
    }

    self.registration.showNotification(event.data.title, {
        body: event.data.body,
        icon: event.data.icon,
        vibrate: [200, 100, 200],
        tag: 'alarm-notification'
    });
});