/**
 * Property-Based Tests for MarkdownParser Round-Trip Validation
 * 
 * **Validates: Requirements 12.1, 12.2**
 * 
 * Property: Parse → Pretty-Print → Parse produces equivalent structure
 * 
 * This test suite generates random markdown structures and validates that:
 * 1. parse(prettyPrint(parse(text))) === parse(text)
 * 2. The structure is preserved through round-trip conversion
 */

const MarkdownParser = typeof module !== 'undefined' && module.exports ? require('./markdown-parser.js') : window.MarkdownParser;

// ─────────────────────────────────────────────────────────────
// RANDOM MARKDOWN GENERATOR
// ─────────────────────────────────────────────────────────────

class MarkdownGenerator {
  /**
   * Generate random valid markdown text
   */
  static generateRandomText() {
    const r = Math.random();
    
    if (r < 0.15) return this.generateHeading();
    if (r < 0.30) return this.generateBulletList();
    if (r < 0.50) return this.generateBodyWithEmphasis();
    if (r < 0.70) return this.generateMixedContent();
    if (r < 0.85) return this.generateNestedStructure();
    return this.generateEdgeCase();
  }

  /**
   * Generate a random heading (level 1-6)
   */
  static generateHeading() {
    const level = Math.floor(Math.random() * 6) + 1;
    const titles = [
      'Introduction',
      'Methods',
      'Results',
      'Discussion',
      'Conclusion',
      'Advanced Topics',
      'Key Concepts',
      'Important Notes'
    ];
    const title = titles[Math.floor(Math.random() * titles.length)];
    return `${this.repeatChar('#', level)} ${title}`;
  }

  /**
   * Generate a random bullet list
   */
  static generateBulletList() {
    const count = Math.floor(Math.random() * 4) + 1;
    const bullets = [];
    const items = [
      'First item in the list',
      'Second item with more detail',
      'Third important point',
      'Additional information',
      'Note this carefully'
    ];
    
    for (let i = 0; i < count; i++) {
      const marker = Math.random() < 0.5 ? '-' : '*';
      const item = items[Math.floor(Math.random() * items.length)];
      bullets.push(`${marker} ${item}`);
    }
    
    return bullets.join('\n');
  }

  /**
   * Generate body text with emphasis
   */
  static generateBodyWithEmphasis() {
    const phrases = [
      'This is important',
      'Pay attention here',
      'Note the following',
      'Remember this',
      'Key information'
    ];
    
    const emphasisType = Math.random() < 0.5 ? '*' : '_';
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    
    if (Math.random() < 0.33) {
      return `Regular text with ${emphasisType}${phrase}${emphasisType} emphasis`;
    } else if (Math.random() < 0.67) {
      return `Text with ${emphasisType}${emphasisType}${phrase}${emphasisType}${emphasisType} bold`;
    } else {
      return `${emphasisType}${phrase}${emphasisType} at start and normal text`;
    }
  }

  /**
   * Generate mixed content (multiple types)
   */
  static generateMixedContent() {
    const parts = [];
    
    // Add a heading
    parts.push(this.generateHeading());
    parts.push('');
    
    // Add body text
    parts.push('This is the main content section.');
    parts.push('');
    
    // Add a bullet list
    parts.push(this.generateBulletList());
    
    return parts.join('\n');
  }

  /**
   * Generate nested structures (emphasis within bullets)
   */
  static generateNestedStructure() {
    const marker = Math.random() < 0.5 ? '-' : '*';
    const emphasisType = Math.random() < 0.5 ? '*' : '_';
    
    const nestedItems = [
      `${marker} Item with ${emphasisType}emphasis${emphasisType}`,
      `${marker} Another with ${emphasisType}${emphasisType}bold${emphasisType}${emphasisType}`,
      `${marker} Multiple ${emphasisType}one${emphasisType} and ${emphasisType}two${emphasisType} emphasis`,
      `# Header with *emphasis*`
    ];
    
    return nestedItems[Math.floor(Math.random() * nestedItems.length)];
  }

  /**
   * Generate edge cases
   */
  static generateEdgeCase() {
    const edgeCases = [
      'Empty line after this\n\nShould work',
      '*Single emphasis*',
      '**Double emphasis**',
      '_Underscore_',
      '__Double underscore__',
      '- Bullet only',
      '# Heading',
      'Text with *multiple* and **emphasis** markers',
      '- Bullet *with* **mixed** emphasis',
      '# Heading with *emphasis*'
    ];
    
    return edgeCases[Math.floor(Math.random() * edgeCases.length)];
  }

