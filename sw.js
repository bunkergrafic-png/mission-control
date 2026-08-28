const CACHE_NAME = 'mc-v3';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './state.js',
  './engine.js',
  './app.js',
  './manifest.json',
  './icon.svg'
];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});
// Network-first: mientras haya internet, siempre trae la versión real del
// servidor (evita quedarte pegado en una versión vieja mientras esto sigue
// cambiando rápido). Si no hay red, cae al caché como respaldo offline.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copia = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
