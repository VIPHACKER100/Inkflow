/**
 * Test Suite for MarkdownParser
 * Tests parsing, pretty-printing, and round-trip correctness
 */

// Import MarkdownParser (works in both Node.js and browser)
const MarkdownParser = typeof module !== 'undefined' && module.exports ? require('./markdown-parser.js') : window.MarkdownParser;

// Simple test framework
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  assertEqual(actual, expected, message = '') {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}. ${message}`);
    }
  }

  assertTrue(value, message = '') {
    if (!value) {
      throw new Error(`Expected truthy value. ${message}`);
    }
  }

  assertFalse(value, message = '') {
    if (value) {
      throw new Error(`Expected falsy value. ${message}`);
    }
  }

  assertIncludes(str, substring, message = '') {
    if (!str.includes(substring)) {
      throw new Error(`Expected "${str}" to include "${substring}". ${message}`);
    }
  }

  run() {
    console.log('Starting MarkdownParser tests...\n');

    for (const { name, fn } of this.tests) {
      try {
        fn.call(this);
        this.passed++;
        console.log(`✓ ${name}`);
      } catch (error) {
        this.failed++;
        console.error(`✗ ${name}`);
        console.error(`  ${error.message}\n`);
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`Tests passed: ${this.passed}`);
    console.log(`Tests failed: ${this.failed}`);
    console.log(`Total: ${this.tests.length}`);
    console.log(`${'='.repeat(50)}\n`);

    return this.failed === 0;
  }
}

// ─────────────────────────────────────────────────────────────
// TEST SUITE
// ─────────────────────────────────────────────────────────────

const runner = new TestRunner();
const parser = new MarkdownParser();

// ─────────────────────────────────────────────────────────────
// BASIC PARSING TESTS
// ─────────────────────────────────────────────────────────────

runner.test('Parse empty string returns empty array', function() {
  const result = parser.parse('');
  this.assertEqual(result, []);
});

runner.test('Parse simple body text', function() {
  const text = 'Hello world';
  const result = parser.parse(text);
  
  this.assertTrue(result.length > 0);
  this.assertEqual(result[0].type, parser.TEXT_TYPES.BODY);
  this.assertEqual(result[0].text, 'Hello world');
});

runner.test('Parse heading level 1', function() {
  const text = '# Main Title';
  const result = parser.parse(text);
  
  this.assertTrue(result.length > 0);
  this.assertEqual(result[0].type, parser.TEXT_TYPES.HEADING);
  this.assertEqual(result[0].level, 1);
  this.assertEqual(result[0].text, 'Main Title');
});

runner.test('Parse heading levels 1-6', function() {
  for (let level = 1; level <= 6; level++) {
    const marker = '#'.repeat(level);
    const text = `${marker} Heading ${level}`;
    const result = parser.parse(text);
    
    this.assertTrue(result.length > 0, `Level ${level} parsing failed`);
    this.assertEqual(result[0].level, level, `Level ${level} not detected`);
  }
});

runner.test('Parse bullet points with dash', function() {
  const text = '- Item one';
  const result = parser.parse(text);
  
  this.assertTrue(result.length > 0);
  this.assertEqual(result[0].type, parser.TEXT_TYPES.BULLET);
  this.assertEqual(result[0].text, 'Item one');
});

runner.test('Parse bullet points with asterisk', function() {
  const text = '* Item one';
  const result = parser.parse(text);
  
  this.assertTrue(result.length > 0);
  this.assertEqual(result[0].type, parser.TEXT_TYPES.BULLET);
  this.assertEqual(result[0].text, 'Item one');
});

runner.test('Parse emphasis with asterisks (italic)', function() {
  const text = 'This is *italic* text';
  const result = parser.parse(text);
  
  // Should have 3 segments: text, emphasis, text
  this.assertTrue(result.length >= 1, 'Should parse emphasis');
  const emphasisSegments = result.filter(s => s.type === parser.TEXT_TYPES.EMPHASIS);
  this.assertTrue(emphasisSegments.length > 0, 'Should contain emphasis segment');
});

runner.test('Parse emphasis with underscores (italic)', function() {
  const text = 'This is _italic_ text';
  const result = parser.parse(text);
  
  const emphasisSegments = result.filter(s => s.type === parser.TEXT_TYPES.EMPHASIS);
  this.assertTrue(emphasisSegments.length > 0, 'Should contain emphasis segment');
});

runner.test('Parse strong emphasis with double asterisks (bold)', function() {
  const text = 'This is **bold** text';
  const result = parser.parse(text);
  
  const emphasisSegments = result.filter(s => s.type === parser.TEXT_TYPES.EMPHASIS);
  this.assertTrue(emphasisSegments.length > 0, 'Should contain emphasis segment');
  this.assertEqual(emphasisSegments[0].emphasisType, 'bold', 'Should detect bold');
});

runner.test('Parse strong emphasis with double underscores (bold)', function() {
  const text = 'This is __bold__ text';
  const result = parser.parse(text);
  
  const emphasisSegments = result.filter(s => s.type === parser.TEXT_TYPES.EMPHASIS);
  this.assertTrue(emphasisSegments.length > 0, 'Should contain emphasis segment');
  this.assertEqual(emphasisSegments[0].emphasisType, 'bold', 'Should detect bold');
});

// ─────────────────────────────────────────────────────────────
// POSITION PRESERVATION TESTS
// ─────────────────────────────────────────────────────────────

runner.test('Preserve original character positions for heading', function() {
  const text = '# Title';
  const result = parser.parse(text);
  
  this.assertTrue(result[0].originalStartPos !== undefined);
  this.assertTrue(result[0].originalEndPos !== undefined);
  this.assertEqual(result[0].originalStartPos, 0);
  this.assertEqual(result[0].originalEndPos, text.length);
});

runner.test('Preserve original character positions for body text', function() {
  const text = 'Line one\nLine two';
  const result = parser.parse(text);
  
  // Each segment should have position info
  for (const seg of result) {
    this.assertTrue(seg.originalStartPos !== undefined);
    this.assertTrue(seg.originalEndPos !== undefined);
  }
});

runner.test('Preserve original character positions for emphasis', function() {
  const text = 'Start *emphasis* end';
  const result = parser.parse(text);
  
  const emphasisSeg = result.find(s => s.type === parser.TEXT_TYPES.EMPHASIS);
  this.assertTrue(emphasisSeg !== undefined);
  this.assertTrue(emphasisSeg.originalStartPos !== undefined);
  this.assertTrue(emphasisSeg.originalEndPos !== undefined);
});

// ─────────────────────────────────────────────────────────────
// NESTED STRUCTURE TESTS
// ─────────────────────────────────────────────────────────────

runner.test('Parse emphasis within bullet point', function() {
  const text = '- Item with *emphasis*';
  const result = parser.parse(text);
  
  // Should have bullet type marker and emphasis content
  this.assertTrue(result.some(s => s.type === parser.TEXT_TYPES.BULLET));
  this.assertTrue(result.some(s => s.type === parser.TEXT_TYPES.EMPHASIS));
});

runner.test('Parse emphasis within heading', function() {
  const text = '# Title with *emphasis*';
  const result = parser.parse(text);
  
  // Should parse heading with emphasis nested
  this.assertTrue(result.some(s => s.type === parser.TEXT_TYPES.HEADING));
  this.assertTrue(result.some(s => s.type === parser.TEXT_TYPES.EMPHASIS));
});

runner.test('Parse multiple emphasis in same line', function() {
  const text = '*one* and *two* and *three*';
  const result = parser.parse(text);
  
  const emphasisCount = result.filter(s => s.type === parser.TEXT_TYPES.EMPHASIS).length;
  this.assertTrue(emphasisCount >= 3, `Should have at least 3 emphasis segments, got ${emphasisCount}`);
});

// ─────────────────────────────────────────────────────────────
// PRETTY PRINT (MARKDOWN RECONSTRUCTION) TESTS
// ─────────────────────────────────────────────────────────────

runner.test('Pretty print simple body text', function() {
  const original = 'Hello world';
  const parsed = parser.parse(original);
  const reconstructed = parser.prettyPrint(parsed);
  
  this.assertEqual(reconstructed.trim(), original.trim());
});

runner.test('Pretty print heading', function() {
  const original = '# Main Title';
  const parsed = parser.parse(original);
  const reconstructed = parser.prettyPrint(parsed);
  
  this.assertIncludes(reconstructed, '# Main Title');
});

runner.test('Pretty print bullet point', function() {
  const original = '- Item one';
  const parsed = parser.parse(original);
  const reconstructed = parser.prettyPrint(parsed);
  
  this.assertIncludes(reconstructed, '- Item one');
});

runner.test('Pretty print emphasis', function() {
  const original = 'Text with *emphasis* inside';
  const parsed = parser.parse(original);
  const reconstructed = parser.prettyPrint(parsed);
  
  this.assertIncludes(reconstructed, '*emphasis*');
});

runner.test('Pretty print bold emphasis', function() {
  const original = 'Text with **bold** inside';
  const parsed = parser.parse(original);
  const reconstructed = parser.prettyPrint(parsed);
  
  this.assertIncludes(reconstructed, '**bold**');
});

// ─────────────────────────────────────────────────────────────
// ROUND-TRIP TESTS (Property: Parse → PrettyPrint → Parse equivalence)
// ─────────────────────────────────────────────────────────────

runner.test('Round-trip: Simple text', function() {
  const original = 'Simple text';
  const parsed1 = parser.parse(original);
  const reconstructed = parser.prettyPrint(parsed1);
  const parsed2 = parser.parse(reconstructed);
  
  // Both parses should produce equivalent results
  this.assertEqual(parsed1.length, parsed2.length, 'Same number of segments after round-trip');
});

runner.test('Round-trip: Heading', function() {
  const original = '# Section Title';
  const parsed1 = parser.parse(original);
  const reconstructed = parser.prettyPrint(parsed1);
  const parsed2 = parser.parse(reconstructed);
  
  this.assertEqual(parsed1[0].type, parsed2[0].type, 'Type preserved');
  this.assertEqual(parsed1[0].level, parsed2[0].level, 'Level preserved');
});

runner.test('Round-trip: Bullet point', function() {
  const original = '- List item';
  const parsed1 = parser.parse(original);
  const reconstructed = parser.prettyPrint(parsed1);
  const parsed2 = parser.parse(reconstructed);
  
  this.assertEqual(
    parsed1.filter(s => s.type === parser.TEXT_TYPES.BULLET).length,
    parsed2.filter(s => s.type === parser.TEXT_TYPES.BULLET).length,
    'Bullet count preserved'
  );
});

runner.test('Round-trip: Emphasis', function() {
  const original = 'Text with *emphasis*';
  const parsed1 = parser.parse(original);
  const reconstructed = parser.prettyPrint(parsed1);
  const parsed2 = parser.parse(reconstructed);
  
  const em1 = parsed1.filter(s => s.type === parser.TEXT_TYPES.EMPHASIS);
  const em2 = parsed2.filter(s => s.type === parser.TEXT_TYPES.EMPHASIS);
  this.assertEqual(em1.length, em2.length, 'Emphasis count preserved');
});

runner.test('Round-trip: Complex mixed content', function() {
  const original = `# Heading