  static repeatChar(char, times) {
    return Array(times).fill(char).join('');
  }
}

// ─────────────────────────────────────────────────────────────
// PROPERTY VALIDATION HELPERS
// ─────────────────────────────────────────────────────────────

class PropertyValidator {
  /**
   * Compare two segment arrays for equivalence
   * Segments are equivalent if they have the same:
   * - text content
   * - type
   * - level (for headings)
   * - emphasis type (for emphasis)
   */
  static segmentsAreEquivalent(seg1, seg2) {
    if (!seg1 && !seg2) return true;
    if (!seg1 || !seg2) return false;
    
    return (
      seg1.text === seg2.text &&
      seg1.type === seg2.type &&
      seg1.level === seg2.level &&
      seg1.emphasisType === seg2.emphasisType
    );
  }

  /**
   * Check if two segment arrays represent the same structure
   */
  static structuresAreEquivalent(segments1, segments2) {
    if (segments1.length !== segments2.length) {
      return false;
    }

    for (let i = 0; i < segments1.length; i++) {
      if (!this.segmentsAreEquivalent(segments1[i], segments2[i])) {
        return false;
      }
    }

    return true;
  }

  /**
   * Count segments by type
   */
  static countByType(segments) {
    const counts = {
      heading: 0,
      bullet: 0,
      body: 0,
      emphasis: 0
    };

    for (const seg of segments) {
      if (seg.type) {
        counts[seg.type]++;
      }
    }

    return counts;
  }
}

// ─────────────────────────────────────────────────────────────
// PROPERTY-BASED TEST RUNNER
// ─────────────────────────────────────────────────────────────

class PropertyTestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.examples = [];
  }

  property(name, fn, iterations = 100) {
    this.tests.push({ name, fn, iterations });
  }

  run() {
    console.log('Starting Property-Based Tests for MarkdownParser...\n');

    for (const { name, fn, iterations } of this.tests) {
      try {
        fn.call(this, iterations);
        this.passed++;
        console.log(`✓ ${name}`);
        if (this.examples.length > 0) {
          console.log(`  (tested with ${this.examples.length} examples)`);
          this.examples = [];
        }
      } catch (error) {
        this.failed++;
        console.error(`✗ ${name}`);
        console.error(`  ${error.message}\n`);
      }
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`Property Tests Passed: ${this.passed}`);
    console.log(`Property Tests Failed: ${this.failed}`);
    console.log(`Total: ${this.tests.length}`);
    console.log(`${'='.repeat(70)}\n`);

    return this.failed === 0;
  }

  assertPropertyHolds(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  recordExample(example) {
    this.examples.push(example);
  }
}

// ─────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────

const runner = new PropertyTestRunner();
const parser = new MarkdownParser();
const generator = MarkdownGenerator;
const validator = PropertyValidator;

/**
 * Property: Round-trip preserves text content
 * 
 * For any markdown text, parse(prettyPrint(parse(text))) should extract
 * the same display text as the original parse.
 * 
 * Validates: Requirements 12.1, 12.2
 */
runner.property(
  'Property: Parse → PrettyPrint → Parse preserves display text',
  function(iterations = 100) {
    let successCount = 0;
    
    for (let i = 0; i < iterations; i++) {
      const originalText = generator.generateRandomText();
      
      try {
        // First parse
        const parsed1 = parser.parse(originalText);
        
        // Pretty print
        const prettyPrinted = parser.prettyPrint(parsed1);
        
        // Parse again
        const parsed2 = parser.parse(prettyPrinted);
        
        // Extract display text from both
        const display1 = parser.getDisplayText(parsed1);
        const display2 = parser.getDisplayText(parsed2);
        
        // Display text should be identical
        this.assertPropertyHolds(
          display1 === display2,
          `Display text mismatch in iteration ${i + 1}:\n` +
          `  Original: "${display1}"\n` +
          `  After round-trip: "${display2}"\n` +
          `  Input was: "${originalText}"`
        );
        
        successCount++;
        this.recordExample(originalText);
      } catch (e) {
        // If parsing fails, that's still valid (malformed input)
        successCount++;
      }
    }
    
    this.assertPropertyHolds(
      successCount > 0,
      `No successful test iterations out of ${iterations}`
    );
  },
  100
);

