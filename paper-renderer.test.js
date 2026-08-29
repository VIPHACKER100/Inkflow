import { describe, it, expect, beforeAll } from 'vitest';

describe('PaperRenderer', () => {
  let R;
  let mockCtx;

  beforeAll(async () => {
    // Mock browser globals
    global.window = global;
    global.S = { margin: 80, paperStyle: 'ruled', inkColor: '#222', penStyle: 'smooth' };
    global.PAGE_W = 794;
    global.PAGE_H = 1123;

    // Minimal CanvasRenderingContext2D mock
    global.document = {
      createElement: (tag) => {
        if (tag === 'canvas') {
          const ctx = {
            clearRect: () => {},
            save: () => {},
            restore: () => {},
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            stroke: () => {},
            fillText: () => {},
            fillRect: () => {},
            arc: () => {},
            clip: () => {},
            fill: () => {},
            drawImage: () => {},
            createLinearGradient: () => ({ addColorStop: () => {} }),
            createRadialGradient: () => ({ addColorStop: () => {} }),
            setTransform: () => {},
            resetTransform: () => {},
            closePath: () => {},
            measureText: () => ({ width: 0 }),
            canvas: { width: 100, height: 100, toDataURL: () => 'data:image/png;base64,abc' },
          };
          return {
            width: 100,
            height: 100,
            getContext: () => ctx,
            toDataURL: () => 'data:image/png;base64,abc',
          };
        }
        return {};
      },
    };

    await import('./paper-renderer.js');
    R = window.PaperRenderer;

    mockCtx = {
      clearRect: () => {},
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fillText: () => {},
      fillRect: () => {},
      closePath: () => {},
      arc: () => {},
      fill: () => {},
      drawImage: () => {},
      createRadialGradient: () => ({ addColorStop: () => {} }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
    };
  });

  describe('Alignment Offsets', () => {
    it('returns negative offset for top alignment', () => {
      const topOff = R.getAlignmentOffset('top', 16, 1.5);
      expect(topOff).toBeLessThan(0);
      expect(topOff).toBeCloseTo(-(16 * 1.5 * 0.35));
    });

    it('returns positive offset for bottom alignment', () => {
      const bottomOff = R.getAlignmentOffset('bottom', 16, 1.5);
      expect(bottomOff).toBeGreaterThan(0);
      expect(bottomOff).toBeCloseTo(16 * 1.5 * 0.35);
    });

    it('returns 0 for middle alignment and unknown alignment', () => {
      expect(R.getAlignmentOffset('middle', 16, 1.5)).toBe(0);
      expect(R.getAlignmentOffset('invalid', 16, 1.5)).toBe(0);
    });

    it('scales correctly for different font sizes and line heights', () => {
      const big = R.getAlignmentOffset('top', 24, 2.0);
      const small = R.getAlignmentOffset('top', 12, 1.0);
      expect(big).toBeCloseTo(-(24 * 2.0 * 0.35));
      expect(small).toBeCloseTo(-(12 * 1.0 * 0.35));
    });
  });

  describe('drawPaperBackground', () => {
    const styles = ['ruled', 'plain', 'grid', 'legal', 'vintage', 'dark', 'dot_grid', 'engineering', 'music', 'dated'];

    styles.forEach((style) => {
      it(`renders paper background style '${style}' without error`, () => {
        expect(() => R.drawPaperBackground(mockCtx, style)).not.toThrow();
      });
    });
  });

  describe('drawLayoutDecorations', () => {
    it('handles standard layout decoration safely', () => {
      expect(() => R.drawLayoutDecorations(mockCtx, 'standard')).not.toThrow();
    });
  });

  describe('Exports', () => {
    it('exports all expected API functions on window.PaperRenderer', () => {
      expect(typeof R.drawLayoutDecorations).toBe('function');
      expect(typeof R.drawPaperBackground).toBe('function');
      expect(typeof R.renderSmudgeEffects).toBe('function');
      expect(typeof R.getAlignmentOffset).toBe('function');
    });
  });
});
