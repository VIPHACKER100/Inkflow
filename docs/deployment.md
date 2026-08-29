# 🌐 Deployment Guide

Options and best practices for hosting Inkflow in production.

---

## Static Hosting (Recommended)

Inkflow is a pure static site — no server-side runtime required. Any static hosting service works perfectly.

### GitHub Pages
```bash
# Push to a GitHub repository
git add .
git commit -m "Deploy Inkflow"
git push origin main

# Enable Pages in Settings → Pages → Source: main branch
```
Your app will be live at `https://username.github.io/inkflow/`

### Netlify
1. Drag and drop the project folder to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Or connect your GitHub repo for automatic deployments
3. No build command needed — deploy as-is

### Vercel
```bash
npx vercel --prod
```

### Cloudflare Pages
1. Connect GitHub repo in Cloudflare dashboard
2. Build command: (leave empty)
3. Output directory: `/`

---

## CDN Dependencies

Inkflow loads these libraries from CDN at runtime:

| Library | CDN | Fallback Strategy |
| :--- | :--- | :--- |
| Google Fonts | fonts.googleapis.com | System fonts fallback |
| Font Awesome | cdnjs.cloudflare.com | Unicode emoji fallback |
| jsPDF | cdn.jsdelivr.net | PDF export disabled |
| opentype.js | cdn.jsdelivr.net | Custom font disabled |

### Self-Hosting Dependencies
For air-gapped or offline deployments, download all CDN assets locally:

```bash
mkdir vendor
# Download each library and update script/link tags in index.html
```

---

## Production Checklist

- [ ] Test all export formats (PNG, JPG, PDF, Print)
- [ ] Verify custom font creation works end-to-end
- [ ] Test on mobile viewport (< 768px)
- [ ] Verify dark mode toggle
- [ ] Check AI integration with valid API key
- [ ] Validate localStorage persistence across sessions
- [ ] Test cross-browser: Chrome, Firefox, Safari, Edge
- [ ] Minify CSS and JS for production (optional)
- [ ] Add favicon and meta tags for SEO
- [ ] Set up HTTPS for secure context features

---

## Environment Notes

- **No `.env` files**: API keys are entered by the user at runtime
- **No build step**: Deploy the source files directly
- **No external database**: All general settings persist in browser `localStorage`, and custom handwriting glyphs persist in `IndexedDB`
- **CORS**: AI features require the `anthropic-dangerous-direct-browser-access` header

## PWA Deployment

Inkflow includes a service worker (`sw.js`) and web app manifest (`manifest.json`) for progressive web app support.

### Features
- **Offline support**: All static assets (JS, CSS, HTML) are precached on first load
- **Installable**: Users can "Add to Home Screen" on mobile or "Install" on desktop
- **Network-first for APIs**: AI requests always go to the network (no stale cache)

### Requirements
- Must be served over HTTPS (or localhost) for service worker registration
- The `manifest.json` must be accessible at the root path

### Verification
After deployment, open DevTools → Application → Service Workers to confirm registration.
