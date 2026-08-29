# 📖 Inkflow Documentation

Welcome to the **Inkflow** documentation hub. This folder contains all technical, design, and operational documentation for the project.

**Current Version**: 1.6.0 — Modular Architecture, Rich Syntax, PWA, 20 JS Files

---

## 📂 Documentation Index

### 🏗️ Architecture & Core Systems

| Document | Description |
| :--- | :--- |
| [System Architecture](./system-architecture.md) | High-level component map, data flow, rendering pipeline |
| [State Management](./state-management.md) | Global config schema, dual input paths, hydration loop, localStorage |
| [Handwriting Engine](./handwriting-engine.md) | Unified `layoutText()`, per-character transforms, Indic script support |
| [Paper Rendering](./paper-rendering.md) | Background styles, grain texture shader, ruling/grid math |
| [Animation Engine](./animation-engine.md) | Live writing animation, auto-scroll, pen tracking |
| [Export Pipelines](./export-pipelines.md) | Blob-based PNG/JPG/SVG, PDF, clipboard copy, toast notifications |

### 🤖 Integrations

| Document | Description |
| :--- | :--- |
| [AI Integration](./ai-integration.md) | OpenRouter + Anthropic multi-provider, SSE streaming, dynamic models |
| [AI Assistant Module](./ai-assistant.md) | Provider routing, Ollama local AI, grammar correction, key persistence |
| [Custom Font Suite](./custom-font-suite.md) | HandFonted Studio: tracing, RDP smoothing, OpenType compilation |

### 🎨 Design & UX

| Document | Description |
| :--- | :--- |
| [UI Design System](./ui-design-system.md) | CSS custom properties, theme tokens, layout grid structure |
| [UX Interactions](./ux-interactions.md) | Responsive layout, inline editing, collapsible panels, debounced rendering |

### 📱 New in v1.6.0

| Document | Description |
| :--- | :--- |
| [Study Mode & Flashcards](./study-mode.md) | Flashcard review, voice-to-notes, theme packs, rich syntax |
| [Notebooks System](./notebooks.md) | IndexedDB CRUD for persistent multi-document management |
| [PWA — Progressive Web App](./pwa.md) | Service worker, manifest, offline caching strategy |

### 📘 Guides & References

| Document | Description |
| :--- | :--- |
| [Getting Started](./getting-started.md) | Setup, prerequisites, running the app locally |
| [Configuration Guide](./configuration-guide.md) | All user-facing controls, ranges, and defaults explained |
| [API Reference](./api-reference.md) | Complete public JavaScript function reference |
| [Deployment Guide](./deployment.md) | Hosting options, CDN setup, production checklist |
| [Accessibility](./accessibility.md) | WCAG considerations, keyboard navigation, screen reader support |
| [Performance](./performance.md) | Optimization techniques, benchmarks, rendering budget |
| [Contributing](./contributing.md) | Code style, PR workflow, issue templates |
| [Changelog](./changelog.md) | Version history and release notes |

---

## 🔗 Quick Links

- **Live App**: Open `index.html` in any modern browser
- **Source Code**: `index.js` (~4,280 lines) + 19 modules (~4,800 lines) = ~9,080 total JS lines
- **Modules**: `font-compilation.js` · `paper-renderer.js` · `text-layout.js` · `export-renderers.js` · `diagram-engine.js` · `cursive-connector.js` · `template-manager.js` · `markdown-parser.js` · `collaborative-engine.js` · `contextual-jitter-engine.js` · `stroke-prediction-engine.js` · `layer-compositor.js` · `audio-recorder.js` · `script-detector.js` · `ai-assistant.js` · `notebooks.js` · `server.js` · `sw.js`
- **Creator**: Aryan Ahirwar (VIPHACKER.100)

---

> **Tip:** Each document is self-contained and can be read independently. Start with [Getting Started](./getting-started.md) if you're new, or jump directly to the engine docs if you're exploring the internals.
