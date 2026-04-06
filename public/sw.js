const CACHE_NAME = 'drselftape-v1';
const OFFLINE_URL = '/dashboard';

// Assets to cache on install for offline shell
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Install — cache shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

// Fetch — network first, fall back to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET and API/WebSocket requests
  if (request.method !== 'GET') return;
  if (request.url.includes('/api/') || request.url.includes('/ws/')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses for static assets
        if (response.ok && (request.url.match(/\.(js|css|png|jpg|svg|woff2?)$/) || request.url.endsWith('/'))) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline — serve from cache
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // For navigation requests, serve the app shell
          if (request.mode === 'navigate') {
            return caches.match('/') || new Response(
              '<html><body style="background:#0D0D0D;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:Poppins,sans-serif"><div style="text-align:center"><h1>Dr Self Tape</h1><p>You\'re offline. Connect to continue.</p></div></body></html>',
              { headers: { 'Content-Type': 'text/html' } }
            );
          }
        });
      })
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'Dr Self Tape';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    data: data.data || {},
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Open App' },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click — navigate to correct screen
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  let url = '/dashboard';

  if (notifData.type === 'scene_partner_like') {
    url = '/dashboard/who-wants-to-read';
  } else if (notifData.type === 'scene_partner_match' && notifData.match_id) {
    url = `/dashboard/green-room/${notifData.match_id}`;
  } else if (notifData.type === 'rehearsal_started' && notifData.match_id) {
    url = `/dashboard/green-room/${notifData.match_id}`;
  } else if (notifData.type === 'new_message' && notifData.match_id) {
    url = `/dashboard/green-room/${notifData.match_id}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
