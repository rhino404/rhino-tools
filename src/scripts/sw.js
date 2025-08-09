// sw.js — PWA migration helper

const NEW_DOMAIN = 'https://ryno.tools/'; // change to your new domain

self.addEventListener('install', (event) => {
  console.log('[SW] Installed - migration mode');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activated - migration mode');
  // Take control of all clients immediately
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Only redirect full-page navigations (so assets like icons still load)
  if (event.request.mode === 'navigate') {
    console.log('[SW] Redirecting to new domain:', NEW_DOMAIN);
    event.respondWith(Response.redirect(NEW_DOMAIN));
    return;
  }

  // Otherwise, fetch as normal (for icons, manifest, etc.)
  event.respondWith(fetch(event.request));
});