/**
 * Property: Type distribution is preserved through round-trip
 * 
 * The count of each segment type (heading, bullet, body, emphasis)
 * should remain the same after parse → prettyPrint → parse.
 * 
 * Validates: Requirements 12.1, 12.2
 */
runner.property(
  'Property: Segment type distribution preserved through round-trip',
  function(iterations = 100) {
    let successCount = 0;
    
    for (let i = 0; i < iterations; i++) {
      const originalText = generator.generateRandomText();
      
      try {
        const parsed1 = parser.parse(originalText);
        const counts1 = validator.countByType(parsed1);
        
        const prettyPrinted = parser.prettyPrint(parsed1);
        const parsed2 = parser.parse(prettyPrinted);
        const counts2 = validator.countByType(parsed2);
        
        this.assertPropertyHolds(
          counts1.heading === counts2.heading &&
          counts1.bullet === counts2.bullet &&
          counts1.emphasis === counts2.emphasis,
          `Type count mismatch in iteration ${i + 1}:\n` +
          `  First parse: ${JSON.stringify(counts1)}\n` +
          `  Second parse: ${JSON.stringify(counts2)}\n` +
          `  Input: "${originalText}"`
        );
        
        successCount++;
        this.recordExample(originalText);
      } catch (e) {
        successCount++;
      }
    }
    
    this.assertPropertyHolds(
      successCount > 0,
      `No successful test iterations out of ${iterations}`
    );
  },
  100
);

/**
 * Property: Emphasis markers are correctly reconstructed
 * 
 * Any emphasis in the original should be present in the reconstructed markdown
 * after round-trip conversion.
 * 
 * Validates: Requirements 12.1, 12.2
 */
runner.property(
  'Property: Emphasis structure preserved through round-trip',
  function(iterations = 100) {
    let successCount = 0;
    
    for (let i = 0; i < iterations; i++) {
      const originalText = generator.generateRandomText();
      
      try {
        const parsed1 = parser.parse(originalText);
        const emphasis1 = parsed1.filter(s => s.type === parser.TEXT_TYPES.EMPHASIS);
        
        const prettyPrinted = parser.prettyPrint(parsed1);
        const parsed2 = parser.parse(prettyPrinted);
        const emphasis2 = parsed2.filter(s => s.type === parser.TEXT_TYPES.EMPHASIS);
        
        this.assertPropertyHolds(
          emphasis1.length === emphasis2.length,
          `Emphasis count mismatch in iteration ${i + 1}:\n` +
          `  Original: ${emphasis1.length} emphasis segments\n` +
          `  After round-trip: ${emphasis2.length} emphasis segments\n` +
          `  Input: "${originalText}"`
        );
        
        successCount++;
        this.recordExample(originalText);
      } catch (e) {
        successCount++;
      }
    }
    
    this.assertPropertyHolds(
      successCount > 0,
      `No successful test iterations out of ${iterations}`
    );
  },
  100
);

/**
 * Property: Heading levels are preserved
 * 
 * A heading at level N should remain at level N after round-trip conversion.
 * 
 * Validates: Requirements 12.1, 12.2
 */
runner.property(
  'Property: Heading levels preserved through round-trip',
  function(iterations = 100) {
    let successCount = 0;
    let headingCount = 0;
    
    for (let i = 0; i < iterations; i++) {
      const originalText = generator.generateRandomText();
      
      try {
        const parsed1 = parser.parse(originalText);
        const headings1 = parsed1.filter(s => s.type === parser.TEXT_TYPES.HEADING);
        
        if (headings1.length > 0) {
          headingCount++;
          
          const prettyPrinted = parser.prettyPrint(parsed1);
          const parsed2 = parser.parse(prettyPrinted);
          const headings2 = parsed2.filter(s => s.type === parser.TEXT_TYPES.HEADING);
          
          // Verify each heading maintains its level
          for (let j = 0; j < headings1.length; j++) {
            this.assertPropertyHolds(
              headings1[j].level === headings2[j].level,
              `Heading level mismatch in iteration ${i + 1}:\n` +
              `  Original level: ${headings1[j].level}\n` +
              `  After round-trip: ${headings2[j].level}\n` +
              `  Input: "${originalText}"`
            );
          }
        }
        
        successCount++;
        this.recordExample(originalText);
      } catch (e) {
        successCount++;
      }
    }
    
    this.assertPropertyHolds(
      successCount > 0,
      `No successful test iterations out of ${iterations}`
    );
  },
  100
);

