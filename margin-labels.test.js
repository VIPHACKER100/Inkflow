import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { clusterQueueLines, isQuestionLine, isAnswerLine, computeMarginLabels } = require('./margin-labels.js');

const OPTS = { fontSize: 22, lineHeight: 1.5 };

// Build queue-style char items for a line of text (spaces are NOT queue items,
// matching the real layout engine — spacing only advances x).
function charLine(text, y, pageIdx, x0 = 80, xStep = 10) {
  return text
    .replace(/ /g, '')
    .split('')
    .map((ch, i) => ({ ch, x: x0 + i * xStep, y: y, pageIdx }));
}

describe('isQuestionLine', () => {
  it('accepts numbered questions with trailing ? (spaces missing)', () => {
    expect(isQuestionLine('1.WhatisERmodel?')).toBe(true);
    expect(isQuestionLine('2)Defineentity?')).toBe(true);
  });

  it('accepts Q-prefixed questions with or without numbers', () => {
    expect(isQuestionLine('Q1.Whatphotosynthesis?')).toBe(true);
    expect(isQuestionLine('Q.Whatisit?')).toBe(true);
    expect(isQuestionLine('Q:whatisit?')).toBe(true);
  });

  it('rejects numbered sub-points without trailing ?', () => {
    expect(isQuestionLine('1.CardinalityConstraint')).toBe(false);
    expect(isQuestionLine('Q1.Alsoastatement')).toBe(false);
  });

  it('rejects plain text and words starting with Q', () => {
    expect(isQuestionLine('Justanote')).toBe(false);
    expect(isQuestionLine('Quiz?')).toBe(false);
  });
});

describe('isAnswerLine', () => {
  it('accepts a bare Answer: line', () => {
    expect(isAnswerLine('Answer:')).toBe(true);
    expect(isAnswerLine('answer.')).toBe(true);
  });

  it('rejects answer lines with content and lookalikes', () => {
    expect(isAnswerLine('Answer:process')).toBe(false);
    expect(isAnswerLine('Answers')).toBe(false);
    expect(isAnswerLine('And:')).toBe(false);
  });
});

describe('clusterQueueLines', () => {
  it('joins same-line chars in x order regardless of queue order', () => {
    const queue = charLine('abc', 100, 0, 80).reverse(); // scrambled queue, same positions
    const lines = clusterQueueLines(queue, OPTS);
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('abc');
    expect(lines[0].pageIdx).toBe(0);
  });

  it('splits lines whose baseline differs beyond the tolerance', () => {
    const queue = [...charLine('one', 100, 0), ...charLine('two', 100 + 22 * 1.5, 0)];
    expect(clusterQueueLines(queue, OPTS)).toHaveLength(2);
  });

  it('keeps same-line chars together despite small wobble', () => {
    const queue = charLine('abc', 100, 0).map((it, i) => ({ ...it, y: 100 + (i % 2 ? 1.5 : -1.5) }));
    expect(clusterQueueLines(queue, OPTS)).toHaveLength(1);
  });

  it('emits lines in reading order (page by page, top to bottom)', () => {
    const queue = [...charLine('page0', 100, 0), ...charLine('page1', 100, 1), ...charLine('more0', 133, 0)];
    const lines = clusterQueueLines(queue, OPTS);
    expect(lines.map((l) => l.pageIdx)).toEqual([0, 0, 1]);
    expect(lines.map((l) => l.text)).toEqual(['page0', 'more0', 'page1']);
  });

  it('skips typed items (shape/edge/mermaid)', () => {
    const queue = [...charLine('ab', 100, 0), { type: 'shape', pageIdx: 0, x: 90, y: 100 }];
    expect(clusterQueueLines(queue, OPTS)).toHaveLength(1);
  });
});

describe('computeMarginLabels', () => {
  it('numbers questions sequentially across the document', () => {
    const queue = [
      ...charLine('1.Whatisanentity?', 100, 0),
      ...charLine('Itisathing.', 133, 0),
      ...charLine('2.Whatisanattribute?', 100, 1),
    ];
    const labels = computeMarginLabels(queue, OPTS);
    expect(labels.get(0)).toEqual([{ y: 100, label: 'Q1' }]);
    expect(labels.get(1)).toEqual([{ y: 100, label: 'Q2' }]);
  });

  it('labels bare Answer: lines with Ans, anchored to the answer content line', () => {
    const queue = [...charLine('Answer:', 100, 0), ...charLine('1.What? ', 133, 0)];
    const labels = computeMarginLabels(queue, OPTS);
    expect(labels.get(0)).toEqual([
      { y: 133, label: 'Ans' },
      { y: 133, label: 'Q1' },
    ]);
  });

  it('keeps an answer-at-page-end Ans label on its own row', () => {
    const labels = computeMarginLabels(charLine('Answer:', 100, 0), OPTS);
    expect(labels.get(0)).toEqual([{ y: 100, label: 'Ans' }]);
  });

  it('returns an empty map for text without questions', () => {
    const labels = computeMarginLabels(charLine('plainnotes', 100, 0), OPTS);
    expect(labels.size).toBe(0);
  });

  it('returns an empty map for an empty queue', () => {
    expect(computeMarginLabels([], OPTS).size).toBe(0);
    expect(computeMarginLabels(null, OPTS).size).toBe(0);
  });
});
