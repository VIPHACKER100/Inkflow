/**
 * text-layout.js — Pure text processing helpers.
 * Functions: sanitizeText, parseBlocks, getGraphemes
 * Extracted from index.js. Zero DOM dependencies.
 */
(function () {
  'use strict';

  function sanitizeText(str) {
    if (!str) return '';
    return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uE000-\uF8FF]/g, '');
  }

  function parseBlocks(text) {
    const blocks = [];
    const blockRegex = /```(mermaid|diagram)([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = blockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        blocks.push({ type: 'text', content: text.substring(lastIndex, match.index) });
      }
      const type = match[1];
      const content = match[2].trim();
      blocks.push({ type: type, content: content, raw: match[0] });
      lastIndex = blockRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      blocks.push({ type: 'text', content: text.substring(lastIndex) });
    }

    return blocks;
  }

  function getGraphemes(text) {
    if (!text) return [];
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
      return Array.from(segmenter.segment(text)).map((s) => s.segment);
    }
    return Array.from(text);
  }

  window.TextLayout = { sanitizeText, parseBlocks, getGraphemes };
})();
