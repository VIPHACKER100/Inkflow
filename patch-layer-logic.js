const fs = require('fs');

let code = fs.readFileSync('index.js', 'utf8');

// 1. Initialize compositor
const initRegex = /const PAGE_W = \d+;(\r?\n)const PAGE_H = \d+;/;
if (!initRegex.test(code)) {
    console.error("Could not find PAGE_W / PAGE_H declaration");
    process.exit(1);
}
code = code.replace(initRegex, (match) => {
  return `${match}\n\n// Task 16: Initialize Layer Compositor\nif (typeof initLayerCompositor === 'function') {\n  initLayerCompositor(PAGE_W, PAGE_H);\n}`;
});

// 2. Add Layer Manager UI code
const layerUiCode = `
/* ═════════════════════════════════════════
   PHASE 16 - LAYER MANAGER UI
═════════════════════════════════════════ */
let currentLayerPage = 0; // The page whose layers are being viewed/edited in the UI

function updateLayerUI(pageIdx = 0) {
  if (!window.layerCompositor) return;
  currentLayerPage = pageIdx;
  const layers = window.layerCompositor.getLayers(pageIdx);
  const container = document.getElementById('layer-list');
  if (!container) return;

  container.innerHTML = '';
  // Render in reverse order (top layer first)
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    const el = document.createElement('div');
    el.className = 'layer-item' + (layer.locked ? ' locked' : '');
    
    // Drag handle
    const drag = document.createElement('div');
    drag.className = 'layer-drag';
    drag.textContent = '≡';
    drag.title = "Drag to reorder";
    
    // Visibility toggle
    const vis = document.createElement('div');
    vis.className = 'layer-vis';
    vis.textContent = layer.visible ? '👁️' : '🚫';
    vis.title = "Toggle visibility";
    vis.onclick = () => {
      window.layerCompositor.setLayerProperty(pageIdx, layer.id, 'visible', !layer.visible);
      requestPageRender(pageIdx);
      updateLayerUI(pageIdx);
    };

    // Name
    const name = document.createElement('div');
    name.className = 'layer-name';
    name.textContent = layer.name;
    name.title = layer.name;
    name.onclick = () => {
      if (layer.locked) return;
      const newName = prompt("Rename layer:", layer.name);
      if (newName) {
        window.layerCompositor.setLayerProperty(pageIdx, layer.id, 'name', newName);
        updateLayerUI(pageIdx);
      }
    };

    // Opacity
    const op = document.createElement('input');
    op.type = 'range';
    op.className = 'layer-opacity';
    op.min = 0; op.max = 1; op.step = 0.05;
    op.value = layer.opacity;
    op.title = "Opacity";
    op.oninput = (e) => {
      window.layerCompositor.setLayerProperty(pageIdx, layer.id, 'opacity', parseFloat(e.target.value));
      requestPageRender(pageIdx);
    };

    // Blend mode
    const blend = document.createElement('select');
    blend.className = 'layer-blend';
    blend.title = "Blend Mode";
    const modes = window.layerCompositor.BLEND_MODES;
    modes.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m.split('-').map(w=>w[0].toUpperCase() + w.slice(1)).join(' ');
      if (m === layer.blendMode) opt.selected = true;
      blend.appendChild(opt);
    });
    blend.onchange = (e) => {
      window.layerCompositor.setLayerProperty(pageIdx, layer.id, 'blendMode', e.target.value);
      requestPageRender(pageIdx);
    };

    // Delete
    const del = document.createElement('div');
    del.className = 'layer-delete';
    del.textContent = '✖';
    del.title = "Delete layer";
    del.onclick = () => {
      if (window.layerCompositor.deleteLayer(pageIdx, layer.id)) {
        requestPageRender(pageIdx);
        updateLayerUI(pageIdx);
      }
    };

    el.appendChild(drag);
    el.appendChild(vis);
    el.appendChild(name);
    el.appendChild(op);
    el.appendChild(blend);
    el.appendChild(del);

    container.appendChild(el);
  }
}

function addNewLayer() {
  if (!window.layerCompositor) return;
  window.layerCompositor.createLayer(currentLayerPage, "New Layer");
  updateLayerUI(currentLayerPage);
}

function flattenAllLayers() {
  if (!window.layerCompositor || !confirm("Are you sure you want to flatten all layers on this page?")) return;
  // Complex implementation skipped for brevity, just redraw for now.
  alert("Flatten not implemented in this demo.");
}

function requestPageRender(pageIdx) {
  // Simple re-render wrapper
  window.renderSpecificPage(pageIdx, true);
}
`;

// Insert UI code at the end
code += "\n\n" + layerUiCode;

// 3. Update renderSpecificPage
// Instead of replacing raw strings with potential whitespace mismatches, we use regex again

const renderSpecificRegex1 = /const ctx = canvas\.getContext\('2d'\);/;
code = code.replace(renderSpecificRegex1, 
  `let ctx = canvas.getContext('2d');
  let contentCtx = ctx;
  if (window.layerCompositor) {
    // Clear all layers before drawing
    window.layerCompositor.clearPage(pageIdx);
    // Draw background on background layer
    const bgLayerId = window.layerCompositor.getStack(pageIdx).layers.find(l => l.name === 'Background').id;
    const bgCtx = window.layerCompositor.getLayerContext(pageIdx, bgLayerId);
    drawPaperBackground(bgCtx, S.paperStyle);
    
    // Get content layer
    const contentLayerId = window.layerCompositor.getContentLayerId(pageIdx);
    contentCtx = window.layerCompositor.getLayerContext(pageIdx, contentLayerId);
    
    // Point the rest of the function to use contentCtx
    ctx = contentCtx;
  } else {
    drawPaperBackground(ctx, S.paperStyle);
  }`
);

// We need to allow renderSpecificPage to be re-run if we pass a second argument (forceRender)
const renderSpecificRegex2 = /if \(!canvas \|\| canvas\.dataset\.rendered === 'true'\) return;/;
code = code.replace(renderSpecificRegex2, `if (!canvas || (canvas.dataset.rendered === 'true' && !arguments[1])) return;`);

// We need to remove the `drawPaperBackground(ctx, S.paperStyle);` in the loop of `renderText`
// It looks like:
// const canvas = createPage(i + 1);
// const ctx = canvas.getContext('2d');
// drawPaperBackground(ctx, S.paperStyle);
// renderSmudgeEffects(ctx, i);

const renderTextLoopRegex = /const ctx = canvas\.getContext\('2d'\);\s*drawPaperBackground\(ctx, S\.paperStyle\);\s*\/\/\s*Render smudge effects before text content \(in drawing order\)\s*renderSmudgeEffects\(ctx, i\);/g;
code = code.replace(renderTextLoopRegex, `// We let renderSpecificPage handle the background and smudges`);

// We also need to add composition at the end of renderSpecificPage
const renderSpecificEndRegex = /if \(S\.showAlignmentGuides\) \{\s*drawAlignmentGuides\(ctx\);\s*\}\s*\};/;
code = code.replace(renderSpecificEndRegex, 
  `  if (S.showAlignmentGuides) {
    drawAlignmentGuides(ctx);
  }

  // Composite layers
  if (window.layerCompositor) {
    window.layerCompositor.composite(pageIdx, canvas.getContext('2d'));
    if (pageIdx === currentLayerPage) updateLayerUI(pageIdx);
  }
};`
);


fs.writeFileSync('index.js', code);
console.log("Successfully patched layer rendering logic in index.js");
