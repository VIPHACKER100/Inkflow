/**
 * Cursive Connector Tests
 * Tests for connection rendering, ligature detection, and exit/entry points.
 */

const { CursiveConnector } = require('./cursive-connector.js');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.log(`  ✗ FAIL: ${message}`);
  }
}

const cc = new CursiveConnector();

// ── shouldRenderConnection ───────────────────────────────
console.log('\n--- shouldRenderConnection ---');

assert(cc.shouldRenderConnection('a', 'b', false) === true, 'Lowercase Latin connects');
assert(cc.shouldRenderConnection('z', 'a', false) === true, 'z→a connects');
assert(cc.shouldRenderConnection('A', 'b', false) === false, 'Uppercase first char blocked');
assert(cc.shouldRenderConnection('a', 'B', false) === false, 'Uppercase second char blocked');
assert(cc.shouldRenderConnection('a', ' ', false) === false, 'Space blocked');
assert(cc.shouldRenderConnection('a', '.', false) === false, 'Punctuation blocked');
assert(cc.shouldRenderConnection('a', 'b', true) === false, 'Indic script blocked');
assert(cc.shouldRenderConnection(null, 'b', false) === false, 'Null char1 blocked');
assert(cc.shouldRenderConnection('a', null, false) === false, 'Null char2 blocked');

// ── getExitPoint / getEntryPoint ─────────────────────────
console.log('\n--- getExitPoint / getEntryPoint ---');

const exitA = cc.getExitPoint('a', 15, 22);
assert(typeof exitA.x === 'number' && typeof exitA.y === 'number', 'Returns {x, y} object');
assert(exitA.x > 0 && exitA.x <= 15, 'Exit x is within char width');
assert(exitA.y >= 0 && exitA.y < 2, 'Exit y is near baseline (small offset)');

const entryA = cc.getEntryPoint('a', 15, 22);
assert(entryA.x > 0 && entryA.x <= 15, 'Entry x is within char width');
assert(entryA.y >= 0 && entryA.y < 2, 'Entry y is near baseline');

// Exit x should be to the right of entry x
assert(exitA.x > entryA.x, 'Exit is to the right of entry');

// Null char returns defaults
const exitNull = cc.getExitPoint(null, 15, 22);
assert(exitNull.x === 15 * 0.8, 'Null exit x defaults to 80% of width');
assert(exitNull.y < 2, 'Null exit y is near baseline');

// ── isLigaturePair ───────────────────────────────────────
console.log('\n--- isLigaturePair ---');

assert(cc.isLigaturePair('t', 'h') === true, 'th is ligature');
assert(cc.isLigaturePair('c', 'h') === true, 'ch is ligature');
assert(cc.isLigaturePair('s', 'h') === true, 'sh is ligature');
assert(cc.isLigaturePair('a', 'b') === false, 'ab is not ligature');

// ── getLigatureGlyphPath ─────────────────────────────────
console.log('\n--- getLigatureGlyphPath ---');

const thPath = cc.getLigatureGlyphPath('t', 'h');
assert(typeof thPath === 'string', 'Returns SVG path string');
assert(thPath.startsWith('M'), 'Path starts with M (moveTo)');

const noPath = cc.getLigatureGlyphPath('x', 'z');
assert(noPath === null, 'Non-ligature returns null');

// ── renderConnectionStroke (smoke test) ──────────────────
console.log('\n--- renderConnectionStroke ---');

// Mock canvas context
const mockCtx = {
  save: () => {},
  restore: () => {},
  beginPath: () => {},
  moveTo: () => {},
  quadraticCurveTo: () => {},
  stroke: () => {},
  translate: () => {},
  scale: () => {},
  set strokeStyle(v) {},
  set lineWidth(v) {},
  set lineCap(v) {},
  set lineJoin(v) {},
  set globalAlpha(v) {},
  set font(v) {}
};

// Should not throw
try {
  cc.renderConnectionStroke(
    mockCtx,
    { x: 100, y: 200 },
    { x: 12, y: 0.44 },
    { x: 130, y: 200 },
    { x: 3, y: 0.44 },
    '#000', 1.0, 22
  );
  assert(true, 'Does not throw on valid input');
} catch (e) {
  assert(false, 'Threw on valid input: ' + e.message);
}

// Null ctx should not throw
try {
  cc.renderConnectionStroke(null, {}, {}, {}, {}, '#000', 1, 22);
  assert(true, 'Null ctx does not throw');
} catch (e) {
  assert(false, 'Threw on null ctx');
}

// ── renderLigatureGlyph (smoke test) ─────────────────────
console.log('\n--- renderLigatureGlyph ---');

try {
  cc.renderLigatureGlyph(mockCtx, 100, 200, 't', 'h', '#000', 22, 1.0);
  assert(true, 'Does not throw on valid ligature');
} catch (e) {
  assert(false, 'Threw: ' + e.message);
}

// ── Summary ──────────────────────────────────────────────
console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(50)}\n`);

if (typeof process !== 'undefined' && process.exit && typeof vitest === 'undefined') {
  process.exit(failed > 0 ? 1 : 0);
}
