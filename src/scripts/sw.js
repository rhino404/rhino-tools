// sw.js — PWA auto cache-busting + optional migration helper

// Use build timestamp as cache version (forces update on each deploy)
const BUILD_TIMESTAMP = self.registration?.active?.scriptURL
  ? new Date().toISOString()
  : 'dev'; // fallback in dev
const CACHE_NAME = `ryno-cache-${BUILD_TIMESTAMP}`;
const NEW_DOMAIN = null; // e.g., 'https://ryno.tools/' — set to null to disable migration

// List of core files to cache for offline use
const CORE_ASSETS = [
  '/',                // root
  '/index.html',
  '/base.css',
  '/dark.css',
  '/app.js',
  '/pwaInstaller.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing — build:', BUILD_TIMESTAMP);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .catch(err => console.error('[SW] Cache addAll failed:', err))
  );
  self.skipWaiting();
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
    )
  );
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Migration redirect — only for navigations
  if (NEW_DOMAIN && event.request.mode === 'navigate') {
    console.log('[SW] Redirecting to new domain:', NEW_DOMAIN);
    event.respondWith(Response.redirect(NEW_DOMAIN));
    return;
  }

  // Cache-first strategy
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
      });
    })
  );
});
