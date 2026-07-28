const CACHE_PREFIX = 'all-in-one-667-runtime';
const CACHE_VERSION = '2026-07-28-real-device-verification';
const CURRENT_CACHE = `${CACHE_PREFIX}-${CACHE_VERSION}`;

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CURRENT_CACHE));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CURRENT_CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request, { cache: 'no-store' }).catch(() => caches.match(request)));
    return;
  }
  event.respondWith(fetch(request));
});