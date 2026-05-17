# 🧠 UX Interactions

This document describes Inkflow's user experience design — responsive layouts, collapsible panels, debounced rendering, and interaction patterns.

---

## Responsive Adaptability

### Desktop (≥ 768px)
- Two-column CSS Grid: 300px sidebar + fluid canvas viewport
- Full control panel visible at all times
- Multi-page A4 canvases centered with depth shadows

### Mobile (< 768px)
- Single-column layout with collapsible sidebar drawer
- Sidebar slides in/out via CSS transform:
  ```css
  transform: translateX(-100%); /* Hidden */
  transform: translateX(0);     /* Visible */
  ```
- Hamburger menu button (`#hamburger`) toggles the drawer
- Canvas auto-scales using `Math.min(PAGE_W, 720)` for fit

### Canvas Auto-Scaling
Rather than rendering canvases at tiny viewports, the app retains the high-density print size ($794 \times 1123\text{px}$) but dynamically scales the DOM representation, maintaining razor-sharp rendering on Retina displays.

---

## Collapsible Sections

Control configurations are segmented into logical, collapsible cards. Toggling a panel uses a smooth cubic-bezier transition:

```css
transition: max-height 0.3s cubic-bezier(.4, 0, .2, 1), padding 0.22s ease;
```

This produces an organic fluid-accordion motion, keeping complex configurations out of sight until needed.

### Section Categories
1. **📝 Text Input** — Textarea for manual entry
2. **🔤 Typography** — Font, size, line height, word spacing
3. **📄 Paper Style** — Ruled, plain, grid, legal, vintage, dark
4. **✒️ Ink & Impression** — Color, rotation, bleed, pressure, margin
5. **🤖 AI Assistant** — API key, AI workflow buttons
6. **🎬 Animation** — Speed control, start/stop
7. **📤 Export** — PNG, JPG, PDF, Print buttons
8. **🔤 Custom Font** — HandFonted Studio launcher

---

## Debounced Rendering

To guarantee immediate visual feedback without stalling browser threads:

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
- Values displayed next to each slider label (e.g., "Font Size **24**px")
- Immediate canvas re-render via debouncer

### Color Picker
- Native `<input type="color">` for ink color selection
- Instant preview on canvas without page reload

### Paper Style Selector
- Visual radio-button cards with active state highlighting
- Click triggers immediate background + ruling redraw

### Pagination
- Bottom-center floating pill with left/right arrows
- Page counter display: "Page 1 of 3"
- Smooth scroll-into-view on page change

### Modal Overlays
- HandFonted Studio opens as a centered glassmorphism modal
- Ambient radial backdrop filter dims background content
- Tabbed navigation between "Live Sketchpad" and "Upload Template"
- ESC key or overlay click to dismiss
