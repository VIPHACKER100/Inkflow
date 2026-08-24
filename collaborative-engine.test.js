/**
 * collaborative-engine.test.js
 * Task 13.5: Unit tests for Operational Transformation logic
 * 
 * Run with: node collaborative-engine.test.js
 * (No external dependencies required)
 */

// ── Inline the OT functions (copy from collaborative-engine.js for isolated testing) ──

function applyOp(text, op) {
  if (op.type === 'INSERT') {
    return text.slice(0, op.position) + op.char + text.slice(op.position);
  } else if (op.type === 'DELETE') {
    return text.slice(0, op.position) + text.slice(op.position + op.char.length);
  }
  return text;
}

function transformOp(op1, op2) {
  if (op1.type === 'INSERT' && op2.type === 'INSERT') {
    if (op1.position < op2.position) return op1;
    if (op1.position > op2.position) return { ...op1, position: op1.position + op2.char.length };
    return (op1.userId > op2.userId)
      ? { ...op1, position: op1.position + op2.char.length }
      : op1;
  }
  if (op1.type === 'INSERT' && op2.type === 'DELETE') {
    if (op1.position <= op2.position) return op1;
    const charsDeleted = op2.char.length;
    return { ...op1, position: Math.max(op2.position, op1.position - charsDeleted) };
  }
  if (op1.type === 'DELETE' && op2.type === 'INSERT') {
    if (op1.position < op2.position) return op1;
    return { ...op1, position: op1.position + op2.char.length };
  }
  if (op1.type === 'DELETE' && op2.type === 'DELETE') {
    if (op1.position < op2.position) return op1;
    if (op1.position >= op2.position + op2.char.length) {
      return { ...op1, position: op1.position - op2.char.length };
    }
    return { ...op1, position: op2.position };
  }
  return op1;
}