- Bullet with *italic*
- Another item

Body text with **bold** and *italic* and normal text.`;

  const parsed1 = parser.parse(original);
  const reconstructed = parser.prettyPrint(parsed1);
  const parsed2 = parser.parse(reconstructed);
  
  // Count each type
  const countType = (arr, type) => arr.filter(s => s.type === type).length;
  
  this.assertEqual(
    countType(parsed1, parser.TEXT_TYPES.HEADING),
    countType(parsed2, parser.TEXT_TYPES.HEADING),
    'Heading count preserved'
  );
  this.assertEqual(
    countType(parsed1, parser.TEXT_TYPES.BULLET),
    countType(parsed2, parser.TEXT_TYPES.BULLET),
    'Bullet count preserved'
  );
  this.assertEqual(
    countType(parsed1, parser.TEXT_TYPES.EMPHASIS),
    countType(parsed2, parser.TEXT_TYPES.EMPHASIS),
    'Emphasis count preserved'
  );
});

// ─────────────────────────────────────────────────────────────
// DETECTION HELPER TESTS
// ─────────────────────────────────────────────────────────────

runner.test('Detect heading levels', function() {
  this.assertEqual(parser.detectHeading('# Heading'), 1);
  this.assertEqual(parser.detectHeading('## Heading'), 2);
  this.assertEqual(parser.detectHeading('### Heading'), 3);
  this.assertFalse(parser.detectHeading('No heading'));
});

runner.test('Detect bullet markers', function() {
  this.assertTrue(parser.detectBullet('- Item'));
  this.assertTrue(parser.detectBullet('* Item'));
  this.assertFalse(parser.detectBullet('No bullet'));
});

runner.test('Detect emphasis markers', function() {
  this.assertTrue(parser.detectEmphasis('Text with *emphasis*'));
  this.assertTrue(parser.detectEmphasis('Text with _emphasis_'));
  this.assertTrue(parser.detectEmphasis('Text with **bold**'));
  this.assertFalse(parser.detectEmphasis('No emphasis'));
});

// ─────────────────────────────────────────────────────────────
// DISPLAY TEXT EXTRACTION TESTS
// ─────────────────────────────────────────────────────────────

runner.test('Extract display text (symbols stripped)', function() {
  const text = '# Title';
  const parsed = parser.parse(text);
  const display = parser.getDisplayText(parsed);
  
  // Should not contain # marker
  this.assertFalse(display.includes('#'), 'Display text should not contain # marker');
  this.assertIncludes(display, 'Title', 'Display text should contain the title');
});

runner.test('Extract display text from emphasis', function() {
  const text = 'Text with *emphasis* inside';
  const parsed = parser.parse(text);
  const display = parser.getDisplayText(parsed);
  
  this.assertEqual(display.trim(), 'Text with emphasis inside');
  this.assertFalse(display.includes('*'), 'Should not contain asterisks');
});

// ─────────────────────────────────────────────────────────────
// LINE MERGING TESTS
// ─────────────────────────────────────────────────────────────

runner.test('Merge segments by line', function() {
  const text = `# Heading
