import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { sanitizeAiResponse, trigramSimilarity, resequenceQA, smartArrangeLocal } = require('./ai-postprocess.js');

describe('sanitizeAiResponse', () => {
  it('strips code fences but keeps the body', () => {
    const text = 'Here are notes:\n```python\nprint("hi")\n```\nDone.';
    expect(sanitizeAiResponse(text)).toBe('Here are notes:\nprint("hi")\nDone.');
  });

  it('preserves diagram fences untouched', () => {
    const text = 'Intro\n```diagram\n{ "type": "cycle", "nodes": [] }\n```\nEnd';
    expect(sanitizeAiResponse(text)).toContain('```diagram');
    expect(sanitizeAiResponse(text)).toContain('{ "type": "cycle"');
  });

  it('preserves mermaid fences untouched', () => {
    const text = '```mermaid\ngraph TD; A-->B;\n```';
    expect(sanitizeAiResponse(text)).toContain('```mermaid');
  });

  it('strips inline backticks', () => {
    expect(sanitizeAiResponse('The `term` means this')).toBe('The term means this');
  });

  it('strips bold and italic markers', () => {
    expect(sanitizeAiResponse('**bold** and _italic_ and __under__')).toBe('bold and italic and under');
  });

  it('does not turn bullets into italic markers', () => {
    expect(sanitizeAiResponse('* item one\n* item two')).toBe('* item one\n* item two');
  });

  it('removes raw HTML tags and converts <br> to newline', () => {
    expect(sanitizeAiResponse('line one<br>line two <strong>bold</strong>')).toBe('line one\nline two bold');
  });

  it('preserves Inkflow rich syntax', () => {
    const text = '# Title\n==key==\n[sticky:yellow]note[sticky]\nQ: What?\nA: This.';
    expect(sanitizeAiResponse(text)).toBe(text);
  });
});

describe('trigramSimilarity', () => {
  it('returns 1 for identical questions', () => {
    expect(trigramSimilarity('What is photosynthesis?', 'what is photosynthesis?')).toBe(1);
  });

  it('returns 0 for empty input', () => {
    expect(trigramSimilarity('', 'x')).toBe(0);
  });

  it('returns a partial score for similar questions', () => {
    const s = trigramSimilarity('Define the cardinality constraint in ER models', 'Define the cardinality constraint of ER models');
    expect(s).toBeGreaterThan(0.72);
  });
});

describe('resequenceQA', () => {
  it('renumbers model numbering sequentially from Q1', () => {
    const text = 'Q3: First?\nA3: one\nQ7: Second?\nA7: two';
    expect(resequenceQA(text)).toBe('Q1: First?\nA1: one\nQ2: Second?\nA2: two');
  });

  it('renumbers bare Q:/A: pairs', () => {
    expect(resequenceQA('Q: One?\nA: 1\nQ: Two?\nA: 2')).toBe('Q1: One?\nA1: 1\nQ2: Two?\nA2: 2');
  });

  it('drops near-duplicate questions together with their paired answer', () => {
    const text = 'Q1: Define the cardinality constraint in ER models\nA1: answer one\nQ2: Define the cardinality constraint of ER models\nA2: answer two';
    expect(resequenceQA(text)).toBe('Q1: Define the cardinality constraint in ER models\nA1: answer one');
  });

  it('keeps distinct questions', () => {
    const text = 'Q1: What is an entity?\nA1: a thing\nQ2: What is an attribute?\nA2: a property';
    expect(resequenceQA(text)).toBe('Q1: What is an entity?\nA1: a thing\nQ2: What is an attribute?\nA2: a property');
  });

  it('drops orphan answers and passes plain text through', () => {
    const text = 'Intro paragraph\nA: dangling answer\nMore text.';
    expect(resequenceQA(text)).toBe('Intro paragraph\nMore text.');
  });
});

describe('smartArrangeLocal', () => {
  it('normalizes bullet markers preserving indentation', () => {
    const r = smartArrangeLocal('• top\n    ‣ nested');
    expect(r.text).toContain('- top');
    expect(r.text).toContain('    - nested');
  });

  it('does not treat **bold** lines as bullets', () => {
    expect(smartArrangeLocal('**bold intro**').text).toContain('**bold intro**');
  });

  it('normalizes header spacing', () => {
    const r = smartArrangeLocal('#Title\n##   Heading');
    expect(r.text).toContain('# Title');
    expect(r.text).toContain('## Heading');
  });

  it('normalizes study tag spacing', () => {
    expect(smartArrangeLocal('[sticky : yellow]note[sticky ]').text).toContain('[sticky:yellow]note[sticky]');
    expect(smartArrangeLocal('[callout : info]x[callout]').text).toContain('[callout:info]x[callout]');
  });

  it('normalizes highlight spacing', () => {
    expect(smartArrangeLocal('this is == key == info').text).toContain('==key==');
  });

  it('normalizes Q/A label casing and spacing', () => {
    const r = smartArrangeLocal('q 1 : What?\na 1 : This');
    expect(r.text).toContain('Q1: What?');
    expect(r.text).toContain('A1: This');
  });

  it('fixes punctuation spacing', () => {
    const r = smartArrangeLocal('Hello , world !Next');
    expect(r.text).toContain('Hello, world! Next');
  });

  it('skips punctuation fixes on fill-in lines', () => {
    const r = smartArrangeLocal('Name is ______ . Fill this');
    expect(r.text).toContain('______ .');
  });

  it('inserts a blank line before questions and headers', () => {
    const r = smartArrangeLocal('text line\nQ1: What?\nmore\n# Heading');
    const out = r.text;
    expect(out).toMatch(/text line\n\nQ1: What?/);
    expect(out).toMatch(/more\n\n# Heading/);
  });

  it('collapses 3+ blank lines to one blank line', () => {
    const r = smartArrangeLocal('a\n\n\n\n\nb');
    expect(r.text).toBe('a\n\nb\n');
  });

  it('reports the number of fixes', () => {
    const r = smartArrangeLocal('• item\n#Title');
    expect(r.fixes).toBeGreaterThanOrEqual(2);
  });

  it('returns empty result untouched', () => {
    expect(smartArrangeLocal('   ').fixes).toBe(0);
  });
});
