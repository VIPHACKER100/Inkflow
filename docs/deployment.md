# 🌐 Deployment Guide

Inkflow is a fully static, client-side web application. There is no build step, no server, and no backend — deployment is just serving four files.

---

## Requirements

- **Runtime**: Any modern browser (Chrome, Edge, Firefox, Safari). No Node.js required.
- **Web server**: Any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages, Apache, nginx, S3).
- **Minimum files**:
  - `index.html` (app shell)
  - `index.css` (styles)
  - `index.js` (application logic)
  - `sw.js` (PWA Service Worker for offline caching)
  - `manifest.json` (PWA Web App Manifest for installability)

---

## CDN Dependencies (Loaded Automatically)

All third-party libraries load from CDNs at runtime — nothing is vendored:

| Library | Version | Purpose | Source |
| :--- | :--- | :--- | :--- |
| html2canvas | 1.4.1 | Canvas rasterization for exports | `cdnjs.cloudflare.com` |
| jsPDF | 2.5.1 | PDF generation (UMD build) | `cdnjs.cloudflare.com` |
| Font Awesome | 6.4.0 | UI icons | `cdnjs.cloudflare.com` |
| Google Fonts | — | Handwriting + UI font families | `fonts.googleapis.com` |
| opentype.js | 1.3.4 | Custom font building (lazy-loaded) | `cdnjs.cloudflare.com` |
| pdf.js | 3.4.120 | PDF file import (lazy-loaded) | `cdnjs.cloudflare.com` |

The last two are lazy-loaded only when the relevant feature is first used (`ensureOpentypeLoaded()` for HandFonted Studio, `extractTextFromPDF()` for PDF import).

---

## Quick Deploy Options

### 1. Local (Offline Preview)
```bash
# Python
python -m http.server 8000

# Node
npx serve .
```
Open `http://localhost:8000`.

### 2. GitHub Pages
Push the repo, then in **Settings → Pages** set the source to the `main` branch root. The site appears at `https://<user>.github.io/Inkflow/`.

### 3. Netlify / Vercel / Cloudflare Pages
Connect the repository — each detects a static site with no build step. Deploy command: `none`. Publish directory: repository root.

---

## AI Integration Considerations

The AI features (OpenRouter / Anthropic) call third-party APIs from the browser. CORS is generally open for these providers, so no proxy is required for personal use. If a network blocks these hosts, AI buttons will show a "connection error" status — the rest of the app continues to work normally.

> **Security note**: users must provide their own API key (stored only in `localStorage`). Never ship a key inside the repo.

---

## Continuous Security Analysis

The repo includes `.github/workflows/codeql.yml` — a GitHub CodeQL Advanced workflow that runs static analysis on every push and pull request (scheduled weekly as well). After pushing to GitHub, enable **Settings → Security → Code security** to receive scan alerts.

---

## Verification Checklist

Before shipping an update:

- [ ] `index.html`, `index.css`, `index.js` all present and the app loads
- [ ] No localhost references remain in CDN/API URLs
- [ ] `localStorage` and IndexedDB persist across reloads (state + notebooks + custom glyphs)
- [ ] Exports (PNG/JPG/PDF/SVG/Copy/Print) produce correct output
- [ ] Dark mode, paper styles, and theme packs render correctly
- [ ] AI features fail gracefully when offline
