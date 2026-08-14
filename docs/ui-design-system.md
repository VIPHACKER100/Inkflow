# 🎨 UI Design System

This document describes Inkflow's CSS design token architecture, theme system, layout grid structure, and theme packs.

---

## CSS Design Tokens & Theme System

The visual foundations are centralized in a CSS Custom Property system, enabling precise light/dark theme switching without runtime layout recalculations. Light values live in `:root`; dark values override them under `html.dark`.

### Core Token Table

| Design Token | Light Mode | Dark Mode | Usage |
| :--- | :--- | :--- | :--- |
| `--paper-cream` | `#f7f3ea` | `#1e1e2e` | Canvas backgrounds for ruled, plain, legal |
| `--paper-ruled` | `#faf9f5` | `#1a1a2a` | Ruled-page background |
| `--paper-shadow` | `rgba(80,60,20,0.13)` | `rgba(0,0,0,0.4)` | Page depth shadows |
| `--app-bg` | `#ede8dc` | `#12121e` | Outer application layout container |
| `--accent` | `#c0622a` | `#e08050` | CTA buttons, slider thumbs, branding |
| `--accent-light` | `#f0e0d4` | `rgba(224,128,80,0.12)` | Accent-tinted fills |
| `--sidebar-bg` | `rgba(247,243,234,0.72)` | `rgba(20,20,35,0.82)` | Frosted glass backdrop for sidebar |
| `--sidebar-border` | `rgba(180,160,110,0.25)` | `rgba(80,80,120,0.3)` | Soft divider lines |
| `--text-primary` | `#1c2340` | `#e8e4d8` | Primary readable text and headers |
| `--text-secondary` | `#6b6148` | `#9890a8` | Secondary text |
| `--text-muted` | `#9e9078` | `#6a6278` | Placeholders, hints |
| `--btn-bg` | `rgba(255,255,255,0.6)` | `rgba(40,40,60,0.6)` | Button surfaces |
| `--input-bg` | `rgba(255,255,255,0.55)` | `rgba(30,30,50,0.6)` | Form controls |
| `--font-ui` | `'Crimson Pro', Georgia, serif` | — | UI chrome and labels |
| `--font-canvas` | `'Caveat', cursive` | — | Default handwriting canvas font |
| `--transition` | `all 0.22s cubic-bezier(.4,0,.2,1)` | — | Motion easing |
| `--radius` / `--radius-lg` | `10px` / `16px` | — | Corner radii |

---

## CSS Architecture & Utility Classes

Inkflow avoids inline styles. Layout, spacing, and component styling are abstracted into utility and component classes inside `index.css`.

Key categories include:
- **Component Modules**: `.toolbar-group`, `.sb-section`, `.paper-grid`, `.paper-btn`, `.ai-btn-group`, `.export-grid`, `.animation-buttons-row`, `.file-upload-wrapper`, `.action-buttons-row`
- **Typography Helpers**: `.font-caveat`, `.font-kalam`, `.font-roboto`, etc.
- **Export Toast**: `.export-toast`, `.export-toast--success`, `.export-toast--error`
- **Page Editor**: `.page-editor`, `.canvas-container`, `.margin-text-overlay`
- **Worksheets**: `.worksheet-header`, `.worksheet-field-row`, `.worksheet-input-box`
- **Flashcards**: `.flashcard-container`, `.flashcard-inner`, `.flashcard-front`, `.flashcard-back`, `.flashcard-badge`
- **Print Overrides**: `@media print` rules

---

## Layout Grid Structure

The interface uses a **two-column CSS Grid** layout:

### Control Console (`#sidebar` — 300px)
A glassmorphic control dock featuring stacked, collapsible sections for:
- Notebooks & Folders explorer (IndexedDB-backed)
- Text input + drag-and-drop file upload zone
- Font & Style (font family, size, line height, word spacing, margin, rotation, alignment, custom font upload, HandFonted Studio launcher, reset defaults)
- Theme Packs (dropdown + one-click theme grid)
- Paper Style (10 paper buttons + header visibility toggle)
- Page Layout (Standard / Two-Column / Cornell)
- Ink Effects (color picker + presets, bleed, pressure)
- AI Features (provider, model, API key, 5 action buttons)
- Export (PNG, JPG, PDF, SVG, Copy, Print)
- Animation (speed slider, start/stop)

