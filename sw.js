/* ═══════════════════════════════════════════════════════════
   INKFLOW — Service Worker  (Phase 1 PWA Offline Support)
   v1.5.0 | Cache-First for assets, Network-First for shell
═══════════════════════════════════════════════════════════ */

const CACHE_VERSION = 'inkflow-v1.5.3';
const SHELL_CACHE   = `${CACHE_VERSION}-shell`;
const ASSET_CACHE   = `${CACHE_VERSION}-assets`;

/* ── App Shell (local files) ── */
const SHELL_URLS = [
  './',
  './index.html',
  './index.css',
  './index.js',
  './inkflow_logo.jpeg',
];

/* ── CDN Assets to pre-cache ── */
const CDN_URLS = [
  /* jsPDF */
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  /* html2canvas (legacy — kept for compatibility) */
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  /* opentype.js for TTF font generation */
  'https://cdn.jsdelivr.net/npm/opentype.js@1.3.4/dist/opentype.min.js',
  /* Font Awesome CSS + primary webfont */
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  /* Google Fonts stylesheet */
  'https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&family=Crimson+Pro:ital,wght@0,200..900;1,200..900&family=Delius&family=Homemade+Apple&family=Shadows+Into+Light&family=Architects+Daughter&family=Gochi+Hand&family=Just+Another+Hand&family=Nanum+Pen+Script&family=Pangolin&family=Indie+Flower&family=Patrick+Hand&family=Kalam:wght@300;400;700&family=Amita:wght@400;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&family=Noto+Serif+Devanagari:wght@400;500;600;700&family=Hind:wght@300;400;500;600;700&family=Tiro+Devanagari+Hindi:ital@0;1&family=Baloo+2:wght@400;500;600;700;800&family=Martel:wght@200;300;400;600;700;800;900&display=swap',
];

/* ════════════════════════════════════════════════
   INSTALL — Pre-cache app shell and CDN assets
═══════════════════════════════════════════════════ */
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_CACHE).then((cache) => {
        return cache.addAll(SHELL_URLS).catch((err) => {
          console.warn('[SW] Shell pre-cache partial failure:', err);
        });
      }),
      caches.open(ASSET_CACHE).then((cache) => {
        // Fetch CDN assets individually so one failure doesn't block install
        return Promise.allSettled(
          CDN_URLS.map((url) =>
            cache.add(url).catch((e) =>
              console.warn('[SW] Could not cache CDN asset:', url, e)
            )
          )
        );
      }),
    ]).then(() => self.skipWaiting())
  );
});

/* ════════════════════════════════════════════════
   ACTIVATE — Delete old caches from prior versions
═══════════════════════════════════════════════════ */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(
            (key) => key.startsWith('inkflow-') && key !== SHELL_CACHE && key !== ASSET_CACHE
          )
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

/* ════════════════════════════════════════════════
   FETCH — Routing Strategy
   • App Shell  → Network-First  (freshest code)
   • Google Fonts + CDN → Cache-First (fast loads)
   • External API calls (OpenRouter, Anthropic, Ollama) → Network-only
═══════════════════════════════════════════════════ */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  /* ── Skip non-GET requests and opaque origins ── */
  if (request.method !== 'GET') return;

  /* ── API calls — always go to network, never cache ── */
  const isApiCall =
    url.hostname === 'openrouter.ai' ||
    url.hostname === 'api.anthropic.com' ||
    url.pathname.startsWith('/api/') || // Ollama localhost
    url.hostname === 'va.vercel-insights.com';

  if (isApiCall) {
    // Let the browser handle it directly
    return;
  }

  /* ── Google Fonts / FontAwesome webfonts → Cache-First ── */
  const isFontOrCDN =
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com' ||
    url.hostname === 'cdnjs.cloudflare.com' ||
    url.hostname === 'cdn.jsdelivr.net';

  if (isFontOrCDN) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  /* ── App Shell (same-origin HTML/CSS/JS) → Network-First with cache fallback ── */
  event.respondWith(networkFirst(request, SHELL_CACHE));
});

/* ════════════════════════════════════════════════
   STRATEGY HELPERS
═══════════════════════════════════════════════════ */

/**
 * Cache-First: try cache, fall back to network and cache the response.
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      // Clone before consuming body
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (e) {
    console.warn('[SW] cache-first network fail:', request.url);
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Network-First: try network and cache, fall back to cache when offline.
 */
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (e) {
    // Network failed — serve from cache
    const cached = await caches.match(request);
    if (cached) return cached;

    // Ultimate fallback: offline page
    const offlineCache = await caches.match('./index.html');
    if (offlineCache) return offlineCache;

    return new Response(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px">
        <img src="./inkflow_logo.jpeg" alt="Inkflow Logo" style="width:64px;height:64px;border-radius:50%;margin-bottom:12px;box-shadow:0 4px 12px rgba(0,0,0,0.15)">
        <h1 style="margin:0 0 10px 0;color:#7c6af7">Inkflow</h1>
        <p>You're offline. Open Inkflow while connected at least once to cache the app.</p>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

/* ════════════════════════════════════════════════
   BACKGROUND SYNC — Autosave queue flush
   Triggered when connectivity is restored after
   the app attempted an IndexedDB autosave offline.
═══════════════════════════════════════════════════ */
self.addEventListener('sync', (event) => {
  if (event.tag === 'inkflow-autosave-sync') {
    // The page handles IndexedDB directly; this event is a signal
    // to notify open clients that they should re-run their save queue.
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) =>
          client.postMessage({ type: 'SYNC_AUTOSAVE' })
        );
      })
    );
  }
});
