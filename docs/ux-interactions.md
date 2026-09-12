# 🧠 UX Interactions

This document describes Inkflow's user experience design — responsive layouts, inline page editing, collapsible panels, debounced rendering, and interaction patterns.

---

## Responsive Adaptability

### Desktop (≥ 768px)
- Two-column CSS Grid: 300px sidebar + fluid canvas viewport
- Full control panel visible at all times
- Multi-page A4 canvases centered with depth shadows

### Mobile (< 768px)
- Single-column layout with collapsible sidebar drawer
- Sidebar slides in/out via CSS transform
- Hamburger menu button (`#hamburger`) toggles the drawer
- Canvas auto-scales using `Math.min(PAGE_W, 720)` for fit

### Canvas Auto-Scaling
The app retains the high-density print size ($794 \times 1123\text{px}$) but dynamically scales the DOM representation, maintaining razor-sharp rendering on Retina displays.

---

## Inline Page Editing (v1.2.0)

Each canvas page has a transparent `contenteditable` overlay (`.page-editor`) that enables direct on-page text editing:

### Interaction Flow
1. **Click on a page**: Editor gains focus, text becomes visible in ink color
2. **Type/edit**: Changes sync to `S.text` and the sidebar textarea via `getGlobalTextFromEditors()`
3. **Click away (blur)**: Editor text becomes transparent, canvas re-renders with handwriting

### Style Synchronization
`updateEditorStyles(editor, canvas)` keeps the overlay aligned with canvas settings:
- Font family (including Devanagari fallbacks)
- Font size scaled to canvas display dimensions
- Padding matching the configured margins
- Caret color matching the ink color

---

## Collapsible Sections

Control configurations are segmented into logical, collapsible cards:

```css
transition: max-height 0.3s cubic-bezier(.4, 0, .2, 1), padding 0.22s ease;
```

### Section Categories
1. **📝 Text Input** — Textarea for manual entry + file upload zone
2. **🔤 Typography** — Font, size, line height, word spacing
3. **📋 Page Layout** — Standard (flowing), Two-Column Grid, and Cornell Study Notes templates
4. **📄 Paper Style** — Ruled, plain, grid, legal, vintage, dark, dot grid, engineering grid, music staff
5. **✒️ Ink & Impression** — Color, rotation, bleed, pressure, margin
6. **🤖 AI Assistant** — Provider, model, API key, workflow buttons
7. **📤 Export** — PNG, JPG, SVG, PDF, Copy, Print
8. **🎬 Animation** — Speed control, start/stop
9. **🔤 Custom Font** — HandFonted Studio launcher

---

## Debounced Rendering

```javascript
function debounceRender() {
  clearTimeout(renderTimeout);
  renderTimeout = setTimeout(() => renderText(S.text), 280);
}
```

- User types → timer resets
- User pauses 280ms → canvas re-renders
- Prevents redundant renders during fast typing

---

## Interaction Patterns

### Slider Controls
- Real-time value preview labels update on `oninput`
- Values displayed next to each slider label
- Immediate canvas re-render via debouncer

### Color Picker
- Native `<input type="color">` for ink color selection
- Preset color buttons for quick access (Navy, Black, Blue, Purple, Red, Green)
- Instant preview on canvas

### Paper Style Selector
- Visual radio-button cards with active state highlighting
- Click triggers immediate background + ruling redraw

### Note Layout Selector
- Dropdown selector for choosing layout templates (Standard, Two-Column, Cornell)
- Triggers instant recalculation and re-layout via `layoutText()`

### Pagination
- Bottom-center floating pill with left/right arrows
- Page counter display: "Page 1 of 3"
- Smooth scroll-into-view on page change
- Also displayed in the top toolbar

### Modal Overlays
- HandFonted Studio opens as a centered glassmorphism modal
- Tabbed navigation between "Live Sketchpad" and "Upload Template"
- Sheet tabs inside Live Sketchpad to toggle between **Letters** (A-Z, a-z) and **Symbols** (numbers and punctuation) sheets
- Dropdown selector inside Upload Template to select template sheet type, allowing independent grid calibration slider states and scanned uploads per sheet
- ESC key or overlay click to dismiss

### File Upload
- Drag-and-drop zone with visual dragover feedback
- Click to browse files
- Supports TXT, MD, and PDF with progress bar for PDF extraction
- Upload status shown inline with success/error feedback

### Export Toast Notifications
- Non-blocking overlay in the bottom-right corner
- Color-coded by type: info (blue), success (green), warn (yellow), error (red)
- Auto-dismiss after 3 seconds for non-info types

---

## Mobile & Drawer (1.7.0)

- **Sidebar drawer**: `setSidebarOpen()` owns the state — `aria-expanded` sync on the hamburger, body scroll-lock (`body.sidebar-open`), and a `#sidebar-backdrop` scrim. Closes on scrim tap, canvas tap (capture-phase, so the tap still reaches the page editor), and Escape (deferred while a modal is open).
- **Compact toolbar** (≤768px): button wordings live in `.btn-label` spans that hide on small screens — emoji glyphs, `title` tooltips, and `aria-label`s carry the meaning; the logo collapses to "Ink" ≤480px.
- **Responsive canvas**: `getResponsiveCanvasWidth()` computes the display width per breakpoint (≤480px: `vw − 24`, ≤768px: `vw − 32`, desktop: `min(794, 720)`); the resize handler reflows every canvas and its editor overlay.
- **Stable viewport**: `viewport-fit=cover` + `env(safe-area-inset-*)` padding on toolbar/drawer/pagination; `100dvh` (with `vh` fallback) prevents browser-chrome jumps.
- **Touch polish**: `touch-action: manipulation` removes the 300ms double-tap delay; drawer inputs are pinned ≥16px so iOS Safari doesn't zoom on focus; HandFonted and Flashcards modals become edge-to-edge sheets ≤768px.
- **Keyboard**: Escape exits Study Mode when no modal is open; Escape closes the drawer otherwise.