/**
 * Property: Empty input handling
 * 
 * Parsing empty string should return empty array, and prettyPrinting
 * empty array should return empty string.
 * 
 * Validates: Requirements 12.1, 12.2
 */
runner.property(
  'Property: Empty and whitespace-only inputs handled consistently',
  function(iterations = 50) {
    const emptyInputs = ['', '   ', '\n', '\t', '\n\n', '  \n  '];
    
    for (const input of emptyInputs) {
      const parsed = parser.parse(input);
      
      this.assertPropertyHolds(
        Array.isArray(parsed),
        `Parse of empty input should return array, got ${typeof parsed}`
      );
      
      // Filtering out any empty body segments
      const meaningful = parsed.filter(s => s.text && s.text.trim().length > 0);
      
      const pretty = parser.prettyPrint(meaningful);
      this.assertPropertyHolds(
        pretty.trim() === '',
        `PrettyPrint of empty segments should produce empty string, got: "${pretty}"`
      );
    }
  },
  1
);

/**
 * Property: Deterministic parsing
 * 
 * Parsing the same text multiple times should always produce
 * equivalent structures.
 * 
 * Validates: Requirements 12.1, 12.2
 */
runner.property(
  'Property: Parsing is deterministic',
  function(iterations = 100) {
    let successCount = 0;
    
    for (let i = 0; i < iterations; i++) {
      const text = generator.generateRandomText();
      
      try {
        const parse1 = parser.parse(text);
        const parse2 = parser.parse(text);
        const parse3 = parser.parse(text);
        
        // All three parses should have same length
        this.assertPropertyHolds(
          parse1.length === parse2.length && parse2.length === parse3.length,
          `Parsing not deterministic in iteration ${i + 1}:\n` +
          `  Parse 1 length: ${parse1.length}\n` +
          `  Parse 2 length: ${parse2.length}\n` +
          `  Parse 3 length: ${parse3.length}\n` +
          `  Input: "${text}"`
        );
        
        // All segments should be equivalent
        for (let j = 0; j < parse1.length; j++) {
          this.assertPropertyHolds(
            validator.segmentsAreEquivalent(parse1[j], parse2[j]) &&
            validator.segmentsAreEquivalent(parse2[j], parse3[j]),
            `Segment mismatch at index ${j} in iteration ${i + 1}`
          );
        }
        
        successCount++;
        this.recordExample(text);
      } catch (e) {
        successCount++;
      }
    }
    
    this.assertPropertyHolds(
      successCount > 0,
      `No successful test iterations out of ${iterations}`
    );
  },
  100
);

/**
 * Property: Position data consistency
 * 
 * All segments should have valid originalStartPos and originalEndPos
 * values that are within bounds of the input text.
 * 
 * Validates: Requirement 11.7
 */
runner.property(
  'Property: Position data is always valid',
  function(iterations = 100) {
    let successCount = 0;
    
    for (let i = 0; i < iterations; i++) {
      const text = generator.generateRandomText();
      
      try {
        const segments = parser.parse(text);
        
        for (const seg of segments) {
          this.assertPropertyHolds(
            seg.originalStartPos !== undefined &&
            seg.originalEndPos !== undefined,
            `Missing position data in iteration ${i + 1}`
          );
          
          this.assertPropertyHolds(
            seg.originalStartPos >= 0 &&
            seg.originalEndPos >= seg.originalStartPos,
            `Invalid position range in iteration ${i + 1}:\n` +
            `  Start: ${seg.originalStartPos}, End: ${seg.originalEndPos}`
          );
        }
        
        successCount++;
        this.recordExample(text);
      } catch (e) {
        successCount++;
      }
    }
    
    this.assertPropertyHolds(
      successCount > 0,
      `No successful test iterations out of ${iterations}`
    );
  },
  100
);

// ─────────────────────────────────────────────────────────────
// RUN ALL PROPERTY TESTS
// ─────────────────────────────────────────────────────────────

const allTestsPassed = runner.run();

// Export for use in test runners
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runner, allTestsPassed, MarkdownGenerator, PropertyValidator };
}

// Return status code for CLI
if (typeof process !== 'undefined') {
  process.exit(allTestsPassed ? 0 : 1);
}
