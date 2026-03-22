const CACHE_NAME = 'vibe-v1';
const ASSETS = ['/', '/index.html', '/app.html', '/styles.css', '/app.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request).catch(() => {
         // Aquí podríamos mostrar una pantalla de "Sin Internet" en el futuro
      });
    })
  );
});