/* Smoke tests for Inkflow's regression-prone pure logic:
 *   1. layoutText() pagination — word wrap, page breaks, text reconstruction
 *   2. Editor sync round-trip — [sticky]/[callout] markers must survive the
 *      page-editor → global-text sync (regressed in v1.6.19 and v1.6.21)
 *
 * Runs in Node with no dependencies: index.js is evaluated in a `vm` sandbox
 * with minimal DOM/canvas stubs. The single `initApp();` bootstrap call at the
 * end of the file is stripped, so no rendering or UI wiring executes.
 * Run via `npm test`.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ── DOM / browser stubs ──────────────────────────────────────── */

const ctxStub = {
  font: '',
  measureText(str) {
    // Deterministic fake metrics: 0.6 × fontSize per character. Good enough
    // to exercise wrap/pagination math — we assert structure, not pixel truth.
    const m = /(\d+(?:\.\d+)?)px/.exec(this.font);
    const size = m ? parseFloat(m[1]) : 22;
    return { width: str.length * size * 0.6 };
  },
};

function makeElement(id = '') {
  const el = {
    id,
    style: {},
    dataset: {},
    value: '',
    innerText: '',
    innerHTML: '',
    textContent: '',
    title: '',
    checked: false,
    disabled: false,
    width: 0,
    height: 0,
    children: [],
    classList: {
      _set: new Set(),
      add(...c) { c.forEach((x) => this._set.add(x)); },
      remove(...c) { c.forEach((x) => this._set.delete(x)); },
      toggle(c, force) {
        const on = force === undefined ? !this._set.has(c) : force;
        if (on) this._set.add(c); else this._set.delete(c);
        return on;
      },
      contains(c) { return this._set.has(c); },
    },
    addEventListener() {},
    removeEventListener() {},
    appendChild(child) { this.children.push(child); },
    removeChild() {},
    remove() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    focus() {},
    blur() {},
    click() {},
    getContext() { return ctxStub; },
  };
  return el;
}

const elements = new Map();
let pageEditors = [];

const documentStub = {
  body: makeElement('body'),
  documentElement: makeElement('html'),
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, makeElement(id));
    return elements.get(id);
  },
  createElement(tag) { return makeElement(tag); },
  createTextNode(text) { return { text }; },
  querySelector() { return null; },
  querySelectorAll(sel) {
    return sel === '.page-editor' ? pageEditors : [];
  },
  addEventListener() {},
  removeEventListener() {},
};

const localStorageStub = (() => {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
})();

/* ── Load index.js into a sandbox ─────────────────────────────── */

let source = readFileSync(join(root, 'index.js'), 'utf8');

// Skip the app bootstrap (UI wiring + first render) — everything it needs
// beyond these stubs is out of scope for pure-logic smoke tests.
if (!source.includes('\ninitApp();')) {
  throw new Error('initApp() bootstrap call not found — index.js changed shape?');
}
source = source.replace('\ninitApp();', '\n');

// Export bridge: `const`/`let` top-level bindings (S, parsedStickies, …) are
// context-scoped and invisible from outside; this snippet runs in the same
// scope so it can hand the tested symbols to the harness.
source += `
;globalThis.__inkflow = {
  S,
  layoutText,
  parseRichSyntax,
  getGlobalTextFromEditors,
  sanitizeText,
  hashString,
  createPRNG,
  getCharVariation,
  sanitizeAiResponse,
  resequenceQA,
  smartArrangeLocal,
  PAGE_W,
  PAGE_H,
  assignState: (patch) => Object.assign(S, patch),
  setFocusState: (t) => { S.text = t; },
};
`;

const sandbox = {
  console,
  Math,
  Date,
  JSON,
  Intl,
  URL,
  Blob: class {},
  FileReader: class {},
  performance,
  setTimeout: () => 0,
  clearTimeout: () => {},
  setInterval: () => 0,
  clearInterval: () => {},
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: () => {},
  fetch: () => Promise.reject(new Error('network disabled in smoke tests')),
  localStorage: localStorageStub,
  document: documentStub,
  navigator: { onLine: true, clipboard: {}, maxTouchPoints: 0, userAgent: 'node-smoke' },
  location: { href: 'http://localhost/index.html', hostname: 'localhost' },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
  addEventListener() {},
  removeEventListener() {},
};
sandbox.window = sandbox;
sandbox.self = sandbox;
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'index.js' });

const {
  S, layoutText, parseRichSyntax, getGlobalTextFromEditors,
  sanitizeText, hashString, createPRNG, getCharVariation,
  sanitizeAiResponse, resequenceQA, smartArrangeLocal,
  PAGE_W, PAGE_H, assignState,
} = sandbox.__inkflow;

