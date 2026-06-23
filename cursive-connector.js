/**
 * CURSIVE CONNECTOR ENGINE
 * 
 * Implements cursive mode with connected letter strokes using quadratic Bezier curves.
 * Supports ligature pairs for common English letter combinations.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9
 */

/**
 * CursiveConnector
 * 
 * Manages connection strokes between characters and pre-defined ligature glyphs.
 * Applies only to Latin script lowercase letters (Req 3.7).
 */
class CursiveConnector {
  constructor() {
    // Define ligature pairs (Req 3.4)
    this.ligaturePairs = ['th', 'ch', 'sh', 'st', 'ct', 'll', 'ff', 'fi', 'fl'];
    
    // Character exit points (right side of character) - normalized to [0,1] scale
    // These are approximate exit points for lowercase letters
    this.charExitPoints = {
      'a': { x: 0.8, y: 0.3 },
      'b': { x: 0.75, y: 0.35 },
      'c': { x: 0.8, y: 0.4 },
      'd': { x: 0.75, y: 0.35 },
      'e': { x: 0.8, y: 0.4 },
      'f': { x: 0.6, y: 0.1 },
      'g': { x: 0.75, y: 0.4 },
      'h': { x: 0.75, y: 0.35 },
      'i': { x: 0.5, y: 0.25 },
      'j': { x: 0.45, y: 0.25 },
      'k': { x: 0.75, y: 0.35 },
      'l': { x: 0.5, y: 0.25 },
      'm': { x: 0.85, y: 0.4 },
      'n': { x: 0.75, y: 0.4 },
      'o': { x: 0.8, y: 0.4 },
      'p': { x: 0.75, y: 0.55 },
      'q': { x: 0.75, y: 0.55 },
      'r': { x: 0.65, y: 0.4 },
      's': { x: 0.75, y: 0.4 },
      't': { x: 0.55, y: 0.2 },
      'u': { x: 0.75, y: 0.4 },
      'v': { x: 0.75, y: 0.4 },
      'w': { x: 0.85, y: 0.4 },
      'x': { x: 0.75, y: 0.4 },
      'y': { x: 0.75, y: 0.5 },
      'z': { x: 0.75, y: 0.4 }
    };

    // Character entry points (left side of character) - normalized to [0,1] scale
    // These are approximate entry points for lowercase letters
    this.charEntryPoints = {
      'a': { x: 0.2, y: 0.3 },
      'b': { x: 0.2, y: 0.1 },
      'c': { x: 0.2, y: 0.4 },
      'd': { x: 0.2, y: 0.1 },
      'e': { x: 0.2, y: 0.4 },
      'f': { x: 0.4, y: 0.1 },
      'g': { x: 0.2, y: 0.1 },
      'h': { x: 0.2, y: 0.1 },
      'i': { x: 0.4, y: 0.25 },
      'j': { x: 0.45, y: 0.25 },
      'k': { x: 0.2, y: 0.1 },
      'l': { x: 0.4, y: 0.1 },
      'm': { x: 0.1, y: 0.4 },
      'n': { x: 0.2, y: 0.4 },
      'o': { x: 0.2, y: 0.4 },
      'p': { x: 0.2, y: 0.1 },
      'q': { x: 0.2, y: 0.1 },
      'r': { x: 0.2, y: 0.4 },
      's': { x: 0.2, y: 0.4 },
      't': { x: 0.4, y: 0.1 },
      'u': { x: 0.2, y: 0.4 },
      'v': { x: 0.1, y: 0.4 },
      'w': { x: 0.1, y: 0.4 },
      'x': { x: 0.2, y: 0.4 },
      'y': { x: 0.2, y: 0.4 },
      'z': { x: 0.2, y: 0.4 }
    };

    // Pre-defined ligature glyph shapes stored as SVG paths
    // These are simplified hand-drawn style paths
    this.ligatureGlyphs = {
      'th': 'M 0.2,0.3 Q 0.5,0.2 0.8,0.3 L 0.8,0.5 Q 0.5,0.6 0.2,0.5',
      'ch': 'M 0.2,0.1 L 0.2,0.5 Q 0.5,0.6 0.8,0.4 L 0.8,0.2',
      'sh': 'M 0.2,0.4 Q 0.4,0.3 0.6,0.4 L 0.8,0.2 Q 0.7,0.5 0.8,0.5',
      'st': 'M 0.2,0.4 Q 0.4,0.3 0.6,0.4 L 0.7,0.1 L 0.7,0.5',
      'ct': 'M 0.2,0.4 Q 0.4,0.3 0.6,0.4 L 0.7,0.1 L 0.7,0.5',
      'll': 'M 0.2,0.1 L 0.2,0.5 L 0.55,0.1 L 0.55,0.5',
      'ff': 'M 0.2,0.1 L 0.2,0.5 Q 0.3,0.35 0.4,0.35 L 0.5,0.1 L 0.5,0.5',
      'fi': 'M 0.2,0.1 L 0.2,0.5 Q 0.3,0.35 0.4,0.35 L 0.55,0.25 L 0.55,0.5',
      'fl': 'M 0.2,0.1 L 0.2,0.5 Q 0.3,0.35 0.4,0.35 L 0.6,0.1 L 0.6,0.5'
    };
  }

