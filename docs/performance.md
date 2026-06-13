# ⚡ Performance

This document covers Inkflow's performance characteristics, optimization techniques, and rendering budget.

---

## Rendering Performance

### Unified Layout Engine
All layout computation (word-wrap, page breaks, character coordinates) is performed once inside `layoutText()`, producing a pre-computed queue. Both static rendering and animation consume this queue without redundant recalculation.

### Debounced Rendering
All text input changes are filtered through a 280ms debouncer:

```javascript
function debounceRender() {
  clearTimeout(renderTimeout);
  renderTimeout = setTimeout(() => renderText(S.text), 280);
}
```

### Canvas vs DOM Rendering
Inkflow renders text on `<canvas>` elements rather than DOM text nodes:
- **Faster repaints**: Canvas redraws are GPU-accelerated
- **No layout thrashing**: No DOM reflow calculations
- **Precise control**: Per-pixel character positioning
- **Export-ready**: Canvas directly exports to image/PDF via `toBlob()`/`toDataURL()`

### Paper Grain Shader
The 2,200-iteration paper grain noise loop runs once per background paint (not per frame). Cost: ~2-5ms per page.

---

## Memory Management

### Canvas Allocation
- Each page creates one `<canvas>` element (794×1123px)
- At 4 bytes/pixel: ~3.4MB per canvas
- 10-page document: ~34MB canvas memory
- Canvases are reused on re-render, not re-created

### Blob URL Lifecycle
Export Blob URLs are revoked after 1 second via `URL.revokeObjectURL()`, preventing memory leaks from accumulated object URLs.

### State Serialization
- `autosave()` runs at most once per second (1000ms debounce)
- Only serializes the config object — not canvas pixel data
- localStorage limit: ~5MB (sufficient for text + settings)
- Custom glyph data (`draftedGlyphs`) stored as base64 — can approach quota limits for extensive font sets

---

## Animation Performance

### requestAnimationFrame
The animation engine uses `requestAnimationFrame` for GPU-synced 60fps rendering:
- No `setInterval` jank
- Automatic throttling when tab is backgrounded
- Smooth pen cursor tracking via CSS positioning

### Character Queue Pre-computation
All character positions are calculated by `layoutText()` before animation begins, avoiding mid-animation layout recalculations that could cause frame drops.

### Auto-scroll Throttling
Viewport scrolling during animation uses `behavior: 'smooth'` with a 120px edge threshold, limiting scroll events to only when the pen approaches viewport boundaries.

---

## AI Streaming Performance

### SSE Streaming
AI responses use Server-Sent Events streaming, rendering text incrementally rather than waiting for the complete response:
- Eliminates UI freezing during AI generation
- First visible output within 200-500ms of request
- Canvas updates on each text chunk without full re-render

---

## Optimization Techniques

| Technique | Impact | Description |
| :--- | :--- | :--- |
| Unified `layoutText()` | High | Single computation shared by render + animation |
| Debounced rendering | High | Prevents redundant canvas redraws |
| Debounced autosave | Medium | Limits localStorage writes to 1/sec |
| Canvas reuse | Medium | Repaints existing canvases vs creating new ones |
| RAF animation | High | GPU-synced rendering at monitor refresh rate |
| Offscreen measurement | Low | Measures text widths on hidden context |
| Blob URL exports | Medium | Native canvas export, no html2canvas overhead |
| CDN dependencies | Medium | Parallel loading from edge servers |
| SSE AI streaming | High | Incremental rendering prevents UI blocking |

---

## Benchmarks (Approximate)

| Operation | Time | Notes |
| :--- | :--- | :--- |
| Initial render (1 page) | 15-30ms | Including paper background |
| Re-render (text change) | 10-25ms | Debounced, single page |
| Paper grain shader | 2-5ms | 2,200 iterations |
| Font compilation | 200-500ms | 64 glyphs, one-time cost |
| PDF export (5 pages) | 300-800ms | JPEG encoding + jsPDF |
| Image export (PNG) | 50-150ms | Native canvas.toBlob() |
| AI first token | 200-500ms | SSE streaming latency |

---

## Known Limitations

- **Large documents (50+ pages)**: Canvas memory may exceed 150MB on low-RAM devices
- **Paper grain noise**: Re-randomizes on each repaint (cosmetic, not a bug)
- **AI latency**: API response time is network-dependent (1-5 seconds typical)
- **Custom font tracing**: Complex handwriting may produce >1000 path points per glyph
- **localStorage glyph storage**: Base64-encoded glyphs may approach the ~5MB quota limit; IndexedDB migration is planned
