# 📋 Changelog

All notable changes to Inkflow are documented in this file.

---

## [1.1.0] — 2026-05-17

### Added
- **Clean Fallback Fonts**: Added `Roboto` and `Arial` to the font options for users who require cleaner, non-handwriting typography to avoid rendering artifacts.

### Changed
- **CSS Architecture**: Migrated hundreds of inline styles into external `index.css` utility classes for better maintainability and cleaner DOM structure.
- **Accessibility Improvements**: Added descriptive `title` attributes and accessible labels to all form inputs, selects, and controls, resolving numerous screen-reader compliance warnings.

---

## [1.0.0] — 2026-05-17

### 🎉 Initial Release

#### Core Features
- **Handwriting Synthesis Engine** — Per-character rendering with randomized tilt, scale, baseline offset, ink bleed, and pen pressure simulation
- **6 Paper Styles** — Ruled, Plain, Grid, Legal Pad, Vintage Parchment, Dark Mode
- **Paper Grain Texture** — Procedural noise shader for realistic paper fiber texture
- **Multi-Page Layout** — Automatic word-wrap and page-break calculations for unlimited-length documents
- **Live Writing Animation** — Real-time character-by-character writing with floating SVG pen cursor tracking
- **Typography Controls** — Font family, size, line height, word spacing with 12+ handwriting fonts

#### AI Integration
- **Anthropic Claude API** — Direct browser-to-API integration
- **4 AI Workflows** — Summarize, Fix Grammar, Lecture → Notes, Generate Assignment
- **Plain-text output** — AI responses render directly as handwritten notes

#### Export System
- **PNG Export** — High-resolution lossless image with transparency
- **JPG Export** — Compressed image for smaller file sizes
- **PDF Export** — Multi-page A4 document via jsPDF
- **Print** — Native OS print dialog with print-optimized CSS

#### HandFonted Studio (Custom Font Suite)
- **Live Sketchpad** — Draw characters on interactive canvas with adjustable pen settings
- **Template Grid Generator** — Downloadable 8×8 blank handwriting template (64 characters)
- **Scan Upload & Alignment** — Upload scanned sheets with interactive grid overlay sliders
- **Moore-Neighbor Contour Tracing** — Raster-to-vector boundary extraction
- **RDP Curve Simplification** — Ramer-Douglas-Peucker path smoothing (ε = 1.0)
- **OpenType Font Compiler** — Client-side TrueType font compilation via opentype.js
- **Dynamic Font Registration** — CSS FontFace registration and instant activation

#### UI/UX
- **Glassmorphism Design** — Frosted glass sidebar with backdrop-filter blur
- **Dark/Light Theme** — Complete theme toggle with CSS custom properties
- **Responsive Layout** — Mobile-optimized with collapsible sidebar drawer
- **Collapsible Sections** — Smooth cubic-bezier accordion panels
- **State Persistence** — Auto-save to localStorage with debounced serialization

#### Documentation
- **18 documentation files** covering architecture, engines, guides, and references
- **Mermaid diagrams** for system architecture and data flow visualization
- **Mathematical specifications** for rendering algorithms

---

## [Unreleased]

### Planned
- Extended character sets (diacritics, special symbols)
- LocalStorage glyph persistence for custom font drafts
- Multi-sheet handwriting templates (separate upper/lowercase)
- Additional paper styles (dot grid, engineering, music staff)
- Localization support (i18n)