/* ── Harness ──────────────────────────────────────────────────── */

let passed = 0;
const failures = [];
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures.push({ name, err });
    console.error(`  ✗ ${name}\n    ${err.message}`);
  }
}

console.log('\nInkflow smoke tests\n');

/* ── 1. layoutText pagination ─────────────────────────────────── */

console.log('layoutText() pagination');

assignState({ noteLayout: 'standard', paperStyle: 'ruled', font: 'Caveat' });

test('empty text yields a single empty page', () => {
  const r = layoutText('');
  assert.equal(r.pageCount, 1);
  assert.equal(r.queue.length, 0);
  // The early-return path reports one page but no page text entries —
  // pinned here so an accidental change to that contract is caught.
  assert.equal(r.pageTexts.length, 0);
});

test('short text stays on one page', () => {
  const r = layoutText('Hello handwritten world.');
  assert.equal(r.pageCount, 1);
  assert.equal(r.pageTexts.length, 1);
  assert.ok(r.queue.length > 0, 'queue should hold one item per character');
  assert.equal(r.pageTexts[0], 'Hello handwritten world.');
});

test('long text paginates without losing characters', () => {
  const words = Array.from({ length: 5000 }, (_, i) => `w${i}`);
  const text = words.join(' ');
  const r = layoutText(text);

  assert.ok(r.pageCount > 1, `expected multiple pages, got ${r.pageCount}`);
  assert.equal(r.pageTexts.length, r.pageCount, 'pageTexts must match pageCount');

  // Every non-space character must land in the render queue exactly once.
  const nonSpace = text.replace(/ /g, '').length;
  assert.equal(r.queue.length, nonSpace,
    `queue had ${r.queue.length} items, text has ${nonSpace} non-space chars`);

  // pageTexts join back to the exact input (wraps add no separator characters).
  assert.equal(r.pageTexts.join(''), text, 'page texts must reconstruct the input');
});

test('explicit newlines are preserved across page breaks', () => {
  const paragraph = (n) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');
  const text = `${paragraph(300)}\n\n${paragraph(300)}\n\n${paragraph(300)}`;
  const r = layoutText(text);

  assert.ok(r.pageCount > 1, 'expected the multi-paragraph text to paginate');
  assert.equal(r.pageTexts.join(''), text, 'newlines must survive pagination');
});

test('every rendered character stays inside the page bounds', () => {
  const text = Array.from({ length: 1000 }, (_, i) => `w${i}`).join(' ');
  const r = layoutText(text);
  for (const item of r.queue) {
    assert.ok(item.x >= 0 && item.x <= PAGE_W,
      `char "${item.ch}" x=${item.x} outside page width ${PAGE_W}`);
    assert.ok(item.y >= 0 && item.y <= PAGE_H,
      `char "${item.ch}" y=${item.y} outside page height ${PAGE_H}`);
    assert.ok(Number.isInteger(item.pageIdx) && item.pageIdx >= 0 && item.pageIdx < r.pageCount,
      `char "${item.ch}" has invalid pageIdx ${item.pageIdx}`);
  }
});

test('new pages skip the first ruled line', () => {
  const lineH = S.fontSize * S.lineHeight;
  const firstLineY = S.margin + lineH * 2;
  const text = Array.from({ length: 5000 }, (_, i) => `w${i}`).join(' ');
  const r = layoutText(text);
  const minY = Math.min(...r.queue.map((q) => q.y));
  assert.ok(minY >= firstLineY - S.fontSize,
    `lowest y=${minY} implies page break did not skip the first line (expected >= ${firstLineY - S.fontSize})`);
});

/* ── 2. Editor sync round-trip (v1.6.19 / v1.6.21 regressions) ── */

console.log('editor sync round-trip');

test('[sticky]/[callout] markers survive editor sync', () => {
  const src = 'Intro line\n[sticky:yellow] Remember this [sticky]\nMid line\n[callout:warning] Be careful [callout]\nOutro line';
  const { cleanText } = parseRichSyntax(src);

  // The parse must have consumed both markers into placeholder chars.
  assert.ok(cleanText.includes('\uFFF0'), 'sticky marker should become a placeholder');
  assert.ok(cleanText.includes('\uFFF1'), 'callout marker should become a placeholder');

  // Simulate the page editors showing the rendered page (placeholders as-is).
  pageEditors = [{ innerText: 'Intro line\n\uFFF0\nMid line\n\uFFF1\nOutro line\n' }];

  const synced = getGlobalTextFromEditors();

  // The v1.6.21 regression: placeholders were written back verbatim,
  // permanently consuming the marker syntax from the source text.
  assert.ok(!synced.includes('\uFFF0') && !synced.includes('\uFFF1'),
    'synced text must not leak placeholder characters');
  assert.equal(synced,
    'Intro line\n[sticky:yellow] Remember this [sticky]\nMid line\n[callout:warning] Be careful [callout]\nOutro line',
    'marker syntax must be re-materialized in document order');
});

