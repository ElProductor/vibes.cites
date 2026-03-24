const CACHE_NAME = 'vibe-v3';
const ASSETS = ['/', '/index.html', '/app.html', '/styles.css', '/app.js'];

self.addEventListener('install', (e) => {
  self.skipWaiting(); // Fuerza la activación inmediata del nuevo Service Worker
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  // Limpia los cachés antiguos (como vibe-v1)
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // 🚨 FIX MACRO-ERROR: Ignorar peticiones a la API o peticiones POST/PUT.
  // Esto permite que el Login y Registro lleguen al servidor de Railway sin interferencia.
  if (e.request.url.includes('/auth/') || e.request.url.includes('/api/') || e.request.method !== 'GET') {
    return; 
  }

  // Estrategia Network-First: Siempre intenta descargar la última versión de la red.
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // Solo guardamos en caché si la respuesta es válida y no opaca
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(e.request);
        if (cachedResponse) {
            return cachedResponse;
        }
        // Evitar el error TypeError devolviendo una respuesta vacía fabricada
        return new Response('', { status: 408, statusText: 'Offline' });
      })
  );
});