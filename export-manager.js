/**
 * export-manager.js — Export pipelines (PNG / JPG / transparent PNG / PDF / SVG / clipboard)
 * Extracted from index.js (docs/roadmap.md Phase 1.2).
 *
 * Functions are TOP-LEVEL declarations: like contextual-jitter-engine.js, they become true
 * globals, so index.html's inline onclick handlers and index.js's `showToast` alias keep
 * working unchanged. They resolve shared state (S, pages, PAGE_W/PAGE_H, cursiveConnector)
 * through the global lexical environment at CALL time — index.js always loads first.
 * Rendering helpers come from window.ExportRenderers (export-renderers.js).
 */

/* ───────────────────────────────────────────
   PHASE 8.1–8.2 — IMAGE EXPORT (PNG / JPG)
   Reads directly from the canvas elements at full native resolution.
   For single-page docs: one file. For multi-page: one file per page.
─────────────────────────────────────────── */
async function exportImage(format) {
  if (!pages || pages.length === 0) {
    showExportToast('Nothing to export — add some text first.', 'warn');
    return;
  }

  if (document.activeElement && document.activeElement.classList.contains('page-editor')) {
    document.activeElement.blur();
    await new Promise((r) => setTimeout(r, 320));
  }

  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const quality = format === 'png' ? 1.0 : 0.93;
  const ext = format === 'png' ? 'png' : 'jpg';

  try {
    if (pages.length === 1) {
      showExportToast('Exporting ' + ext.toUpperCase() + '…', 'info');
      pages[0].toBlob(
        (blob) => {
          if (!blob) {
            showExportToast('Export failed: Blob generation failed', 'error');
            return;
          }
          const url = URL.createObjectURL(blob);
          triggerDownload(url, 'inkflow-notes.' + ext);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          showExportToast('✓ ' + ext.toUpperCase() + ' saved!', 'success');
        },
        mimeType,
        quality
      );
    } else {
      for (let i = 0; i < pages.length; i++) {
        showExportToast(`Exporting ${ext.toUpperCase()} (Page ${i + 1}/${pages.length})…`, 'info');
        await new Promise((resolve) => {
          pages[i].toBlob(
            (blob) => {
              if (!blob) {
                resolve();
                return;
              }
              const url = URL.createObjectURL(blob);
              triggerDownload(url, `inkflow-notes-page${i + 1}.${ext}`);
              setTimeout(() => URL.revokeObjectURL(url), 1000);
              resolve();
            },
            mimeType,
            quality
          );
        });
        await new Promise((r) => setTimeout(r, 120));
      }
      showExportToast('✓ ' + ext.toUpperCase() + ' pages saved!', 'success');
    }
  } catch (e) {
    showExportToast('Export failed: ' + e.message, 'error');
    console.error('[Inkflow] exportImage error:', e);
  }
}

async function exportTransparentPNG() {
  if (!pages || pages.length === 0) {
    showExportToast('Nothing to export — add some text first.', 'warn');
    return;
  }

  if (document.activeElement && document.activeElement.classList.contains('page-editor')) {
    document.activeElement.blur();
    await new Promise((r) => setTimeout(r, 320));
  }

  const queue = window.currentRenderQueue || [];
  const ext = 'png';

  try {
    for (let i = 0; i < pages.length; i++) {
      showExportToast(`Exporting transparent PNG (Page ${i + 1}/${pages.length})…`, 'info');
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = PAGE_W;
      tmpCanvas.height = PAGE_H;
      const tmpCtx = tmpCanvas.getContext('2d');

      const pageItems = queue.filter((item) => item.pageIdx === i);
      if (S.cursiveMode && cursiveConnector && window.ExportRenderers) {
        window.ExportRenderers.renderCursiveConnectionsOn(tmpCtx, tmpCanvas, pageItems);
      }
      if (window.ExportRenderers) {
        window.ExportRenderers.renderQueueItems(tmpCtx, tmpCanvas, pageItems);
      }

      await new Promise((resolve) => {
        tmpCanvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve();
              return;
            }
            const url = URL.createObjectURL(blob);
            triggerDownload(url, `inkflow-transparent-page${i + 1}.${ext}`);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            resolve();
          },
          'image/png',
          1.0
        );
      });
      await new Promise((r) => setTimeout(r, 120));
    }
    showExportToast('✓ Transparent PNGs saved!', 'success');
  } catch (e) {
    showExportToast('Export failed: ' + e.message, 'error');
    console.error('[Inkflow] exportTransparentPNG error:', e);
  }
}