### Canvas Viewport (`#canvas-area`)
A neutral, spacious preview environment with:
- Subtle radial-gradient micro-dot pattern
- Centered virtual A4 pages with inline `contenteditable` editor overlays
- Depth shadows via `--paper-shadow`
- Per-page Date / P. No. worksheet header inputs

### Floating Header (56px fixed)
Top toolbar on a frosted backdrop (`backdrop-filter: blur(20px)`) containing the hamburger (mobile), `Inkflow` logo, Animate and Clear buttons, page indicator, Study Mode toggle, Flashcards button, and the dark-mode toggle.

### Floating Pagination
Bottom pill-style navigation (`◀ Page X of Y ▶`) for multi-page A4 transitions.

---

## Typography

- **UI Font**: `'Crimson Pro'`, Georgia, serif (`--font-ui`)
- **Handwriting Fonts**: Google Fonts — English (Caveat, Indie Flower, Shadows Into Light, Patrick Hand), Devanagari (Kalam, Amita, Noto Sans Devanagari, Noto Serif Devanagari, Hind, Tiro Devanagari Hindi, Baloo 2, Martel), plus user-uploaded and HandFonted Studio fonts
- **Clean Fallbacks**: Roboto, Arial — for users preferring non-handwriting rendering
- **Indic Fallbacks**: Noto Sans Devanagari, Hind — automatic for Devanagari/Hindi text via `getFontStack()`

---

## Glassmorphism & Visual Effects

```css
#sidebar {
  background: var(--sidebar-bg);
  backdrop-filter: blur(20px) saturate(1.5);
  -webkit-backdrop-filter: blur(20px) saturate(1.5);
  border-right: 1px solid var(--sidebar-border);
}

#toolbar {
  background: var(--toolbar-bg);
  backdrop-filter: blur(20px) saturate(1.5);
  border-bottom: 1px solid var(--sidebar-border);
}
```

---

## Theme Packs

Two sidebar sections apply the same `applyTheme(themeId)` engine:
1. **`#sec-theme`** — a "Notebook Theme" dropdown (Default / Vintage / Cute / Science / Minimal / Scrapbook)
2. **`#sec-themes`** — a "One-click Note Themes" grid of gradient swatch buttons

Each preset sets paper style, ink color, rotation chaos, bleed, pressure, and font size together (see [Configuration Guide](./configuration-guide.md) for the full table). The `minimal` (dark) theme also switches the highlight color to a warm brown.

---

## Color Palette

### Ink Colors (User-Selectable)
| Name | Hex | Usage |
| :--- | :--- | :--- |
| Navy | `#1c2340` | Default ink — professional dark blue |
| Black | `#1a1a1a` | Graphite-toned dark |
| Blue | `#0a3d62` | Deep blue ink |
| Purple | `#6d2177` | Creative violet tones |
| Red | `#8b0000` | Corrections and emphasis |
| Green | `#2d6a4f` | Forest/nature-toned green |

### Paper Backgrounds
| Style | Color | Description |
| :--- | :--- | :--- |
| Ruled | `#faf9f5` | Bright off-white notebook with blue guidelines, double red margin, and header box |
| Clean | `#faf9f5` | Same ruling as Ruled; clean typographic text layout |
| Plain | `#faf7f0` | Clean blank ivory sheet |
| Grid | `#f6f2ec` | Light grid paper at `fontSize × lineHeight` intervals |
| Legal | `#fef9c3` | Bright yellow legal pad with red left margin |
| Vintage | `#f2e8ce` | Aged parchment paper with a radial vignette |
| Dark | `#1a1a2e` | Slate indigo dark mode with muted guides |
| Dot Grid | `#f6f2ec` | Warm beige grid of dots |
| Engineering | `#eef6ed` | Pale green grid with minor and major lines |
| Music Staff | `#faf7f0` | Soft ivory sheet with 5-line music staffs |

---

## Responsive Breakpoints

| Range | Device Class |
| :--- | :--- |
| ≥ 1920px | Large desktop — larger canvas (`canvasSize: 320`) |
| 1024 – 1919px | Standard desktop (`canvasSize: 256`) |
| 768 – 1023px | Tablet landscape (`canvasSize: 280`) |
| 481 – 767px | Tablet portrait (`canvasSize: 240`) |
| ≤ 480px | Mobile (`canvasSize: min(280, width−60)`) |

Touch devices additionally get `touch-action: none` on the sketchpad and larger hit targets.