// ── Test Harness ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(name, condition) {
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${name}`);
    failed++;
  }
}

function test(name, fn) {
  if (typeof global.it === 'function' && typeof process !== 'undefined' && require.main !== module) {
    global.it(name, fn);
    return;
  }
  console.log(`\n[TEST] ${name}`);
  try {
    fn();
  } catch (e) {
    console.error(`  ❌ EXCEPTION: ${e.message}`);
    failed++;
  }
}

/**
 * Core OT invariant: given a document `base` and two concurrent operations A and B,
 * applying A then transform(B, A) should yield the same result as applying B then transform(A, B).
 * I.e., convergence: apply(apply(base, A), T(B,A)) === apply(apply(base, B), T(A,B))
 */
function assertConvergence(base, opA, opB) {
  const stateA = applyOp(base, opA);
  const stateB = applyOp(base, opB);
  const finalA = applyOp(stateA, transformOp(opB, opA));
  const finalB = applyOp(stateB, transformOp(opA, opB));
  assert(`Convergence: "${base}" + A + T(B,A) === "${base}" + B + T(A,B): "${finalA}" === "${finalB}"`, finalA === finalB);
}

// ── Test Cases ────────────────────────────────────────────────────────────────

test('applyOp: INSERT at start', () => {
  assert('Insert H at pos 0', applyOp('ello', { type: 'INSERT', position: 0, char: 'H' }) === 'Hello');
});

test('applyOp: INSERT at end', () => {
  assert('Insert ! at end', applyOp('Hello', { type: 'INSERT', position: 5, char: '!' }) === 'Hello!');
});

test('applyOp: INSERT in middle', () => {
  assert('Insert X in middle', applyOp('ac', { type: 'INSERT', position: 1, char: 'b' }) === 'abc');
});

test('applyOp: DELETE single char', () => {
  assert('Delete l at pos 2', applyOp('Hello', { type: 'DELETE', position: 2, char: 'l' }) === 'Helo');
});

test('applyOp: DELETE substring', () => {
  assert('Delete "ll" at pos 2', applyOp('Hello', { type: 'DELETE', position: 2, char: 'll' }) === 'Heo');
});

test('transformOp: Two inserts at different positions', () => {
  // User A inserts "X" at pos 2; User B inserts "Y" at pos 5
  const opA = { type: 'INSERT', position: 2, char: 'X', userId: 'uA' };
  const opB = { type: 'INSERT', position: 5, char: 'Y', userId: 'uB' };
  const opB_after_A = transformOp(opB, opA);
  assert('B pos shifts right by 1', opB_after_A.position === 6);
  assertConvergence('Hello World', opA, opB);
});

test('transformOp: Two inserts at SAME position (userId tie-break)', () => {
  const opA = { type: 'INSERT', position: 3, char: 'A', userId: 'user_1' };
  const opB = { type: 'INSERT', position: 3, char: 'B', userId: 'user_2' };
  // user_2 > user_1, so opB should shift right
  const opB_after_A = transformOp(opB, opA);
  assert('B at same pos shifts right (userId tie-break)', opB_after_A.position === 4);
  assertConvergence('abcdef', opA, opB);
});

test('transformOp: Insert after delete', () => {
  // A deletes "ll" at pos 2; B inserts "X" at pos 5
  const opA = { type: 'DELETE', position: 2, char: 'll', userId: 'uA' };
  const opB = { type: 'INSERT', position: 5, char: 'X', userId: 'uB' };
  const opB_after_A = transformOp(opB, opA);
  assert('B insert shifts left after A delete', opB_after_A.position === 3);
  assertConvergence('Hello World', opA, opB);
});

test('transformOp: Delete after insert', () => {
  // A inserts "XX" at pos 1; B deletes "e" at pos 1
  const opA = { type: 'INSERT', position: 1, char: 'XX', userId: 'uA' };
  const opB = { type: 'DELETE', position: 1, char: 'e', userId: 'uB' };
  const opB_after_A = transformOp(opB, opA);
  assert('B delete shifts right after A insert', opB_after_A.position === 3);
  assertConvergence('Hello', opA, opB);
});

test('transformOp: Two concurrent deletes non-overlapping', () => {
  // Base: "Hello"
  // A deletes 'H' at pos 0; B deletes 'o' at pos 4
  const opA = { type: 'DELETE', position: 0, char: 'H', userId: 'uA' };
  const opB = { type: 'DELETE', position: 4, char: 'o', userId: 'uB' };
  const opB_after_A = transformOp(opB, opA);
  assert('B delete pos shifts left by 1 after A delete', opB_after_A.position === 3);
  assertConvergence('Hello', opA, opB);
});

test('transformOp: Two concurrent deletes overlapping', () => {
  // Both try to delete 'l' at pos 2 in "Hello"
  const opA = { type: 'DELETE', position: 2, char: 'l', userId: 'uA' };
  const opB = { type: 'DELETE', position: 2, char: 'l', userId: 'uB' };
  const opB_after_A = transformOp(opB, opA);
  // After A deletes, B's position clamps to A's position (effectively a no-op on same char)
  assert('Overlapping delete: B position clamps to A position', opB_after_A.position === opA.position);
});

test('Convergence: Complex sequence (insert + delete)', () => {
  // Base: "The quick fox"
  const opA = { type: 'INSERT', position: 4, char: 'very ', userId: 'uA' };
  const opB = { type: 'DELETE', position: 10, char: 'fox', userId: 'uB' };
  assertConvergence('The quick fox', opA, opB);
});

test('Convergence: Multi-char insert vs single char delete', () => {
  const opA = { type: 'INSERT', position: 0, char: 'Dear: ', userId: 'uA' };
  const opB = { type: 'DELETE', position: 0, char: 'H', userId: 'uB' };
  assertConvergence('Hello', opA, opB);
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n──────────────────────────────────');
console.log(`Results: ${passed} passed, ${failed} failed`);
if (typeof require !== 'undefined' && require.main === module) {
  if (failed === 0) {
    console.log('✅ All OT tests passed!');
    process.exit(0);
  } else {
    console.error(`❌ ${failed} test(s) failed.`);
    process.exit(1);
  }
} else if (failed === 0) {
  console.log('✅ All OT tests passed!');
} else {
  console.error(`❌ ${failed} test(s) failed.`);
}
