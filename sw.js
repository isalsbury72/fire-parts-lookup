// sw.js
const CACHE = 'fpl-v5-3-7';

const ASSETS = [
  './',
  './index.html',
  './app.js?v=5.3.7',
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
  const req = e.request;
  const url = new URL(req.url);

  const isHTML =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  const isAppJs =
    url.pathname.endsWith('/app.js') ||
    url.pathname.endsWith('app.js') ||
    url.searchParams.has('v');

  // Network first for HTML + app.js so updates appear quickly
  if (isHTML || isAppJs) {
    e.respondWith(
      fetch(req)
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return resp;
        })
        .catch(() =>
          // Proper navigation fallback: always try cached index.html
          caches.match('./index.html')
            .then(r => r || caches.match('index.html') || caches.match('./'))
        )
    );
    return;
  }

  // Cache first for everything else
  e.respondWith(
    caches.match(req).then(r => r || fetch(req))
  );
});
