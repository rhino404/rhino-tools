const CACHE_NAME = 'rhino-tools-cache-v4'; // ⚠️ Bump this with each deploy

const ASSETS = [
  '/',
  '/index.html',
  '/styles/base.css?v=20250803',
  '/scripts/main.js?v=20250803',
  '/scripts/installPrompt.js?v=20250803',
  '/images/new-icon.svg',
  // add any other essential assets here
];

// Install event — pre-cache assets
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching assets');
      return cache.addAll(ASSETS);
    })
  );
});

// Activate event — remove old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log(`[SW] Removing old cache: ${key}`);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch event — respond with cache first
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(event.request)
        .then((response) => {
          return response;
        })
        .catch((err) => {
          console.warn('[SW] Fetch failed:', err);
          return new Response('⚠️ Network error or offline.', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
    })
  );
});

// Optional: Message handler for SW updates
self.addEventListener('message', event => {
  if (event.data?.action === 'checkForUpdate') {
    console.log('[SW] Received update check');
    self.skipWaiting();
  }
});