test('editor trailing newline is dropped, live edits are honored', () => {
  // v1.6.19 regression: sync read the canvas dataset snapshot instead of the
  // live editor text, discarding in-flight edits and mutating newlines.
  pageEditors = [{ innerText: 'freshly typed text\n' }];
  assert.equal(getGlobalTextFromEditors(), 'freshly typed text');
});

test('placeholder order maps sequentially across multiple stickies', () => {
  parseRichSyntax('[sticky:pink] First [sticky] and [sticky:cyan] Second [sticky]');
  pageEditors = [{ innerText: '\uFFF0 between \uFFF0' }];
  const synced = getGlobalTextFromEditors();
  assert.equal(synced, '[sticky:pink] First [sticky] between [sticky:cyan] Second [sticky]');
});

test('placeholder without parse state is passed through untouched', () => {
  parseRichSyntax('clean text, no markers');
  pageEditors = [{ innerText: 'stray \uFFF0 here' }];
  assert.equal(getGlobalTextFromEditors(), 'stray \uFFF0 here');
});

test('multi-page editors join with a newline separator', () => {
  parseRichSyntax('irrelevant');
  pageEditors = [{ innerText: 'page one tail' }, { innerText: 'page two head\n' }];
  assert.equal(getGlobalTextFromEditors(), 'page one tail\npage two head');
});

/* ── 4. Seeded PRNG & Realism Jitter Engine ────────────────────── */

console.log('Seeded PRNG & Realism Engine');

test('mulberry32 PRNG produces 100% deterministic sequence', () => {
  const seed = hashString('Inkflow handwritten sample note text 123');
  const prng1 = createPRNG(seed);
  const prng2 = createPRNG(seed);
  const seq1 = Array.from({ length: 10 }, () => prng1());
  const seq2 = Array.from({ length: 10 }, () => prng2());
  assert.deepEqual(seq1, seq2, 'identical seeds must produce identical random float sequences');
});

test('layoutText produces identical character queue positions across re-renders', () => {
  assignState({ realism: 0.5, rareImperfections: true });
  const text = 'Deterministic handwriting layout test string with Indic: नमस्ते';
  const r1 = layoutText(text);
  const r2 = layoutText(text);
  assert.equal(r1.queue.length, r2.queue.length);
  for (let i = 0; i < r1.queue.length; i++) {
    assert.equal(r1.queue[i].x, r2.queue[i].x, `char ${i} x coordinate mismatch`);
    assert.equal(r1.queue[i].y, r2.queue[i].y, `char ${i} y coordinate mismatch`);
    assert.equal(r1.queue[i].v.tiltDeg, r2.queue[i].v.tiltDeg, `char ${i} tiltDeg mismatch`);
  }
});

test('Devanagari script reduces rotation jitter magnitude to preserve legibility', () => {
  const prngA = createPRNG(12345);
  const prngB = createPRNG(12345);
  const latinVar = getCharVariation(1, 0.12, 22, prngA, false);
  const indicVar = getCharVariation(1, 0.12, 22, prngB, true);
  assert.ok(Math.abs(indicVar.tiltDeg) <= Math.abs(latinVar.tiltDeg) + 1e-6,
    'Indic rotation jitter must be scaled down relative to Latin jitter');
});

/* ── 5. AI Response Sanitizer & Q&A Resequencer ─────────────── */

console.log('AI sanitizer & Q\u0026A resequencer');

test('sanitizeAiResponse strips triple-backtick code fences but keeps body', () => {
  const raw = 'Notes:\n```python\ndef hello():\n    print("hi")\n```\nDone.';
  const out = sanitizeAiResponse(raw);
  assert.ok(!out.includes('```'), 'backtick fences must be removed');
  assert.ok(out.includes('def hello'), 'code body must be preserved');
  assert.ok(out.includes('Done.'), 'surrounding text must be preserved');
});

test('sanitizeAiResponse strips inline backtick spans', () => {
  const raw = 'Use the `print()` function and `input()` together.';
  const out = sanitizeAiResponse(raw);
  assert.ok(!out.includes('`'), 'no backticks should remain');
  assert.equal(out, 'Use the print() function and input() together.');
});

