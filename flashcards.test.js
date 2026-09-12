import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

// flashcards.js is an IIFE that attaches to window in the browser and exports
// its pure helpers via module.exports under Node/Vitest.
const require = createRequire(import.meta.url);
const { extractFlashcards } = require('./flashcards.js');

describe('extractFlashcards', () => {
  it('extracts a simple Q:/A: pair', () => {
    const text = 'Q: What is photosynthesis?\nA: The process by which plants convert light to energy.';
    expect(extractFlashcards(text)).toEqual([
      { question: 'What is photosynthesis?', answer: 'The process by which plants convert light to energy.' },
    ]);
  });

  it('extracts multiple consecutive pairs', () => {
    const text = 'Q: One?\nA: 1\nQ: Two?\nA: 2';
    expect(extractFlashcards(text)).toEqual([
      { question: 'One?', answer: '1' },
      { question: 'Two?', answer: '2' },
    ]);
  });

  it('supports Q. / A. variants', () => {
    const text = 'Q. Capital of France?\nA. Paris';
    expect(extractFlashcards(text)).toEqual([{ question: 'Capital of France?', answer: 'Paris' }]);
  });

  it('skips answers with no preceding question', () => {
    const text = 'A: orphan answer\nQ: Real?\nA: yes';
    expect(extractFlashcards(text)).toEqual([{ question: 'Real?', answer: 'yes' }]);
  });

  it('returns an empty array for text without Q/A patterns', () => {
    expect(extractFlashcards('Just some notes\nwith no cards.')).toEqual([]);
    expect(extractFlashcards('')).toEqual([]);
  });

  it('trims whitespace around lines and markers', () => {
    const text = '  Q:  Spaced out?  \n\tA:\tTrimmed answer  ';
    expect(extractFlashcards(text)).toEqual([{ question: 'Spaced out?', answer: 'Trimmed answer' }]);
  });

  it('handles CRLF line endings', () => {
    const text = 'Q: Windows?\r\nA: Also works\r\n';
    expect(extractFlashcards(text)).toEqual([{ question: 'Windows?', answer: 'Also works' }]);
  });

  it('requires the marker to be followed by whitespace', () => {
    expect(extractFlashcards('Quiet: no\nAnd: no')).toEqual([]);
  });
});
