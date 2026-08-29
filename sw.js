// Inkflow Service Worker — minimal offline cache
const CACHE_NAME = 'inkflow-v1.6.0';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/index.js',
  '/index.css',
  '/ai-assistant.js',
  '/paper-renderer.js',
  '/text-layout.js',
  '/script-detector.js',
  '/export-renderers.js',
  '/diagram-engine.js',
  '/font-compilation.js',
  '/template-manager.js',
  '/cursive-connector.js',
  '/collaborative-engine.js',
  '/contextual-jitter-engine.js',
  '/layer-compositor.js',
  '/markdown-parser.js',
  '/stroke-prediction-engine.js',
  '/notebooks.js',
  '/server.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Network-first for API calls, cache-first for static assets
  if (event.request.url.includes('/api/') || event.request.url.includes('openrouter') || event.request.url.includes('anthropic') || event.request.url.includes('localhost:11434')) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
