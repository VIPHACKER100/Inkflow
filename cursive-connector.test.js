/**
 * CURSIVE CONNECTOR TESTS
 * 
 * Tests for the CursiveConnector class that manages connection strokes
 * and ligature pairs for cursive mode rendering.
 * 
 * Requirements: 3.1, 3.4, 3.7
 */

const { CursiveConnector } = require('./cursive-connector.js');

describe('CursiveConnector', () => {

  let connector;

  beforeEach(() => {
    connector = new CursiveConnector();
  });

  describe('Ligature Pairs (Req 3.4)', () => {
    
    test('should define all required ligature pairs', () => {
      const requiredPairs = ['th', 'ch', 'sh', 'st', 'ct', 'll', 'ff', 'fi', 'fl'];
      expect(connector.ligaturePairs).toEqual(expect.arrayContaining(requiredPairs));
    });

    test('should identify ligature pair "th"', () => {
      expect(connector.isLigaturePair('t', 'h')).toBe(true);
    });

    test('should identify ligature pair "ch"', () => {
      expect(connector.isLigaturePair('c', 'h')).toBe(true);
    });

    test('should identify ligature pair "fi"', () => {
      expect(connector.isLigaturePair('f', 'i')).toBe(true);
    });

    test('should not identify non-ligature pairs', () => {
      expect(connector.isLigaturePair('a', 'b')).toBe(false);
      expect(connector.isLigaturePair('x', 'y')).toBe(false);
    });

    test('should handle case-insensitive ligature detection', () => {
      expect(connector.isLigaturePair('T', 'H')).toBe(true);
      expect(connector.isLigaturePair('T', 'h')).toBe(true);
    });

    test('should return null for non-existent ligature glyphs', () => {
      expect(connector.getLigatureGlyphPath('a', 'b')).toBeNull();
    });

    test('should return glyph path for defined ligature pairs', () => {
      const thPath = connector.getLigatureGlyphPath('t', 'h');
      expect(thPath).toBeTruthy();
      expect(typeof thPath).toBe('string');
    });
  });

  describe('Pre-defined Ligature Glyphs (Req 3.4, 3.5)', () => {
    
    test('should store SVG paths for all ligatures', () => {
      const ligatures = ['th', 'ch', 'sh', 'st', 'ct', 'll', 'ff', 'fi', 'fl'];
      ligatures.forEach(pair => {
        const path = connector.ligatureGlyphs[pair];
        expect(path).toBeTruthy();
        expect(typeof path).toBe('string');
        expect(path).toMatch(/^M\s/); // SVG paths start with M command
      });
    });
  });

  describe('Connection Rendering Logic (Req 3.6, 3.7)', () => {
    
    test('should render connection for consecutive lowercase letters', () => {
      expect(connector.shouldRenderConnection('a', 'b', false)).toBe(true);
      expect(connector.shouldRenderConnection('m', 'n', false)).toBe(true);
    });

    test('should not render connection when next character is uppercase (Req 3.6)', () => {
      expect(connector.shouldRenderConnection('a', 'B', false)).toBe(false);
      expect(connector.shouldRenderConnection('h', 'E', false)).toBe(false);
    });

    test('should not render connection when next character is whitespace (Req 3.6)', () => {
      expect(connector.shouldRenderConnection('a', ' ', false)).toBe(false);
      expect(connector.shouldRenderConnection('d', '\n', false)).toBe(false);
    });

    test('should not render connection when next character is punctuation (Req 3.6)', () => {
      expect(connector.shouldRenderConnection('a', '.', false)).toBe(false);
      expect(connector.shouldRenderConnection('e', ',', false)).toBe(false);
      expect(connector.shouldRenderConnection('t', '!', false)).toBe(false);
    });

    test('should not render connection for Devanagari/Indic text (Req 3.7)', () => {
      expect(connector.shouldRenderConnection('a', 'b', true)).toBe(false);
    });

    test('should not render connection when first character is not lowercase letter', () => {
      expect(connector.shouldRenderConnection('A', 'b', false)).toBe(false);
      expect(connector.shouldRenderConnection('1', 'b', false)).toBe(false);
    });

    test('should handle null/undefined characters gracefully', () => {
      expect(connector.shouldRenderConnection(null, 'b', false)).toBe(false);
      expect(connector.shouldRenderConnection('a', null, false)).toBe(false);
      expect(connector.shouldRenderConnection(undefined, 'b', false)).toBe(false);
    });
  });

  describe('Character Exit Points (Req 3.2)', () => {
    
    test('should return exit point for known characters', () => {
      const exitPoint = connector.getExitPoint('a', 40, 20);
      expect(exitPoint).toHaveProperty('x');
      expect(exitPoint).toHaveProperty('y');
      expect(exitPoint.x).toBeGreaterThan(0);
      expect(exitPoint.y).toBeGreaterThan(0);
    });

    test('should scale exit point based on character width/height', () => {
      const exitPoint1 = connector.getExitPoint('a', 40, 20);
      const exitPoint2 = connector.getExitPoint('a', 80, 40);
      expect(exitPoint2.x).toBeGreaterThan(exitPoint1.x);
      expect(exitPoint2.y).toBeGreaterThan(exitPoint1.y);
    });

    test('should use default exit point for unknown characters', () => {
      const exitPoint = connector.getExitPoint('?', 40, 20);
      expect(exitPoint).toHaveProperty('x');
      expect(exitPoint).toHaveProperty('y');
    });
  });

  describe('Character Entry Points (Req 3.2)', () => {
    
    test('should return entry point for known characters', () => {
      const entryPoint = connector.getEntryPoint('b', 40, 20);
      expect(entryPoint).toHaveProperty('x');
      expect(entryPoint).toHaveProperty('y');
      expect(entryPoint.x).toBeGreaterThan(0);
      expect(entryPoint.y).toBeGreaterThan(0);
    });

    test('should return different points for exit and entry', () => {
      const exitPoint = connector.getExitPoint('a', 40, 20);
      const entryPoint = connector.getEntryPoint('b', 40, 20);
      // Exit point should be on the right side, entry on the left
      expect(exitPoint.x).toBeGreaterThan(entryPoint.x);
    });
  });

  describe('Connection Stroke Rendering (Req 3.2, 3.3, 3.9)', () => {
    
    test('should handle missing canvas context gracefully', () => {
      expect(() => {
        connector.renderConnectionStroke(null, { x: 0, y: 0 }, { x: 10, y: 5 }, 
                                         { x: 50, y: 0 }, { x: 10, y: 5 }, 
                                         '#000000', 1.0, 22);
      }).not.toThrow();
    });

    test('should render with canvas context', () => {
      const mockCanvas = {
        save: jest.fn(),
        restore: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        quadraticCurveTo: jest.fn(),
        stroke: jest.fn()
      };

      connector.renderConnectionStroke(mockCanvas, { x: 0, y: 0 }, { x: 10, y: 5 },
                                       { x: 50, y: 0 }, { x: 10, y: 5 },
                                       '#000000', 1.0, 22);

      expect(mockCanvas.save).toHaveBeenCalled();
      expect(mockCanvas.restore).toHaveBeenCalled();
    });

    test('should apply ink color to connection stroke (Req 3.9)', () => {
      const mockCanvas = {
        save: jest.fn(),
        restore: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        quadraticCurveTo: jest.fn(),
        stroke: jest.fn()
      };

      const inkColor = '#0a3d62';
      connector.renderConnectionStroke(mockCanvas, { x: 0, y: 0 }, { x: 10, y: 5 },
                                       { x: 50, y: 0 }, { x: 10, y: 5 },
                                       inkColor, 1.0, 22);

      expect(mockCanvas.strokeStyle).toBe(inkColor);
    });

    test('should apply pressure variation to connection stroke (Req 3.9)', () => {
      const mockCanvas = {
        save: jest.fn(),
        restore: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        quadraticCurveTo: jest.fn(),
        stroke: jest.fn()
      };

      connector.renderConnectionStroke(mockCanvas, { x: 0, y: 0 }, { x: 10, y: 5 },
                                       { x: 50, y: 0 }, { x: 10, y: 5 },
                                       '#000000', 1.5, 22);

      // Line width should be affected by pressure
      expect(mockCanvas.lineWidth).toBeGreaterThan(0);
    });
  });

  describe('Ligature Glyph Rendering', () => {
    
    test('should handle missing canvas context gracefully', () => {
      expect(() => {
        connector.renderLigatureGlyph(null, 50, 50, 't', 'h', '#000000', 22, 1.0);
      }).not.toThrow();
    });

    test('should not throw on non-existent ligature pair', () => {
      const mockCanvas = {
        save: jest.fn(),
        restore: jest.fn(),
        translate: jest.fn(),
        scale: jest.fn(),
        stroke: jest.fn()
      };

      expect(() => {
        connector.renderLigatureGlyph(mockCanvas, 50, 50, 'a', 'b', '#000000', 22, 1.0);
      }).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    
    test('should handle complete connection workflow for valid pair', () => {
      // Check if pair should connect
      expect(connector.shouldRenderConnection('t', 'h', false)).toBe(true);
      
      // Get the ligature glyph path
      const glyphPath = connector.getLigatureGlyph('t', 'h');
      // May be null if not a direct ligature, or a path if defined
      
      // Get exit and entry points
      const exitPoint = connector.getExitPoint('t', 40, 20);
      const entryPoint = connector.getEntryPoint('h', 40, 20);
      
      expect(exitPoint).toBeTruthy();
      expect(entryPoint).toBeTruthy();
    });

    test('should skip connection for uppercase transition', () => {
      // 'the' should connect t-h
      expect(connector.shouldRenderConnection('t', 'h', false)).toBe(true);
      
      // 'tHe' should not connect t-H
      expect(connector.shouldRenderConnection('t', 'H', false)).toBe(false);
    });
  });

});
