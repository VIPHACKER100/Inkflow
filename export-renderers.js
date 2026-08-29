/**
 * export-renderers.js — Pure canvas rendering for queue items and cursive connections.
 * Functions: renderQueueItems, renderCursiveConnectionsOn
 * Extracted from index.js (lines 2231–2332). Reads globals: S, cursiveConnector.
 */
(function () {
  'use strict';

  function renderCursiveConnectionsOn(ctx, canvas, pageItems) {
    if (typeof cursiveConnector === 'undefined' || !cursiveConnector) return;
    const charList = pageItems.filter((item) => !item.type && !item.isIndic);
    for (let i = 0; i < charList.length - 1; i++) {
      const curr = charList[i];
      const next = charList[i + 1];
      if (!cursiveConnector.shouldRenderConnection(curr.ch, next.ch, curr.isIndic)) continue;
      if (curr.penKey !== next.penKey) continue;
      const gap = next.x - (curr.x + (curr.charWidth || 20));
      if (gap > S.fontSize * 0.6) continue;

      const currW = curr.charWidth || 20;
      const nextW = next.charWidth || 20;
      const exitPoint = cursiveConnector.getExitPoint(curr.ch, currW, S.fontSize);
      const entryPoint = cursiveConnector.getEntryPoint(next.ch, nextW, S.fontSize);
      cursiveConnector.renderConnectionStroke(
        ctx,
        { x: curr.x, y: curr.y },
        exitPoint,
        { x: next.x, y: next.y },
        entryPoint,
        curr.inkColor || S.inkColor,
        curr.v?.pressureMod ?? 1,
        S.fontSize
      );
    }
  }

  function renderQueueItems(ctx, canvas, pageItems) {
    if (typeof rough !== 'undefined' && !window._rcCache) window._rcCache = new Map();
    let rc = window._rcCache?.get(canvas);
    if (!rc && typeof rough !== 'undefined') {
      rc = rough.canvas(canvas);
      window._rcCache?.set(canvas, rc);
    }

    const options = { roughness: S.pressure * 4, stroke: S.inkColor, strokeWidth: 1.2, bowing: S.rotationMax * 2 };

    pageItems.forEach((item) => {
      if (item.type === 'mermaid') {
        if (typeof getDiagramImage === 'undefined') return;
        const diag = getDiagramImage(item.content);
        if (diag.ready && diag.img && !diag.error) {
          ctx.save();
          ctx.translate(item.x, item.y);
          ctx.globalAlpha = 0.9;
          ctx.drawImage(diag.img, 0, 0, item.w, item.h);
          ctx.restore();
        }
        return;
      }
      if (item.type === 'shape') {
        if (rc) {
          if (item.shape === 'circle') rc.circle(item.x, item.y, Math.max(item.w, item.h), options);
          else if (item.shape === 'diamond') {
            const hw = item.w / 2,
              hh = item.h / 2;
            rc.polygon(
              [
                [item.x, item.y - hh],
                [item.x + hw, item.y],
                [item.x, item.y + hh],
                [item.x - hw, item.y],
              ],
              options
            );
          } else if (item.shape === 'pill' || item.shape === 'rounded') {
            rc.roundRect(item.x - item.w / 2, item.y - item.h / 2, item.w, item.h, 12, options);
          } else if (item.shape === 'hexagon') {
            const hw = item.w / 2,
              hh = item.h / 2,
              inset = hw * 0.3;
            rc.polygon(
              [
                [item.x - hw + inset, item.y - hh],
                [item.x + hw - inset, item.y - hh],
                [item.x + hw, item.y],
                [item.x + hw - inset, item.y + hh],
                [item.x - hw + inset, item.y + hh],
                [item.x - hw, item.y],
              ],
              options
            );
          } else rc.rectangle(item.x - item.w / 2, item.y - item.h / 2, item.w, item.h, options);
        } else {
          ctx.strokeStyle = S.inkColor;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          if (item.shape === 'circle') ctx.arc(item.x, item.y, Math.max(item.w, item.h) / 2, 0, Math.PI * 2);
          else ctx.rect(item.x - item.w / 2, item.y - item.h / 2, item.w, item.h);
          ctx.stroke();
        }
        return;
      }
      if (item.type === 'edge') {
        if (rc) {
          rc.line(item.from.x, item.from.y, item.to.x, item.to.y, options);
        } else {
          ctx.strokeStyle = S.inkColor;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(item.from.x, item.from.y);
          ctx.lineTo(item.to.x, item.to.y);
          ctx.stroke();
        }
        if (item.label) {
          const mx = (item.from.x + item.to.x) / 2,
            my = (item.from.y + item.to.y) / 2;
          ctx.save();
          ctx.font = `${Math.max(10, S.fontSize * 0.7)}px ${S.font}`;
          ctx.fillStyle = S.inkColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(item.label, mx, my);
          ctx.restore();
        }
        return;
      }
      if (item.type === 'diagram-label') {
        ctx.save();
        ctx.font = `${Math.max(10, S.fontSize * 0.7)}px ${item.fontStack || S.font}`;
        ctx.fillStyle = item.inkColor || S.inkColor;
        ctx.globalAlpha = 0.9;
        ctx.fillText(item.ch, item.x, item.y);
        ctx.restore();
        return;
      }
      const v = item.v;
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate((v.tiltDeg * (item.isIndic ? 0.3 : 1) * Math.PI) / 180);
      ctx.scale(v.scaleX, v.scaleY);
      const pxSize = S.fontSize * v.pressureMod;
      ctx.font = `${Math.max(10, pxSize)}px ${item.fontStack}`;
      ctx.globalAlpha = v.opacity;
      ctx.fillStyle = item.inkColor || S.inkColor;
      ctx.fillText(item.ch, 0, 0);
      ctx.restore();
    });
  }

  window.ExportRenderers = { renderQueueItems, renderCursiveConnectionsOn };
})();
