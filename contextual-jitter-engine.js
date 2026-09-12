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
    this.lineCharCount = 0; // Total characters in current line
    this.lineCharIndex = 0; // Current character position in line
    this.charCountInLine = 0; // Total characters accumulated on current line
    this.isLineStart = false; // Character is at the beginning of line
    this.isLineEnd = false; // Character is at the end of line
    this.isInWord = false; // Character is in middle of a word
    this.fatigueAccumulation = 0; // Accumulated baseline fatigue in pixels
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
      fatigueOffset: this.fatigueAccumulation, // For baseline drift
    };
  }
}

/**
 * FNV-1a 32-bit hash — seeds the PRNG from note text so layout is deterministic
 * across re-renders, page switches, and PDF exports (upstream v1.6.22).
 */
function hashString(str) {
  let hash = 0x811c9dc5;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** mulberry32 — tiny fast seeded PRNG returning () => [0,1). */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Create a seeded PRNG from a numeric seed (pair with hashString). */
function createPRNG(seed) {
  return mulberry32(seed >>> 0);
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
 * @param {object} [opts] - Seeded realism path (upstream v1.6.22):
 *   { prng, realism, isIndic }. When omitted, the legacy unseeded behavior runs.
 * @returns {object} Variation parameters with position-aware scaling applied
 *
 * Requirements: 1.1-1.8
 */
function getCharVariationWithContext(rotMax, pressure, fontSize, context, opts) {
  const k = (fontSize || 22) / 22; // Scale factor for font size normalization

  if (opts && typeof opts === 'object') {
    // Seeded realism path: transforms scale with S.realism; Devanagari uses
    // tighter jitter multipliers (0.3 rot / 0.4 scale) to protect matras and
    // the shirorekha top line.
    const prng = typeof opts.prng === 'function' ? opts.prng : Math.random;
    const r = opts.realism === undefined ? 0.5 : opts.realism;
    const scriptRotMult = opts.isIndic ? 0.3 : 1.0;
    const scriptScaleMult = opts.isIndic ? 0.4 : 1.0;
    const prand = (min, max) => min + prng() * (max - min);

    const maxTilt = Math.max(rotMax, 3.5 * r) * scriptRotMult;
    const scaleJitter = 0.075 * r * scriptScaleMult;

    const baseVariation = {
      tiltDeg: prand(-maxTilt, maxTilt),
      scaleY: 1.0 + prand(-scaleJitter, scaleJitter),
      scaleX: 1.0 + prand(-scaleJitter, scaleJitter),
      baselineOff: prand(-0.4, 0.4) * k * r * scriptScaleMult,
      spacingExtra: prand(-0.4, 0.6) * k,
      pressureMod: (1 - prng() * pressure * 1.4) * (1 + prand(-0.15, 0.15) * r),
      opacity: 1.0 - prng() * 0.15 * r,
    };

    if (context) {
      const scaling = context.getPositionScaling();
      baseVariation.pressureMod *= scaling.pressureScale;
      baseVariation.tiltDeg *= scaling.slantScale;
      baseVariation.baselineOff -= scaling.fatigueOffset;
      baseVariation.spacingExtra *= scaling.spacingScale;
    }
    return baseVariation;
  }

  // Legacy path (unchanged, unseeded): preserves the pre-realism behavior.
  const rand = (min, max) => min + Math.random() * (max - min);

  // Base variation (Req 1.8 - preserve existing proportional scaling)
  const baseVariation = {
    tiltDeg: rand(-rotMax, rotMax),
    scaleY: rand(0.97, 1.03),
    scaleX: rand(0.98, 1.02),
    baselineOff: rand(-0.4, 0.4) * k,
    spacingExtra: rand(-0.4, 0.6) * k,
    pressureMod: 1 - Math.random() * pressure * 1.4,
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
    getCharVariationWithContext,
    hashString,
    mulberry32,
    createPRNG,
  };
}
