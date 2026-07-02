/**
 * collab-integration-smoke.js
 * Simulates two WebSocket clients connecting to server.js,
 * sending concurrent INSERT operations, and verifying
 * that both clients converge to the same document text.
 * 
 * Run AFTER starting: node server.js
 */

const WebSocket = require('ws');

// ── Inline OT from collaborative-engine.js ───────────────────────────────────
function applyOp(text, op) {
  if (op.type === 'INSERT') return text.slice(0, op.position) + op.char + text.slice(op.position);
  if (op.type === 'DELETE') return text.slice(0, op.position) + text.slice(op.position + op.char.length);
  return text;
}

function transformOp(op1, op2) {
  if (op1.type === 'INSERT' && op2.type === 'INSERT') {
    if (op1.position < op2.position) return op1;
    if (op1.position > op2.position) return { ...op1, position: op1.position + op2.char.length };
    return (op1.userId > op2.userId) ? { ...op1, position: op1.position + op2.char.length } : op1;
  }
  if (op1.type === 'INSERT' && op2.type === 'DELETE') {
    if (op1.position <= op2.position) return op1;
    return { ...op1, position: Math.max(op2.position, op1.position - op2.char.length) };
  }
  if (op1.type === 'DELETE' && op2.type === 'INSERT') {
    if (op1.position < op2.position) return op1;
    return { ...op1, position: op1.position + op2.char.length };
  }
  if (op1.type === 'DELETE' && op2.type === 'DELETE') {
    if (op1.position < op2.position) return op1;
    if (op1.position >= op2.position + op2.char.length) return { ...op1, position: op1.position - op2.char.length };
    return { ...op1, position: op2.position };
  }
  return op1;
}

// ── Test harness ──────────────────────────────────────────────────────────────
let passed = 0; let failed = 0;
function assert(label, cond) {
  if (cond) { console.log(`  ✅ PASS: ${label}`); passed++; }
  else       { console.error(`  ❌ FAIL: ${label}`); failed++; }
}

// ── Client state ──────────────────────────────────────────────────────────────
function createClient(label) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:8080');
    const state = { ws, label, text: '', revision: 0, userId: null, color: null, ops: [] };

    ws.on('open', () => console.log(`  [${label}] Connected`));
    ws.on('error', reject);
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw);

      if (msg.type === 'INIT') {
        state.userId = msg.userId;
        state.color = msg.color;
        state.text = msg.text;
        state.revision = msg.revision;
        state.ready = true;
        state.readyCb && state.readyCb();
      }

      if (msg.type === 'ACK') {
        // Server acknowledged our sent op — pop the oldest pending and update revision
        state.revision = msg.revision;
        state.ops.shift();
        state.ackCb && state.ackCb(msg);
      }

      if (msg.type === 'OPERATION') {
        // Remote operation from another user — transform against our pending ops
        let incoming = msg.operation;
        const newPending = [];
        for (const pending of state.ops) {
          newPending.push(transformOp(pending, incoming));
          incoming = transformOp(incoming, pending);
        }
        state.ops = newPending;
        state.text = applyOp(state.text, incoming);
        state.revision = msg.revision;
        state.lastOp = msg.operation;
        state.opCb && state.opCb(msg);
      }
    });

    state.waitReady = () => new Promise(r => {
      if (state.ready) return r();
      state.readyCb = r;
    });

    state.waitOp = () => new Promise(r => { state.opCb = () => { state.opCb = null; r(); }; });
    state.waitAck = () => new Promise(r => { state.ackCb = () => { state.ackCb = null; r(); }; });

    state.send = (op) => {
      state.ops.push(op);
      // Apply locally immediately (sender applies their own op optimistically)
      state.text = applyOp(state.text, op);
      ws.send(JSON.stringify({ type: 'OPERATION', operation: op, revision: state.revision, userId: state.userId }));
    };

    state.close = () => ws.close();

    ws.on('open', () => resolve(state));
  });
}

