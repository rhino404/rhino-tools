const CACHE_NAME = 'rhino-tools-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles/base.css',
  '/styles/light.css',
  '/styles/dark.css',
  '/scripts/main.js',
  '/scripts/installPrompt.js',
  '/images/rhino404.jpeg',
  // Add other assets to cache here
];

self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(
    // Clean up old caches if needed
    caches.keys().then(keys => 
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    )
  );
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(networkResponse => {
        // Optionally cache new requests dynamically
        return networkResponse;
      });
    })
  );
});
