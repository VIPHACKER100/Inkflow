# Inkflow — AI Handwritten Notes Generator

Inkflow turns typed text into realistic handwritten notes, rendered on canvas with per-character
variation: baseline wobble, pen pressure, ink bleed, smudge, and cursive connections. It runs
entirely in the browser as an installable PWA — no account, no server required.

![Version](https://img.shields.io/badge/version-1.7.0-blue) ![Tests](https://img.shields.io/badge/tests-197%20passing-brightgreen) ![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- **Handwriting engine** — 48 fonts (Print / Cursive & Script / Devanagari), seeded per-character
  realism (jitter, pressure, baseline drift, rare imperfections), ink bleed, smudge, cursive
  connections, and a crisp ✨ **Clean** paper mode
- **Margin Q/Ans labels** — numbered question/answer marks in the left margin (Standard layout)
- **AI actions** — Smart Arrange (fully offline), Summarize, Grammar fix, Lecture→Notes, Assignment
  generation via OpenRouter, Anthropic, or local Ollama; every result is sanitized and Q:/A: pairs
  renumbered & deduplicated automatically
- **HandFonted Studio** — draw your own glyphs and compile them into a real `.ttf` font in-browser
- **Study tools** — Q:/A: flashcards, study mode, rich syntax (stickies, callouts, highlights)
- **10 paper styles**, 4 note layouts (Standard, Two-Column, Cornell, Meeting), layer manager
- **Export** — PNG / JPG / transparent PNG / SVG / multi-page PDF (Compact/Standard/High size
  presets) / clipboard / print
- **Voice to Notes** — live speech-to-text via Web Speech API
- **PWA** — installable, offline-capable via service worker

## 🚀 Quick Start

```bash
npm install
npm run dev        # Vite dev server
npm run server     # optional: collaboration WebSocket server (localhost:8080)
```

Open the printed URL, type notes in the sidebar, and press **✦ Render**.

## 🧰 Scripts

| Command | What it does |
| :--- | :--- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm test` | Run the Vitest suite (130 tests) |
| `npm run lint` / `npm run lint:fix` | ESLint |
| `npm run format` / `npm run format:check` | Prettier |
| `npm run check:version` | Verify `sw.js` cache version matches `package.json` |
| `npm run server` | Collaboration WebSocket server |

## 📚 Documentation

Full documentation lives in [`docs/`](./docs/README.md) — architecture, handwriting engine,
AI integration, export pipelines, PWA, accessibility, and more.

## 🤝 Contributing

See [`docs/contributing.md`](./docs/contributing.md). CI runs lint, tests, the version-consistency
check, and a build on every pull request.

## 📄 License

[MIT](./LICENSE)
