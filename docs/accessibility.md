# ♿ Accessibility

This document records Inkflow's current accessibility state and identifies gaps. The app is a canvas-heavy drawing tool, so some constraints are inherent to the medium.

---

## Current State

### What Is Already in Place

- **Semantic buttons**: All interactive controls are native `<button>` elements — keyboard-activatable by default (Enter/Space).
- **Accessible labels**: The hamburger, dark-mode toggle, and all six export buttons carry `aria-label` attributes (e.g. `"Export as PNG image"`).
- **Native form controls**: Sliders, selects, checkboxes, and color inputs are native elements with visible value readouts (`<span class="val">` next to every label).
- **Dark mode**: CSS custom properties in `html.dark` preserve contrast; text remains `#e8e4d8` on `#12121e` (high ratio).
- **Reduced-motion respect (partial)**: The app uses `requestAnimationFrame` animation that stops cleanly with the **■ Stop** button.
- **Focus visibility & Trapping**: Buttons and controls show focus rings. Open modals (`HandFonted Studio` & `Flashcards`) enforce WCAG 2.1 focus trapping via `trapFocusModal()`, cycling `Tab` / `Shift+Tab` within modal boundaries and restoring focus upon closure.
- **Keyboard Shortcuts**: `Escape` key closes open modals and exits Study Mode instantly.
- **Print**: `@media print` rules remove chrome so notes print cleanly.

### Known Gaps

| Area | Gap | Recommendation |
| :--- | :--- | :--- |
| `aria-live` regions | No render/export announcements exist | Add `aria-live="polite"` regions for toast + AI status |
| Icon-only paper buttons | Emoji labels (📏⬜⊞…) have no `aria-label` | Add `aria-label`/`title` to each `.paper-btn` |
| Canvas content | The handwriting canvas is not screen-reader readable | Provide the textarea as the accessible source of truth |
| Contenteditable overlays | `.page-editor` overlays lack `aria-label` / `role` | Add `role="textbox"` + `aria-label="Page N editor"` |
| Color contrast | Emoji/`Font Awesome` glyphs rely on color alone for ink presets | Add text labels or `title` attributes (some already present) |

---

## Conformance Notes

- The tool's **core interaction** (handwriting rendering to canvas) is fundamentally visual; keyboard navigation of rendered output is not feasible without a semantic fallback. The **textarea + Render** path is the accessible equivalent.
- All AI actions and exports produce visible status feedback via toast/status-line, but not yet via `aria-live`.
- On touch devices the app applies `touch-action: none` to drawing surfaces and larger hit targets via `adjustCanvasSizeForDevice()`.

---

## Priority Roadmap

1. Add `aria-live` status region + wire toasts and AI status into it.
2. Add focus trapping to both modals.
3. Add `aria-label`/`title` to paper-style and ink-preset buttons.
4. Add `role="textbox"` to page editors and link them with the main textarea.
