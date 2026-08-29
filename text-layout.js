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

  function splitRawTextIntoPages(rawText, cleanPageTexts) {
    if (!rawText || !cleanPageTexts || cleanPageTexts.length === 0) return [rawText || ''];
    const result = [];
    let remaining = rawText;
    for (let i = 0; i < cleanPageTexts.length; i++) {
      const clean = (cleanPageTexts[i] || '').trim();
      if (!clean) {
        result.push('');
        continue;
      }
      const idx = remaining.indexOf(clean);
      if (idx !== -1) {
        result.push(remaining.substring(0, idx + clean.length));
        remaining = remaining.substring(idx + clean.length);
      } else {
        const words = clean.split(/\s+/).filter(Boolean);
        let found = false;
        for (let w = 0; w < words.length && !found; w++) {
          const wIdx = remaining.indexOf(words[w]);
          if (wIdx !== -1) {
            const endIdx = wIdx + words[w].length;
            result.push(remaining.substring(0, endIdx));
            remaining = remaining.substring(endIdx);
            found = true;
          }
        }
        if (!found) result.push(clean);
      }
    }
    if (remaining.trim()) result.push(remaining);
    return result;
  }

  function parseStructuredContent(text) {
    if (!text) return [];
    const lines = text.split('\n');
    const blocks = [];
    let qNum = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/^#{2,3}\s/.test(trimmed)) {
        blocks.push({ type: 'subheading', text: trimmed.replace(/^#{2,3}\s*/, '') });
      } else if (/^#\s/.test(trimmed)) {
        blocks.push({ type: 'heading', text: trimmed.replace(/^#\s*/, '') });
      } else if (/^[-*]\s/.test(trimmed)) {
        const level = /^\s{4,}/.test(line) ? 2 : 1;
        blocks.push({ type: 'bullet', text: trimmed.replace(/^[-*]\s*/, ''), level });
      } else if (/^(Q[:.]|\d+[.)])\s/.test(trimmed)) {
        qNum++;
        blocks.push({ type: 'question', text: trimmed, num: qNum });
      } else {
        blocks.push({ type: 'paragraph', text: trimmed });
      }
    }
    return blocks;
  }

  function parseRichSyntax(rawText) {
    if (!rawText) return { cleanText: '', flashcards: [] };
    let cleanText = rawText;
    const flashcards = [];
    const stickyRegex = /\[sticky:(\w+)\]([\s\S]*?)\[sticky\]/g;
    cleanText = cleanText.replace(stickyRegex, (_, color, content) => {
      if (typeof window !== 'undefined' && !window._parsedStickies) window._parsedStickies = [];
      window._parsedStickies.push({ color, text: content.trim() });
      return '';
    });
    const calloutRegex = /\[callout:(\w+)\]([\s\S]*?)\[callout\]/g;
    cleanText = cleanText.replace(calloutRegex, (_, type, content) => {
      if (typeof window !== 'undefined' && !window._parsedCallouts) window._parsedCallouts = [];
      window._parsedCallouts.push({ type, text: content.trim() });
      return '';
    });
    const highlightRegex = /==(.+?)==/g;
    cleanText = cleanText.replace(highlightRegex, (_, text) => {
      if (typeof window !== 'undefined' && !window._highlightRanges) window._highlightRanges = [];
      window._highlightRanges.push(text);
      return text;
    });
    const flashcardRegex = /Q:\s*(.+?)\nA:\s*(.+?)(?=\nQ:|\n*$)/gs;
    let fcMatch;
    while ((fcMatch = flashcardRegex.exec(cleanText)) !== null) {
      flashcards.push({ question: fcMatch[1].trim(), answer: fcMatch[2].trim() });
    }
    cleanText = cleanText.replace(/Q:\s*.+?\nA:\s*.+?\n?/gs, '');
    return { cleanText: cleanText.trim(), flashcards };
  }

  window.TextLayout = { sanitizeText, parseBlocks, getGraphemes, splitRawTextIntoPages, parseStructuredContent, parseRichSyntax };
})();
