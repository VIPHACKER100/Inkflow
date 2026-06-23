/**
 * CONTEXTUAL PER-CHARACTER JITTER ENGINE
 * 
 * Implements position-aware character variation with:
 * - Line position context (start, end, mid-word)
 * - Progressive baseline fatigue accumulation
 * - Hand-cramping simulation
 * - Fatigue reset at line breaks
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
 */

/**
 * CharacterVariationContext
 * 
 * Tracks position metadata for characters during rendering.
 * Used to apply contextual variation scaling based on position within a line.
 */
class CharacterVariationContext {
  constructor() {
    this.reset();
  }

  reset() {
    this.lineCharCount = 0;        // Total characters in current line
    this.lineCharIndex = 0;        // Current character position in line
    this.charCountInLine = 0;      // Total characters accumulated on current line
    this.isLineStart = false;      // Character is at the beginning of line
    this.isLineEnd = false;        // Character is at the end of line
    this.isInWord = false;         // Character is in middle of a word
    this.fatigueAccumulation = 0;  // Accumulated baseline fatigue in pixels
    this.charsProcessedThisLine = 0; // Counter for fatigue calculation
  }

  /**
   * Update context for a new character position
   * @param {number} charIndex - Current character index in line (0-based)
   * @param {number} totalCharsInLine - Total characters in this line
   * @param {boolean} isWordStart - Character starts a word
   * @param {boolean} isWordEnd - Character ends a word
   */
  updateForCharacter(charIndex, totalCharsInLine, isWordStart, isWordEnd) {
    this.lineCharIndex = charIndex;
    this.lineCharCount = totalCharsInLine;
    this.isLineStart = charIndex === 0;
    this.isLineEnd = charIndex === totalCharsInLine - 1;
    this.isInWord = !isWordStart && !isWordEnd;
    this.charsProcessedThisLine++;

    // Calculate progressive fatigue after 50 characters
    if (this.charsProcessedThisLine > 50) {
      this.fatigueAccumulation = (this.charsProcessedThisLine - 50) * 0.02;
    } else {
      this.fatigueAccumulation = 0;
    }
  }

  /**
   * Signal end of line and reset fatigue
   * Requirements: 1.5 - fatigue reset at line breaks
   */
  resetAtLineBreak() {
    this.charsProcessedThisLine = 0;
    this.fatigueAccumulation = 0;
    this.lineCharIndex = 0;
    this.lineCharCount = 0;
  }

  /**
   * Get variation scaling multipliers based on position context
   * Requirements: 1.1, 1.2, 1.3
   * @returns {object} Scaling factors {pressureScale, slantScale, spacingScale}
   */
  getPositionScaling() {
    let pressureScale = 1.0;
    let slantScale = 1.0;
    let spacingScale = 1.0;

    // 1.2× pressure at line-start (Req 1.1)
    if (this.isLineStart) {
      pressureScale = 1.2;
    }

    // 1.3× slant at line-end (Req 1.2)
    if (this.isLineEnd) {
      slantScale = 1.3;
    }

    // 1.5× spacing randomization after 80 chars per line (Req 1.7)
    if (this.charsProcessedThisLine > 80) {
      spacingScale = 1.5;
    }

    return {
      pressureScale,
      slantScale,
      spacingScale,
      fatigueOffset: this.fatigueAccumulation  // For baseline drift
    };
  }
}

/**
 * Enhanced character variation function with position context
 * 
 * Generates randomized per-character variation parameters with position-aware scaling.
 * 
 * @param {number} rotMax - Maximum rotation in degrees
 * @param {number} pressure - Base pressure (0-1)
 * @param {number} fontSize - Font size in pixels
 * @param {CharacterVariationContext} context - Position context (optional)
 * @returns {object} Variation parameters with position-aware scaling applied
 * 
 * Requirements: 1.1-1.8
 */
function getCharVariationWithContext(rotMax, pressure, fontSize, context) {
  const rand = (min, max) => min + Math.random() * (max - min);
  const k = (fontSize || 22) / 22; // Scale factor for font size normalization

  // Base variation (Req 1.8 - preserve existing proportional scaling)
  const baseVariation = {
    tiltDeg: rand(-rotMax, rotMax),
    scaleY: rand(0.97, 1.03),
    scaleX: rand(0.98, 1.02),
    baselineOff: rand(-0.4, 0.4) * k,
    spacingExtra: rand(-0.4, 0.6) * k,
    pressureMod: 1 - (Math.random() * pressure * 1.4),
    opacity: rand(0.92, 1.0),
  };

  // If no context provided, return base variation
  if (!context) {
    return baseVariation;
  }

  // Get position-aware scaling multipliers
  const scaling = context.getPositionScaling();

  // Apply position-aware variation scaling
  // Req 1.1: 1.2× pressure at line-start
  baseVariation.pressureMod *= scaling.pressureScale;

  // Req 1.2: 1.3× slant at line-end
  baseVariation.tiltDeg *= scaling.slantScale;

  // Req 1.4: Progressive baseline fatigue accumulation (0.02px per char after 50 chars)
  baseVariation.baselineOff -= scaling.fatigueOffset;

  // Req 1.7: 1.5× spacing randomization after 80 chars per line
  baseVariation.spacingExtra *= scaling.spacingScale;

  return baseVariation;
}

/**
 * Backward-compatible wrapper - maintains existing API
 * For use in existing code that doesn't have context
 */
function getCharVariation(rotMax, pressure, fontSize) {
  return getCharVariationWithContext(rotMax, pressure, fontSize, null);
}

// Export for Node.js/test environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CharacterVariationContext,
    getCharVariation,
    getCharVariationWithContext
  };
}
