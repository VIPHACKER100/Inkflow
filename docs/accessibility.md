# ♿ Accessibility

This document covers accessibility considerations, keyboard navigation, and screen reader support in Inkflow.

---

## Current Accessibility Features

### Semantic HTML
- Proper heading hierarchy (`<h1>` for app title, `<h2>` for section headers)
- `<button>` elements for all interactive controls (not clickable `<div>`s)
- `<label>` elements associated with all form inputs
- `<nav>` for pagination controls

### Keyboard Navigation
- All sidebar controls are focusable via Tab key
- Collapsible sections toggle via Enter/Space
- Export buttons accessible via keyboard
- Modal can be closed with ESC key

### Color & Contrast
- Light mode: Navy text (`#1c2340`) on cream backgrounds — WCAG AAA contrast ratio
- Dark mode: Chalk cream (`#e8e4d8`) on deep slate — WCAG AA contrast ratio
- Accent color (`#c0622a`) meets minimum 4.5:1 contrast on light backgrounds

---

## Recommended Improvements

### ARIA Labels
```html
<!-- Add to interactive elements -->
<button aria-label="Export as PDF">📄 PDF</button>
<input type="range" aria-label="Font Size" />
<div role="tabpanel" aria-labelledby="tab-sketchpad">...</div>
```

### Screen Reader Announcements
```html
<!-- Live region for AI status updates -->
<div aria-live="polite" id="status-announcer"></div>
```

### Focus Management
- Trap focus inside modal when HandFonted Studio is open
- Return focus to trigger button when modal closes
- Skip-to-content link for keyboard users

### Motion Preferences
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### High Contrast Mode
```css
@media (forced-colors: active) {
  .card { border: 2px solid CanvasText; }
  .btn { border: 1px solid ButtonText; }
}
```

---

## Testing Checklist

- [ ] Navigate entire app using keyboard only (no mouse)
- [ ] Test with screen reader (NVDA, VoiceOver, or JAWS)
- [ ] Verify all form inputs have associated labels
- [ ] Check color contrast ratios with axe DevTools
- [ ] Test with browser zoom at 200%
- [ ] Verify focus indicators are visible on all interactive elements
- [ ] Test `prefers-reduced-motion` with OS setting enabled