async function exportPDF() {
  if (!pages || pages.length === 0) {
    showExportToast('Nothing to export — add some text first.', 'warn');
    return;
  }

  if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
    showExportToast('PDF library not loaded. Check your internet connection.', 'error');
    return;
  }

  if (document.activeElement && document.activeElement.classList.contains('page-editor')) {
    document.activeElement.blur();
    await new Promise((r) => setTimeout(r, 320));
  }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    // Output size preset (upstream v1.6.20): Compact 1× JPEG 75%,
    // Standard 2× JPEG 92%, High 2× lossless PNG. Persisted separately.
    const presetName = localStorage.getItem('inkflow-pdf-size') || 'standard';
    const presets = (window.ExportRenderers && window.ExportRenderers.PDF_SIZE_PRESETS) || {};
    const preset = presets[presetName] || presets.standard || { label: 'Standard', scale: 1, format: 'image/jpeg', quality: 0.93, jspdfFormat: 'JPEG', compression: 'FAST' };

    for (let i = 0; i < pages.length; i++) {
      showExportToast(`Building PDF (Page ${i + 1}/${pages.length}) — ${preset.label}…`, 'info');
      await new Promise((r) => setTimeout(r, 60));
      if (i > 0) doc.addPage();
      const src = preset.scale > 1 ? window.ExportRenderers._upscaleCanvas(pages[i], preset.scale) : pages[i];
      const imgData = src.toDataURL(preset.format, preset.quality);
      doc.addImage(imgData, preset.jspdfFormat, 0, 0, 210, 297, undefined, preset.compression);
    }

    doc.save('inkflow-notes.pdf');
    showExportToast('✓ PDF saved!', 'success');
  } catch (e) {
    showExportToast('PDF export failed: ' + e.message, 'error');
    console.error('[Inkflow] exportPDF error:', e);
  }
}

async function exportSVG() {
  if (!pages || pages.length === 0) {
    showExportToast('Nothing to export — add some text first.', 'warn');
    return;
  }

  if (document.activeElement && document.activeElement.classList.contains('page-editor')) {
    document.activeElement.blur();
    await new Promise((r) => setTimeout(r, 320));
  }

  try {
    for (let i = 0; i < pages.length; i++) {
      showExportToast(`Building SVG (Page ${i + 1}/${pages.length})…`, 'info');
      await new Promise((r) => setTimeout(r, 60));
      const imgData = pages[i].toDataURL('image/png', 1.0);
      const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${PAGE_W}" height="${PAGE_H}" viewBox="0 0 ${PAGE_W} ${PAGE_H}">
  <image href="${imgData}" x="0" y="0" width="${PAGE_W}" height="${PAGE_H}"/>
</svg>`;
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const suffix = pages.length > 1 ? `-page${i + 1}` : '';
      triggerDownload(url, `inkflow-notes${suffix}.svg`);
      URL.revokeObjectURL(url);
      await new Promise((r) => setTimeout(r, 120));
    }
    showExportToast('✓ SVG saved!', 'success');
  } catch (e) {
    showExportToast('SVG export failed: ' + e.message, 'error');
    console.error('[Inkflow] exportSVG error:', e);
  }
}

async function copyToClipboard() {
  if (!pages || pages.length === 0) {
    showExportToast('Nothing to copy — add some text first.', 'warn');
    return;
  }
  try {
    const canvas = pages[S.currentPage] || pages[0];
    canvas.toBlob(
      async (blob) => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          showExportToast('✓ Copied to clipboard!', 'success');
        } catch (e) {
          showExportToast('Clipboard copy failed: ' + e.message, 'error');
        }
      },
      'image/png',
      1.0
    );
  } catch (e) {
    showExportToast('Copy failed: ' + e.message, 'error');
  }
}

/* ───────────────────────────────────────────
   SHARED EXPORT HELPERS
─────────────────────────────────────────── */
function triggerDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

let exportToastTimer = null;
function announceToScreenReader(message) {
  const live = document.getElementById('status-announcer');
  if (!live) return;
  live.textContent = '';
  requestAnimationFrame(() => {
    live.textContent = message;
  });
}

function showExportToast(msg, type = 'info') {
  announceToScreenReader(msg);
  let toast = document.getElementById('export-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'export-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = 'export-toast export-toast--' + type;
  toast.style.opacity = '1';
  clearTimeout(exportToastTimer);
  if (type !== 'info') {
    exportToastTimer = setTimeout(() => {
      toast.style.opacity = '0';
    }, 3000);
  }
}
