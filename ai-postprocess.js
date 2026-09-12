/**
 * AI Post-Processing Module — pure text transforms applied to every AI result
 * before it reaches the textarea or the renderer.
 * Functions: sanitizeAiResponse, trigramSimilarity, resequenceQA, smartArrangeLocal
 * Parity with upstream Inkflow v1.6.23 (docs/feature-gap-analysis.md items A5–A7).
 * No DOM dependencies. Loads before ai-assistant.js.
 */
(function () {
  'use strict';

  /**
   * Strips markdown leakage from AI responses (code fences, inline backticks,
   * bold/italic markers, raw HTML) while preserving Inkflow's own syntax
   * (==highlights==, [sticky:…]/[callout:…], # headings, Q:/A: pairs) and the
   * ```diagram / ```mermaid fences that the renderer parses.
   */
  function sanitizeAiResponse(input) {
    let text = String(input || '');
    if (!text) return '';

    // 1. Protect diagram/mermaid fences from all later passes.
    const fencedBlocks = [];
    text = text.replace(/```(?:diagram|mermaid)\n?[\s\S]*?```/g, (m) => {
      fencedBlocks.push(m);
      return '\uFFF2' + (fencedBlocks.length - 1) + '\uFFF3';
    });

    // 2. Generic code fences: keep body content, drop the fence markers.
    text = text.replace(/```[^\n]*\n?([\s\S]*?)```\n?/g, (m, body) => body);
    text = text.replace(/```[^\n]*\n?/g, '');

    // 3. Inline code spans: `term` → term
    text = text.replace(/`([^`\n]+)`/g, '$1');

    // 4. Bold / italic markers (bold first, then bounded italic so bullets
    //    like "* item" and snake_case identifiers survive untouched).
    text = text.replace(/\*\*([^*\n]+)\*\*/g, '$1');
    text = text.replace(/__([^_\n]+)__/g, '$1');
    text = text.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, '$1$2');
    text = text.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,;:!?]|$)/g, '$1$2');

    // 5. Raw HTML: <br> variants become newlines, other tags are removed.
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/?[a-zA-Z][^>]*>/g, '');

    // 6. Restore the protected blocks.
    text = text.replace(/\uFFF2(\d+)\uFFF3/g, (m, i) => fencedBlocks[+i] || '');

    return text.trim();
  }

  /** Trigram Jaccard similarity of two strings (0–1). */
  function trigramSimilarity(a, b) {
    const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const A = norm(a);
    const B = norm(b);
    if (!A || !B) return 0;
    if (A === B) return 1;
    const grams = (s) => {
      const set = new Set();
      for (let i = 0; i < s.length - 2; i++) set.add(s.slice(i, i + 3));
      return set;
    };
    const ga = grams(A);
    const gb = grams(B);
    if (ga.size === 0 || gb.size === 0) return 0;
    let inter = 0;
    for (const g of ga) if (gb.has(g)) inter++;
    return inter / (ga.size + gb.size - inter);
  }

  /**
   * Renumbers every Q:/A: pair sequentially from Q1 (ignoring the model's own
   * numbering) and drops near-duplicate questions (trigram Jaccard ≥ 0.72)
   * together with their paired answer. Non-Q/A lines pass through unchanged;
   * orphan answers (no pending question) are dropped.
   */
  function resequenceQA(input) {
    const lines = String(input || '').split('\n');
    const out = [];
    const accepted = [];
    let pendingQ = null;
    let seq = 0;

    const qRe = /^\s*Q\s*(\d*)\s*[:.]\s*(.+)$/i;
    const aRe = /^\s*A\s*(\d*)\s*[:.]\s*(.+)$/i;

    const isDuplicate = (q) => accepted.some((prev) => trigramSimilarity(prev, q) >= 0.72);

    const emitPending = () => {
      if (!pendingQ) return;
      seq += 1;
      out.push('Q' + seq + ': ' + pendingQ);
      accepted.push(pendingQ);
      pendingQ = null;
    };

    for (const raw of lines) {
      const qm = raw.match(qRe);
      const am = raw.match(aRe);
      if (qm) {
        emitPending();
        const q = qm[2].trim();
        if (!isDuplicate(q)) pendingQ = q;
        continue;
      }
      if (am) {
        if (pendingQ) {
          seq += 1;
          out.push('Q' + seq + ': ' + pendingQ);
          out.push('A' + seq + ': ' + am[2].trim());
          accepted.push(pendingQ);
          pendingQ = null;
        }
        continue;
      }
      emitPending();
      out.push(raw);
    }
    emitPending();
    return out.join('\n');
  }

  /**
   * Deterministic offline tidy-up used by Smart Arrange (no API key required).
   * Normalizes bullets, headers, study tags, highlights, Q/A labels and
   * punctuation spacing; collapses blank-line runs; inserts structural breaks.
   * Returns { text, fixes }.
   */
  function smartArrangeLocal(input) {
    let fixes = 0;
    const text = String(input || '');
    if (!text.trim()) return { text: text, fixes: 0 };

    const lines = text.split('\n');
    const out = [];
    let prevBlank = true;

    for (let raw of lines) {
      let line = raw.replace(/\s+$/, '');
      if (line !== raw) fixes++;
      const leading = (line.match(/^\s*/) || [''])[0];
      const content = line.slice(leading.length);

      if (!content) {
        out.push('');
        prevBlank = true;
        continue;
      }

      // Bullet markers → "- " (indentation preserved; **bold** not touched)
      const bm = content.match(/^([*‣•+⁃◦▪▫–—])(\s+)(.*)$/);
      if (bm) {
        line = leading + '- ' + bm[3];
        fixes++;
      }

      // Headers: #Title → # Title, ##   Heading → ## Heading
      const hm = line.match(/^(\s*)(#{1,6})(\s*)(.+)$/);
      if (hm) {
        const normalized = hm[1] + hm[2] + ' ' + hm[4].trim();
        if (normalized !== line) {
          line = normalized;
          fixes++;
        }
      }

      // Study tags: [sticky : yellow] → [sticky:yellow], [sticky ] → [sticky]
      const tagBefore = line;
      line = line.replace(/\[\s*(sticky|callout)\s*:\s*([^\]]*?)\s*\]/gi, '[$1:$2]');
      line = line.replace(/\[\s*(sticky|callout)\s*\]/gi, '[$1]');
      if (line !== tagBefore) fixes++;

      // Highlight spacing: == key == → ==key==
      const hlBefore = line;
      line = line.replace(/==\s+([^=]+?)\s+==/g, '==$1==');
      if (line !== hlBefore) fixes++;

      // Q/A labels: "q 1 :" → "Q1:", "ans 1:" → "A1:", "question:" → "Q:"
      const qaBefore = line;
      line = line.replace(/^(\s*)(?:q(?:uestion)?)\s*(\d*)\s*[:.]\s*/i, (m, ind, num) => ind + 'Q' + num + ': ');
      line = line.replace(/^(\s*)(?:a(?:ns(?:wer)?)?)\s*(\d*)\s*[:.]\s*/i, (m, ind, num) => ind + 'A' + num + ': ');
      if (line !== qaBefore) fixes++;

      // Punctuation spacing (fill-in lines with underscores are left alone)
      if (!line.includes('___')) {
        const pBefore = line;
        line = line.replace(/\s+([,.;:!?])/g, '$1');
        line = line.replace(/([,;!?])(?=[A-Za-z])/g, '$1 ');
        if (line !== pBefore) fixes++;

        // Collapse internal double spaces, preserving leading indentation
        const ind = (line.match(/^\s*/) || [''])[0];
        const body = line.slice(ind.length);
        const collapsed = body.replace(/ {2,}/g, ' ');
        if (collapsed !== body) {
          line = ind + collapsed;
          fixes++;
        }
      }

      // Structural break before headers and questions
      const isHeader = /^#{1,6}\s/.test(line) || /^#{1,6}$/.test(line.trim());
      const isQuestion =
        /^\s*Q\d*\s*:\s/.test(line) || /^\s*\d+[.)]\s.*\?\s*$/.test(line);
      if ((isHeader || isQuestion) && !prevBlank && out.length > 0) {
        out.push('');
        fixes++;
      }

      out.push(line);
      prevBlank = false;
    }

    let result = out.join('\n');
    const beforeCollapse = result;
    result = result.replace(/\n{4,}/g, '\n\n'); // 3+ blank lines → 1
    if (result !== beforeCollapse) fixes++;
    result = result.replace(/\n+$/, '') + '\n'; // single trailing newline

    return { text: result, fixes: fixes };
  }

  if (typeof window !== 'undefined') {
    window.AIPostProcess = { sanitizeAiResponse, trigramSimilarity, resequenceQA, smartArrangeLocal };
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { sanitizeAiResponse, trigramSimilarity, resequenceQA, smartArrangeLocal };
  }
})();