  /**
   * Check if a character pair should be rendered as a ligature
   * Req 3.4: Ligature pairs defined
   * 
   * @param {string} char1 - First character
   * @param {string} char2 - Second character
   * @returns {boolean} True if ligature pair exists
   */
  isLigaturePair(char1, char2) {
    if (!char1 || !char2) return false;
    const pair = char1.toLowerCase() + char2.toLowerCase();
    return this.ligaturePairs.includes(pair);
  }

  /**
   * Get the pre-defined ligature glyph path
   * Req 3.5: Use pre-defined connected glyph shapes
   * 
   * @param {string} char1 - First character
   * @param {string} char2 - Second character
   * @returns {string} SVG path data or null
   */
  getLigatureGlyphPath(char1, char2) {
    const pair = (char1 + char2).toLowerCase();
    return this.ligatureGlyphs[pair] || null;
  }

  /**
   * Check if a connection should be rendered between two characters
   * Req 3.6: No connection for uppercase, whitespace, or punctuation
   * Req 3.7: Only apply to Latin script
   * 
   * @param {string} char1 - Current character (will exit)
   * @param {string} char2 - Next character (will enter)
   * @param {boolean} isIndic - Whether text is Devanagari/Indic
   * @returns {boolean} True if connection should be drawn
   */
  shouldRenderConnection(char1, char2, isIndic) {
    // Req 3.7: Only apply to Latin script
    if (isIndic) return false;

    // Handle null/undefined characters
    if (!char1 || !char2) return false;

    // Req 3.6: Skip uppercase, whitespace, punctuation
    if (char2 === char2.toUpperCase() || /\s|\p{P}/u.test(char2)) {
      return false;
    }

    // Req 3.6: Also skip if first character is uppercase
    if (char1 === char1.toUpperCase()) {
      return false;
    }

    // Only connect lowercase letters
    return /^[a-z]$/.test(char1) && /^[a-z]$/.test(char2);
  }

  /**
   * Get exit point for a character
   * 
   * @param {string} char - Character
   * @param {number} charWidth - Width of character in pixels
   * @param {number} charHeight - Height of character in pixels
   * @returns {object} Exit point {x, y}
   */
  getExitPoint(char, charWidth, charHeight) {
    const normalized = this.charExitPoints[char.toLowerCase()] || { x: 0.8, y: 0.4 };
    return {
      x: charWidth * normalized.x,
      y: charHeight * normalized.y
    };
  }

  /**
   * Get entry point for a character
   * 
   * @param {string} char - Character
   * @param {number} charWidth - Width of character in pixels
   * @param {number} charHeight - Height of character in pixels
   * @returns {object} Entry point {x, y}
   */
  getEntryPoint(char, charWidth, charHeight) {
    const normalized = this.charEntryPoints[char.toLowerCase()] || { x: 0.2, y: 0.4 };
    return {
      x: charWidth * normalized.x,
      y: charHeight * normalized.y
    };
  }

  /**
   * Render a connection stroke between two characters
   * Req 3.2, 3.3: Render quadratic Bezier curve from exit to entry point
   * Req 3.9: Apply same ink color and pressure variation
   * 
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {object} exitPos - Exit position {x, y} in canvas coordinates
   * @param {object} exitPoint - Exit point relative to character
   * @param {object} entryPos - Entry position {x, y} in canvas coordinates
   * @param {object} entryPoint - Entry point relative to character
   * @param {string} inkColor - Ink color
   * @param {number} pressure - Pressure variation multiplier
   * @param {number} fontSize - Font size for line width scaling
   */
  renderConnectionStroke(ctx, exitPos, exitPoint, entryPos, entryPoint, inkColor, pressure, fontSize) {
    if (!ctx) return;

    ctx.save();
    
    // Calculate actual exit and entry points in canvas space
    const startX = exitPos.x + exitPoint.x;
    const startY = exitPos.y + exitPoint.y;
    const endX = entryPos.x + entryPoint.x;
    const endY = entryPos.y + entryPoint.y;

    // Quadratic Bezier curve with control point for natural curve
    const controlX = (startX + endX) / 2;
    const controlY = (startY + endY) / 2 - (fontSize * 0.1); // Curve upward slightly

    // Set stroke style (Req 3.9: same ink color and pressure variation)
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(0.5, fontSize * 0.05 * pressure);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.9; // Slightly transparent for natural look

    // Draw quadratic Bezier curve
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(controlX, controlY, endX, endY);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Render a ligature glyph
   * Req 3.5: Use pre-defined connected glyph shape
   * 
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {string} char1 - First character
   * @param {string} char2 - Second character
   * @param {string} inkColor - Ink color
   * @param {number} fontSize - Font size
   * @param {number} pressure - Pressure variation
   */
  renderLigatureGlyph(ctx, x, y, char1, char2, inkColor, fontSize, pressure) {
    const path = this.getLigatureGlyphPath(char1, char2);
    if (!path) return;

    ctx.save();
    ctx.translate(x, y);

    // Scale based on font size
    const scale = fontSize / 22; // Normalize to base font size of 22
    ctx.scale(scale, scale);

    ctx.strokeStyle = inkColor;
    ctx.lineWidth = Math.max(0.5, 1.2 * pressure);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.95;

    // Parse and render SVG path (simplified - just render as stroke)
    try {
      const pathObj = new Path2D(path);
      ctx.stroke(pathObj);
    } catch (e) {
      // Fallback: path parsing not supported, just render empty space
      // The connection stroke will still be drawn separately
    }

    ctx.restore();
  }
}

// Export for Node.js/test environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CursiveConnector };
}
