/**
 * Diagram Engine Tests
 * Tests for layout algorithms and diagram parsing.
 */

const { layoutCycle, layoutFlowchart, layoutHierarchy, parseDiagramJSON, positionDiagramNodes } = require('./diagram-engine.js');

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

function assertApprox(a, b, tolerance, message) {
  assert(Math.abs(a - b) < tolerance, `${message} (${a} ≈ ${b})`);
}

// ── layoutCycle ──────────────────────────────────────────
console.log('\n--- layoutCycle ---');

const cycleNodes = [
  { id: 'a', label: 'A' },
  { id: 'b', label: 'B' },
  { id: 'c', label: 'C' },
  { id: 'd', label: 'D' }
];
const cycleResult = layoutCycle(cycleNodes, 100, { x: 200, y: 200 });

assert(cycleResult.length === 4, 'Returns all nodes');
assert(cycleResult[0].shape === 'circle', 'Default shape is circle');
assertApprox(cycleResult[0].x, 200, 1, 'First node x ≈ center (top)');
assertApprox(cycleResult[0].y, 100, 1, 'First node y ≈ center-radius (top)');
assert(cycleResult[0].label === 'A', 'Preserves label');

// Nodes should be evenly spaced around circle
const angles = cycleResult.map(n => Math.atan2(n.y - 200, n.x - 200));
const angleDiffs = [];
for (let i = 1; i < angles.length; i++) {
  angleDiffs.push(Math.abs(angles[i] - angles[i - 1]));
}
const avgDiff = angleDiffs.reduce((a, b) => a + b, 0) / angleDiffs.length;
assertApprox(avgDiff, Math.PI / 2, 0.1, 'Nodes are ~90° apart');

// ── layoutFlowchart ──────────────────────────────────────
console.log('\n--- layoutFlowchart ---');

const fcNodes = [
  { id: 'start', label: 'Start', shape: 'box' },
  { id: 'check', label: 'Check?', shape: 'diamond' },
  { id: 'ok', label: 'OK', shape: 'box' },
  { id: 'fail', label: 'Fail', shape: 'box' }
];
const fcEdges = [
  { from: 'start', to: 'check' },
  { from: 'check', to: 'ok', label: 'Yes' },
  { from: 'check', to: 'fail', label: 'No' }
];
const fcResult = layoutFlowchart(fcNodes, fcEdges, 0, 0, 600);

assert(fcResult.length === 4, 'Returns all nodes');
assert(fcResult[0].shape === 'box', 'Preserves shape');

// start should be in layer 0, check in layer 1, ok/fail in layer 2
const startY = fcResult.find(n => n.id === 'start').y;
const checkY = fcResult.find(n => n.id === 'check').y;
const okY = fcResult.find(n => n.id === 'ok').y;
assert(checkY > startY, 'Check is below start');
assert(okY > checkY, 'OK is below check');

// ── layoutHierarchy ──────────────────────────────────────
console.log('\n--- layoutHierarchy ---');

const hierNodes = [
  { id: 'root', label: 'Root' },
  { id: 'child1', label: 'Child 1' },
  { id: 'child2', label: 'Child 2' },
  { id: 'grandchild', label: 'Grandchild' }
];
const hierEdges = [
  { from: 'root', to: 'child1' },
  { from: 'root', to: 'child2' },
  { from: 'child1', to: 'grandchild' }
];
const hierResult = layoutHierarchy(hierNodes, hierEdges, 0, 0, 600, 400);

assert(hierResult.length === 4, 'Returns all nodes');
const rootH = hierResult.find(n => n.id === 'root');
const child1H = hierResult.find(n => n.id === 'child1');
const gcH = hierResult.find(n => n.id === 'grandchild');
assert(rootH.y < child1H.y, 'Root is above children');
assert(child1H.y < gcH.y, 'Child is above grandchild');

// ── parseDiagramJSON ─────────────────────────────────────
console.log('\n--- parseDiagramJSON ---');

const validJSON = '{"type":"cycle","nodes":[{"id":"a","label":"A"}],"edges":[]}';
const parsed = parseDiagramJSON(validJSON);
assert(parsed !== null, 'Parses valid JSON');
assert(parsed.type === 'cycle', 'Preserves type');
assert(parsed.nodes.length === 1, 'Has nodes');

assert(parseDiagramJSON('not json') === null, 'Returns null for invalid JSON');
assert(parseDiagramJSON('{"no":"nodes"}') === null, 'Returns null when nodes missing');

// ── positionDiagramNodes ─────────────────────────────────
console.log('\n--- positionDiagramNodes ---');

const posNodes = [
  { id: 'a', label: 'A' },
  { id: 'b', label: 'B' },
  { id: 'c', label: 'C' }
];

const cyclePos = positionDiagramNodes({ type: 'cycle', nodes: posNodes }, 0, 0, 600, 300);
assert(cyclePos.length === 3, 'Cycle positioning works');

const flowPos = positionDiagramNodes({ type: 'flowchart', nodes: posNodes, edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }] }, 0, 0, 600, 300);
assert(flowPos.length === 3, 'Flowchart positioning works');

const hierPos = positionDiagramNodes({ type: 'hierarchy', nodes: posNodes, edges: [{ from: 'a', to: 'b' }, { from: 'a', to: 'c' }] }, 0, 0, 600, 300);
assert(hierPos.length === 3, 'Hierarchy positioning works');

const pyrPos = positionDiagramNodes({ type: 'pyramid', nodes: posNodes }, 0, 0, 600, 300);
assert(pyrPos.length === 3, 'Pyramid positioning works');
assert(pyrPos[0].x === pyrPos[1].x, 'Pyramid nodes are centered horizontally');

// ── Summary ──────────────────────────────────────────────
console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(50)}\n`);

process.exit(failed > 0 ? 1 : 0);