test('sanitizeAiResponse strips bold and italic markers but preserves Inkflow ==highlights==', () => {
  const raw = '**Bold term** and _italic_ and ==highlighted== and __also bold__.';
  const out = sanitizeAiResponse(raw);
  assert.ok(!out.includes('**'), 'bold ** should be stripped');
  assert.ok(!out.includes('__'), 'bold __ should be stripped');
  assert.ok(out.includes('==highlighted=='), '==highlights== must be preserved');
  assert.ok(out.includes('Bold term'), 'bold content must survive stripping');
});

test('sanitizeAiResponse strips inline HTML tags', () => {
  const raw = 'Hello <strong>world</strong> and <br> newline.';
  const out = sanitizeAiResponse(raw);
  assert.ok(!out.includes('<strong>') && !out.includes('</strong>'), 'HTML tags must be removed');
  assert.ok(out.includes('world'), 'tag contents must survive');
});

test('resequenceQA renumbers Q: pairs with local counter ignoring model numbers', () => {
  const input = 'Q3: What is photosynthesis?\nA: Process by which plants make food.\nQ7: What is osmosis?\nA: Movement of water across membranes.';
  const out = resequenceQA(input);
  assert.ok(out.includes('Q1: What is photosynthesis?'), 'first Q must become Q1');
  assert.ok(out.includes('Q2: What is osmosis?'), 'second Q must become Q2');
  assert.ok(!out.includes('Q3:') && !out.includes('Q7:'), 'original model numbers must be gone');
});

test('resequenceQA deduplicates near-identical questions', () => {
  const dup1 = 'Q1: What is the process of photosynthesis in plants?';
  const dup2 = 'Q2: What is the process of photosynthesis in plants?'; // exact duplicate
  const unique = 'Q3: Describe osmosis in detail.';
  const input = [dup1, 'A: Answer one.', dup2, 'A: Answer two.', unique, 'A: Answer three.'].join('\n');
  const out = resequenceQA(input);
  const qLines = out.split('\n').filter(l => l.startsWith('Q'));
  assert.equal(qLines.length, 2, 'duplicate question must be deduplicated');
  assert.ok(out.includes('Q1:'), 'first unique Q retained as Q1');
  assert.ok(out.includes('Q2: Describe osmosis'), 'second unique Q renumbered as Q2');
});

/* ── 6. Smart Arrange Offline Tidy-up ─────────────────────────── */

console.log('\nSmart Arrange offline tidy-up');

test('smartArrangeLocal normalizes headers, bullets, tags, and Q&A formatting', () => {
  const input = '#Title\n* bullet point 1\n[sticky : yellow] note [sticky]\nq 1 : What is cell division?\na : It is mitosis.\nword ,next word .';
  const res = smartArrangeLocal(input);
  assert.ok(res.fixes > 0, 'must report non-zero fixes');
  assert.ok(res.text.includes('# Title'), 'header must have space');
  assert.ok(res.text.includes('- Bullet point 1'), 'bullet must be normalized and capitalized');
  assert.ok(res.text.includes('[sticky:yellow]'), 'tag must be normalized');
  assert.ok(res.text.includes('Q1: What is cell division?'), 'Q1: must be normalized');
  assert.ok(res.text.includes('A: It is mitosis.'), 'A: must be normalized');
  assert.ok(res.text.includes('word, next word.'), 'punctuation spacing must be fixed');
});

test('smartArrangeLocal preserves indentation and handles expanded bullet/Q&A/header variants', () => {
  const input = '##   Multi Space Header\n    + plus bullet\n    indented  code  line\nquestion 1: What is DNA?\nans 1: Deoxyribonucleic acid.';
  const res = smartArrangeLocal(input);
  assert.ok(res.fixes > 0, 'must report non-zero fixes');
  assert.ok(res.text.includes('## Multi Space Header'), 'header multi-space normalized');
  assert.ok(res.text.includes('    - Plus bullet'), 'plus bullet normalized with indent');
  assert.ok(res.text.includes('    indented code line'), 'leading indentation preserved while internal spaces collapsed');
  assert.ok(res.text.includes('Q1: What is DNA?'), 'question 1 normalized to Q1');
  assert.ok(res.text.includes('A1: Deoxyribonucleic acid.'), 'ans 1 normalized to A1');
});

/* ── Summary ──────────────────────────────────────────────────── */

console.log(`\n${passed} passed, ${failures.length} failed\n`);
process.exit(failures.length ? 1 : 0);
