const CACHE_NAME = 'alerta-bolivia-v1.0.0';
const urlsToCache = [
  'https://alaztito0z.github.io/Alerta_Bolivia/',
  'https://alaztito0z.github.io/Alerta_Bolivia/index.html',
  'https://alaztito0z.github.io/Alerta_Bolivia/educacion.html',
  'https://alaztito0z.github.io/Alerta_Bolivia/denuncias.html',
  'https://alaztito0z.github.io/Alerta_Bolivia/mapa.html',
  'https://alaztito0z.github.io/Alerta_Bolivia/contactos.html',
  'https://alaztito0z.github.io/Alerta_Bolivia/manifest.json',
  'https://alaztito0z.github.io/Alerta_Bolivia/icon-192.png',
  'https://alaztito0z.github.io/Alerta_Bolivia/icon-512.png',
  'https://alaztito0z.github.io/Alerta_Bolivia/logo.jpg',
  'https://formspree.io/f/xblzaejj'
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
  if (!(event.request.url.startsWith('http'))) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('https://alaztito0z.github.io/Alerta_Bolivia/index.html');
            }
            
            return new Response('Recurso no disponible en modo offline', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});
