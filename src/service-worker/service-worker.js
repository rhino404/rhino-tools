// service-worker.js

// ===============================
// PWA Service Worker — Optimized
// ===============================

// Use build timestamp as cache version (forces update on each deploy)
const BUILD_TIMESTAMP = new Date().toISOString();
const CORE_CACHE = `ryno-core-${BUILD_TIMESTAMP}`;     // Core app shell (HTML, JS, CSS)
const CONTENT_CACHE = `ryno-content`;                 // Dynamic assets (images, optional resources)

// Optional: set to new domain for migration, or null to disable
const NEW_DOMAIN = null; // e.g., 'https://ryno.tools/'

// Determine base path dynamically (handles /src or /public deployment differences)
const BASE_PATH = self.registration.scope.replace(self.location.origin, '').replace(/\/$/, '');

// List of core files to cache for offline use
const CORE_ASSETS = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/css/base.css`,
  `${BASE_PATH}/css/theme.css`,
  `${BASE_PATH}/css/modal.css`,
  `${BASE_PATH}/index.js`,
  `${BASE_PATH}/services/pwaInstaller.js`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/datasets/index.json`,
];

// ===============================
// Install Event — Cache Core Assets
// ===============================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing — build:', BUILD_TIMESTAMP, 'Scope:', self.registration.scope);
  event.waitUntil(
    caches.open(CORE_CACHE)
      .then(cache => cache.addAll(CORE_ASSETS))
      .catch(err => console.error('[SW] Cache addAll failed:', err))
  );
  self.skipWaiting(); // Activate immediately after install
});

// ===============================
// Activate Event — Clean Old Caches
// ===============================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating — build:', BUILD_TIMESTAMP);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => (key.startsWith('ryno-core-') || key.startsWith('ryno-content')) && ![CORE_CACHE, CONTENT_CACHE].includes(key))
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
    .then(() => {
      // 📢 Notify all clients that a new version is available
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientsArr => {
          clientsArr.forEach(client => {
            client.postMessage({ type: 'NEW_VERSION_AVAILABLE' });
          });
        });
    })
  );
});

// ===============================
// Fetch Event — Cache-First + Stale-While-Revalidate
// ===============================
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Optional migration redirect — only for navigations
  if (NEW_DOMAIN && req.mode === 'navigate') {
    console.log('[SW] Redirecting to new domain:', NEW_DOMAIN);
    event.respondWith(Response.redirect(NEW_DOMAIN));
    return;
  }

  // Only handle GET requests for caching
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then(cachedResponse => {
      // Serve cached response immediately if available
      if (cachedResponse) {
        // Update cache in background (stale-while-revalidate)
        fetch(req).then(networkResp => {
          if (networkResp.ok) {
            const cacheToUse = CORE_ASSETS.includes(req.url.replace(location.origin, BASE_PATH)) ? CORE_CACHE : CONTENT_CACHE;
            caches.open(cacheToUse).then(cache => cache.put(req, networkResp.clone()));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      // If not cached, fetch from network
      return fetch(req).then(networkResp => {
        // Cache dynamically for future
        if (networkResp.ok) {
          caches.open(CONTENT_CACHE).then(cache => cache.put(req, networkResp.clone()));
        }
        return networkResp;
      }).catch(err => {
        console.warn('[SW] Fetch failed; returning offline cache if available.', err);
        // fallback to app shell for navigations
        if (req.mode === 'navigate') return caches.match(`${BASE_PATH}/index.html`);
      });
    })
  );
});
