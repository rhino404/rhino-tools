const CACHE_NAME = 'rhino-tools-cache-v3'; // bump version each deploy
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/main.js?v=20250731',
  '/base.css?v=20250731',
  // add other assets you want cached here
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request);
    })
  );
});