<p align="center">
  <img src="../inkflow_logo.jpeg" alt="Inkflow Logo" width="80" style="border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
</p>

# 🚀 Getting Started with Inkflow

Welcome to **Inkflow v1.6.11** — a single-file Progressive Web App (PWA) that turns plain text into beautiful, handwritten-style notes with built-in AI (OpenRouter, Anthropic, and local Ollama) plus offline helpers like the no-key Smart Arrange.

---

## What Is Inkflow?

Inkflow converts typed text into realistic handwriting on virtual A4 paper using your browser. It works fully client-side: no server required, 100% offline-ready via PWA service worker, no sign-up, no telemetry. Everything runs in your browser tab or installed app window.

---

## Quick Start

1. **Open or Install the app** — load `index.html` in any browser or click the browser address bar icon to **Install Inkflow** as a PWA app.
2. **Type or paste text** in the sidebar text area (or drag in a `.txt` / `.md` / `.pdf` file).
3. Press **Animate** to watch the handwriting animation, or press **✦ Render** for instant output.
4. Use the floating **page indicator** at the bottom to move between pages.
5. Export via the **Export** section — PNG, JPG, PDF (lossless), SVG, Copy, or Print.

That's it. Inkflow functions 100% offline once opened once.

---

## Hosting Options

Because Inkflow is a static single-page app, it runs anywhere static files are served:

- **Local**: double-click `index.html` (all libraries load from CDN)
- **GitHub Pages** / Netlify / Vercel / Cloudflare Pages: push the repo, done
- **Any web server**: copy `index.html`, `index.css`, `index.js` to your docroot

See [Deployment](./deployment.md) for details, including the AI proxy caveat.

---

## Project Structure

```
Inkflow/
├── index.html          # App shell + CDN library loads (html2canvas, jsPDF, opentype.js, Font Awesome — SRI-pinned)
├── index.css           # ~2,650 lines: design tokens, themes, paper styles, modals
├── index.js            # ~6,800 lines: the entire application logic
├── sw.js               # Service worker: PWA offline support (cache-first assets)
├── scripts/
│   └── check-versions.mjs  # npm run check-versions — enforces version parity across files
├── eslint.config.mjs   # ESLint flat config (correctness rules) — npm run lint
├── docs/               # Full documentation suite (this site)
│   ├── README.md
│   ├── getting-started.md
│   ├── system-architecture.md
│   ├── state-management.md
│   ├── configuration-guide.md
│   ├── ui-design-system.md
│   ├── paper-rendering.md
│   ├── handwriting-engine.md
│   ├── animation-engine.md
│   ├── export-pipelines.md
│   ├── ai-integration.md
│   ├── custom-font-suite.md
│   ├── api-reference.md
│   ├── ux-interactions.md
│   ├── accessibility.md
│   ├── performance.md
│   ├── deployment.md
│   └── contributing.md
├── .github/
│   └── workflows/
│       └── codeql.yml    # CodeQL static-analysis CI
└── LICENSE               # MIT
```

---

## Try It in 30 Seconds

```
1. Click the text area
2. Paste: "Hello! This is Inkflow. I make your notes look handwritten."
3. Click ▶ Animate
4. Watch it draw itself
5. Click Export → PNG
```

---

## Feature Highlights

| Category | Features |
| :--- | :--- |
| **Handwriting** | 14 fonts (English + Devanagari handwriting, 2 clean fallbacks) + custom uploads, 10 paper styles, ink presets, bleed/pressure, auto-fit, alignment |
| **Layouts** | Standard, Two-Column, Cornell Study Notes |
| **Study Tools** | Study Mode, Flashcards (auto-extracted), Voice-to-Notes, Notebooks & Folders, margin Q/Ans labels |
| **AI & Offline** | Smart Arrange (offline, no key), Summarize, Grammar Fix, Lecture→Notes, Assignment Generator (OpenRouter/Anthropic/Ollama) |
| **Custom Fonts** | Upload `.ttf`/`.otf`, or build your own with the HandFonted Studio |
| **Export** | PNG, JPG, PDF (lossless), SVG, Clipboard, Print — all 2× upscaled |

---

## Where to Go Next

- [Configuration Guide](./configuration-guide.md) — every control explained
- [System Architecture](./system-architecture.md) — how the app is structured
- [State Management](./state-management.md) — persistence & hydration
- [API Reference](./api-reference.md) — all public functions
- [Changelog](./changelog.md) — release history