// ── Main Test ─────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n[Collab Integration Smoke Test]\n');

  console.log('[1] Connecting two clients...');
  const [c1, c2] = await Promise.all([createClient('Tab1'), createClient('Tab2')]);
  await Promise.all([c1.waitReady(), c2.waitReady()]);

  console.log('\n[2] Both clients connected ✓');
  assert('Tab1 has userId', !!c1.userId);
  assert('Tab2 has userId', !!c2.userId);
  assert('User IDs are different', c1.userId !== c2.userId);

  // ── Test: Tab1 inserts "Hello" ───────────────────────────────────────────────
  console.log('\n[3] Tab1 sends INSERT "Hello" at pos 0...');
  const opA = { type: 'INSERT', position: 0, char: 'Hello', userId: c1.userId };
  const opFromTab2 = c2.waitOp();
  c1.send(opA);
  await opFromTab2;

  console.log(`  Tab1 text: "${c1.text}"`);
  console.log(`  Tab2 text: "${c2.text}"`);
  assert('Tab2 received Tab1\'s insert: text is "Hello"', c2.text === 'Hello');

  // ── Test: Tab2 inserts " World" at pos 5 ───────────────────────────────────
  console.log('\n[4] Tab2 sends INSERT " World" at pos 5...');
  const opB = { type: 'INSERT', position: 5, char: ' World', userId: c2.userId };
  const opFromTab1 = c1.waitOp();
  c2.send(opB);
  await opFromTab1;

  console.log(`  Tab1 text: "${c1.text}"`);
  console.log(`  Tab2 text: "${c2.text}"`);
  assert('Tab1 received Tab2\'s insert: text is "Hello World"', c1.text === 'Hello World');
  assert('Tab2 also shows "Hello World"', c2.text === 'Hello World');

  // ── Test: Concurrent inserts (Tab1 and Tab2 both insert at pos 0 simultaneously)
  console.log('\n[5] Concurrent inserts: Tab1 inserts "A" and Tab2 inserts "B" at pos 0...');
  const opC = { type: 'INSERT', position: 0, char: 'A', userId: c1.userId };
  const opD = { type: 'INSERT', position: 0, char: 'B', userId: c2.userId };

  const bothReceive = Promise.all([c1.waitOp(), c2.waitOp()]);
  c1.send(opC);
  c2.send(opD);
  await bothReceive;

  // Wait a tick for the second op to propagate
  await new Promise(r => setTimeout(r, 300));
  if (c1.text !== c2.text) {
    // One more op may be in flight — wait for it
    await Promise.race([c1.waitOp(), new Promise(r => setTimeout(r, 500))]);
    await Promise.race([c2.waitOp(), new Promise(r => setTimeout(r, 500))]);
  }

  console.log(`  Tab1 text: "${c1.text}"`);
  console.log(`  Tab2 text: "${c2.text}"`);
  assert('Both tabs converged to the same text after concurrent inserts', c1.text === c2.text);
  assert('Result contains A, B, Hello, World', c1.text.includes('A') && c1.text.includes('B') && c1.text.includes('Hello') && c1.text.includes('World'));

  // ── Test: DELETE
  console.log('\n[6] Tab1 sends DELETE of first char...');
  const firstChar = c1.text[0];
  const opE = { type: 'DELETE', position: 0, char: firstChar, userId: c1.userId };
  const tab2ReceiveDel = c2.waitOp();
  c1.send(opE);
  await tab2ReceiveDel;
  await new Promise(r => setTimeout(r, 200));

  console.log(`  Tab1 text: "${c1.text}"`);
  console.log(`  Tab2 text: "${c2.text}"`);
  assert('Tab2 received delete op from Tab1', c1.text === c2.text);
  assert(`First char "${firstChar}" was deleted`, !c1.text.startsWith(firstChar));

  // ── Cleanup ──────────────────────────────────────────────────────────────────
  c1.close();
  c2.close();

  console.log('\n─────────────────────────────────');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('✅ All integration smoke tests passed!\n');
    process.exit(0);
  } else {
    console.error(`❌ ${failed} test(s) failed.\n`);
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
