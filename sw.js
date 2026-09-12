// Inkflow Service Worker — offline cache
// Keep CACHE_NAME in sync with package.json — scripts/check-version.js (`npm run check:version`) enforces it in CI.
const CACHE_NAME = 'inkflow-v1.7.0';
// Same-origin app shell only. CDN libraries (jsPDF, mammoth, mermaid, opentype.js,
// rough.js, TensorFlow.js) and Google Fonts are cached at runtime on first use —
// see the fetch handler — so offline mode works after the first visit without
// risking an install failure if a CDN is unreachable.
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/index.js',
  '/index.css',
  '/ai-assistant.js',
  '/ai-postprocess.js',
  '/audio-recorder.js',
  '/paper-renderer.js',
  '/text-layout.js',
  '/script-detector.js',
  '/export-renderers.js',
  '/export-manager.js',
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
  '/flashcards.js',
  '/margin-labels.js',
  '/voice-notes.js',
  '/manifest.json',
  // Google Fonts stylesheet — must match the <link> in index.html exactly so the
  // full handwriting font suite is available offline (the .woff2 files themselves
  // are runtime-cached on first use).
  'https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&family=Crimson+Pro:ital,wght@0,200..900;1,200..900&family=Delius&family=Homemade+Apple&family=Indie+Flower&family=Patrick+Hand&family=Roboto:wght@300;400;500;700&family=Shadows+Into+Light&family=Architects+Daughter&family=Gochi+Hand&family=Just+Another+Hand&family=Nanum+Pen+Script&family=Pangolin&family=reey:wght@400&family=Gloria+Hallelujah&family=Schoolbell&family=Neucha&family=Covered+By+Your+Grace&family=The+Girl+Next+Door&family=Waiting+for+the+Sunrise&family=Permanent+Marker&family=Coming+Soon&family=Short+Stack&family=Handlee&family=Rancho&family=Amatic+SC&family=Fuzzy+Bubbles&family=Dancing+Script:wght@400..700&family=Great+Vibes&family=Satisfy&family=Sacramento&family=Cedarville+Cursive&family=Zeyada&family=La+Belle+Aurore&family=Nothing+You+Could+Do&family=Reenie+Beanie&family=Nanum+Brush+Script&family=Pacifico&family=Parisienne&family=Yellowtail&family=Charm:wght@400;700&family=Aladin&family=Kalam:wght@300;400;700&family=Amita:wght@400;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&family=Noto+Serif+Devanagari:wght@400;500;600;700&family=Hind:wght@300;400;500;600;700&family=Tiro+Devanagari+Hindi:ital@0;1&family=Baloo+2:wght@400;500;600;700;800&family=Martel:wght@200;300;400;600;700;800;900&display=swap',
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
  // Never intercept live API traffic (app server, AI providers).
  if (event.request.url.includes('/api/') || event.request.url.includes('openrouter') || event.request.url.includes('anthropic') || event.request.url.includes('localhost:11434')) {
    return;
  }
  // Cache-first for everything else, including cross-origin CDN assets and
  // Google Fonts (cached on first use, so subsequent offline visits work).
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
