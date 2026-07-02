/**
 * layer-compositor.js
 * Multi-Layer Canvas Architecture for InkFlow (Task 16)
 *
 * Provides a layer management system with offscreen canvases,
 * blend modes, opacity controls, and z-index ordering.
 *
 * Integration: Each visible page canvas composites its layer stack
 * when rendering. The compositor does NOT replace the page canvases
 * but provides an API to manage separate drawing surfaces that are
 * merged onto the page canvas during the render step.
 */

class LayerCompositor {
  /**
   * @param {number} width  - canvas width  (typically PAGE_W)
   * @param {number} height - canvas height (typically PAGE_H)
   */
  constructor(width, height) {
    this.width = width;
    this.height = height;

    /** @type {Map<number, LayerStack>} pageIndex → LayerStack */
    this.pageStacks = new Map();

    // Supported blend modes (canvas globalCompositeOperation values)
    this.BLEND_MODES = [
      'source-over',   // normal
      'multiply',
      'screen',
      'overlay',
      'darken',
      'lighten',
      'color-dodge',
      'color-burn',
      'hard-light',
      'soft-light',
      'difference',
      'exclusion',
    ];

    this._nextLayerId = 1;
  }

  // ── Layer Stack per page ─────────────────────────────────────

  /**
   * Get or create a LayerStack for a specific page index.
   */
  getStack(pageIdx) {
    if (!this.pageStacks.has(pageIdx)) {
      const stack = new LayerStack(pageIdx, this.width, this.height);
      // Every page starts with a default "Background" layer
      stack.addLayer(this._nextLayerId++, 'Background', { locked: true });
      // And a "Content" layer where text is drawn
      stack.addLayer(this._nextLayerId++, 'Content');
      this.pageStacks.set(pageIdx, stack);
    }
    return this.pageStacks.get(pageIdx);
  }

  /**
   * Create a new layer on a specific page.
   * @returns {Layer} the created layer
   */
  createLayer(pageIdx, name, options = {}) {
    const stack = this.getStack(pageIdx);
    const layer = stack.addLayer(this._nextLayerId++, name, options);
    return layer;
  }

  /**
   * Delete a layer (except locked layers like Background).
   */
  deleteLayer(pageIdx, layerId) {
    const stack = this.getStack(pageIdx);
    return stack.removeLayer(layerId);
  }

  /**
   * Set a property on a layer: 'visible', 'opacity', 'blendMode', 'name', 'locked'.
   */
  setLayerProperty(pageIdx, layerId, property, value) {
    const stack = this.getStack(pageIdx);
    const layer = stack.getLayer(layerId);
    if (!layer) return false;

    if (property === 'blendMode') {
      if (!this.BLEND_MODES.includes(value)) {
        console.warn(`Unsupported blend mode: ${value}`);
        return false;
      }
    }
    if (property === 'opacity') {
      value = Math.max(0, Math.min(1, value));
    }

    layer[property] = value;
    return true;
  }

  /**
   * Reorder layers by moving a layer to a new z-index position.
   * @param {number} pageIdx
   * @param {number} layerId
   * @param {number} newIndex - target index in the layers array (0 = bottom)
   */
  reorderLayers(pageIdx, layerId, newIndex) {
    const stack = this.getStack(pageIdx);
    return stack.reorder(layerId, newIndex);
  }

  /**
   * Get the offscreen canvas context for a specific layer on a page.
   * This is where drawing commands should target.
   */
  getLayerCanvas(pageIdx, layerId) {
    const stack = this.getStack(pageIdx);
    const layer = stack.getLayer(layerId);
    return layer ? layer.canvas : null;
  }

  getLayerContext(pageIdx, layerId) {
    const canvas = this.getLayerCanvas(pageIdx, layerId);
    return canvas ? canvas.getContext('2d') : null;
  }

  /**
   * Get the "Content" layer id for a page (the default drawing layer).
   */
  getContentLayerId(pageIdx) {
    const stack = this.getStack(pageIdx);
    const contentLayer = stack.layers.find(l => l.name === 'Content');
    return contentLayer ? contentLayer.id : null;
  }

