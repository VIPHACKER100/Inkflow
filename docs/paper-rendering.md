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
| **Dot Grid** | Warm beige (`#f6f2ec`) | Subtle dotted grid layout at 28px intervals (`#c0b49a` at 0.35 opacity) |
| **Engineering** | Pale green (`#eef6ed`) | Technical grid: minor lines every 10px (0.18 opacity), major lines every 50px (0.4 opacity), with reddish margins |
| **Music Staff** | Soft ivory (`#faf7f0`) | 5-line music staff blocks with 8px line spacing, 72px staff spacing, and vertical bracket endpoints |

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
6. **Grid Layouts**:
   - For `grid` sheets, draw vertical and horizontal lines at 28px increments.
   - For `dot_grid` sheets, draw 1.2px radius circles (dots) at 28px intervals.
   - For `engineering` sheets, draw minor lines (0.4px width, 0.18 opacity) every 10px, major lines (0.8px width, 0.4 opacity) every 50px, and reddish-brown margins at $x = \text{S.margin} - 10$ and $y = \text{S.margin}$.
   - For `music` sheets, draw sets of 5 staff lines (8px spacing, 72px spacing between staffs) with vertical brackets marking the start and end of each staff.
7. **Layout Decorations**: Call `drawLayoutDecorations(ctx, S.noteLayout)` to paint any template guidelines (e.g., Cornell dividers and cues/notes/summary titles).
8. **Edge Shadowing**: Layer a soft shadow border along the A4 sheet edges to create depth.

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
  ruled:       { bg: '#f8f4ea', lineColor: '#c5b9a0', lineOpacity: 0.55, redLine: '#e08080' },
  plain:       { bg: '#faf7f0', lineColor: null },
  grid:        { bg: '#f6f2ec', lineColor: '#c0b49a', lineOpacity: 0.35 },
  legal:       { bg: '#fef9c3', lineColor: '#c8b820', lineOpacity: 0.45, redLine: '#e07070' },
  vintage:     { bg: '#f2e8ce', lineColor: '#b8a080', lineOpacity: 0.4 },
  dark:        { bg: '#1a1a2e', lineColor: '#3a3a5e', lineOpacity: 0.7 },
  dot_grid:    { bg: '#f6f2ec', lineColor: '#c0b49a', lineOpacity: 0.35 },
  engineering: { bg: '#eef6ed', lineColor: '#78a67d', lineOpacity: 0.4 },
  music:       { bg: '#faf7f0', lineColor: '#4a4a4a', lineOpacity: 0.55 }
};
```
