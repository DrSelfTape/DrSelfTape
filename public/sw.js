self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'Dr Self Tape';
  const options = {
    body: data.body || '',
    icon: data.icon || '/logo.png',
    badge: '/badge.png',
    data: data.data || {},
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Open App' },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  let url = '/';

  if (notifData.type === 'scene_partner_match' && notifData.match_id) {
    url = `/dashboard/green-room/${notifData.match_id}`;
  } else if (notifData.type === 'rehearsal_started' && notifData.match_id) {
    url = `/dashboard/green-room/${notifData.match_id}`;
  } else if (notifData.type === 'new_message' && notifData.match_id) {
    url = `/dashboard/green-room/${notifData.match_id}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));