Body text`;
  const parsed = parser.parse(text);
  const merged = parser.mergeSegmentsByLine(parsed);
  
  // Should have 2 lines
  this.assertTrue(merged.length >= 1, 'Should have at least one line');
});

runner.test('Merged line contains all segments from same line', function() {
  const text = 'Text with *emphasis* and **bold**';
  const parsed = parser.parse(text);
  const merged = parser.mergeSegmentsByLine(parsed);
  
  if (merged.length > 0) {
    this.assertTrue(merged[0].segments !== undefined, 'Merged line should contain segments array');
    this.assertTrue(merged[0].segments.length > 0, 'Merged line should have sub-segments');
  }
});

// ─────────────────────────────────────────────────────────────
// EDGE CASE TESTS
// ─────────────────────────────────────────────────────────────

runner.test('Handle multiple consecutive newlines', function() {
  const text = 'Line one\n\n\nLine two';
  const result = parser.parse(text);
  
  // Should not crash
  this.assertTrue(Array.isArray(result));
});

runner.test('Handle empty lines in multiline text', function() {
  const text = 'Line one\n\nLine three';
  const parsed = parser.parse(text);
  const reconstructed = parser.prettyPrint(parsed);
  
  // Should preserve content
  this.assertIncludes(reconstructed, 'Line one');
  this.assertIncludes(reconstructed, 'Line three');
});

runner.test('Handle emphasis at start of line', function() {
  const text = '*Emphasis* at start';
  const result = parser.parse(text);
  
  this.assertTrue(result.some(s => s.type === parser.TEXT_TYPES.EMPHASIS));
});

runner.test('Handle emphasis at end of line', function() {
  const text = 'Ends with *emphasis*';
  const result = parser.parse(text);
  
  this.assertTrue(result.some(s => s.type === parser.TEXT_TYPES.EMPHASIS));
});

runner.test('Handle emphasis on entire line', function() {
  const text = '*Entire line is emphasized*';
  const result = parser.parse(text);
  
  this.assertTrue(result.some(s => s.type === parser.TEXT_TYPES.EMPHASIS));
});

runner.test('Handle special characters in text', function() {
  const text = 'Text with @#$%^&() special chars';
  const result = parser.parse(text);
  
  this.assertTrue(result.length > 0, 'Should parse text with special chars');
  this.assertIncludes(parser.getDisplayText(result), '@#$%^&()');
});

runner.test('Handle null/undefined input gracefully', function() {
  this.assertEqual(parser.parse(null), []);
  this.assertEqual(parser.parse(undefined), []);
});

runner.test('Detect heading requires space after markers', function() {
  this.assertFalse(parser.detectHeading('#NoSpace'), 'Should require space after #');
  this.assertTrue(parser.detectHeading('# With space'), 'Should detect heading with space');
});

runner.test('Detect bullet requires space after marker', function() {
  this.assertFalse(parser.detectBullet('-NoSpace'), 'Should require space after -');
  this.assertTrue(parser.detectBullet('- With space'), 'Should detect bullet with space');
});

// ─────────────────────────────────────────────────────────────
// RUN ALL TESTS
// ─────────────────────────────────────────────────────────────

const allTestsPassed = runner.run();

// Export for use in test runners
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runner, allTestsPassed };
}

// Return status code for CLI
if (typeof process !== 'undefined') {
  process.exit(allTestsPassed ? 0 : 1);
}
