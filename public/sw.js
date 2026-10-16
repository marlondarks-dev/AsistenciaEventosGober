// Service Worker para soporte PWA y funcionamiento offline básico
const CACHE_NAME = 'pili-pwa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Estrategia Network-First con fallback a cache si no hay red
  if (event.request.method !== 'GET') return;
  
  // No cachear APIs dinámicas
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
