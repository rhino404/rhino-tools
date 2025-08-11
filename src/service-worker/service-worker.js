// service-worker.js

// Use build timestamp as cache version (forces update on each deploy)
const BUILD_TIMESTAMP = new Date().toISOString();
const CACHE_NAME = `ryno-cache-${BUILD_TIMESTAMP}`;

// Optional: set to new domain for migration, or null to disable
const NEW_DOMAIN = null; // e.g., 'https://ryno.tools/'

// Determine base path dynamically (handles /src or /public deployment differences)
const BASE_PATH = self.registration.scope.replace(self.location.origin, '').replace(/\/$/, '');

// List of core files to cache for offline use
const CORE_ASSETS = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/styles/base.css`,
  `${BASE_PATH}/styles/dark.css`,
  `${BASE_PATH}/styles/light.css`,
  `${BASE_PATH}/index.js`,
  `${BASE_PATH}/services/pwaInstaller.js`,
  `${BASE_PATH}/manifest.json`,
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing — build:', BUILD_TIMESTAMP, 'Scope:', self.registration.scope);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .catch(err => console.error('[SW] Cache addAll failed:', err))
  );
  self.skipWaiting(); // Activate immediately after install
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating — build:', BUILD_TIMESTAMP);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('ryno-cache-') && key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
    .then(() => {
      // 🔥 Reload all open app windows so they use the new SW immediately
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientsArr => {
          clientsArr.forEach(client => {
            console.log('[SW] Reloading client:', client.url);
            client.navigate(client.url);
          });
        });
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Optional migration redirect — only for navigations
  if (NEW_DOMAIN && event.request.mode === 'navigate') {
    console.log('[SW] Redirecting to new domain:', NEW_DOMAIN);
    event.respondWith(Response.redirect(NEW_DOMAIN));
    return;
  }

  // Cache-first strategy (offline friendly)
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then(networkResponse => {
        if (
          event.request.method === 'GET' &&
          event.request.url.startsWith(self.location.origin)
        ) {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(err => {
        console.warn('[SW] Fetch failed; returning offline cache if available.', err);
        return caches.match(`${BASE_PATH}/index.html`); // fallback to app shell
      });
    })
  );
});
