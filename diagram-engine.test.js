import { describe, it, expect } from 'vitest';
import {
  layoutCycle,
  layoutFlowchart,
  layoutHierarchy,
  parseDiagramJSON,
  positionDiagramNodes,
} from './diagram-engine.js';

describe('DiagramEngine', () => {
  describe('layoutCycle', () => {
    it('spaces nodes evenly in a circle around center', () => {
      const cycleNodes = [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
        { id: 'c', label: 'C' },
        { id: 'd', label: 'D' },
      ];
      const cycleResult = layoutCycle(cycleNodes, 100, { x: 200, y: 200 });

      expect(cycleResult).toHaveLength(4);
      expect(cycleResult[0].shape).toBe('circle');
      expect(cycleResult[0].x).toBeCloseTo(200, 0);
      expect(cycleResult[0].y).toBeCloseTo(100, 0);
      expect(cycleResult[0].label).toBe('A');

      const angles = cycleResult.map((n) => Math.atan2(n.y - 200, n.x - 200));
      const angleDiffs = [];
      for (let i = 1; i < angles.length; i++) {
        angleDiffs.push(Math.abs(angles[i] - angles[i - 1]));
      }
      const avgDiff = angleDiffs.reduce((a, b) => a + b, 0) / angleDiffs.length;
      expect(avgDiff).toBeCloseTo(Math.PI / 2, 1);
    });
  });

  describe('layoutFlowchart', () => {
    it('layers nodes hierarchically according to in-degrees and edges', () => {
      const fcNodes = [
        { id: 'start', label: 'Start', shape: 'box' },
        { id: 'check', label: 'Check?', shape: 'diamond' },
        { id: 'ok', label: 'OK', shape: 'box' },
        { id: 'fail', label: 'Fail', shape: 'box' },
      ];
      const fcEdges = [
        { from: 'start', to: 'check' },
        { from: 'check', to: 'ok', label: 'Yes' },
        { from: 'check', to: 'fail', label: 'No' },
      ];
      const fcResult = layoutFlowchart(fcNodes, fcEdges, 0, 0, 600);

      expect(fcResult).toHaveLength(4);
      expect(fcResult[0].shape).toBe('box');

      const startY = fcResult.find((n) => n.id === 'start').y;
      const checkY = fcResult.find((n) => n.id === 'check').y;
      const okY = fcResult.find((n) => n.id === 'ok').y;

      expect(checkY).toBeGreaterThan(startY);
      expect(okY).toBeGreaterThan(checkY);
    });
  });

  describe('layoutHierarchy', () => {
    it('arranges tree nodes top-down with increasing vertical depth', () => {
      const hierNodes = [
        { id: 'root', label: 'Root' },
        { id: 'child1', label: 'Child 1' },
        { id: 'child2', label: 'Child 2' },
        { id: 'grandchild', label: 'Grandchild' },
      ];
      const hierEdges = [
        { from: 'root', to: 'child1' },
        { from: 'root', to: 'child2' },
        { from: 'child1', to: 'grandchild' },
      ];
      const hierResult = layoutHierarchy(hierNodes, hierEdges, 0, 0, 600, 400);

      expect(hierResult).toHaveLength(4);
      const rootH = hierResult.find((n) => n.id === 'root');
      const child1H = hierResult.find((n) => n.id === 'child1');
      const gcH = hierResult.find((n) => n.id === 'grandchild');

      expect(rootH.y).toBeLessThan(child1H.y);
      expect(child1H.y).toBeLessThan(gcH.y);
    });
  });

  describe('parseDiagramJSON', () => {
    it('parses valid diagram JSON strings', () => {
      const validJSON = '{"type":"cycle","nodes":[{"id":"a","label":"A"}],"edges":[]}';
      const parsed = parseDiagramJSON(validJSON);
      expect(parsed).not.toBeNull();
      expect(parsed.type).toBe('cycle');
      expect(parsed.nodes).toHaveLength(1);
    });

    it('returns null on invalid JSON or missing nodes property', () => {
      expect(parseDiagramJSON('not json')).toBeNull();
      expect(parseDiagramJSON('{"no":"nodes"}')).toBeNull();
    });
  });

  describe('positionDiagramNodes', () => {
    const posNodes = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ];

    it('positions cycle diagrams correctly', () => {
      const cyclePos = positionDiagramNodes({ type: 'cycle', nodes: posNodes }, 0, 0, 600, 300);
      expect(cyclePos).toHaveLength(3);
    });

    it('positions flowchart diagrams correctly', () => {
      const flowPos = positionDiagramNodes(
        { type: 'flowchart', nodes: posNodes, edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }] },
        0,
        0,
        600,
        300
      );
      expect(flowPos).toHaveLength(3);
    });

    it('positions hierarchy diagrams correctly', () => {
      const hierPos = positionDiagramNodes(
        { type: 'hierarchy', nodes: posNodes, edges: [{ from: 'a', to: 'b' }, { from: 'a', to: 'c' }] },
        0,
        0,
        600,
        300
      );
      expect(hierPos).toHaveLength(3);
    });

    it('positions pyramid diagrams centered horizontally', () => {
      const pyrPos = positionDiagramNodes({ type: 'pyramid', nodes: posNodes }, 0, 0, 600, 300);
      expect(pyrPos).toHaveLength(3);
      expect(pyrPos[0].x).toBe(pyrPos[1].x);
    });
  });
});
