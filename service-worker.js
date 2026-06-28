const CACHE_NAME = 'ehv-ops-hub-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/tasks.html',
  '/finance.html',
  '/energy.html',
  '/leads.html',
  '/strategy.html',
  '/health.html',
  '/calendar.html',
  '/settings.html',
  '/css/style.css',
  '/js/data-service.js',
  '/js/prompts.js',
  '/js/nav.js',
  '/js/weather.js',
  '/js/outlook.js',
  '/js/notifications.js',
  '/js/chart-config.js',
  '/js/morning-ritual.js',
  '/js/tasks.js',
  '/js/health.js',
  '/js/calendar.js',
  '/js/settings.js',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/favicon.svg',
  '/manifest.json'
];

// Install — cache static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first for static, network-first for API
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Network-first for API calls (Microsoft Graph, Open-Meteo)
  if (url.hostname.includes('graph.microsoft.com') ||
      url.hostname.includes('open-meteo.com') ||
      url.hostname.includes('login.microsoftonline.com')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for everything else
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// Push notifications
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  const title = data.title || 'EHV Ops Hub';
  const options = {
    body: data.body || '',
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-192.png',
    tag: data.tag || 'ehv-notification',
    data: { url: data.url || '/', action: data.action || null },
    actions: [
      { action: 'done', title: 'Done' },
      { action: 'snooze', title: 'Snooze 1hr' }
    ],
    vibrate: [100, 50, 100]
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// Notification click
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const data = e.notification.data || {};

  if (e.action === 'done' && data.action) {
    // Mark task/metric complete without opening app
    self.clients.matchAll().then(clients => {
      clients.forEach(c => c.postMessage({ type: 'complete', payload: data.action }));
    });
    return;
  }

  if (e.action === 'snooze') {
    // Re-schedule notification for 1 hour later
    const snoozeTime = Date.now() + 3600000;
    self.clients.matchAll().then(clients => {
      clients.forEach(c => c.postMessage({ type: 'snooze', payload: { ...data, time: snoozeTime } }));
    });
    return;
  }

  // Default: open the app
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      const existing = clients.find(c => c.url.includes(data.url));
      if (existing) return existing.focus();
      return self.clients.openWindow(data.url);
    })
  );
});

// Background sync for reminders
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_REMINDER') {
    const { id, title, body, time, url, action } = e.data.payload;
    const delay = time - Date.now();
    if (delay > 0) {
      setTimeout(() => {
        self.registration.showNotification('EHV Ops Hub', {
          body: title,
          icon: '/assets/icon-192.png',
          tag: id,
          data: { url, action },
          actions: [
            { action: 'done', title: 'Done' },
            { action: 'snooze', title: 'Snooze 1hr' }
          ]
        });
      }, delay);
    }
  }
});
