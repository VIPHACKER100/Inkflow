# ⚡ Performance

This document covers Inkflow's performance characteristics, optimization techniques, and rendering budget.

---

## Rendering Performance

### Debounced Rendering
All text input changes are filtered through a 280ms debouncer, preventing redundant canvas redraws during fast typing:

```javascript
function debounceRender() {
  clearTimeout(renderTimeout);
  renderTimeout = setTimeout(() => renderText(S.text), 280);
}
```

### Canvas vs DOM Rendering
Inkflow renders text on `<canvas>` elements rather than DOM text nodes. This provides:
- **Faster repaints**: Canvas redraws are GPU-accelerated
- **No layout thrashing**: No DOM reflow calculations
- **Precise control**: Per-pixel character positioning
- **Export-ready**: Canvas directly exports to image/PDF

### Paper Grain Shader
The 2,200-iteration paper grain noise loop runs once per background paint (not per frame). Cost: ~2-5ms per page.

---

## Memory Management

### Canvas Allocation
- Each page creates one `<canvas>` element (794×1123px)
- At 4 bytes/pixel: ~3.4MB per canvas
- 10-page document: ~34MB canvas memory
- Canvases are reused on re-render, not re-created

### State Serialization
- `autosave()` runs at most once per second (1000ms debounce)
- Only serializes the config object — not canvas pixel data
- localStorage limit: ~5MB (sufficient for text + settings)

---

## Animation Performance

### requestAnimationFrame
The animation engine uses `requestAnimationFrame` for GPU-synced 60fps rendering:
- No `setInterval` jank
- Automatic throttling when tab is backgrounded
- Smooth pen cursor tracking via CSS positioning

### Character Queue Pre-computation
All character positions are calculated before animation begins, avoiding mid-animation layout recalculations that could cause frame drops.

---

## Optimization Techniques

| Technique | Impact | Description |
| :--- | :--- | :--- |
| Debounced rendering | High | Prevents redundant canvas redraws |
| Debounced autosave | Medium | Limits localStorage writes to 1/sec |
| Canvas reuse | Medium | Repaints existing canvases vs creating new ones |
| RAF animation | High | GPU-synced rendering at monitor refresh rate |
| Offscreen measurement | Low | Measures text widths on hidden context |
| CDN dependencies | Medium | Parallel loading from edge servers |

---

## Benchmarks (Approximate)

| Operation | Time | Notes |
| :--- | :--- | :--- |
| Initial render (1 page) | 15-30ms | Including paper background |
| Re-render (text change) | 10-25ms | Debounced, single page |
| Paper grain shader | 2-5ms | 2,200 iterations |
| Font compilation | 200-500ms | 64 glyphs, one-time cost |
| PDF export (5 pages) | 300-800ms | JPEG encoding + jsPDF |
| Image export | 100-300ms | html2canvas at 1.5x scale |

---

## Known Limitations

- **Large documents (50+ pages)**: Canvas memory may exceed 150MB on low-RAM devices
- **Paper grain noise**: Re-randomizes on each repaint (cosmetic, not a bug)
- **AI latency**: Claude API response time is network-dependent (1-5 seconds typical)
- **Custom font tracing**: Complex handwriting with many curves may produce >1000 path points per glyph
