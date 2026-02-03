const CACHE_NAME = 'alerta-bolivia-v1.0';
const OFFLINE_URL = 'offline.html';
const CORE_ASSETS = [
  'index.html',
  'educacion.html',
  'denuncias.html',
  'mapa.html',
  'contactos.html',
  './',
  'manifest.json',
  'logo.jpg'
];
const STATIC_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Poppins:wght@700;800;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll([...CORE_ASSETS, OFFLINE_URL]);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  if (request.method !== 'GET' || 
      request.url.includes('formspree.io') ||
      request.url.includes('nominatim.openstreetmap.org') ||
      request.url.includes('api')) {
    return;
  }
  
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) return cachedResponse;
              return caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }
  
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          fetch(request).then((response) => {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }).catch(() => {});
          return cachedResponse;
        }
        
        return fetch(request)
          .then((response) => {
            if (!response || response.status !== 200) return response;
            
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
            
            return response;
          })
          .catch(() => {
            if (request.url.includes('.css')) {
              return new Response(`
                body { 
                  font-family: Arial, sans-serif; 
                  background: #F0F9FF; 
                  color: #0A1E32;
                  padding: 20px;
                }
              `, { headers: { 'Content-Type': 'text/css' } });
            }
          });
      })
  );
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {
    title: 'Alerta Bolivia',
    body: 'Nueva alerta de emergencia',
    icon: 'logo.jpg',
    badge: 'logo.jpg',
    tag: 'alerta-bolivia',
    vibrate: [200, 100, 200]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      vibrate: data.vibrate,
      data: data.data || {}
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});
});
