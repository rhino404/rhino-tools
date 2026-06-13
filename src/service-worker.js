// service-worker.js

// ===============================
// PWA Service Worker — Optimized
// ===============================

// Static version string — increment this (e.g. v20260607b) on each deploy to force
// the browser to detect a changed SW file and install a fresh cache.
const CACHE_VERSION = 'v20260613g';
const CORE_CACHE = `ryno-core-${CACHE_VERSION}`;
const CONTENT_CACHE = `ryno-content-${CACHE_VERSION}`;

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
  `${BASE_PATH}/css/chrome.css`,
  `${BASE_PATH}/css/modal.css`,
  `${BASE_PATH}/css/blog.css`,
  `${BASE_PATH}/index.js`,
  `${BASE_PATH}/services/pwaInstaller.js`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/datasets/index.json`,
  `${BASE_PATH}/images/ryno-wordmark-navy.webp`,
  `${BASE_PATH}/blog/`,
  `${BASE_PATH}/blog/index.html`,
  `${BASE_PATH}/blog/feed.xml`,
];

// ===============================
// Install Event — Cache Core Assets
// ===============================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing —', CACHE_VERSION, 'Scope:', self.registration.scope);
  event.waitUntil(
    caches.open(CORE_CACHE).then(cache =>
      // Resilient precache: cache each asset independently so one 404 doesn't
      // abort the whole shell (atomic addAll would reject on any single failure).
      Promise.allSettled(
        CORE_ASSETS.map(asset =>
          cache.add(asset).catch(err => console.warn('[SW] Precache skipped:', asset, err))
        )
      )
    )
  );
  self.skipWaiting(); // Activate immediately after install
});

// ===============================
// Activate Event — Clean Old Caches
// ===============================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating —', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => (key.startsWith('ryno-core-') || key.startsWith('ryno-content-')) && ![CORE_CACHE, CONTENT_CACHE].includes(key))
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

  const url = new URL(req.url);

  // Images: cache-first (stable assets; no SWR overhead needed)
  if (url.pathname.startsWith(`${BASE_PATH}/images/`)) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(resp => {
        if (resp.ok) caches.open(CONTENT_CACHE).then(c => c.put(req, resp.clone()));
        return resp;
      }))
    );
    return;
  }

  // HTML navigations: network-first so content fixes appear immediately.
  // Falls back to cache only when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(networkResp => {
        if (networkResp.ok) {
          const dest = url.pathname.startsWith(`${BASE_PATH}/blog`) ? CONTENT_CACHE : CORE_CACHE;
          caches.open(dest).then(c => c.put(req, networkResp.clone()));
        }
        return networkResp;
      }).catch(() =>
        caches.match(req).then(cached => cached || caches.match(`${BASE_PATH}/index.html`))
      )
    );
    return;
  }

  // All other GET: stale-while-revalidate (assets, JSON, images)
  const coreSet = new Set(CORE_ASSETS.map(p => new URL(p, self.location.origin).pathname));

  event.respondWith(
    caches.match(req).then(cachedResponse => {
      if (cachedResponse) {
        // Update cache in background
        fetch(req).then(networkResp => {
          if (networkResp.ok) {
            const bucket = coreSet.has(url.pathname) ? CORE_CACHE : CONTENT_CACHE;
            caches.open(bucket).then(c => c.put(req, networkResp.clone()));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(req).then(networkResp => {
        if (networkResp.ok) {
          caches.open(CONTENT_CACHE).then(c => c.put(req, networkResp.clone()));
        }
        return networkResp;
      }).catch(err => {
        console.warn('[SW] Fetch failed; returning offline cache if available.', err);
      });
    })
  );
});
