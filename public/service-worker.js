const CACHE_NAME = "plomergas-v4"; // SUBÍ LA VERSIÓN

const urlsToCache = [
  '/',
  '/login',           // 👈 agregamos explícitamente el login nuevo
  '/inicio',          // 👈 agregamos el panel de inicio REAL
  '/css/styles.css',
  '/js/clientes.js',
  '/js/empleados.js',
  '/js/servicios.js',
  '/js/facturacion.js',
  '/js/login.js',
  '/js/registro.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// 👉 FORZAR A TOMAR LA NUEVA VERSIÓN SI O SI
self.addEventListener("install", (event) => {
  self.skipWaiting(); // 🚀 instala inmediatamente

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// 👉 BORRAR TODAS LAS VERSIONES ANTERIORES
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("🗑 Borrando cache viejo:", key);
            return caches.delete(key);
          }
        })
      )
    )
  );

  return self.clients.claim();
});

// 👉 RESPUESTA DEL SW
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(resp => resp || fetch(event.request))
  );
});
