const CACHE_NAME = 'alerta-bolivia-v1.0.1';
const urlsToCache = [
  '/Alerta_Bolivia/',
  '/Alerta_Bolivia/index.html',
  '/Alerta_Bolivia/educacion.html',
  '/Alerta_Bolivia/denuncias.html',
  '/Alerta_Bolivia/mapa.html',
  '/Alerta_Bolivia/contactos.html',
  '/Alerta_Bolivia/manifest.json',
  '/Alerta_Bolivia/icon-192.png',
  '/Alerta_Bolivia/icon-512.png',
  '/Alerta_Bolivia/logo.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http') || event.request.url.includes('formspree.io')) {
    return;
  }

  if (event.request.url.includes('/Alerta_Bolivia/') && !event.request.url.includes('?')) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(event.request)
            .then((response) => {
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }

              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });

              return response;
            })
            .catch(() => {
              if (event.request.destination === 'document') {
                return caches.match('/Alerta_Bolivia/index.html');
              }
            });
        })
    );
  } else {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request);
        })
    );
  }
});