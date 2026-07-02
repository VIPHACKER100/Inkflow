/**
 * SCRIPT DETECTOR ENGINE
 *
 * Implements script detection and font switching for multi-language mixing (Hinglish Support).
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.6, 8.7
 */

class ScriptDetector {
  /**
   * Identifies if text contains Devanagari characters (U+0900-U+097F)
   * Also checks extended Indic ranges for broader support
   */
  static isIndicScript(text) {
    return /[\u0900-\u097F\uA8E0-\uA8FF\u1CD0-\u1CFF\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0D80-\u0DFF]/.test(text);
  }

  /**
   * Identifies if text contains Basic Latin characters (U+0041-U+007A and U+0061-U+007A)
   */
  static isBasicLatin(text) {
    return /[A-Za-z]/.test(text);
  }

  /**
   * Classify a single character into a script category
   */
  static classifyChar(ch) {
    if (!ch) return 'neutral';
    if (this.isIndicScript(ch)) return 'indic';
    if (this.isBasicLatin(ch)) return 'latin';
    return 'neutral';
  }
}

class FontSwitcher {
  constructor() {
    // Fonts known to include Devanagari glyphs
    this.DEVANAGARI_FONTS = new Set([
      'Kalam', 'Amita', 'Noto Sans Devanagari', 'Noto Serif Devanagari',
      'Hind', 'Tiro Devanagari Hindi', 'Baloo 2', 'Martel'
    ]);
  }

  /**
   * Build a font-family string that guarantees proper Devanagari rendering.
   */
  getFontStack(isIndic, currentFont) {
    if (!isIndic || this.DEVANAGARI_FONTS.has(currentFont)) {
      return `"${currentFont}", ${this.getFallbackStack()}`;
    }
    return `"${currentFont}", "Hind", ${this.getFallbackStack()}`;
  }

  /**
   * Provides a safe system fallback for failed characters.
   */
  getFallbackStack() {
    return `"Noto Sans Devanagari", "Noto Serif", sans-serif`;
  }

  resolveNeutralScript(graphemes, index, fallback = 'latin') {
    for (let i = index - 1; i >= 0; i--) {
      const leftClass = ScriptDetector.classifyChar(graphemes[i]);
      if (leftClass !== 'neutral') return leftClass;
    }
    for (let i = index + 1; i < graphemes.length; i++) {
      const rightClass = ScriptDetector.classifyChar(graphemes[i]);
      if (rightClass !== 'neutral') return rightClass;
    }
    return fallback;
  }

  /**
   * Splits a word into runs of consistent scripts
   */
  getScriptRuns(text, getGraphemesFn) {
    const graphemes = getGraphemesFn(text);
    if (!graphemes.length) return [];

    const fallback = ScriptDetector.isIndicScript(text) ? 'indic' : 'latin';
    const runs = [];
    let activeScript = null;
    let buffer = '';

    for (let i = 0; i < graphemes.length; i++) {
      const ch = graphemes[i];
      let scriptClass = ScriptDetector.classifyChar(ch);
      
      if (scriptClass === 'neutral') {
        scriptClass = this.resolveNeutralScript(graphemes, i, fallback);
      }
      
      if (activeScript === null) {
        activeScript = scriptClass;
        buffer = ch;
        continue;
      }
      
      if (scriptClass === activeScript) {
        buffer += ch;
        continue;
      }
      
      // Transition point found
      runs.push({ text: buffer, isIndic: activeScript === 'indic' });
      activeScript = scriptClass;
      buffer = ch;
    }

    if (buffer) {
      runs.push({ text: buffer, isIndic: activeScript === 'indic' });
    }
    return runs;
  }

  /**
   * Main entry point to get script runs for a token, considering auto-switch setting
   */
  getTokenScriptRuns(text, autoSwitch, getGraphemesFn) {
    if (!text) return [];
    if (!autoSwitch) {
      return [{ text, isIndic: ScriptDetector.isIndicScript(text) }];
    }
    return this.getScriptRuns(text, getGraphemesFn);
  }
}

// Export for module systems (if applicable), or keep in global scope for InkFlow
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ScriptDetector, FontSwitcher };
}
