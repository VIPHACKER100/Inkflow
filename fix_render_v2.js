const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// ─── FIX 1: Simplify renderSpecificPage – bypass layer compositor for text rendering ───
// The layer compositor adds complexity; draw everything directly to the main canvas ctx.
const oldRenderSpecificPage = `window.renderSpecificPage = function(pageIdx) {
  const canvas = pages[pageIdx];
  if (!canvas || (canvas.dataset.rendered === 'true' && !arguments[1])) return;
  canvas.dataset.rendered = 'true';

  let ctx = canvas.getContext('2d');
  
  // Layer compositor integration (Task 16)
  if (window.layerCompositor) {
    window.layerCompositor.clearPage(pageIdx);
    // Draw background on background layer
    const bgStack = window.layerCompositor.getStack(pageIdx);
    const bgLayer = bgStack.layers.find(l => l.name === 'Background');
    if (bgLayer) {
      const bgCtx = bgLayer.canvas.getContext('2d');
      drawPaperBackground(bgCtx, S.paperStyle);
      renderSmudgeEffects(bgCtx, pageIdx);
    }
    // Redirect drawing to the content layer
    const contentLayerId = window.layerCompositor.getContentLayerId(pageIdx);
    const contentCanvas = window.layerCompositor.getLayerCanvas(pageIdx, contentLayerId);
    if (contentCanvas) {
      ctx = contentCanvas.getContext('2d');
    }
  } else {
    drawPaperBackground(ctx, S.paperStyle);
    renderSmudgeEffects(ctx, pageIdx);
  }

  const activeEditor = document.getElementById('editor-' + (pageIdx + 1));
  const pageItems = (window.currentRenderQueue || []).filter(item => item.pageIdx === pageIdx);

  if (S.cursiveMode && typeof cursiveConnector !== 'undefined') {
    renderCursiveConnections(pageItems);
  }

  pageItems.forEach((item) => {
    if (document.activeElement === activeEditor) return;`;

const newRenderSpecificPage = `window.renderSpecificPage = function(pageIdx, forceRedraw) {
  const canvas = pages[pageIdx];
  if (!canvas) return;
  if (canvas.dataset.rendered === 'true' && !forceRedraw && !arguments[1]) return;
  canvas.dataset.rendered = 'true';

  // Always draw directly to the main canvas for reliability
  const ctx = canvas.getContext('2d');
  drawPaperBackground(ctx, S.paperStyle);
  renderSmudgeEffects(ctx, pageIdx);

  // Also update layer compositor background layer if available (for layer UI)
  if (window.layerCompositor) {
    try {
      window.layerCompositor.clearPage(pageIdx);
      const bgStack = window.layerCompositor.getStack(pageIdx);
      const bgLayer = bgStack.layers.find(l => l.name === 'Background');
      if (bgLayer) {
        const bgCtx = bgLayer.canvas.getContext('2d');
        drawPaperBackground(bgCtx, S.paperStyle);
        renderSmudgeEffects(bgCtx, pageIdx);
      }
    } catch(e) { /* ignore compositor errors */ }
  }

  const pageItems = (window.currentRenderQueue || []).filter(item => item.pageIdx === pageIdx);

  if (S.cursiveMode && typeof cursiveConnector !== 'undefined') {
    renderCursiveConnections(pageItems);
  }

  pageItems.forEach((item) => {`;

if (code.includes(oldRenderSpecificPage)) {
  code = code.replace(oldRenderSpecificPage, newRenderSpecificPage);
  console.log('✅ FIX 1 applied: Simplified renderSpecificPage to draw directly to canvas');
} else {
  console.log('⚠️  FIX 1 pattern not found – trying partial match...');
  // Try to find the function and replace the first part
  const funcStart = code.indexOf('window.renderSpecificPage = function(pageIdx)');
  if (funcStart !== -1) {
    console.log('   Found renderSpecificPage at index:', funcStart);
    console.log('   Context:', code.substring(funcStart, funcStart + 200));
  }
}

// ─── FIX 2: Remove the composite-at-end call (since we're now drawing directly) ───
const oldCompositeEnd = `  // Composite all layers onto the main page canvas (Task 16)
  if (window.layerCompositor) {
    window.layerCompositor.composite(pageIdx, canvas.getContext('2d'));
    if (typeof updateLayerUI === 'function' && pageIdx === currentLayerPage) {
      updateLayerUI(pageIdx);
    }
  }
};`;

const newCompositeEnd = `  // Update layer UI if needed
  if (window.layerCompositor && typeof updateLayerUI === 'function' && pageIdx === currentLayerPage) {
    updateLayerUI(pageIdx);
  }
};`;

if (code.includes(oldCompositeEnd)) {
  code = code.replace(oldCompositeEnd, newCompositeEnd);
  console.log('✅ FIX 2 applied: Removed layer compositor composite call (now using direct canvas draw)');
} else {
  console.log('⚠️  FIX 2 pattern not found');
}

// ─── FIX 3: Ensure renderText properly invalidates rendered flag ───
// After setting currentRenderQueue, mark all pages as needing re-render
const oldRAF = `  // Immediately render all pages to avoid blank-until-scroll race condition
  // Use requestAnimationFrame to allow DOM to settle first
  requestAnimationFrame(() => {
    pages.forEach((c, idx) => {
      window.renderSpecificPage(idx);
    });
  });
}`;

const newRAF = `  // Immediately render all pages to avoid blank-until-scroll race condition
  // Use requestAnimationFrame to allow DOM to settle first
  requestAnimationFrame(() => {
    pages.forEach((c, idx) => {
      c.dataset.rendered = 'false'; // force re-render
      window.renderSpecificPage(idx, true);
    });
  });
}`;

if (code.includes(oldRAF)) {
  code = code.replace(oldRAF, newRAF);
  console.log('✅ FIX 3 applied: Force re-render in RAF loop');
} else {
  console.log('⚠️  FIX 3 pattern not found');
}

// ─── FIX 4: Fix initApp blank page to draw directly ───
const oldInitBlank = `    // Composite if using layer compositor
    if (window.layerCompositor) {
      window.layerCompositor.composite(0, canvas.getContext('2d'));
    }`;

const newInitBlank = `    // If we used a layer canvas, composite now; otherwise content is already on the main canvas
    if (window.layerCompositor && bgCtx !== canvas.getContext('2d')) {
      window.layerCompositor.composite(0, canvas.getContext('2d'));
    }`;

if (code.includes(oldInitBlank)) {
  code = code.replace(oldInitBlank, newInitBlank);
  console.log('✅ FIX 4 applied: Fixed initApp blank page composite');
} else {
  console.log('⚠️  FIX 4 pattern not found');
}

fs.writeFileSync('index.js', code, 'utf8');
console.log('\n✅ All fixes written to index.js');
