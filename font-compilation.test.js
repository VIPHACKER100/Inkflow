import { describe, it, expect } from 'vitest';
import { simplifyPath, isCellBlank } from './font-compilation.js';

describe('FontCompilation', () => {
  describe('simplifyPath (Ramer-Douglas-Peucker algorithm)', () => {
    it('returns empty array when given empty input', () => {
      expect(simplifyPath([], 2.0)).toEqual([]);
    });

    it('returns original points when point count is <= 2', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ];
      expect(simplifyPath(points, 2.0)).toEqual(points);
    });

    it('simplifies collinear intermediate points', () => {
      const collinearPoints = [
        { x: 0, y: 0 },
        { x: 2, y: 2 },
        { x: 5, y: 5 },
        { x: 8, y: 8 },
        { x: 10, y: 10 },
      ];
      const simplified = simplifyPath(collinearPoints, 1.0);
      expect(simplified).toHaveLength(2);
      expect(simplified[0]).toEqual({ x: 0, y: 0 });
      expect(simplified[1]).toEqual({ x: 10, y: 10 });
    });

    it('preserves significant corner points exceeding epsilon tolerance', () => {
      const cornerPoints = [
        { x: 0, y: 0 },
        { x: 5, y: 20 }, // High deflection
        { x: 10, y: 0 },
      ];
      const simplified = simplifyPath(cornerPoints, 1.0);
      expect(simplified).toHaveLength(3);
      expect(simplified[1]).toEqual({ x: 5, y: 20 });
    });
  });

  describe('isCellBlank', () => {
    function createMockCanvas(width, height, pixelData) {
      return {
        width,
        height,
        getContext: (type) => {
          if (type === '2d') {
            return {
              getImageData: (x, y, w, h) => ({
                width: w,
                height: h,
                data: pixelData,
              }),
            };
          }
          return null;
        },
      };
    }

    it('identifies an all-white or transparent cell as blank', () => {
      const width = 10;
      const height = 10;
      const data = new Uint8ClampedArray(width * height * 4);
      // Fill with white (255, 255, 255, 255)
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 255;
      }

      const canvas = createMockCanvas(width, height, data);
      expect(isCellBlank(canvas)).toBe(true);
    });

    it('identifies drawn strokes (dark pixels) as non-blank', () => {
      const width = 10;
      const height = 10;
      const data = new Uint8ClampedArray(width * height * 4);
      // Fill with white
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 255;
      }
      // Add 20 dark pixels (ink stroke)
      for (let i = 0; i < 20; i++) {
        const idx = i * 4;
        data[idx] = 20;
        data[idx + 1] = 20;
        data[idx + 2] = 20;
        data[idx + 3] = 255;
      }

      const canvas = createMockCanvas(width, height, data);
      expect(isCellBlank(canvas)).toBe(false);
    });
  });
});
