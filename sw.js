// sw.js
const CACHE = 'fpl-v1';
const ASSETS = [
  '/fire-parts-lookup/',
  '/fire-parts-lookup/index.html',
  '/fire-parts-lookup/app.js',
  '/fire-parts-lookup/manifest.json',
  '/fire-parts-lookup/icon-192.png',
  '/fire-parts-lookup/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
