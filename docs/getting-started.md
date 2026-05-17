# 🚀 Getting Started

This guide covers everything you need to set up and run Inkflow locally.

---

## Prerequisites

- A modern web browser (Chrome 90+, Firefox 88+, Safari 15+, Edge 90+)
- No server, Node.js, or package manager required
- Optional: Anthropic API key for AI features

---

## Quick Start

### 1. Download or Clone
```bash
git clone https://github.com/your-username/inkflow.git
cd inkflow
```

Or simply download and extract the ZIP archive.

### 2. Open in Browser
Open `index.html` directly in your browser:
```
File → Open → index.html
```

### 3. Use a Local Dev Server (Recommended)
For the best experience (especially for font loading and file uploads), use a local HTTP server:

**VS Code Live Server:**
1. Install the "Live Server" extension
2. Right-click `index.html` → "Open with Live Server"
3. App opens at `http://localhost:5500/index.html`

**Python:**
```bash
python -m http.server 5500
```

**Node.js:**
```bash
npx serve .
```

---

## Project Structure

```
inkflow/
├── index.html          # Main HTML structure and CDN imports
├── index.css           # Complete stylesheet with design tokens
├── index.js            # All application logic and engines
└── docs/               # Documentation (you are here)
    ├── README.md           # Documentation index
    ├── system-architecture.md
    ├── state-management.md
    ├── handwriting-engine.md
    ├── paper-rendering.md
    ├── animation-engine.md
    ├── ai-integration.md
    ├── export-pipelines.md
    ├── custom-font-suite.md
    ├── ui-design-system.md
    ├── ux-interactions.md
    ├── getting-started.md
    ├── configuration-guide.md
    ├── api-reference.md
    ├── deployment.md
    ├── accessibility.md
    ├── performance.md
    ├── contributing.md
    └── changelog.md
```

---

## External Dependencies (CDN-loaded)

| Library | Version | Purpose |
| :--- | :--- | :--- |
| Google Fonts | — | Caveat, Patrick Hand, Indie Flower, etc. |
| Font Awesome | 6.x | UI icons |
| html2canvas | 1.4.1 | Screenshot/image export |
| jsPDF | 2.5.1 | Multi-page PDF generation |
| opentype.js | 1.3.4 | Custom font compilation |

All dependencies are loaded via CDN — no `npm install` required.

---

## First Steps

1. **Type or paste text** into the textarea on the left sidebar
2. **Choose a paper style** — ruled, grid, plain, legal, vintage, or dark
3. **Adjust typography** — font family, size, line height
4. **Tune handwriting style** — rotation, ink bleed, pen pressure
5. **Export** — download as PNG, JPG, PDF, or print directly

### Optional: AI Features
1. Enter your Anthropic API key in the AI section
2. Paste source text (lecture notes, essays, etc.)
3. Click an AI action: Summarize, Fix Grammar, Convert to Notes, or Generate Assignment
4. The AI output renders automatically as handwritten notes

### Optional: Custom Font
1. Click "✨ Create Your Own Font" in the sidebar
2. Use the Live Sketchpad to draw characters, or upload a scanned template
3. Click "Build Font" to compile and activate your handwriting
