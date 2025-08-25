const CACHE_NAME = 'plomergas-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/clientes.js',
  '/js/empleados.js',
  '/js/servicios.js',
  '/js/facturacion.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(resp => resp || fetch(event.request))
  );
});
