<p align="center">
  <img src="../inkflow_logo.jpeg" alt="Inkflow Logo" width="80" style="border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
</p>

# 📄 Paper Rendering Engine

This document describes Inkflow's paper background rendering system — the supported styles, grain texture shader, ruling/grid mathematics, and the printed Date / Page No. header box.

---

## Overview

Inkflow features A4 aspect ratio rendering (794px × 1123px) inside standard `<canvas>` blocks. The background generator dynamically paints complex background styles based on the selected notebook options via `drawPaperBackground(ctx, style, pageNum)`.

---

## Supported Paper Styles

| Style | Background | Features |
| :--- | :--- | :--- |
| **Ruled** | Off-white (`#faf9f5`) | Classmate-style: double red vertical margin lines, double red horizontal top lines, blue horizontal guidelines, printed Date / P. No. header box |
| **Clean** | Off-white (`#faf9f5`) | Same ruling as Ruled (with header box), used by the clean structured-layout mode |
| **Plain** | Warm ivory (`#faf7f0`) | No guidelines — clean blank sheet |
| **Grid** | Light brown (`#f6f2ec`) | Coordinate grid cells sized to `fontSize × lineHeight` |
| **Legal Pad** | Bright yellow (`#fef9c3`) | Red left margin line, dense ruled horizontal lines |
| **Vintage** | Aged parchment (`#f2e8ce`) | Radial vignette overlay simulating aged paper |
| **Dark** | Indigo slate (`#1a1a2e`) | Muted guide lines for dark-mode writing |
| **Dot Grid** | Warm beige (`#f6f2ec`) | Dots at `fontSize × lineHeight` intervals (`#c0b49a` at 0.35 opacity) |
| **Engineering** | Pale green (`#eef6ed`) | Minor grid (0.18 opacity) + major grid (0.4 opacity), reddish-brown margins |
| **Music Staff** | Soft ivory (`#faf7f0`) | 5-line music staff blocks with bracket endpoints |

---

## Rendering Pipeline (`drawPaperBackground`)

**Inputs**: `ctx` (Canvas 2D Context), `style` (String), `pageNum` (Integer, used for the header box).

### Step-by-Step Process

1. **Clear Frame**: Clear the canvas using `ctx.clearRect(0, 0, w, h)`.
2. **Base Fill**: Select the theme background color and apply a solid fill.
3. **Paper Grain Noise**: Run 2,200 iterations drawing micro-rectangles (1–4px, opacity 0.018) in warm organic tones. **Skipped** for `dark` and `clean` styles.
4. **Ruled / Clean margins**: Draw **double** vertical red lines (`#ff4d6d`) at `x = margin − 10` (70px) and `x = margin − 14` (66px), and **double** horizontal red lines at `y = margin` and `y = margin − 4`. Left margin notes (`.margin-text-overlay` / `drawMarginTextOnCanvas`) are strictly constrained to `0`–`62px` (`S.margin - 18px`), staying to the left of the vertical red lines. Margin question/answer labels (`drawMarginQuestionLabels`, v1.6.8+) right-align at `x = margin − 14` inside the same strip (toggleable via `S.showMarginLabels`).
5. **Baseline Parity with DOM Editors**: Main page editors (`.page-editor`) start writing text on Line 2 baseline (`S.margin + lineSpacingPx * 2 = 146px` for standard/clean), with DOM top padding `topPadding = firstLineBaseline - fontSize * 0.82` ensuring 100% pixel-perfect alignment between DOM text and paper ruled lines without vertical text jumping.
6. **Legal margin**: A single vertical red margin guide (`#e07070`) at `x = margin − 10`.
6. **Date / Page No. header box** (ruled + clean, when `S.showHeaderBox !== false`): Draw a rounded red-bordered box in the top-right (145×42px at `w − 175, 20`), split horizontally, labelled `DATE:` and `P. NO.:`. The interactive overlay inputs (`#date-input-N`, `#page-input-N`) bake their values into the canvas in the active handwriting font with a small handwritten rotation, unless the matching input is focused.
7. **Horizontal ruling lines**: Spaced by
   $$\Delta y = \text{S.fontSize} \times \text{S.lineHeight}$$
   drawn from `y = margin + Δy` down to `h − 20`.
8. **Grid layouts**:
   - **Grid**: Vertical and horizontal lines at `fontSize × lineHeight` intervals, aligned to the margin.
   - **Dot Grid**: 1.2px-radius dots at the same grid pitch.
   - **Engineering**: Minor lines every `Δy/5`, major lines every `Δy`, reddish-brown margins at `x = margin − 10` and `y = margin`.
   - **Music**: Groups of 5 staff lines (line spacing `Δy × 8/33`, staff spacing `Δy × 72/33`) with vertical bracket endpoints.
9. **Layout Decorations**: Call `drawLayoutDecorations(ctx, S.noteLayout)` to paint template guidelines (e.g., Cornell dividers and cues/notes/summary titles).
10. **Edge Shadowing**: Layer a soft shadow border along the sheet edges for depth.

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

## Cornell Layout Decorations

`drawLayoutDecorations(ctx, noteLayout)` (active for `cornell`):
- Vertical divider at `x = 230`
- Horizontal divider at `y = h − 190`
- Faint labels: `Cues / Questions`, `Main Notes`, `Summary`

---

## Theme Color Configurations

Each paper style defines a unique color palette (local to `drawPaperBackground`):

```javascript
const configs = {
  ruled:       { bg: '#faf9f5', lineColor: '#85add4', lineOpacity: 0.65, redLine: '#ff4d6d' },
  clean:       { bg: '#faf9f5', lineColor: '#85add4', lineOpacity: 0.65, redLine: '#ff4d6d' },
  plain:       { bg: '#faf7f0', lineColor: null },
  grid:        { bg: '#f6f2ec', lineColor: '#c0b49a', lineOpacity: 0.35 },
  legal:       { bg: '#fef9c3', lineColor: '#c8b820', lineOpacity: 0.45, redLine: '#e07070' },
  vintage:     { bg: '#f2e8ce', lineColor: '#b8a080', lineOpacity: 0.4 },
  dark:        { bg: '#1a1a2e', lineColor: '#3a3a5e', lineOpacity: 0.7 },
  dot_grid:    { bg: '#f6f2ec', lineColor: '#c0b49a', lineOpacity: 0.35 },
  engineering: { bg: '#eef6ed', lineColor: '#78a67d', lineOpacity: 0.4 },
  music:       { bg: '#faf7f0', lineColor: '#4a4a4a', lineOpacity: 0.55 },
};
```