  /**
   * Composite all visible layers onto the target canvas context.
   * Layers are drawn bottom-to-top with their blend modes and opacities.
   */
  composite(pageIdx, targetCtx) {
    const stack = this.getStack(pageIdx);

    targetCtx.save();
    targetCtx.clearRect(0, 0, this.width, this.height);

    for (const layer of stack.layers) {
      if (!layer.visible || layer.opacity <= 0) continue;

      targetCtx.save();
      targetCtx.globalAlpha = layer.opacity;
      targetCtx.globalCompositeOperation = layer.blendMode;
      targetCtx.drawImage(layer.canvas, 0, 0);
      targetCtx.restore();
    }

    targetCtx.restore();
  }

  /**
   * Clear all layers for a page (used when re-rendering).
   */
  clearPage(pageIdx) {
    const stack = this.getStack(pageIdx);
    stack.layers.forEach(layer => {
      const ctx = layer.canvas.getContext('2d');
      ctx.clearRect(0, 0, this.width, this.height);
    });
  }

  /**
   * Resize all layer canvases (e.g., if PAGE_W/PAGE_H change).
   */
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.pageStacks.forEach(stack => {
      stack.resize(width, height);
    });
  }

  /**
   * Export the layer stack metadata for persistence.
   */
  exportLayerStack(pageIdx) {
    const stack = this.getStack(pageIdx);
    return stack.layers.map(l => ({
      id: l.id,
      name: l.name,
      visible: l.visible,
      opacity: l.opacity,
      blendMode: l.blendMode,
      locked: l.locked,
    }));
  }

  /**
   * Get all layers for a page (for UI rendering).
   */
  getLayers(pageIdx) {
    const stack = this.getStack(pageIdx);
    return [...stack.layers];
  }
}


// ── LayerStack ──────────────────────────────────────────────────

class LayerStack {
  constructor(pageIdx, width, height) {
    this.pageIdx = pageIdx;
    this.width = width;
    this.height = height;
    /** @type {Layer[]} ordered bottom-to-top */
    this.layers = [];
  }

  addLayer(id, name, options = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;

    const layer = {
      id,
      name: name || `Layer ${id}`,
      canvas,
      visible: true,
      opacity: options.opacity ?? 1.0,
      blendMode: options.blendMode || 'source-over',
      locked: options.locked || false,
    };

    this.layers.push(layer);
    return layer;
  }

  removeLayer(layerId) {
    const idx = this.layers.findIndex(l => l.id === layerId);
    if (idx === -1) return false;
    const layer = this.layers[idx];
    if (layer.locked) {
      console.warn(`Cannot remove locked layer: ${layer.name}`);
      return false;
    }
    this.layers.splice(idx, 1);
    return true;
  }

  getLayer(layerId) {
    return this.layers.find(l => l.id === layerId) || null;
  }

  reorder(layerId, newIndex) {
    const oldIdx = this.layers.findIndex(l => l.id === layerId);
    if (oldIdx === -1) return false;

    const clamped = Math.max(0, Math.min(newIndex, this.layers.length - 1));
    const [layer] = this.layers.splice(oldIdx, 1);
    this.layers.splice(clamped, 0, layer);
    return true;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.layers.forEach(layer => {
      // Preserve content by copying first
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = layer.canvas.width;
      tmpCanvas.height = layer.canvas.height;
      tmpCanvas.getContext('2d').drawImage(layer.canvas, 0, 0);

      layer.canvas.width = width;
      layer.canvas.height = height;
      layer.canvas.getContext('2d').drawImage(tmpCanvas, 0, 0);
    });
  }
}


// ── Global singleton ────────────────────────────────────────────

window.layerCompositor = null;

function initLayerCompositor(width, height) {
  window.layerCompositor = new LayerCompositor(width, height);
  return window.layerCompositor;
}
