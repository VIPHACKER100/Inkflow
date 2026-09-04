<p align="center">
  <img src="../inkflow_logo.jpeg" alt="Inkflow Logo" width="90" style="border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
</p>

# 📖 Inkflow Documentation

Welcome to the **Inkflow** documentation hub. This folder contains all technical, design, and operational documentation for the project.

**Current Version**: 1.6.17 — Offline Smart Arrange (no AI key needed), Question & Answer numbers in the left margin (toggleable, optically aligned, with bare "Answer:" lines hidden on canvas in favor of the margin **Ans** label), Clean Notes Q&A structure (numbered questions, `Answer:` blocks, one empty line after every answer), Page-Bottom Space Utilization (baseline-based page breaks), Editor Text Feedback Loop Fix, Safe UI Event Wiring (`bindUIActions`), Version Drift Guard (`npm run check-versions`), CDN Integrity (SRI), PWA Offline Support, Local Ollama AI Integration.

---

## 📂 Documentation Index

### 🏗️ Architecture & Core Systems

| Document | Description |
| :--- | :--- |
| [System Architecture](./system-architecture.md) | High-level component map, data flow, rendering pipeline |
| [State Management](./state-management.md) | Global config schema, dual input paths, hydration loop, localStorage + IndexedDB |
| [Handwriting Engine](./handwriting-engine.md) | Unified `layoutText()`, per-character transforms, Indic script support, rich study syntax |
| [Paper Rendering](./paper-rendering.md) | Background styles, grain texture shader, ruling/grid math, header box |
| [Animation Engine](./animation-engine.md) | Live writing animation, auto-scroll, pen tracking |
| [Export Pipelines](./export-pipelines.md) | 2×-upscaled Blob-based PNG/JPG/SVG, lossless PDF, clipboard copy, toast notifications |

### 🤖 Integrations

| Document | Description |
| :--- | :--- |
| [AI Integration](./ai-integration.md) | OpenRouter + Anthropic multi-provider, SSE streaming, dynamic models, 5 workflows |
| [Custom Font Suite](./custom-font-suite.md) | HandFonted Studio: tracing, RDP smoothing, OpenType compilation, IndexedDB glyphs |

### 🎨 Design & UX

| Document | Description |
| :--- | :--- |
| [UI Design System](./ui-design-system.md) | CSS custom properties, theme tokens, layout grid structure, theme packs |
| [UX Interactions](./ux-interactions.md) | Responsive layout, inline editing, collapsible panels, debounced rendering, study tools |

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
- **Source Code**: `index.html` · `index.css` · `index.js`
- **Creator**: Aryan Ahirwar (VIPHACKER.100)

---

> **Tip:** Each document is self-contained and can be read independently. Start with [Getting Started](./getting-started.md) if you're new, or jump directly to the engine docs if you're exploring the internals.
