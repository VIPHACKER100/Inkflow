/**
 * paper-renderer.js — Canvas paper background rendering for all 10 styles.
 * Functions: drawLayoutDecorations, drawPaperBackground, renderSmudgeEffects, getAlignmentOffset
 * Extracted from index.js (lines 643–1153). Reads globals: S, PAGE_W, PAGE_H.
 */
(function () {
  'use strict';

  function drawLayoutDecorations(ctx, noteLayout) {
    if (noteLayout === 'standard') return;
    if (!window.templateManager) return;

    const template = window.templateManager.resolveTemplate(noteLayout, PAGE_W, PAGE_H, S.margin);
    if (!template) return;

    ctx.save();
    ctx.strokeStyle = S.inkColor;
    ctx.fillStyle = S.inkColor;

    if (template.guides) {
      template.guides.forEach((g) => {
        if (g.type === 'line') {
          ctx.globalAlpha = g.alpha || 0.35;
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(g.x1, g.y1);
          ctx.lineTo(g.x2, g.y2);
          ctx.stroke();
        }
      });
    }

    if (template.labels) {
      template.labels.forEach((l) => {
        ctx.globalAlpha = l.alpha || 0.5;
        ctx.font = l.font || 'italic bold 11px sans-serif';
        ctx.fillText(l.text, l.x, l.y);
      });
    }

    ctx.restore();
  }

  // Offscreen canvas cache for static paper backgrounds
  const _paperBgCache = new Map();

  function _renderPaperBackgroundDirect(ctx, style) {
    if (!S || !PAGE_W || !PAGE_H) return;
    const w = PAGE_W,
      h = PAGE_H;
    ctx.clearRect(0, 0, w, h);

    const configs = {
      ruled: { bg: '#f8f4ea', lineColor: '#c5b9a0', lineOpacity: 0.55, redLine: '#e08080' },
      plain: { bg: '#faf7f0', lineColor: null },
      grid: { bg: '#f6f2ec', lineColor: '#c0b49a', lineOpacity: 0.35 },
      legal: { bg: '#fef9c3', lineColor: '#c8b820', lineOpacity: 0.45, redLine: '#e07070' },
      vintage: { bg: '#f2e8ce', lineColor: '#b8a080', lineOpacity: 0.4 },
      dark: { bg: '#1a1a2e', lineColor: '#3a3a5e', lineOpacity: 0.7 },
      dot_grid: { bg: '#f6f2ec', lineColor: '#c0b49a', lineOpacity: 0.35 },
      engineering: { bg: '#eef6ed', lineColor: '#78a67d', lineOpacity: 0.4 },
      music: { bg: '#faf7f0', lineColor: '#4a4a4a', lineOpacity: 0.55 },
      dated: { bg: '#f8f4ea', lineColor: '#c5b9a0', lineOpacity: 0.55, redLine: '#e08080', dateColumn: true },
    };

    const c = configs[style] || configs.ruled;

    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, w, h);

    // Paper grain texture
    if (style !== 'dark') {
      ctx.save();
      ctx.globalAlpha = 0.018;
      let seed = 0;
      for (let ci = 0; ci < style.length; ci++) seed = ((seed << 5) - seed + style.charCodeAt(ci)) | 0;
      const rng = () => {
        seed = (seed * 16807 + 0) % 2147483647;
        return (seed & 0x7fffffff) / 0x7fffffff;
      };
      for (let i = 0; i < 2200; i++) {
        const gx = rng() * w;
        const gy = rng() * h;
        const gs = rng() * 3 + 1;
        ctx.fillStyle = rng() > 0.5 ? '#8b7355' : '#c8b090';
        ctx.fillRect(gx, gy, gs, gs * 0.5);
      }
      ctx.restore();
    }

    if (style === 'ruled' || style === 'legal') {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = c.redLine || '#e08080';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(S.margin - 10, 0);
      ctx.lineTo(S.margin - 10, h);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = c.lineOpacity;
      ctx.strokeStyle = c.lineColor;
      ctx.lineWidth = 0.8;
      const lineSpacingPx = S.fontSize * S.lineHeight;
      for (let y = S.margin + lineSpacingPx; y < h - 20; y += lineSpacingPx) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (style === 'dated') {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = c.redLine || '#e08080';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(S.margin - 10, 0);
      ctx.lineTo(S.margin - 10, h);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = '#b0a080';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(S.margin - 60, 0);
      ctx.lineTo(S.margin - 60, h);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = c.lineOpacity;
      ctx.strokeStyle = c.lineColor;
      ctx.lineWidth = 0.8;
      const lineSpacingPx = S.fontSize * S.lineHeight;
      for (let y = S.margin + lineSpacingPx; y < h - 20; y += lineSpacingPx) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (style === 'grid') {
      ctx.save();
      ctx.globalAlpha = c.lineOpacity;
      ctx.strokeStyle = c.lineColor;
      ctx.lineWidth = 0.6;
      const gridSz = S.fontSize * S.lineHeight;
      for (let x = S.margin; x < w; x += gridSz) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let x = S.margin - gridSz; x > 0; x -= gridSz) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = S.margin; y < h; y += gridSz) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let y = S.margin - gridSz; y > 0; y -= gridSz) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (style === 'vintage') {
      ctx.save();
      const grd = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.85);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(1, 'rgba(120,80,20,0.14)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = c.lineColor;
      ctx.lineWidth = 0.7;
      const vs = S.fontSize * S.lineHeight;
      for (let y = S.margin + vs; y < h - 20; y += vs) {
        ctx.beginPath();
        ctx.moveTo(20, y);
        ctx.lineTo(w - 20, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (style === 'dark') {
      ctx.save();
      ctx.globalAlpha = c.lineOpacity;
      ctx.strokeStyle = c.lineColor;
      ctx.lineWidth = 0.7;
      const vs = S.fontSize * S.lineHeight;
      for (let y = S.margin + vs; y < h - 20; y += vs) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (style === 'dot_grid') {
      ctx.save();
      ctx.fillStyle = c.lineColor || '#c0b49a';
      ctx.globalAlpha = c.lineOpacity;
      const dotSz = S.fontSize * S.lineHeight;
      for (let x = S.margin; x < w; x += dotSz) {
        for (let y = S.margin; y < h; y += dotSz) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      for (let x = S.margin - dotSz; x > 0; x -= dotSz) {
        for (let y = S.margin; y < h; y += dotSz) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    if (style === 'engineering') {
      ctx.save();
      ctx.strokeStyle = c.lineColor || '#78a67d';
      const majorSize = S.fontSize * S.lineHeight;
      const minorSize = majorSize / 5;

      ctx.globalAlpha = 0.18;
      ctx.lineWidth = 0.4;
      for (let x = S.margin; x < w; x += minorSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let x = S.margin - minorSize; x > 0; x -= minorSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = S.margin; y < h; y += minorSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let y = S.margin - minorSize; y > 0; y -= minorSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 0.8;
      for (let x = S.margin; x < w; x += majorSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let x = S.margin - majorSize; x > 0; x -= majorSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = S.margin; y < h; y += majorSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let y = S.margin - majorSize; y > 0; y -= majorSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      ctx.strokeStyle = '#a66858';
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(S.margin - 10, 0);
      ctx.lineTo(S.margin - 10, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, S.margin);
      ctx.lineTo(w, S.margin);
      ctx.stroke();
      ctx.restore();
    }

    if (style === 'music') {
      ctx.save();
      ctx.strokeStyle = c.lineColor || '#4a4a4a';
      ctx.lineWidth = 0.8;
      const baseSpacing = S.fontSize * S.lineHeight;
      const lineSpacing = baseSpacing * (8 / 33);
      const staffSpacing = baseSpacing * (72 / 33);
      const startY = S.margin;
      ctx.globalAlpha = c.lineOpacity;

      for (let y = startY; y < h - 80; y += staffSpacing) {
        for (let i = 0; i < 5; i++) {
          const ly = y + i * lineSpacing;
          ctx.beginPath();
          ctx.moveTo(S.margin - 20, ly);
          ctx.lineTo(w - S.margin + 20, ly);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(S.margin - 20, y);
        ctx.lineTo(S.margin - 20, y + 4 * lineSpacing);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(w - S.margin + 20, y);
        ctx.lineTo(w - S.margin + 20, y + 4 * lineSpacing);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Page shadow edge
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 4, h);
    ctx.fillRect(w - 4, 0, 4, h);
    ctx.restore();

    drawLayoutDecorations(ctx, S.noteLayout);
  }

  function drawPaperBackground(ctx, style) {
    if (!S || !PAGE_W || !PAGE_H || !ctx) return;
    const w = PAGE_W,
      h = PAGE_H;

    // Build unique cache key based on style, dimensions, and layout properties
    const cacheKey = `${style}_${w}_${h}_${S.lineHeight}_${S.fontSize}_${S.margin}_${S.noteLayout || 'standard'}`;

    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      let cachedCanvas = _paperBgCache.get(cacheKey);
      if (!cachedCanvas) {
        cachedCanvas = document.createElement('canvas');
        cachedCanvas.width = w;
        cachedCanvas.height = h;
        const offCtx = cachedCanvas.getContext('2d');
        if (offCtx) {
          _renderPaperBackgroundDirect(offCtx, style);
          _paperBgCache.set(cacheKey, cachedCanvas);
        }
      }

      if (cachedCanvas) {
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(cachedCanvas, 0, 0);
        return;
      }
    }

    // Direct fallback if document / offscreen canvas is unavailable
    _renderPaperBackgroundDirect(ctx, style);
  }

  function renderSmudgeEffects(ctx, pageIdx) {
    if (!S.smudgeEffects) return;

    const baseSeed = 12345 + pageIdx * 9876;
    let callCount = 0;
    const seededRandom = () => {
      callCount++;
      const x = Math.sin(baseSeed * 12.9898 + callCount * 78.233) * 43758.5453;
      return x - Math.floor(x);
    };

    const numShapes = Math.floor(seededRandom() * 4) + 2;

    for (let i = 0; i < numShapes; i++) {
      const isEraser = seededRandom() > 0.6;

      const minOpacity = isEraser ? 0.03 : 0.05;
      const maxOpacity = isEraser ? 0.08 : 0.15;
      const opacity = minOpacity + seededRandom() * (maxOpacity - minOpacity);

      const width = 40 + seededRandom() * 80;
      const height = 15 + seededRandom() * 25;

      const minY = 100 - height * 0.3;
      const maxY = PAGE_H - height;
      const y = minY + seededRandom() * (maxY - minY);
      const x = seededRandom() * (PAGE_W - width);

      const shapeType = seededRandom() > 0.5 ? 'blob' : 'ellipse';

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillStyle = S.paperStyle === 'dark' ? '#ffffff' : '#888888';

      if (shapeType === 'ellipse') {
        const radiusX = width / 2;
        const radiusY = height / 2;
        const rotation = seededRandom() * Math.PI;

        ctx.translate(x + radiusX, y + radiusY);
        ctx.rotate(rotation);
        ctx.scale(radiusX, radiusY);
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.translate(x, y);
        const blobPoints = 4;
        for (let j = 0; j < blobPoints; j++) {
          const bx = (width / 2) * Math.cos((j / blobPoints) * Math.PI * 2);
          const by = (height / 2) * Math.sin((j / blobPoints) * Math.PI * 2);
          const blobRadius = Math.min(width, height) * 0.3 * (0.7 + seededRandom() * 0.6);
          ctx.beginPath();
          ctx.arc(bx, by, blobRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }
  }

  function getAlignmentOffset(alignment, fontSize, lineHeight) {
    const lineH = fontSize * lineHeight;

    switch (alignment) {
      case 'top':
        return -(lineH * 0.35);
      case 'bottom':
        return lineH * 0.35;
      case 'middle':
      default:
        return 0;
    }
  }

  function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
    ctx.stroke();
  }

  function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    const words = text.split(' ');
    let line = '';
    let lineCount = 0;
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line !== '') {
        ctx.fillText(line.trim(), x, y);
        line = words[i] + ' ';
        y += lineHeight;
        lineCount++;
        if (maxLines && lineCount >= maxLines) {
          ctx.fillText('…', x, y);
          return y;
        }
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, y);
    return y;
  }

  window.PaperRenderer = {
    drawLayoutDecorations,
    drawPaperBackground,
    renderSmudgeEffects,
    getAlignmentOffset,
    drawRoundedRect,
    drawWrappedText,
  };
})();
