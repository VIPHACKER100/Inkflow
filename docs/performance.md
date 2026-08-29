<p align="center">
  <img src="../inkflow_logo.jpeg" alt="Inkflow Logo" width="80" style="border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
</p>

# ⚡ Performance

This document covers Inkflow's performance characteristics and the techniques that keep it fast.

---

## Architecture-Level Wins

- **Single-file vanilla JS** (≈5,600 lines, zero runtime dependencies beyond CDN libs) — no framework overhead, no virtual DOM.
- **Persistent page canvases**: characters are drawn once onto each A4 canvas and stay there; re-renders only occur on setting changes, not on scroll/export.
- **Debounced rendering**: editor/textarea changes trigger `debounceRender()` — a 280ms trailing debounce around `renderText(S.text)`, so typing never re-lays-out per keystroke.
- **Debounced autosave**: `autosave()` debounces 1000ms before serializing settings to `localStorage` and the active notebook to IndexedDB — writes are batched and non-blocking.
- **IndexedDB for heavy assets**: custom glyph images (`draftedGlyphs`) and notebooks (`notebooks`) live in IndexedDB, keeping `localStorage` small.

---

## Rendering Pipeline

### Layout
`layoutText()` runs a single pass over the text to produce the character queue, wrapping, and page breaks — reused identically by render, animation, auto-fit, and export. No DOM reads/writes during layout.

### Draw
Characters are drawn with `ctx.fillText()` using precomputed per-character variation. The clean paper style skips variation for crisp typographic output.

### Glyph Image Cache
Drafted glyphs are decoded lazily into an in-memory `glyphImageCache` (index.js:2407) and reused across pages — a full multi-page note only decodes each custom character once. `pruneBlankGlyphs()` purges blank entries from the cache too.

---

## Measured Characteristics

| Metric | Value |
| :--- | :--- |
| Character render rate (animate, speed 8) | ~8 chars/frame → 500+ chars in ~2s |
| A4 page canvas | 794 × 1123 px |
| Approx. memory per filled page | ~3.4 MB bitmap |
| Render debounce | 280 ms trailing |
| Autosave debounce | 1000 ms trailing |
| Auto-fit font size | Binary search, 6 iterations |
| PDF export | Lossless PNG / `NONE` compression — larger files, zero artifacts |

---

## Export Costs

Exports run 2× upscaling through `_upscaleCanvas(src, scale)` (a high-quality smoothing pass). PNG is lossless; JPG uses quality **0.97**; PDF embeds lossless PNGs with `NONE` compression — fidelity first, size second. Downloads stream per-page, so memory stays bounded regardless of note length.

---

## When Things Get Heavy

- **Very long notes** → more pages × ~3.4 MB each. Rendering is O(chars); page count scales linearly.
- **Many drafted glyphs** → IndexedDB grows; only non-blank glyphs are kept (`pruneBlankGlyphs`).
- **Rapid slider dragging** → each `change` event re-renders; the 280ms debounce still applies on the text path, but setting changes render immediately by design.

---

## Future Optimizations (Not Yet Needed)

- Worker-thread layout for extremely large documents
- Delta rendering (only re-draw changed pages)
- `OffscreenCanvas` for page compositing
