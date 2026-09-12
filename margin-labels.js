/**
 * Margin Q/Ans Labels Module — clusters the layout queue into visual lines and
 * assigns margin labels: Q1..Qn next to numbered question lines, Ans next to
 * bare "Answer:" lines (upstream Inkflow v1.6.8–1.6.11 parity, adapted).
 * Pure functions — no DOM. index.js draws the computed labels on canvas.
 */
(function () {
  'use strict';

  /**
   * Cluster queue char items into visual lines.
   * Spaces are not queue items and per-char y varies by a few px of wobble, so
   * a line is a run of items whose y stays within lineHeight/2, per page.
   * Returns [{ pageIdx, y, text }] in queue order (y = median of the cluster).
   */
  function clusterQueueLines(queue, options) {
    const fontSize = (options && options.fontSize) || 22;
    const lineHeight = (options && options.lineHeight) || 1.5;
    const tolerance = (fontSize * lineHeight) / 2;

    const byPage = new Map();
    for (const item of queue || []) {
      if (item.type) continue; // skip shape/edge/mermaid/diagram-label items
      if (!byPage.has(item.pageIdx)) byPage.set(item.pageIdx, []);
      byPage.get(item.pageIdx).push(item);
    }

    const lines = [];
    for (const [pageIdx, items] of byPage) {
      items.sort((a, b) => a.y - b.y || a.x - b.x);
      let cluster = [];
      let anchorY = null;
      const flush = () => {
        if (!cluster.length) return;
        const ys = cluster.map((it) => it.y).sort((a, b) => a - b);
        const text = cluster
          .slice()
          .sort((a, b) => a.x - b.x)
          .map((it) => it.ch || '')
          .join('');
        lines.push({ pageIdx: pageIdx, y: ys[Math.floor(ys.length / 2)], text: text });
        cluster = [];
        anchorY = null;
      };
      for (const item of items) {
        if (anchorY === null || Math.abs(item.y - anchorY) <= tolerance) {
          cluster.push(item);
          if (anchorY === null) anchorY = item.y;
        } else {
          flush();
          cluster = [item];
          anchorY = item.y;
        }
      }
      flush();
    }
    return lines;
  }

  /**
   * Space-tolerant classifiers (upstream v1.6.9): the joined line text has no
   * spaces, so patterns are tested on the whitespace-stripped text. Questions
   * must carry a numbered/Q prefix AND end with "?" so numbered sub-points
   * ("1. Cardinality Constraint") are not mislabeled.
   */
  function isQuestionLine(text) {
    const compact = String(text || '').replace(/\s+/g, '').toLowerCase();
    if (!compact.endsWith('?')) return false;
    return /^(q\d*[:.]|\d+[.)])/.test(compact);
  }

  function isAnswerLine(text) {
    const compact = String(text || '').replace(/\s+/g, '').toLowerCase();
    return /^answer[:.]?$/.test(compact);
  }

  /**
   * Compute margin labels for the whole document: Map<pageIdx, [{y, label}]>.
   * Numbering runs sequentially across pages in queue order (deterministic —
   * computed once per full render), so lazy per-page painting can't scramble it.
   */
  function computeMarginLabels(queue, options) {
    const lines = clusterQueueLines(queue, options);
    const labels = new Map();
    let qNum = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let label = null;
      if (isQuestionLine(line.text)) {
        qNum += 1;
        label = 'Q' + qNum;
      } else if (isAnswerLine(line.text)) {
        label = 'Ans';
      }
      if (!label) continue;
      // Upstream v1.6.15: anchor Ans to the first line of the answer content
      let anchorY = line.y;
      const next = lines[i + 1];
      if (label === 'Ans' && next && next.pageIdx === line.pageIdx) {
        anchorY = next.y;
      }
      if (!labels.has(line.pageIdx)) labels.set(line.pageIdx, []);
      labels.get(line.pageIdx).push({ y: anchorY, label: label });
    }
    return labels;
  }

  if (typeof window !== 'undefined') {
    window.MarginLabels = { clusterQueueLines, isQuestionLine, isAnswerLine, computeMarginLabels };
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { clusterQueueLines, isQuestionLine, isAnswerLine, computeMarginLabels };
  }
})();
