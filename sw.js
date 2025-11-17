// sw.js
const CACHE = 'fpl-v5-3-9';

const ASSETS = [
  './',
  './index.html',
  './app.js?v=5.3.9',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './Parts.csv'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(k => (k === CACHE ? null : caches.delete(k)))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const accept = e.request.headers.get('accept') || '';
  const isHTML =
    e.request.mode === 'navigate' ||
    accept.includes('text/html');

  const isAppJs =
    url.pathname.endsWith('/app.js') ||
    url.pathname.endsWith('app.js') ||
    url.searchParams.has('v');

  // Network-first for HTML and app.js, with explicit index.html fallback
  if (isHTML || isAppJs) {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return resp;
        })
        .catch(() =>
          caches.match(e.request).then(hit => {
            if (hit) return hit;
            // Navigation fallback to cached index.html if available
            return caches.match('./index.html');
          })
        )
    );
    return;
  }

  // Cache-first for everything else
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
