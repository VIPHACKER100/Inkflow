# 📄 Paper Rendering Engine

This document describes Inkflow's paper background rendering system — the supported styles, grain texture shader, and ruling/grid mathematics.

---

## Overview

Inkflow features A4 aspect ratio rendering ($794\text{px} \times 1123\text{px}$) inside standard `<canvas>` blocks. The background generator dynamically paints complex background styles based on selected notebook options.

---

## Supported Paper Styles

| Style | Background | Features |
| :--- | :--- | :--- |
| **Ruled** | Cream (`#f7f3ea`) | Red vertical margin line, blue horizontal guidelines |
| **Plain** | Warm ivory | No guidelines — clean blank sheet |
| **Grid** | Light gray/brown | Coordinate grid cells at 28px square intervals |
| **Legal Pad** | Bright yellow | Left margin lines, dense ruled horizontal lines |
| **Vintage** | Dark radial gradient | Vignette overlays simulating aged parchment paper |
| **Dark** | Indigo slate (`#1e1e2e`) | Glowing neon guide lines for dark-mode writing |

---

## Rendering Pipeline (`drawPaperBackground`)

**Inputs**: `ctx` (Canvas 2D Context), `style` (String representation of notebook sheet theme).

### Step-by-Step Process

1. **Clear Frame**: Clear the canvas using `ctx.clearRect`.
2. **Base Fill**: Select the theme background color and apply a solid fill:
   ```javascript
   ctx.fillStyle = config.bg;
   ctx.fillRect(0, 0, w, h);
   ```
3. **Paper Grain Noise**: Run 2,200 iterations drawing micro-rectangles (1–4px, opacity 0.018) in warm organic tones to mimic tactile paper fibers.
4. **Margin Lines**: For `ruled` and `legal` styles, draw a vertical red margin guide (`#e08080`) at $x = \text{S.margin} - 10$.
5. **Ruling Lines**: Draw horizontal lines separated by:
   $$\Delta y = \text{S.fontSize} \times \text{S.lineHeight}$$
6. **Grid Layouts**: For `grid` sheets, draw vertical and horizontal lines at 28px increments.
7. **Edge Shadowing**: Layer a soft shadow border along the A4 sheet edges to create depth.

---

## Paper Grain Texture Shader

For realistic texture, the app generates randomized paper grain noise:

```javascript
ctx.save();
ctx.globalAlpha = 0.018; // Faint, subtle opacity
for (let i = 0; i < 2200; i++) {
  const gx = Math.random() * w;
  const gy = Math.random() * h;
  const gs = Math.random() * 3 + 1; // 1px to 4px size
  ctx.fillStyle = Math.random() > 0.5 ? '#8b7355' : '#c8b090';
  ctx.fillRect(gx, gy, gs, gs * 0.5);
}
ctx.restore();
```

This creates a subtle organic paper texture that varies each time the canvas is painted, adding to the handwritten authenticity.

---

## Theme Color Configurations

Each paper style defines a unique color palette:

```javascript
const PAPER_CONFIGS = {
  ruled:   { bg: '#f7f3ea', lineColor: '#c8dce8', marginColor: '#e08080' },
  plain:   { bg: '#faf6ee', lineColor: 'transparent' },
  grid:    { bg: '#f5f0e6', lineColor: '#d4c9b4' },
  legal:   { bg: '#fff8cc', lineColor: '#a8c6d8', marginColor: '#e08080' },
  vintage: { bg: '#e8dcc4', lineColor: '#c4b396' },
  dark:    { bg: '#1e1e2e', lineColor: '#2e3a5a' }
};
```
