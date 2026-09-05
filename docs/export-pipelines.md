<p align="center">
  <img src="../inkflow_logo.jpeg" alt="Inkflow Logo" width="80" style="border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
</p>

# 📤 Export Pipelines

This document describes Inkflow's multi-format export system — 2×-upscaled PNG/JPG image export, SVG vector wrapper, multi-page PDF with selectable output size, clipboard copy, and native print support.

---

## Export Architecture

```mermaid
graph LR
    A["Rendered A4 Canvas Pages"] --> UP["_upscaleCanvas 2x"]
    UP --> B{"Export Selection"}
    B -->|"canvas.toBlob PNG/JPG"| C["High-Res Images"]
    B -->|"SVG wrapping PNG embed"| D["SVG Vector Files"]
    B -->|"jsPDF A4 scaling"| E["Multi-page PDF"]
    B -->|"Clipboard API"| F["Copy to Clipboard"]
    B -->|"Browser print"| G["Direct Print"]
    C --> H["Blob URL -> triggerDownload"]
    D --> H
```

---

## High-Resolution Upscaling

Since v1.4.0 every raster export runs the source canvas through `_upscaleCanvas(src, scale)`:

```javascript
function _upscaleCanvas(src, scale) {
  const hq = document.createElement('canvas');
  hq.width  = src.width  * scale;
  hq.height = src.height * scale;
  const ctx = hq.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, hq.width, hq.height);
  return hq;
}
```

The image-export `EXPORT_SCALE` factor is **2**, producing ~150 DPI output from the 794×1123 native canvas; the PDF render scale is preset-dependent (see §3).

---

## 1. Image Export (PNG / JPG)

Reads from `pages[]` canvas elements and upsamples 2× before encoding via `canvas.toBlob()`. No screenshot library required.

### Process
1. Blur any active `.page-editor` overlay and wait 320ms for clean canvas state
2. `_upscaleCanvas(pages[i], 2)` for each page
3. Call `hq.toBlob(callback, mimeType, quality)`
4. Create a Blob URL via `URL.createObjectURL(blob)`
5. Trigger download via `triggerDownload(url, filename)`
6. Revoke the Blob URL after 1 second to free memory

| Format | MIME Type | Quality | Notes |
| :--- | :--- | :--- | :--- |
| PNG | `image/png` | 1.0 | Lossless, full alpha |
| JPG | `image/jpeg` | 0.97 | Near-lossless, smaller file |

Single-page documents export one file (`inkflow-notes.png`); multi-page documents export one file per page (`inkflow-notes-page1.png`, …).

> **v1.2.0 Change**: Replaced `html2canvas` screenshot capture with native `canvas.toBlob()`. The `html2canvas` CDN script remains loaded in `index.html` but is no longer referenced by any export path.

---

## 2. SVG Export

Wraps a full-resolution PNG data URL inside a standard SVG `<image>` element:

```javascript
const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_W}" height="${PAGE_H}"
     viewBox="0 0 ${PAGE_W} ${PAGE_H}">
  <image href="${imgData}" x="0" y="0" width="${PAGE_W}" height="${PAGE_H}"/>
</svg>`;
const blob = new Blob([svgContent], { type: 'image/svg+xml' });
triggerDownload(URL.createObjectURL(blob), 'inkflow-notes.svg');
```

For multi-page documents: `inkflow-notes-page1.svg`, `inkflow-notes-page2.svg`, etc.

---

## 3. Multi-Page PDF Export

Maps upscaled page images into jsPDF A4 blocks (210mm × 297mm) with progress toasts. Since **v1.6.20**, the render scale, image format, and compression come from the **PDF Output Size** dropdown (`#pdf-size-select`, persisted in `localStorage`):

| Preset | Scale | Format / Quality | jsPDF compress | Typical size/page |
| :--- | :--- | :--- | :--- | :--- |
| `compact` | 1× | JPEG 0.75 | `FAST` | ~142 KB |
| `standard` (default) | 2× | JPEG 0.92 | `FAST` | ~465 KB |
| `high` | 2× | PNG 1.0 (lossless) | `NONE` | ~1.8 MB |

```javascript
const PDF_SIZE_PRESETS = {
  compact:  { scale: 1, format: 'JPEG', quality: 0.75, compress: true,  tag: 'FAST', label: 'Compact' },
  standard: { scale: 2, format: 'JPEG', quality: 0.92, compress: true,  tag: 'FAST', label: 'Standard' },
  high:     { scale: 2, format: 'PNG',  quality: 1.0,  compress: false, tag: 'NONE', label: 'High (lossless)' }
};

const preset = PDF_SIZE_PRESETS[document.getElementById('pdf-size-select').value] || PDF_SIZE_PRESETS.standard;
const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: preset.compress });
for (let i = 0; i < pages.length; i++) {
  if (i > 0) doc.addPage();
  const hq = _upscaleCanvas(pages[i], preset.scale);
  const mime = preset.format === 'PNG' ? 'image/png' : 'image/jpeg';
  doc.addImage(hq.toDataURL(mime, preset.quality), preset.format, 0, 0, 210, 297, undefined, preset.tag);
}
doc.save('inkflow-notes.pdf');
```

> **v1.4.0**: switched to lossless PNG with `NONE` compression for pixel-perfect print quality. **v1.6.20**: made it selectable — the default became **Standard** (2× JPEG 92%, ~4× smaller), with `high` preserving the old lossless behavior.

---

## 4. Copy to Clipboard

Copies the current page as a PNG image to the system clipboard:

```javascript
canvas.toBlob(async (blob) => {
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}, 'image/png', 1.0);
```

---

## 5. Native Print

Custom `@media print` CSS overrides hide UI, printing only notes pages.

---

## Export Toast Notifications

All exports display non-blocking toast feedback via `showExportToast(msg, type)`:

| Type | Trigger | Auto-dismiss |
| :--- | :--- | :--- |
| `info` | Progress ("Building PDF…") | No |
| `success` | Complete | 3 seconds |
| `warn` | Nothing to export | 3 seconds |
| `error` | Failure | 3 seconds |

---

## Shared Download Helper — `triggerDownload(url, filename)`

```javascript
function triggerDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.style.display = 'none';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
```

---

## Pre-Export State Handling

Before any export: checks `pages.length > 0`, blurs active `.page-editor`, and awaits 320ms for the blur/redraw cycle to complete. Failing conditions surface as a `warn` toast ("Nothing to export — add some text first.").
