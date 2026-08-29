/**
 * font-compilation.js — Pure image processing for custom font generation.
 * Functions: traceCanvasContours, isCellBlank, simplifyPath, loadImageToCanvas, canvasToOpentypePath
 * Extracted from index.js (lines 4451–4675). Zero DOM dependencies.
 */
(function () {
  'use strict';

  // Connected Component Vector Tracer — Moore-Neighbor contour tracing
  function traceCanvasContours(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const width = imageData.width;
    const height = imageData.height;
    const pixels = imageData.data;

    const binary = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const r = pixels[i * 4];
      const g = pixels[i * 4 + 1];
      const b = pixels[i * 4 + 2];
      const a = pixels[i * 4 + 3];

      if (a > 50 && (r + g + b) / 3 < 160) {
        binary[i] = 1;
      } else {
        binary[i] = 0;
      }
    }

    const visited = new Uint8Array(width * height);
    const contours = [];

    const dx = [-1, 0, 1, 1, 1, 0, -1, -1];
    const dy = [-1, -1, -1, 0, 1, 1, 1, 0];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (binary[idx] === 1 && !visited[idx]) {
          if (binary[idx - 1] === 0) {
            const points = [];
            let cx = x;
            let cy = y;
            let dir = 7;

            const startX = x;
            const startY = y;

            let limit = 4000;
            while (limit-- > 0) {
              points.push({ x: cx, y: cy });
              visited[cy * width + cx] = 1;

              let found = false;
              for (let i = 0; i < 8; i++) {
                const checkDir = (dir + 1 + i) % 8;
                const nx = cx + dx[checkDir];
                const ny = cy + dy[checkDir];

                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                  if (binary[ny * width + nx] === 1) {
                    cx = nx;
                    cy = ny;
                    dir = (checkDir + 4) % 8;
                    found = true;
                    break;
                  }
                }
              }

              if (!found || (cx === startX && cy === startY)) {
                break;
              }
            }

            if (points.length >= 3) {
              const smoothed = simplifyPath(points, 0.85);
              contours.push(smoothed);
            }
          }
        }
      }
    }
    return contours;
  }

  // Checks if a canvas cell contains any significant ink (dark pixels)
  function isCellBlank(canvas) {
    const ctx = canvas.getContext('2d');
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha > 50) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (brightness < 160) {
          return false;
        }
      }
    }
    return true;
  }

  // Ramer-Douglas-Peucker (RDP) Simplification Engine
  function simplifyPath(points, tolerance) {
    if (points.length <= 2) return points;

    const sqTolerance = tolerance * tolerance;

    function getSqSegDist(p, p1, p2) {
      let x = p1.x;
      let y = p1.y;
      let dx = p2.x - x;
      let dy = p2.y - y;

      if (dx !== 0 || dy !== 0) {
        const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
        if (t > 1) {
          x = p2.x;
          y = p2.y;
        } else if (t > 0) {
          x += dx * t;
          y += dy * t;
        }
      }

      dx = p.x - x;
      dy = p.y - y;
      return dx * dx + dy * dy;
    }

    function simplifyDPStep(points, first, last, sqTolerance, simplified) {
      let maxSqDist = sqTolerance;
      let index = -1;

      for (let i = first + 1; i < last; i++) {
        const sqDist = getSqSegDist(points[i], points[first], points[last]);
        if (sqDist > maxSqDist) {
          index = i;
          maxSqDist = sqDist;
        }
      }

      if (maxSqDist > sqTolerance) {
        if (index - first > 1) simplifyDPStep(points, first, index, sqTolerance, simplified);
        simplified.push(points[index]);
        if (last - index > 1) simplifyDPStep(points, index, last, sqTolerance, simplified);
      }
    }

    const simplified = [points[0]];
    simplifyDPStep(points, 0, points.length - 1, sqTolerance, simplified);
    simplified.push(points[points.length - 1]);
    return simplified;
  }

  // Loads a data URL image into a 256x256 canvas, centered and aspect-ratio preserved
  function loadImageToCanvas(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const scale = Math.min(256 / img.width, 256 / img.height);
        const scaledW = img.width * scale;
        const scaledH = img.height * scale;
        const x = (256 - scaledW) / 2;
        const y = (256 - scaledH) / 2;
        ctx.drawImage(img, x, y, scaledW, scaledH);
        resolve(canvas);
      };
      img.src = dataUrl;
    });
  }

  // Converts canvas contours to an OpenType.js Path object
  function canvasToOpentypePath(canvas) {
    const contours = traceCanvasContours(canvas);
    const path = new window.opentype.Path();

    if (contours.length === 0) return path;

    let globalMinX = Infinity,
      globalMaxX = -Infinity;
    let globalMinY = Infinity,
      globalMaxY = -Infinity;

    contours.forEach((points) => {
      points.forEach((p) => {
        globalMinX = Math.min(globalMinX, p.x);
        globalMaxX = Math.max(globalMaxX, p.x);
        globalMinY = Math.min(globalMinY, p.y);
        globalMaxY = Math.max(globalMaxY, p.y);
      });
    });

    const width = globalMaxX - globalMinX || 1;
    const height = globalMaxY - globalMinY || 1;

    const scale = Math.min(600 / width, 700 / height);

    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    const offsetX = 100 + (600 - scaledWidth) / 2;
    const offsetY = 100;

    contours.forEach((points) => {
      if (points.length < 3) return;

      const x0 = (points[0].x - globalMinX) * scale + offsetX;
      const y0 = 800 - (points[0].y - globalMinY) * scale - offsetY;
      path.moveTo(x0, y0);

      for (let i = 1; i < points.length; i++) {
        const px = (points[i].x - globalMinX) * scale + offsetX;
        const py = 800 - (points[i].y - globalMinY) * scale - offsetY;
        path.lineTo(px, py);
      }
      path.closePath();
    });

    return path;
  }

  const FontCompilation = {
    traceCanvasContours,
    isCellBlank,
    simplifyPath,
    loadImageToCanvas,
    canvasToOpentypePath,
  };

  if (typeof window !== 'undefined') {
    window.FontCompilation = FontCompilation;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FontCompilation;
  }
})();
