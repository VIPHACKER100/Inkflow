# 📱 PWA — Progressive Web App

This document covers Inkflow's v1.6.0 PWA support: service worker, web app manifest, and offline caching strategy.

---

## Overview

Inkflow can be installed as a Progressive Web App on desktop and mobile. The service worker caches all static assets for offline use while keeping AI API calls network-first to avoid stale data.

**Files**: `sw.js`, `manifest.json`

---

## Web App Manifest (`manifest.json`)

```json
{
  "name": "Inkflow — AI Handwritten Notes",
  "short_name": "Inkflow",
  "description": "Generate beautiful AI-powered handwritten notes in your browser",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f7f3ea",
  "theme_color": "#6C63FF",
  "orientation": "any",
  "icons": [
    {
      "src": "data:image/svg+xml,...",
      "sizes": "any",
      "type": "image/svg+xml"
    }
  ]
}
```

### Properties

| Property | Value | Description |
|----------|-------|-------------|
| `display` | `standalone` | Opens without browser chrome (address bar, tabs) |
| `background_color` | `#f7f3ea` | Matches default paper color for seamless splash |
| `theme_color` | `#6C63FF` | Matches accent color for status bar theming |
| `orientation` | `any` | Supports both portrait and landscape |

---

## Service Worker (`sw.js`)

### Cache Strategy

| Request Type | Strategy | Rationale |
|--------------|----------|-----------|
| Static assets (JS, CSS, HTML) | **Cache-first** | Fast loads, offline support |
| API calls (OpenRouter, Anthropic, Ollama) | **Network-first** | Always fresh AI responses |
| Image/font loads | **Cache-first** | Performance |

### Precache List

The service worker precaches all 18 JS modules + HTML + CSS on install:

```javascript
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
];
```

### Lifecycle

```
install → precache static assets → skipWaiting()
activate → delete old caches → claim clients()
fetch → cache-first for static, network-first for APIs
```

### Cache Name

```javascript
const CACHE_NAME = 'inkflow-v1.6.0';
```

Bump this string on each release to invalidate old caches.

---

## Registration

```html
<!-- index.html — at end of <body> -->
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
</script>
```

Registration is silent — errors are caught and ignored (e.g., file:// protocol, unsupported browsers).

---

## Manifest Link

```html
<!-- index.html — in <head> -->
<link rel="manifest" href="manifest.json" />
<meta name="theme-color" content="#6C63FF" />
```

---

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Service Worker | ✅ 40+ | ✅ 44+ | ✅ 11.1+ | ✅ 17+ |
| Web App Manifest | ✅ 39+ | ✅ 52+ | ✅ 11.3+ | ✅ 17+ |
| Install Prompt | ✅ | ✅ | ❌ | ✅ |
| Offline Support | ✅ | ✅ | ✅ | ✅ |

---

## Deployment Requirements

- **HTTPS** required for service worker registration (or `localhost`)
- `manifest.json` must be accessible at root path
- `sw.js` must be accessible at root path (scope = directory of sw.js)

---

## Testing

1. Open DevTools → Application → Service Workers
2. Verify `sw.js` is registered and activated
3. Check Cache Storage for `inkflow-v1.6.0` entry
4. Go offline (DevTools → Network → Offline) and reload — app should load from cache
5. AI actions should fail gracefully when offline (network-first, no cache)

---

## Updating the Service Worker

When releasing a new version:

1. Update `CACHE_NAME` in `sw.js` (e.g., `'inkflow-v1.7.0'`)
2. Add any new JS files to `PRECACHE_URLS`
3. The new service worker will activate and delete the old cache automatically via `skipWaiting()` + `claimClients()`
