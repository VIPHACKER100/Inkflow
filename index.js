const S = {
  text: 'This is a sample note starting from the second line of the page. The first line has been skipped automatically as per your request.\n\n```diagram\n{\n  "type": "cycle",\n  "title": "Water Cycle",\n  "nodes": [\n    { "id": "n1", "label": "Evaporation" },\n    { "id": "n2", "label": "Condensation" },\n    { "id": "n3", "label": "Precipitation" },\n    { "id": "n4", "label": "Collection" }\n  ],\n  "edges": [\n    { "from": "n1", "to": "n2" },\n    { "from": "n2", "to": "n3" },\n    { "from": "n3", "to": "n4" },\n    { "from": "n4", "to": "n1" }\n  ]\n}\n```\n\nYou can continue writing your notes here, and the engine will handle the line spacing and page breaks while always skipping the top line of every new page.',
  font: 'Caveat',
  fontSize: 22,
  lineHeight: 1.5,
  wordSpacing: 1,
  margin: 80,
  rotationMax: 1,
  inkColor: '#1c2340',
  bleed: 0.5,
  pressure: 0.12,
  paperStyle: 'ruled',
  animSpeed: 8,
  currentPage: 0,
  noteLayout: 'standard',
  textAlignment: 'middle', // 'top', 'middle', 'bottom'
  smudgeEffects: false, // Smudge effects toggle
  cursiveMode: false, // Cursive mode toggle (Req 3.1)
  hinglishAutoSwitch: true,
  markdownMultiPen: true,
  markdownPenProfiles: {
    heading: { inkColor: '#0a3d62', pressure: 0.14, rotationScale: 1.12 },
    body: { inkColor: null },
    bullet: { inkColor: '#2d6a4f', pressure: 0.13 },
    emphasis: { inkColor: '#8b0000', pressure: 0.15, rotationScale: 1.08 },
  },
};

/* Canvas pages array */
let pages = [];
let animFrameId = null;
let isAnimating = false;
let renderTimeout = null;

// Initialize CursiveConnector for ligatures and connected strokes (Req 3.1-3.9)
let cursiveConnector = null;
if (typeof CursiveConnector !== 'undefined') {
  cursiveConnector = new CursiveConnector();
}

let markdownParser = null;
if (typeof MarkdownParser !== 'undefined') {
  markdownParser = new MarkdownParser();
}

let fontSwitcher = null;
if (typeof FontSwitcher !== 'undefined') {
  fontSwitcher = new FontSwitcher();
}

let predictionEngine = null;
let currentPrediction = '';
if (typeof StrokePredictionEngine !== 'undefined') {
  predictionEngine = new StrokePredictionEngine();
  predictionEngine.initialize();
}

function getStyledLineSegments(lineText) {
  if (!lineText) return [];
  if (!S.markdownMultiPen || !markdownParser) {
    return [{ text: lineText, type: 'body', emphasisType: null, level: null }];
  }

  const parsed = markdownParser.parse(lineText);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return [{ text: lineText, type: 'body', emphasisType: null, level: null }];
  }

  return parsed.map((seg) => ({
    text: seg.text || '',
    type: seg.type || 'body',
    emphasisType: seg.emphasisType || null,
    level: seg.level || null,
  }));
}

function getPenProfileForSegment(segment) {
  const type = segment?.type || 'body';
  const map = S.markdownPenProfiles || {};
  const profile = map[type] || map.body || {};
  return {
    inkColor: profile.inkColor || null,
    pressure: typeof profile.pressure === 'number' ? profile.pressure : null,
    rotationScale: typeof profile.rotationScale === 'number' ? profile.rotationScale : 1,
    key: `${type}:${segment?.emphasisType || 'none'}:${segment?.level || 0}`,
  };
}

function tokenizeWithSpaces(text) {
  if (!text) return [];
  const tokens = [];
  let word = '';

  for (const ch of text) {
    if (ch === ' ') {
      if (word.length > 0) {
        tokens.push({ type: 'word', text: word });
        word = '';
      }
      tokens.push({ type: 'space', text: ' ' });
    } else {
      word += ch;
    }
  }

  if (word.length > 0) {
    tokens.push({ type: 'word', text: word });
  }

  return tokens;
}

/* Initialize Mermaid for diagrams */
if (typeof mermaid !== 'undefined') {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
      primaryColor: '#ffffff',
      primaryTextColor: '#1c2340',
      primaryBorderColor: '#1c2340',
      lineColor: '#1c2340',
      secondaryColor: '#f8f4ea',
      tertiaryColor: '#f8f4ea',
    },
  });
}

/**
 * PHASE 6.0 — STRUCTURED HAND-DRAWN DIAGRAMS (rough.js)
 */
// ponytail: diagram layout functions imported from diagram-engine.js
// diagram layout functions (layoutCycle, layoutFlowchart, etc.) are global from diagram-engine.js
function getDiagramImage(content) {
  if (typeof DiagramEngine !== 'undefined' && DiagramEngine.getDiagramImage) {
    return DiagramEngine.getDiagramImage(content);
  }
  return { ready: false };
}

// ponytail: layoutFlowchart and layoutHierarchy are in diagram-engine.js

function drawArrowhead(ctx, rc, x, y, angle, size, color, roughness) {
  const p1 = { x: x, y: y };
  const p2 = {
    x: x - size * Math.cos(angle - Math.PI / 6),
    y: y - size * Math.sin(angle - Math.PI / 6),
  };
  const p3 = {
    x: x - size * Math.cos(angle + Math.PI / 6),
    y: y - size * Math.sin(angle + Math.PI / 6),
  };

  rc.line(p1.x, p1.y, p2.x, p2.y, { stroke: color, roughness: roughness });
  rc.line(p1.x, p1.y, p3.x, p3.y, { stroke: color, roughness: roughness });
}

// ponytail: shared shape/edge renderer — deduplicates renderSpecificPage and startAnimation
function drawShapeOrEdge(ctx, canvas, item, options, rcCache) {
  let rc = rcCache ? rcCache.get(item.pageIdx) : null;
  if (!rc && typeof rough !== 'undefined') {
    rc = rough.canvas(canvas);
    if (rcCache) rcCache.set(item.pageIdx, rc);
  }

  if (item.type === 'shape') {
    if (rc) {
      if (item.shape === 'circle') {
        rc.circle(item.x, item.y, Math.max(item.w, item.h), options);
      } else if (item.shape === 'diamond') {
        const halfW = item.w / 2, halfH = item.h / 2;
        rc.polygon(
          [[item.x, item.y - halfH], [item.x + halfW, item.y], [item.x, item.y + halfH], [item.x - halfW, item.y]],
          options
        );
      } else if (item.shape === 'pill' || item.shape === 'rounded') {
        rc.roundRect(item.x - item.w / 2, item.y - item.h / 2, item.w, item.h, 12, options);
      } else if (item.shape === 'hexagon') {
        const hw = item.w / 2, hh = item.h / 2, inset = hw * 0.3;
        rc.polygon(
          [
            [item.x - hw + inset, item.y - hh], [item.x + hw - inset, item.y - hh],
            [item.x + hw, item.y], [item.x + hw - inset, item.y + hh],
            [item.x - hw + inset, item.y + hh], [item.x - hw, item.y],
          ],
          options
        );
      } else {
        rc.rectangle(item.x - item.w / 2, item.y - item.h / 2, item.w, item.h, options);
      }
    } else {
      ctx.strokeStyle = S.inkColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      if (item.shape === 'circle') {
        ctx.arc(item.x, item.y, Math.max(item.w, item.h) / 2, 0, Math.PI * 2);
      } else if (item.shape === 'diamond') {
        const halfW = item.w / 2, halfH = item.h / 2;
        ctx.moveTo(item.x, item.y - halfH);
        ctx.lineTo(item.x + halfW, item.y);
        ctx.lineTo(item.x, item.y + halfH);
        ctx.lineTo(item.x - halfW, item.y);
        ctx.closePath();
      } else if (item.shape === 'pill' || item.shape === 'rounded') {
        const rad = Math.min(12, item.h / 2);
        ctx.roundRect(item.x - item.w / 2, item.y - item.h / 2, item.w, item.h, rad);
      } else if (item.shape === 'hexagon') {
        const hw = item.w / 2, hh = item.h / 2, inset = hw * 0.3;
        ctx.moveTo(item.x - hw + inset, item.y - hh);
        ctx.lineTo(item.x + hw - inset, item.y - hh);
        ctx.lineTo(item.x + hw, item.y);
        ctx.lineTo(item.x + hw - inset, item.y + hh);
        ctx.lineTo(item.x - hw + inset, item.y + hh);
        ctx.lineTo(item.x - hw, item.y);
        ctx.closePath();
      } else {
        ctx.rect(item.x - item.w / 2, item.y - item.h / 2, item.w, item.h);
      }
      ctx.stroke();
    }
  } else if (item.type === 'edge') {
    if (rc) {
      rc.line(item.from.x, item.from.y, item.to.x, item.to.y, options);
      const angle = Math.atan2(item.to.y - item.from.y, item.to.x - item.from.x);
      drawArrowhead(ctx, rc, item.to.x, item.to.y, angle, 12, S.inkColor, options.roughness);
    } else {
      ctx.strokeStyle = S.inkColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(item.from.x, item.from.y);
      ctx.lineTo(item.to.x, item.to.y);
      ctx.stroke();
      const angle = Math.atan2(item.to.y - item.from.y, item.to.x - item.from.x);
      ctx.beginPath();
      ctx.moveTo(item.to.x, item.to.y);
      ctx.lineTo(item.to.x - 10 * Math.cos(angle - 0.5), item.to.y - 10 * Math.sin(angle - 0.5));
      ctx.moveTo(item.to.x, item.to.y);
      ctx.lineTo(item.to.x - 10 * Math.cos(angle + 0.5), item.to.y - 10 * Math.sin(angle + 0.5));
      ctx.stroke();
    }
    if (item.label) {
      const mx = (item.from.x + item.to.x) / 2;
      const my = (item.from.y + item.to.y) / 2;
      ctx.save();
      ctx.font = `${Math.max(10, S.fontSize * 0.7)}px ${S.font}`;
      ctx.fillStyle = S.inkColor;
      ctx.globalAlpha = 0.85;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(item.label).width;
      const isDark = S.paperStyle === 'dark';
      ctx.fillStyle = isDark ? 'rgba(26,26,46,0.85)' : 'rgba(247,243,234,0.85)';
      ctx.fillRect(mx - tw / 2 - 3, my - S.fontSize * 0.4, tw + 6, S.fontSize * 0.9);
      ctx.fillStyle = S.inkColor;
      ctx.fillText(item.label, mx, my);
      ctx.restore();
    }
  }
}

const TEMPLATE_SHEETS = {
  letters: [
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S',
    'T',
    'U',
    'V',
    'W',
    'X',
    'Y',
    'Z',
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    'g',
    'h',
    'i',
    'j',
    'k',
    'l',
    'm',
    'n',
    'o',
    'p',
    'q',
    'r',
    's',
    't',
    'u',
    'v',
    'w',
    'x',
    'y',
    'z',
  ],
  symbols: [
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    ',',
    '.',
    '?',
    '!',
    '@',
    '#',
    '$',
    '%',
    '^',
    '&',
    '*',
    '(',
    ')',
    '-',
    '_',
    '+',
    '=',
    '/',
    ':',
    ';',
    "'",
    '"',
  ],
};
const ALL_TEMPLATE_CHARS = [...TEMPLATE_SHEETS.letters, ...TEMPLATE_SHEETS.symbols];
let activeChar = 'A';
let activeSheet = 'letters';
let activeUploadSheet = 'letters';
const draftedGlyphs = {};
const alignerImages = { letters: null, symbols: null };
const gridConfigs = {
  letters: { gridX: 22, gridY: 36, gridW: 315, gridH: 315 },
  symbols: { gridX: 22, gridY: 36, gridW: 315, gridH: 315 },
};
let gridX = 22;
let gridY = 36;
let gridW = 315;
let gridH = 315;

const PAGE_W = 794;
const PAGE_H = 1123;

// Task 16: Initialize Layer Compositor
if (typeof initLayerCompositor === 'function') {
  initLayerCompositor(PAGE_W, PAGE_H);
}

/* ───────────────────────────────────────────
   PHASE 1.4 / 2.6 — DARK MODE TOGGLE
─────────────────────────────────────────── */
const darkToggle = document.getElementById('dark-toggle');
const darkIcon = document.getElementById('dark-icon');
let isDark = localStorage.getItem('inkflow-dark') === '1';
applyDark();

darkToggle?.addEventListener('click', () => {
  isDark = !isDark;
  localStorage.setItem('inkflow-dark', isDark ? '1' : '0');
  applyDark();
});

function applyDark() {
  document.documentElement.classList.toggle('dark', isDark);
  if (darkIcon) darkIcon.textContent = isDark ? '??' : '??';
}

/* ───────────────────────────────────────────
   PHASE 2.7 — HAMBURGER (MOBILE)
─────────────────────────────────────────── */
document.getElementById('hamburger')?.addEventListener('click', () => {
  document.getElementById('sidebar')?.classList.toggle('open');
});

/* ───────────────────────────────────────────
   PHASE 2.3 — SIDEBAR SECTION TOGGLE
─────────────────────────────────────────── */
function toggleSection(id) {
  const section = document.getElementById(id);
  section.classList.toggle('collapsed');
  const btn = section.querySelector('.sb-section-header');
  if (btn) btn.setAttribute('aria-expanded', !section.classList.contains('collapsed'));
}

/* ───────────────────────────────────────────
   PHASE 3.1/3.2 — FONT SELECTOR + PREVIEW
─────────────────────────────────────────── */
const fontSelect = document.getElementById('font-select');
fontSelect?.addEventListener('change', () => {
  S.font = fontSelect.value;
  fontSelect.style.fontFamily = S.font;
  if (document.fonts) {
    document.fonts
      .load(`${S.fontSize}px "${S.font}"`)
      .then(() => {
        debounceRender();
      })
      .catch(() => {
        debounceRender();
      });
  } else {
    debounceRender();
  }
});
if (fontSelect) fontSelect.style.fontFamily = S.font;

const layoutSelect = document.getElementById('layout-select');
if (layoutSelect) {
  layoutSelect.addEventListener('change', () => {
    S.noteLayout = layoutSelect.value;
    autosave();
    debounceRender();
  });
}

// Initialize notebooks sidebar on load
if (window.NotebooksUI) {
  setTimeout(() => window.NotebooksUI.renderNotebooksSidebar(), 500);
}

if (document.fonts) {
  document.fonts.ready.then(() => {
    debounceRender();
  });
}

/* Phase 3.3 — Custom font upload */
document.getElementById('font-upload').addEventListener('change', async function () {
  const file = this.files[0];
  if (!file) return;
  const name = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]/g, ' ');
  const buf = await file.arrayBuffer();
  try {
    const face = new FontFace(name, buf);
    await face.load();
    document.fonts.add(face);
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name + ' (uploaded)';
    opt.style.fontFamily = name;
    fontSelect.appendChild(opt);
    fontSelect.value = name;
    fontSelect.style.fontFamily = name;
    S.font = name;
    /* Phase 3.4 — Store font name in localStorage */
    const stored = JSON.parse(localStorage.getItem('inkflow-fonts') || '[]');
    if (!stored.includes(name)) stored.push(name);
    localStorage.setItem('inkflow-fonts', JSON.stringify(stored));
    debounceRender();
  } catch (e) {
    alert('Could not load font: ' + e.message);
  }
});

/* ───────────────────────────────────────────
   PHASE 3.5 — AUTO-FIT FONT SIZE
─────────────────────────────────────────── */
function autoFitFontSize() {
  const text = S.text.trim();
  if (!text) return;

  const originalFontSize = S.fontSize;
  let min = 14;
  let max = 52;
  let bestSize = min;

  try {
    for (let i = 0; i < 6; i++) {
      const mid = Math.floor((min + max) / 2);
      S.fontSize = mid;
      const { pageCount } = layoutText(text);

      if (pageCount > 1) {
        max = mid;
      } else {
        bestSize = mid;
        min = mid;
      }
    }
  } catch (e) {
    S.fontSize = originalFontSize;
    return;
  }

  S.fontSize = bestSize;

  // Sync UI
  const slider = document.getElementById('font-size-slider');
  if (slider) slider.value = S.fontSize;
  const disp = document.getElementById('fs-val');
  if (disp) disp.textContent = S.fontSize;

  debounceRender();
  autosave();
}

/* ───────────────────────────────────────────
   PHASE 5.1–5.6 — SLIDER CONTROLS
─────────────────────────────────────────── */
function bindSlider(id, valId, key, parse = parseFloat, suffix = '') {
  const el = document.getElementById(id);
  const disp = document.getElementById(valId);
  el?.addEventListener('input', () => {
    S[key] = parse(el.value);
    if (disp) disp.textContent = parse(el.value) + suffix;
    debounceRender();
  });
}

bindSlider('font-size-slider', 'fs-val', 'fontSize', parseInt);
bindSlider('line-spacing', 'ls-val', 'lineHeight', parseFloat);
bindSlider('word-spacing', 'ws-val', 'wordSpacing', parseInt);
bindSlider('margin-slider', 'mg-val', 'margin', parseInt);
bindSlider('rotation-slider', 'rot-val', 'rotationMax', parseFloat);
bindSlider('bleed-slider', 'bleed-val', 'bleed', parseFloat);
bindSlider('pressure-slider', 'pressure-val', 'pressure', parseFloat);
bindSlider('speed-slider', 'spd-val', 'animSpeed', parseInt);

/* Phase 5.6 — Ink color picker */
const inkColorInput = document.getElementById('ink-color');
inkColorInput?.addEventListener('input', () => {
  S.inkColor = inkColorInput.value;
  document.getElementById('ink-color-label').textContent = S.inkColor;
  debounceRender();
});

function setInkPreset(hex, name) {
  S.inkColor = hex;
  inkColorInput.value = hex;
  document.getElementById('ink-color-label').textContent = hex + ' — ' + name;
  syncMarkdownPenControls();
  debounceRender();
}

function syncMarkdownPenControls() {
  const multiPenToggle = document.getElementById('markdown-multipen-toggle');
  const penGrid = document.getElementById('markdown-pen-grid');
  const headingInput = document.getElementById('pen-color-heading');
  const bodyInput = document.getElementById('pen-color-body');
  const bulletInput = document.getElementById('pen-color-bullet');
  const emphasisInput = document.getElementById('pen-color-emphasis');

  if (multiPenToggle) {
    multiPenToggle.checked = !!S.markdownMultiPen;
  }
  if (penGrid) {
    penGrid.setAttribute('aria-disabled', S.markdownMultiPen ? 'false' : 'true');
  }

  const profiles = S.markdownPenProfiles || {};
  if (headingInput) headingInput.value = (profiles.heading && profiles.heading.inkColor) || '#0a3d62';
  if (bodyInput) bodyInput.value = (profiles.body && profiles.body.inkColor) || S.inkColor;
  if (bulletInput) bulletInput.value = (profiles.bullet && profiles.bullet.inkColor) || '#2d6a4f';
  if (emphasisInput) emphasisInput.value = (profiles.emphasis && profiles.emphasis.inkColor) || '#8b0000';
}

function onMarkdownMultiPenToggle() {
  const toggle = document.getElementById('markdown-multipen-toggle');
  if (!toggle) return;
  S.markdownMultiPen = toggle.checked;
  syncMarkdownPenControls();
  autosave();
  debounceRender();
}

function onMarkdownPenColorChange(type, value) {
  if (!S.markdownPenProfiles[type]) {
    S.markdownPenProfiles[type] = {};
  }
  S.markdownPenProfiles[type].inkColor = value;
  autosave();
  debounceRender();
}

function syncHinglishControls() {
  const val = !!S.hinglishAutoSwitch;
  const toggle1 = document.getElementById('auto-switch-devanagari');
  const toggle2 = document.getElementById('hinglish-toggle');
  if (toggle1) toggle1.checked = val;
  if (toggle2) toggle2.checked = val;
}

function onHinglishToggle(e) {
  const toggle = e && e.target ? e.target : document.getElementById('auto-switch-devanagari');
  if (!toggle) return;
  S.hinglishAutoSwitch = !!toggle.checked;
  // Sync the other checkbox
  const otherId = toggle.id === 'hinglish-toggle' ? 'auto-switch-devanagari' : 'hinglish-toggle';
  const other = document.getElementById(otherId);
  if (other) other.checked = S.hinglishAutoSwitch;
  autosave();
  debounceRender();
}

const markdownMultiPenToggle = document.getElementById('markdown-multipen-toggle');
if (markdownMultiPenToggle) {
  markdownMultiPenToggle.addEventListener('change', onMarkdownMultiPenToggle);
}

const hinglishToggle = document.getElementById('hinglish-toggle');
if (hinglishToggle) {
  hinglishToggle.addEventListener('change', onHinglishToggle);
}

const markdownPenInputMap = {
  heading: 'pen-color-heading',
  body: 'pen-color-body',
  bullet: 'pen-color-bullet',
  emphasis: 'pen-color-emphasis',
};

Object.keys(markdownPenInputMap).forEach((type) => {
  const el = document.getElementById(markdownPenInputMap[type]);
  if (!el) return;
  el.addEventListener('input', () => onMarkdownPenColorChange(type, el.value));
  el.addEventListener('change', autosave);
});

/* ───────────────────────────────────────────
   PHASE 2.2 — SMUDGE EFFECTS TOGGLE
─────────────────────────────────────────── */
/* ───────────────────────────────────────────
   PHASE 3.1 — CURSIVE MODE TOGGLE
   Enables connected letter strokes (ligatures and connection curves)
   Requirements: 3.1, 3.4, 3.7
─────────────────────────────────────────── */
function onCursiveModeToggle() {
  const cursiveModeToggle = document.getElementById('cursive-mode-toggle');
  if (cursiveModeToggle) {
    S.cursiveMode = cursiveModeToggle.checked;
    autosave();
    debounceRender();
  }
}

function onSmudgeEffectsToggle() {
  const smudgeToggle = document.getElementById('smudge-effects-toggle');
  if (smudgeToggle) {
    S.smudgeEffects = smudgeToggle.checked;
    autosave();
    debounceRender();
  }
}

const cursiveModeToggle = document.getElementById('cursive-mode-toggle');
if (cursiveModeToggle) {
  cursiveModeToggle.addEventListener('change', onCursiveModeToggle);
}

/* ───────────────────────────────────────────
   PHASE 5.7 — PAPER STYLE BUTTONS
─────────────────────────────────────────── */
function setPaper(btn) {
  document.querySelectorAll('.paper-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  S.paperStyle = btn.dataset.style;
  debounceRender();
}

/* ───────────────────────────────────────────
   TEXT VERTICAL ALIGNMENT CONTROL
─────────────────────────────────────────── */
function setTextAlignment(alignment) {
  S.textAlignment = alignment;

  // Update UI
  document.querySelectorAll('.align-btn').forEach((btn) => {
    btn.classList.remove('active');
  });
  document.querySelector(`.align-btn[data-align="${alignment}"]`).classList.add('active');

  // Update label
  const labels = { top: 'Upper', middle: 'Middle', bottom: 'Lower' };
  document.getElementById('align-val').textContent = labels[alignment] || 'Middle';

  // Re-render with new alignment
  debounceRender();
}

/* ───────────────────────────────────────────
   PHASE 4.1 — CREATE CANVAS PAGE
─────────────────────────────────────────── */
function createPage(pageNum) {
  const wrapper = document.createElement('div');
  wrapper.className = 'page-wrapper';

  const label = document.createElement('div');
  label.className = 'page-label';
  label.textContent = 'Page ' + pageNum;

  const container = document.createElement('div');
  container.className = 'canvas-container';

  const canvas = document.createElement('canvas');
  canvas.className = 'canvas-page';
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  canvas.id = 'page-' + pageNum;
  canvas.style.width = Math.min(PAGE_W, 720) + 'px';
  canvas.style.height = Math.min(PAGE_H, (720 * PAGE_H) / PAGE_W) + 'px';

  const editor = document.createElement('div');
  editor.className = 'page-editor';
  editor.id = 'editor-' + pageNum;
  editor.contentEditable = 'true';
  editor.setAttribute('aria-label', 'Edit Page ' + pageNum);

  // Focus: clear canvas text (draw only background) and show overlay text
  editor.addEventListener('focus', () => {
    const ctx = canvas.getContext('2d');
    window.PaperRenderer.drawPaperBackground(ctx, S.paperStyle);
    editor.style.color = S.inkColor;
  });

  // Blur: hide overlay text and redraw handwriting to canvas
  editor.addEventListener('blur', () => {
    editor.style.color = 'transparent';
    renderText(S.text);
  });

  // Input: concatenate all editor contents, sync to sidebar, and autosave
  editor.addEventListener('input', () => {
    const globalText = getGlobalTextFromEditors();
    S.text = globalText;
    document.getElementById('text-input').value = globalText;
    autosave();
    // Re-evaluate font family stack dynamically in case Indic characters were typed
    editor.style.fontFamily =
      fontSwitcher?.getFontStack(ScriptDetector.isIndicScript(editor.innerText), S.font) ?? S.font;
  });

  // Create margin text overlay for left side notes
  const marginText = document.createElement('div');
  marginText.className = 'margin-text-overlay';
  marginText.id = 'margin-' + pageNum;
  marginText.contentEditable = 'true';
  marginText.setAttribute('aria-label', 'Margin notes for Page ' + pageNum);
  marginText.setAttribute('placeholder', '📝');
  marginText.style.fontFamily = S.font;

  // Update font when typing
  marginText.addEventListener('input', () => {
    marginText.style.fontFamily =
      fontSwitcher?.getFontStack(ScriptDetector.isIndicScript(marginText.innerText), S.font) ?? S.font;
  });

  container.appendChild(canvas);
  container.appendChild(editor);
  container.appendChild(marginText);
  wrapper.appendChild(label);
  wrapper.appendChild(container);

  document.getElementById('page-container').appendChild(wrapper);
  pages.push(canvas);
  updatePageNav();

  updateEditorStyles(editor, canvas);

  return canvas;
}

function updateEditorStyles(editor, canvas) {
  if (!editor || !canvas) return;
  const actualWidth = canvas.offsetWidth || parseFloat(canvas.style.width) || PAGE_W;
  const scale = actualWidth / PAGE_W;
  editor.style.fontFamily =
    fontSwitcher?.getFontStack(ScriptDetector.isIndicScript(editor.innerText), S.font) ?? S.font;
  editor.style.fontSize = S.fontSize * scale + 'px';
  editor.style.lineHeight = S.lineHeight;
  editor.style.paddingTop = S.margin * scale + 'px';
  editor.style.paddingLeft = S.margin * scale + 'px';
  editor.style.paddingRight = S.margin * scale + 'px';
  editor.style.paddingBottom = S.margin * scale + 'px';

  if (document.activeElement === editor) {
    editor.style.color = S.inkColor;
  } else {
    editor.style.color = 'transparent';
  }
  editor.style.caretColor = S.inkColor;
}

function getGlobalTextFromEditors() {
  const editors = document.querySelectorAll('.page-editor');
  let text = '';
  editors.forEach((editor, i) => {
    let t = editor.innerText;
    if (t.endsWith('\n')) {
      t = t.slice(0, -1);
    }
    text += t;
    if (i < editors.length - 1) text += '\n';
  });
  return text;
}

window.addEventListener('resize', () => {
  pages.forEach((c, idx) => {
    const editor = document.getElementById('editor-' + (idx + 1));
    if (editor) {
      updateEditorStyles(editor, c);
    }
  });
});

function clearPages() {
  pages = [];
  S.currentPage = 0;
  document.getElementById('page-container').innerHTML = '';
  updatePageNav();
}

function clearText() {
  document.getElementById('text-input').value = '';
  S.text = '';
  clearPages();
  const canvas = createPage(1);
  window.PaperRenderer.drawPaperBackground(canvas.getContext('2d'), S.paperStyle);
  const editor = document.getElementById('editor-1');
  if (editor) {
    editor.innerText = '';
    updateEditorStyles(editor, canvas);
  }
  autosave();
}

function redrawPageCanvas(pageNum) {
  const canvas = pages[pageNum - 1];
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  window.PaperRenderer.drawPaperBackground(ctx, S.paperStyle);
  window.PaperRenderer.renderSmudgeEffects(ctx, pageNum - 1);
  const queue = window.currentRenderQueue;
  if (queue) {
    const items = queue.filter((item) => item.pageIdx === pageNum - 1);
    window.ExportRenderers.renderQueueItems(ctx, canvas, items);
  }
}

// ponytail: aliases for extracted text-layout.js module
const sanitizeText = (str) => window.TextLayout.sanitizeText(str);
const parseBlocks = (text) => window.TextLayout.parseBlocks(text);
const getGraphemes = (text) => window.TextLayout.getGraphemes(text);

const STICKY_COLORS = { yellow: '#fff9c4', cyan: '#e0f7fa', pink: '#fce4ec', mint: '#e8f5e9' };
const CALLOUT_STYLES = { warning: { bg: '#fff3e0', border: '#e65100', icon: '⚠' }, info: { bg: '#e3f2fd', border: '#1565c0', icon: 'ℹ' }, formula: { bg: '#f3e5f5', border: '#7b1fa2', icon: '∑' } };

function paintStickyNotes(queue, targetPageIdx) {
  if (typeof window._parsedStickies === 'undefined' || !window._parsedStickies.length) return;
  window._parsedStickies.forEach((sticky) => {
    const items = queue.filter((item) => item.pageIdx === (targetPageIdx != null ? targetPageIdx : item.pageIdx));
    if (!items.length) return;
    const canvas = pages[items[0].pageIdx];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const bg = STICKY_COLORS[sticky.color] || STICKY_COLORS.yellow;
    const margin = S.margin;
    const stickyW = 120;
    const stickyH = 80;
    const sx = PAGE_W - margin - stickyW;
    const sy = margin + 20;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = bg;
    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.shadowBlur = 4;
    ctx.fillRect(sx, sy, stickyW, stickyH);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.font = `${Math.max(9, S.fontSize * 0.5)}px ${S.font}`;
    ctx.fillStyle = '#333';
    window.PaperRenderer.drawWrappedText(ctx, sticky.text, sx + 6, sy + 16, stickyW - 12, S.fontSize * 0.55, 5);
    ctx.restore();
  });
}

function paintCallouts(queue, targetPageIdx) {
  if (typeof window._parsedCallouts === 'undefined' || !window._parsedCallouts.length) return;
  window._parsedCallouts.forEach((callout) => {
    const items = queue.filter((item) => item.pageIdx === (targetPageIdx != null ? targetPageIdx : item.pageIdx));
    if (!items.length) return;
    const canvas = pages[items[0].pageIdx];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const style = CALLOUT_STYLES[callout.type] || CALLOUT_STYLES.info;
    const margin = S.margin;
    const boxW = margin - 20;
    const boxH = 70;
    const bx = 10;
    const by = margin + 20;
    ctx.save();
    ctx.fillStyle = style.bg;
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeStyle = style.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, boxW, boxH);
    ctx.font = `bold ${Math.max(10, S.fontSize * 0.5)}px ${S.font}`;
    ctx.fillStyle = style.border;
    ctx.fillText(style.icon, bx + 6, by + 16);
    ctx.font = `${Math.max(8, S.fontSize * 0.4)}px ${S.font}`;
    ctx.fillStyle = '#333';
    window.PaperRenderer.drawWrappedText(ctx, callout.text, bx + 22, by + 16, boxW - 28, S.fontSize * 0.45, 4);
    ctx.restore();
  });
}

// ponytail: diagramCache and getDiagramImage are in diagram-engine.js

function layoutText(text) {
  const originalLength = text ? text.length : 0;
  if (typeof currentPrediction !== 'undefined' && currentPrediction) {
    text = (text || '') + currentPrediction;
  }

  text = sanitizeText(text);
  if (!text.trim()) {
    return { queue: [], pageTexts: [], pageCount: 1 };
  }

  const result = layoutTextTemplated(text);

  // Tag prediction characters in the queue and strip them from pageTexts
  if (typeof currentPrediction !== 'undefined' && currentPrediction && result) {
    const numPredictionChars = getGraphemes(currentPrediction).length;
    let taggedCount = 0;
    for (let i = result.queue.length - 1; i >= 0; i--) {
      const item = result.queue[i];
      if (item.type !== 'shape' && item.type !== 'edge' && item.type !== 'mermaid') {
        item.isPrediction = true;
        taggedCount++;
        if (taggedCount >= numPredictionChars) {
          break;
        }
      }
    }

    // Strip prediction from pageTexts
    let remainingPredictionLen = currentPrediction.length;
    for (let i = result.pageTexts.length - 1; i >= 0; i--) {
      if (remainingPredictionLen <= 0) break;
      const pageText = result.pageTexts[i];
      if (pageText.length >= remainingPredictionLen) {
        result.pageTexts[i] = pageText.slice(0, pageText.length - remainingPredictionLen);
        remainingPredictionLen = 0;
      } else {
        remainingPredictionLen -= pageText.length;
        result.pageTexts[i] = '';
      }
    }
  }

  return result;
}

function layoutTextTemplated(text) {
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = PAGE_W;
  tmpCanvas.height = PAGE_H;
  const ctx = tmpCanvas.getContext('2d');

  const queue = [];
  const pageTexts = [];
  let currentPageText = '';

  const variationContext = new CharacterVariationContext();

  const margin = S.margin;
  const template = window.templateManager
    ? window.templateManager.resolveTemplate(S.noteLayout, PAGE_W, PAGE_H, margin)
    : null;
  const zones =
    template && template.zones && template.zones.length > 0
      ? template.zones
      : [{ id: 'main', x: margin, y: margin, width: PAGE_W - margin * 2, height: PAGE_H - margin * 2, nextZone: null }];

  let activeZone = zones[0];
  let x = activeZone.x;
  const lineH = S.fontSize * S.lineHeight;
  let y = activeZone.y + S.fontSize + lineH;

  let pageIdx = 0;
  let charIndex = 0;
  let lineCharIndex = 0;

  function advanceLineOrZone() {
    x = activeZone.x;
    y += lineH;
    lineCharIndex = 0;
    variationContext.resetAtLineBreak();
    if (y + lineH > activeZone.y + activeZone.height) {
      if (activeZone.nextZone) {
        activeZone = zones.find((z) => z.id === activeZone.nextZone) || zones[0];
      } else {
        pageTexts.push(currentPageText);
        currentPageText = '';
        pageIdx++;
        activeZone = zones[0];
      }
      x = activeZone.x;
      y = activeZone.y + S.fontSize + lineH;
    }
  }

  const blocks = parseBlocks(text);

  for (const block of blocks) {
    if (block.type === 'mermaid') {
      const diag = getDiagramImage(block.content);

      const maxWidth = activeZone.width;
      let dWidth = diag.width || 400;
      let dHeight = diag.height || 200;

      if (dWidth > maxWidth) {
        const scale = maxWidth / dWidth;
        dWidth = maxWidth;
        dHeight *= scale;
      }

      if (y + dHeight > activeZone.y + activeZone.height) {
        advanceLineOrZone();
      }

      queue.push({
        type: 'mermaid',
        content: block.content,
        x: activeZone.x + (activeZone.width - dWidth) / 2,
        y: y,
        w: dWidth,
        h: dHeight,
        pageIdx,
      });

      currentPageText += block.raw + '\n';
      y += dHeight + lineH;
      x = activeZone.x;
      lineCharIndex = 0;
      continue;
    }

    if (block.type === 'diagram') {
      let data;
      try {
        data = JSON.parse(block.content);
        if (!data || !data.nodes) throw new Error('Missing nodes');
      } catch (e) {
        console.error('Failed to parse diagram JSON', e);
        continue;
      }

      const dWidth = activeZone.width;
      const dHeight = data.nodes.length > 5 ? 400 : 300;

      if (y + dHeight > activeZone.y + activeZone.height) {
        advanceLineOrZone();
      }

      let positionedNodes = [];

      // Layout based on diagram type (using imported functions from diagram-engine.js)
      positionedNodes = positionDiagramNodes(data, activeZone.x, y, dWidth, dHeight);

      // Push individual shape items
      positionedNodes.forEach((n) => {
        const shape = n.shape || (data.type === 'cycle' ? 'circle' : 'box');
        queue.push({
          type: 'shape',
          shape,
          label: n.label || '',
          x: n.x,
          y: n.y,
          w: n.w || 100,
          h: n.h || 40,
          pageIdx,
        });
      });

      // Push individual edge items with labels
      (data.edges || []).forEach((e) => {
        const fromNode = positionedNodes.find((n) => n.id === e.from);
        const toNode = positionedNodes.find((n) => n.id === e.to);
        if (!fromNode || !toNode) return;
        queue.push({
          type: 'edge',
          from: { x: fromNode.x, y: fromNode.y },
          to: { x: toNode.x, y: toNode.y },
          label: e.label || '',
          pageIdx,
        });
      });

      positionedNodes.forEach((n) => {
        if (!n.label) return;
        const words = n.label.split(' ');
        let ly = n.y - 5;
        const labelLineHeight = S.fontSize * 1.2;
        ctx.font = `${S.fontSize}px ${S.font}`;

        words.forEach((word) => {
          let lx = n.x - ctx.measureText(word).width / 2;
          const chars = getGraphemes(word);
          chars.forEach((ch, _ci) => {
            const v = getCharVariation(S.rotationMax * 0.5, S.pressure, S.fontSize);
            const cw = ctx.measureText(ch).width + v.spacingExtra;
            queue.push({
              ch,
              x: lx,
              y: ly + v.baselineOff,
              v,
              pageIdx,
              isIndic: false,
              type: 'diagram-label',
              fontStack: fontSwitcher?.getFontStack(false, S.font) ?? S.font,
              inkColor: S.inkColor,
              penKey: 'body',
              charWidth: cw,
            });
            lx += cw;
          });
          ly += labelLineHeight;
        });
      });

      y += dHeight + lineH;
      currentPageText += block.raw + '\n';
      x = activeZone.x;
      lineCharIndex = 0;
      continue;
    }

    const lines = block.content.split('\n');

    const applySpaceAdvance = (fontStack) => {
      ctx.font = `${S.fontSize}px ${fontStack}`;
      const spaceW = ctx.measureText(' ').width + S.wordSpacing;
      if (x + spaceW < activeZone.x + activeZone.width) {
        x += spaceW;
        currentPageText += ' ';
      }
    };

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      if (lineIdx > 0) {
        advanceLineOrZone();
        currentPageText += '\n';
      }

      const lineText = lines[lineIdx];
      if (!lineText) continue;

      const segments = getStyledLineSegments(lineText);
      for (let si = 0; si < segments.length; si++) {
        const segment = segments[si];
        if (!segment.text) continue;

        const penProfile = getPenProfileForSegment(segment);
        const penPressure = penProfile.pressure !== null ? penProfile.pressure : S.pressure;
        const penRotation = S.rotationMax * penProfile.rotationScale;
        const inkColor = penProfile.inkColor || S.inkColor;
        const tokens = tokenizeWithSpaces(segment.text);

        for (let ti = 0; ti < tokens.length; ti++) {
          const token = tokens[ti];
          if (token.type === 'space') {
            const previewIsIndic = ScriptDetector.isIndicScript(segment.text);
            applySpaceAdvance(fontSwitcher?.getFontStack(previewIsIndic, S.font) ?? S.font);
            continue;
          }

          const lineWord = token.text;
          if (!lineWord) continue;

          const scriptRuns = fontSwitcher?.getTokenScriptRuns(lineWord, S.hinglishAutoSwitch, getGraphemes) || [];
          let wordWidth = S.wordSpacing;
          scriptRuns.forEach((run) => {
            const runFontStack = fontSwitcher?.getFontStack(run.isIndic, S.font) ?? S.font;
            ctx.font = `${S.fontSize}px ${runFontStack}`;
            wordWidth += ctx.measureText(run.text).width;
          });

          if (x + wordWidth > activeZone.x + activeZone.width && x > activeZone.x) {
            advanceLineOrZone();
          }

          scriptRuns.forEach((run) => {
            const fontStack = fontSwitcher?.getFontStack(run.isIndic, S.font) ?? S.font;
            if (run.isIndic) {
              const lineLength = Math.max(1, lineText.length);
              variationContext.updateForCharacter(
                lineCharIndex,
                lineLength,
                lineCharIndex === 0,
                lineCharIndex === lineLength - 1
              );
              const v = getCharVariationWithContext(
                run.isIndic ? penRotation * 0.3 : penRotation,
                penPressure,
                S.fontSize,
                variationContext
              );
              const wobble = Math.sin(lineCharIndex * 0.04) * 0.4 * (S.fontSize / 22);
              const alignOffset = window.PaperRenderer.getAlignmentOffset(S.textAlignment, S.fontSize, S.lineHeight);
              const cy = y + v.baselineOff * 0.4 + wobble + alignOffset;

              queue.push({
                ch: run.text,
                x,
                y: cy,
                v,
                pageIdx,
                isIndic: true,
                fontStack,
                inkColor,
                penKey: penProfile.key,
                charWidth: ctx.measureText(run.text).width + v.spacingExtra,
              });

              ctx.font = `${S.fontSize}px ${fontStack}`;
              x += ctx.measureText(run.text).width + v.spacingExtra;
              charIndex += run.text.length;
              lineCharIndex += run.text.length;
              currentPageText += run.text;
              return;
            }

            const graphemes = getGraphemes(run.text);
            for (let ci = 0; ci < graphemes.length; ci++) {
              const ch = graphemes[ci];
              const isWordStart = ci === 0;
              const isWordEnd = ci === graphemes.length - 1;
              const lineLength = Math.max(1, lineText.length);
              variationContext.updateForCharacter(lineCharIndex, lineLength, isWordStart, isWordEnd);

              const v = getCharVariationWithContext(
                run.isIndic ? penRotation * 0.3 : penRotation,
                penPressure,
                S.fontSize,
                variationContext
              );
              ctx.font = `${S.fontSize}px ${fontStack}`;
              const charWidth = ctx.measureText(ch).width + v.spacingExtra;

              if (x + charWidth > activeZone.x + activeZone.width && x > activeZone.x) {
                advanceLineOrZone();
              }

              const wobble = Math.sin(lineCharIndex * 0.04) * 0.8 * (S.fontSize / 22);
              const alignOffset = window.PaperRenderer.getAlignmentOffset(S.textAlignment, S.fontSize, S.lineHeight);
              const cy = y + v.baselineOff + wobble + alignOffset;

              queue.push({
                ch,
                x,
                y: cy,
                v,
                pageIdx,
                isIndic: false,
                fontStack,
                inkColor,
                penKey: penProfile.key,
                charWidth: ctx.measureText(ch).width + v.spacingExtra,
              });

              x += ctx.measureText(ch).width + v.spacingExtra;
              charIndex++;
              lineCharIndex++;
              currentPageText += ch;
            }
          });
        }
      }
    }
  }

  pageTexts.push(currentPageText);
  return { queue, pageTexts, pageCount: pageIdx + 1 };
}

// Cache of decoded <img> elements for drafted glyphs, keyed by character.
// renderText() only draws an entry once it's fully decoded (img.complete-
// equivalent ready flag), so the drawImage() call always happens
// synchronously inside the correct save()/translate()/restore() block for
// that character instead of racing an async onload against ctx.restore().
// ponytail: LRU cache — evicts oldest entry when exceeding 500
const glyphImageCache = new Map();
const GLYPH_CACHE_MAX = 500;

function getCachedGlyphImage(char, src) {
  let entry = glyphImageCache.get(char);
  if (entry && entry.src === src) {
    return entry.ready ? entry.img : null;
  }
  // New character, or its drafted artwork changed — (re)decode it.
  if (glyphImageCache.size >= GLYPH_CACHE_MAX) {
    const oldest = glyphImageCache.keys().next().value;
    glyphImageCache.delete(oldest);
  }
  const img = new Image();
  entry = { img, src, ready: false };
  glyphImageCache.set(char, entry);
  img.onload = () => {
    entry.ready = true;
    debounceRender(); // swap the system-font placeholder for the real stroke
  };
  img.src = src;
  return null;
}

function renderText(text) {
  text = sanitizeText(text);
  clearPages();
  if (!text.trim()) {
    const canvas = createPage(1);
    window.PaperRenderer.drawPaperBackground(canvas.getContext('2d'), S.paperStyle);
    const ctx = canvas.getContext('2d');
    window.PaperRenderer.renderSmudgeEffects(ctx, 0);
    const editor = document.getElementById('editor-1');
    if (editor) {
      editor.innerText = '';
      updateEditorStyles(editor, canvas);
    }
    return;
  }

  const { queue, pageTexts, pageCount } = layoutText(text);

  for (let i = 0; i < pageCount; i++) {
    createPage(i + 1);
    // We let renderSpecificPage handle the background and smudges
  }

  // Disconnect old observer before re-observing new pages
  if (window.pageObserver) {
    window.pageObserver.disconnect();
  }
  window.pageObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const wrapper = entry.target;
        if (entry.isIntersecting) {
          const pageIdx = parseInt(wrapper.dataset.pageIdx, 10);
          if (!isNaN(pageIdx)) {
            window.renderSpecificPage(pageIdx);
          }
        }
      });
    },
    { rootMargin: '600px 0px' }
  );

  // Group queue by page and save globally for lazy rendering
  window.currentRenderQueue = queue;
  window.currentRcCache = new Map();

  pages.forEach((c, idx) => {
    const editor = document.getElementById('editor-' + (idx + 1));
    if (editor) {
      if (document.activeElement !== editor) {
        editor.innerText = pageTexts[idx] || '';
      }
      c.dataset.text = pageTexts[idx] || '';
      updateEditorStyles(editor, c);
    }

    c.dataset.rendered = 'false';
    const wrapper = c.parentElement;
    wrapper.dataset.pageIdx = idx;
    window.pageObserver.observe(wrapper);
  });
}

window.renderSpecificPage = function (pageIdx, forceRedraw) {
  const canvas = pages[pageIdx];
  if (!canvas) return;
  if (canvas.dataset.rendered === 'true' && !forceRedraw) return;
  canvas.dataset.rendered = 'true';

  // Always draw directly to the main canvas for reliability
  const ctx = canvas.getContext('2d');
  window.PaperRenderer.drawPaperBackground(ctx, S.paperStyle);
  window.PaperRenderer.renderSmudgeEffects(ctx, pageIdx);

  // Also update layer compositor background layer if available (for layer UI)
  if (window.layerCompositor) {
    try {
      window.layerCompositor.clearPage(pageIdx);
      const bgStack = window.layerCompositor.getStack(pageIdx);
      const bgLayer = bgStack.layers.find((l) => l.name === 'Background');
      if (bgLayer) {
        const bgCtx = bgLayer.canvas.getContext('2d');
        window.PaperRenderer.drawPaperBackground(bgCtx, S.paperStyle);
        window.PaperRenderer.renderSmudgeEffects(bgCtx, pageIdx);
      }
    } catch {
      /* ignore compositor errors */
    }
  }

  const pageItems = (window.currentRenderQueue || []).filter((item) => item.pageIdx === pageIdx);

  const renderCursive = window.ExportRenderers?.renderCursiveConnectionsOn;
  if (S.cursiveMode && cursiveConnector && typeof renderCursive === 'function') {
    renderCursive(ctx, pageItems);
  }

  pageItems.forEach((item) => {
    if (item.type === 'mermaid') {
      const diag = getDiagramImage(item.content);
      if (diag.ready && diag.img && !diag.error) {
        ctx.save();
        ctx.translate(item.x, item.y);
        // ponytail: seeded rotation so diagrams don't jitter on re-render
        let hash = 0;
        for (let ci = 0; ci < item.content.length; ci++) {
          hash = ((hash << 5) - hash + item.content.charCodeAt(ci)) | 0;
        }
        ctx.rotate(((((hash % 40) - 20) / 100) * Math.PI) / 180);
        ctx.globalAlpha = 0.9;
        ctx.drawImage(diag.img, 0, 0, item.w, item.h);
        ctx.restore();
      } else if (diag.error) {
        ctx.fillStyle = '#ff0000';
        ctx.font = '12px Courier New';
        ctx.fillText('[Mermaid Error]', item.x, item.y + 20);
      } else {
        ctx.save();
        ctx.strokeStyle = S.inkColor;
        ctx.globalAlpha = 0.3;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(item.x, item.y, item.w, item.h);
        ctx.font = 'italic 12px sans-serif';
        ctx.fillStyle = S.inkColor;
        ctx.fillText('Rendering Mermaid...', item.x + 10, item.y + 20);
        ctx.restore();
      }
      return;
    }

    if (item.type === 'shape' || item.type === 'edge') {
      drawShapeOrEdge(ctx, canvas, item, {
        roughness: S.pressure * 4,
        stroke: S.inkColor,
        strokeWidth: 1.2,
        bowing: S.rotationMax * 2,
      }, window.currentRcCache);
      return;
    }

    const v = item.v;
    const itemInkColor = item.inkColor || S.inkColor;

    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate((v.tiltDeg * (item.isIndic ? 0.3 : 1) * Math.PI) / 180);
    ctx.scale(v.scaleX, v.scaleY);

    if (draftedGlyphs[item.ch]) {
      const glyphImg = getCachedGlyphImage(item.ch, draftedGlyphs[item.ch]);
      if (glyphImg) {
        ctx.globalAlpha = item.isPrediction ? 0.3 : v.opacity;
        const drawSz = S.fontSize * 1.35;
        ctx.drawImage(glyphImg, -drawSz / 2, -drawSz / 2, drawSz, drawSz);
      } else {
        const pxSize = S.fontSize * v.pressureMod;
        ctx.font = `${Math.max(10, pxSize)}px ${item.fontStack}`;
        ctx.globalAlpha = item.isPrediction ? 0.3 : v.opacity;
        ctx.fillStyle = itemInkColor;
        ctx.fillText(item.ch, 0, 0);
      }
    } else {
      const pxSize = S.fontSize * v.pressureMod;
      ctx.font = `${Math.max(10, pxSize)}px ${item.fontStack}`;
      ctx.globalAlpha = item.isPrediction ? 0.3 : v.opacity;
      if (S.bleed > 0.05) {
        ctx.shadowColor = itemInkColor;
        ctx.shadowBlur = S.bleed * 1.4;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = itemInkColor;
      ctx.fillText(item.ch, 0, 0);
    }
    ctx.restore();
  });

  // Draw template decorations on top of content
  window.PaperRenderer.drawLayoutDecorations(ctx, S.noteLayout);

  // Update layer UI if needed
  if (window.layerCompositor && typeof updateLayerUI === 'function' && pageIdx === currentLayerPage) {
    updateLayerUI(pageIdx);
  }
};

function onTextInputChange() {
  if (!predictionEngine) return;
  const textarea = document.getElementById('text-input');
  if (!textarea) return;

  const text = textarea.value;
  const cursor = textarea.selectionStart;

  // Only predict if the cursor is at the very end of the text
  if (cursor === text.length) {
    const preds = predictionEngine.predict(text, 1);
    currentPrediction = preds[0] || '';
  } else {
    currentPrediction = '';
  }
}

const textInputEl = document.getElementById('text-input');
if (textInputEl) {
  textInputEl.addEventListener('input', function () {
    S.text = this.value;
    onTextInputChange();
    debounceRender();
    autosave();
  });

  textInputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Tab' && typeof currentPrediction !== 'undefined' && currentPrediction) {
      e.preventDefault();

      const start = this.selectionStart;
      const end = this.selectionEnd;
      const originalValue = this.value;

      // Accept prediction
      this.value = originalValue.slice(0, start) + currentPrediction + originalValue.slice(end);
      this.selectionStart = this.selectionEnd = start + currentPrediction.length;

      S.text = this.value;
      currentPrediction = '';

      onTextInputChange();

      // Notify collaboration server if connected
      if (collabEngine && collabEngine.isConnected()) {
        const event = new Event('input', { bubbles: true });
        this.dispatchEvent(event);
      } else {
        debounceRender();
        autosave();
      }
    }
  });

  textInputEl.addEventListener('keyup', function (e) {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
      onTextInputChange();
      debounceRender();
    }
  });

  textInputEl.addEventListener('click', function () {
    onTextInputChange();
    debounceRender();
  });
}

function debounceRender() {
  clearTimeout(renderTimeout);
  renderTimeout = setTimeout(() => renderText(S.text), 280);
}

function triggerRender() {
  const input = document.getElementById('text-input');
  if (input) S.text = input.value;
  renderText(S.text);
}

/* ───────────────────────────────────────────
   TASK 13 — COLLABORATIVE WRITING ENGINE
─────────────────────────────────────────── */
let collabEngine = null;
const COLLAB_SERVER_URL = 'ws://localhost:8080';

// Assign a short friendly name per session (random adjective + noun)
function _collabGenerateName() {
  const adj = ['Swift', 'Calm', 'Bold', 'Keen', 'Warm', 'Wise', 'Bright', 'Sharp'];
  const noun = ['Pen', 'Ink', 'Page', 'Quill', 'Note', 'Leaf', 'Scroll', 'Draft'];
  return adj[Math.floor(Math.random() * adj.length)] + noun[Math.floor(Math.random() * noun.length)];
}

const _collabLocalName = _collabGenerateName();

function toggleCollaboration() {
  const btn = document.getElementById('btn-collab-connect');

  if (collabEngine && collabEngine.isConnected()) {
    // Disconnect
    collabEngine.disconnect();
    collabEngine = null;
    btn.textContent = 'Connect to Session';
    document.getElementById('collab-users-container').classList.add('hidden');
    return;
  }

  // Create and initialize engine
  const textarea = document.getElementById('text-input');

  collabEngine = new CollaborativeEngine({
    textarea,
    onTextChange(newText) {
      textarea.value = newText;
      S.text = newText;
      if (typeof onTextInputChange === 'function') {
        onTextInputChange();
      }
      debounceRender();
    },
    onUsersChange(users) {
      const list = document.getElementById('collab-users-list');
      const container = document.getElementById('collab-users-container');
      list.innerHTML = '';

      // Add self
      const selfItem = document.createElement('li');
      selfItem.className = 'user-item';
      selfItem.innerHTML = `<span class="user-color-dot" style="background:${collabEngine.color || '#aaa'}"></span> ${_collabLocalName} (you)`;
      list.appendChild(selfItem);

      // Add remote users
      for (const u of users) {
        const li = document.createElement('li');
        li.className = 'user-item';
        li.dataset.userId = u.userId;
        li.innerHTML = `<span class="user-color-dot" style="background:${u.color}"></span> ${u.userId.slice(0, 12)}`;
        list.appendChild(li);
      }

      if (users.length > 0) {
        container.classList.remove('hidden');
      }
    },
    onStatusChange(text, isOnline) {
      const indicator = document.getElementById('collab-status-indicator');
      const statusText = document.getElementById('collab-status-text');
      const btn = document.getElementById('btn-collab-connect');

      statusText.textContent = text;
      indicator.className =
        'status-indicator ' + (isOnline ? 'online' : text === 'Connection error' ? 'error' : 'offline');

      if (isOnline) {
        btn.textContent = 'Disconnect';
        document.getElementById('collab-users-container').classList.remove('hidden');
      } else if (text !== 'Connecting…') {
        btn.textContent = 'Connect to Session';
      }
    },
  });

  collabEngine.initialize();
  collabEngine.connect(COLLAB_SERVER_URL);
  btn.textContent = 'Connecting…';
  btn.disabled = true;
  setTimeout(() => {
    btn.disabled = false;
  }, 2000);
}

/**
 * PHASE 6.0 — DIAGRAM TEMPLATES
 */
function insertDiagramTemplate(type) {
  const textarea = document.getElementById('text-input');
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const current = textarea.value;

  const templates = {
    cycle:
      '\n```diagram\n{\n  "type": "cycle",\n  "nodes": [\n    { "id": "n1", "label": "Start" },\n    { "id": "n2", "label": "Develop" },\n    { "id": "n3", "label": "Review" },\n    { "id": "n4", "label": "Ship" }\n  ],\n  "edges": [\n    { "from": "n1", "to": "n2" },\n    { "from": "n2", "to": "n3" },\n    { "from": "n3", "to": "n4" },\n    { "from": "n4", "to": "n1" }\n  ]\n}\n```\n',
    flowchart:
      '\n```diagram\n{\n  "type": "flowchart",\n  "nodes": [\n    { "id": "s1", "label": "Input", "shape": "box" },\n    { "id": "s2", "label": "Verify?", "shape": "diamond" },\n    { "id": "s3", "label": "Success", "shape": "box" },\n    { "id": "s4", "label": "Retry", "shape": "box" }\n  ],\n  "edges": [\n    { "from": "s1", "to": "s2" },\n    { "from": "s2", "to": "s3", "label": "Yes" },\n    { "from": "s2", "to": "s4", "label": "No" }\n  ]\n}\n```\n',
    hierarchy:
      '\n```diagram\n{\n  "type": "hierarchy",\n  "nodes": [\n    { "id": "ceo", "label": "CEO", "shape": "rounded" },\n    { "id": "eng", "label": "Engineering", "shape": "box" },\n    { "id": "design", "label": "Design", "shape": "box" },\n    { "id": "mkt", "label": "Marketing", "shape": "box" },\n    { "id": "fe", "label": "Frontend", "shape": "pill" },\n    { "id": "be", "label": "Backend", "shape": "pill" }\n  ],\n  "edges": [\n    { "from": "ceo", "to": "eng" },\n    { "from": "ceo", "to": "design" },\n    { "from": "ceo", "to": "mkt" },\n    { "from": "eng", "to": "fe" },\n    { "from": "eng", "to": "be" }\n  ]\n}\n```\n',
    pyramid:
      '\n```diagram\n{\n  "type": "pyramid",\n  "nodes": [\n    { "id": "t", "label": "Vision", "shape": "diamond" },\n    { "id": "m", "label": "Strategy", "shape": "box" },\n    { "id": "b", "label": "Execution", "shape": "hexagon" }\n  ],\n  "edges": [\n    { "from": "t", "to": "m" },\n    { "from": "m", "to": "b" }\n  ]\n}\n```\n',
    pipeline:
      '\n```diagram\n{\n  "type": "flowchart",\n  "nodes": [\n    { "id": "p1", "label": "Plan", "shape": "rounded" },\n    { "id": "p2", "label": "Build", "shape": "box" },\n    { "id": "p3", "label": "Test", "shape": "hexagon" },\n    { "id": "p4", "label": "Deploy", "shape": "pill" }\n  ],\n  "edges": [\n    { "from": "p1", "to": "p2" },\n    { "from": "p2", "to": "p3" },\n    { "from": "p3", "to": "p4" }\n  ]\n}\n```\n',
    mermaid:
      '\n```mermaid\ngraph TD\n  A[Idea] --> B(Writing)\n  B --> C{Good?}\n  C -->|Yes| D[Publish]\n  C -->|No| B\n```\n',
  };

  const template = templates[type] || templates.flowchart;
  textarea.value = current.substring(0, start) + template + current.substring(end);
  textarea.focus();
  textarea.selectionStart = textarea.selectionEnd = start + template.length;

  S.text = textarea.value;
  debounceRender();
}

function buildCharQueue(text) {
  const { queue } = layoutText(text);
  return queue;
}

function stopAnimation() {
  if (animFrameId) cancelAnimationFrame(animFrameId);
  animFrameId = null;
  isAnimating = false;
  const cursor = document.getElementById('pen-cursor');
  if (cursor) cursor.style.display = 'none';
}

function startAnimation() {
  stopAnimation();
  const text = document.getElementById('text-input').value;
  if (!text.trim()) return;
  isAnimating = true;

  // Clear and recreate pages with backgrounds
  clearPages();
  const { queue, pageTexts, pageCount } = layoutText(text);
  for (let i = 0; i < pageCount; i++) {
    const c = createPage(i + 1);
    window.PaperRenderer.drawPaperBackground(c.getContext('2d'), S.paperStyle);
  }

  let idx = 0;
  const penEl = document.getElementById('pen-cursor');
  penEl.style.display = 'block';

  function step() {
    if (!isAnimating || idx >= queue.length) {
      penEl.style.display = 'none';
      isAnimating = false;
      renderText(S.text);
      return;
    }
    const charsPerFrame = S.animSpeed;
    for (let i = 0; i < charsPerFrame && idx < queue.length; i++, idx++) {
      const item = queue[idx];
      const canvas = pages[item.pageIdx] || pages[pages.length - 1];
      if (!canvas) continue;
      const ctx = canvas.getContext('2d');

      if (item.type === 'mermaid') {
        const diag = getDiagramImage(item.content);
        if (diag.ready && diag.img && !diag.error) {
          ctx.save();
          ctx.translate(item.x, item.y);
          ctx.rotate(((Math.random() * 0.4 - 0.2) * Math.PI) / 180);
          ctx.globalAlpha = 0.9;
          ctx.drawImage(diag.img, 0, 0, item.w, item.h);
          ctx.restore();
        }
        continue;
      }

      if (item.type === 'shape' || item.type === 'edge') {
        drawShapeOrEdge(ctx, canvas, item, {
          roughness: S.pressure * 4,
          stroke: S.inkColor,
          strokeWidth: 1.2,
          bowing: S.rotationMax * 2,
        }, null);
        continue;
      }

      const v = item.v;
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate((v.tiltDeg * (item.isIndic ? 0.3 : 1) * Math.PI) / 180);
      ctx.scale(v.scaleX, v.scaleY);
      const pxSize = S.fontSize * v.pressureMod;
      ctx.font = `${Math.max(10, pxSize)}px ${item.fontStack}`;
      ctx.globalAlpha = v.opacity;
      if (S.bleed > 0.05) {
        ctx.shadowColor = S.inkColor;
        ctx.shadowBlur = S.bleed * 1.4;
      }
      ctx.fillStyle = S.inkColor;
      ctx.fillText(item.ch, 0, 0);
      ctx.restore();

      // Move pen cursor to current char screen position
      if (i === charsPerFrame - 1 || idx === queue.length - 1) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width / PAGE_W;
        const scaleY = rect.height / PAGE_H;
        const penLeft = rect.left + item.x * scaleX;
        const penTop = rect.top + item.y * scaleY + window.scrollY;
        penEl.style.left = penLeft + 'px';
        penEl.style.top = penTop + 'px';

        // Auto-scroll viewport if the pen is near the edges of screen
        const targetScroll = rect.top + item.y * scaleY + window.scrollY - window.innerHeight / 2;
        if (rect.top + item.y * scaleY < 120 || rect.top + item.y * scaleY > window.innerHeight - 120) {
          window.scrollTo({
            top: Math.max(0, targetScroll),
            behavior: 'smooth',
          });
        }
      }
    }
    animFrameId = requestAnimationFrame(step);
  }
  animFrameId = requestAnimationFrame(step);
}

document.getElementById('btn-animate').addEventListener('click', startAnimation);
document.getElementById('btn-clear').addEventListener('click', clearText);

/* ───────────────────────────────────────────
   PHASE 7.2 — MULTI-PROVIDER AI ENGINE
   Supports: OpenRouter (100+ models) & Anthropic Direct
─────────────────────────────────────────── */

const AI_MODELS = {
  openrouter: [
    // ── Google ──
    { id: 'google/gemini-2.5-flash-preview', name: '⚡ Gemini 2.5 Flash (Free)' },
    { id: 'google/gemini-2.5-pro-preview', name: '🔥 Gemini 2.5 Pro' },
    { id: 'google/gemini-2.0-flash-001', name: '⚡ Gemini 2.0 Flash (Free)' },
    // ── Anthropic ──
    { id: 'anthropic/claude-sonnet-4', name: '🟣 Claude Sonnet 4' },
    { id: 'anthropic/claude-3.5-sonnet', name: '🟣 Claude 3.5 Sonnet' },
    { id: 'anthropic/claude-3-haiku', name: '🟣 Claude 3 Haiku (Fast)' },
    // ── OpenAI ──
    { id: 'openai/gpt-4.1', name: '🟢 GPT-4.1' },
    { id: 'openai/gpt-4.1-mini', name: '🟢 GPT-4.1 Mini' },
    { id: 'openai/gpt-4.1-nano', name: '🟢 GPT-4.1 Nano' },
    { id: 'openai/gpt-4o', name: '🟢 GPT-4o' },
    { id: 'openai/gpt-4o-mini', name: '🟢 GPT-4o Mini' },
    { id: 'openai/o3-mini', name: '🟢 o3-Mini (Reasoning)' },
    // ── Meta ──
    { id: 'meta-llama/llama-4-maverick', name: '🦙 Llama 4 Maverick' },
    { id: 'meta-llama/llama-4-scout', name: '🦙 Llama 4 Scout' },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: '🦙 Llama 3.3 70B (Free)' },
    // ── DeepSeek ──
    { id: 'deepseek/deepseek-chat-v3-0324', name: '🌊 DeepSeek V3' },
    { id: 'deepseek/deepseek-r1', name: '🌊 DeepSeek R1 (Reasoning)' },
    // ── Mistral ──
    { id: 'mistralai/mistral-large-2411', name: '🔷 Mistral Large' },
    { id: 'mistralai/mistral-small-2503', name: '🔷 Mistral Small' },
    { id: 'mistralai/codestral-mamba', name: '🔷 Codestral Mamba' },
    // ── Qwen ──
    { id: 'qwen/qwen-2.5-72b-instruct', name: '🟠 Qwen 2.5 72B' },
    { id: 'qwen/qwen3-235b-a22b', name: '🟠 Qwen 3 235B' },
    // ── xAI ──
    { id: 'x-ai/grok-3-mini-beta', name: '✖ Grok 3 Mini' },
    // ── Others ──
    { id: 'nvidia/llama-3.1-nemotron-70b-instruct', name: '🟩 Nemotron 70B (Free)' },
    { id: 'microsoft/phi-4', name: '🪟 Phi-4 (Free)' },
    { id: 'cohere/command-a', name: '🔴 Command A' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4 (Latest)' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast)' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus (Powerful)' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku (Budget)' },
  ],
  ollama: [
    { id: 'llama3.2', name: '🦙 Llama 3.2' },
    { id: 'mistral', name: '🔷 Mistral' },
    { id: 'phi4', name: '🪟 Phi-4' },
    { id: 'gemma2', name: '💎 Gemma 2' },
    { id: 'qwen2.5', name: '🟠 Qwen 2.5' },
    { id: 'deepseek-r1', name: '🌊 DeepSeek R1' },
    { id: 'codellama', name: '🦙 CodeLlama' },
  ],
};

let openRouterModelsLoaded = false;
let isFetchingOpenRouterModels = false;

async function fetchOpenRouterModels() {
  if (openRouterModelsLoaded || isFetchingOpenRouterModels) return;
  isFetchingOpenRouterModels = true;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    if (!res.ok) throw new Error('HTTP status ' + res.status);
    const data = await res.json();
    if (data && Array.isArray(data.data)) {
      const fetched = data.data.map((item) => {
        let emoji = '🤖 ';
        const id = item.id.toLowerCase();

        if (id.startsWith('google/')) emoji = '⚡ ';
        else if (id.startsWith('anthropic/')) emoji = '🟣 ';
        else if (id.startsWith('openai/')) emoji = '🟢 ';
        else if (id.startsWith('meta-llama/')) emoji = '🦙 ';
        else if (id.startsWith('deepseek/')) emoji = '🌊 ';
        else if (id.startsWith('mistralai/')) emoji = '🔷 ';
        else if (id.startsWith('qwen/')) emoji = '🟠 ';
        else if (id.startsWith('x-ai/')) emoji = '✖ ';
        else if (id.startsWith('cohere/')) emoji = '🔴 ';
        else if (id.startsWith('nvidia/')) emoji = '🟩 ';
        else if (id.startsWith('microsoft/')) emoji = '🪟 ';

        const isFree =
          item.pricing && parseFloat(item.pricing.prompt) === 0 && parseFloat(item.pricing.completion) === 0;
        let displayName = item.name || item.id;

        // Strip out redundant provider prefixes to keep UI compact
        displayName = displayName.replace(
          /^(google|anthropic|openai|meta|deepseek|mistral|qwen|x-ai|cohere|nvidia|microsoft|llama):\s*/i,
          ''
        );

        let name = `${emoji}${displayName}`;
        if (isFree) {
          name += ' (Free)';
        }

        return {
          id: item.id,
          name: name,
          isFree: isFree,
        };
      });

      // Sort free models first, then alphabetically
      fetched.sort((a, b) => {
        if (a.isFree && !b.isFree) return -1;
        if (!a.isFree && b.isFree) return 1;
        return a.name.localeCompare(b.name);
      });

      if (fetched.length > 0) {
        AI_MODELS.openrouter = fetched;
        openRouterModelsLoaded = true;

        // Refresh UI if currently viewing OpenRouter
        const provider = document.getElementById('ai-provider').value;
        if (provider === 'openrouter') {
          onProviderChange();
        }
      }
    }
  } catch (e) {
    console.warn('Could not auto-fetch OpenRouter models, using fallback list:', e);
  } finally {
    isFetchingOpenRouterModels = false;
  }
}

function onProviderChange() {
  const provider = document.getElementById('ai-provider').value;
  const modelSelect = document.getElementById('ai-model');
  const keyLabel = document.getElementById('api-key-label');
  const keyInput = document.getElementById('api-key');

  // Update model dropdown
  modelSelect.innerHTML = '';
  AI_MODELS[provider].forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.name;
    modelSelect.appendChild(opt);
  });

  // Update key label and placeholder
  if (provider === 'ollama') {
    keyLabel.textContent = 'No API key needed (local)';
    keyInput.placeholder = 'Ollama runs locally — no key required';
    keyInput.disabled = true;
    keyInput.value = '';
    keyLabel.style.display = 'none';
    keyInput.style.display = 'none';
    document.getElementById('remember-api-key')?.closest('label')?.style.setProperty('display', 'none');
  } else {
    keyLabel.style.display = '';
    keyInput.style.display = '';
    keyInput.disabled = false;
    document.getElementById('remember-api-key')?.closest('label')?.style.setProperty('display', '');
    if (provider === 'openrouter') {
      keyLabel.textContent = 'OpenRouter API Key';
      keyInput.placeholder = 'sk-or-v1-…';
      // Async fetch up-to-date models automatically from openrouter
      fetchOpenRouterModels();
    } else {
      keyLabel.textContent = 'Anthropic API Key';
      keyInput.placeholder = 'sk-ant-api…';
    }
  }
}

// Initialize model dropdown and start auto-fetching on load
onProviderChange();
fetchOpenRouterModels();
window.AIAssistant.initApiKeyPersistence();

/* -- AI ASSISTANT � delegated to ai-assistant.js -------------------------- */
const callClaude = (...a) => window.AIAssistant.callClaude(...a);
const setAiStatus = (...a) => window.AIAssistant.setAiStatus(...a);
const aiAction = (...a) => window.AIAssistant.aiAction(...a);
const GrammarCorrector = window.AIAssistant.GrammarCorrector;
const acceptGrammarCorrection = (...a) => window.AIAssistant.acceptGrammarCorrection(...a);

/* ───────────────────────────────────────────
   PHASE 8.1–8.2 — IMAGE EXPORT (PNG / JPG)
   Reads directly from the canvas elements at full native resolution.
   For single-page docs: one file. For multi-page: one file per page.
─────────────────────────────────────────── */
async function exportImage(format) {
  if (!pages || pages.length === 0) {
    showExportToast('Nothing to export — add some text first.', 'warn');
    return;
  }

  if (document.activeElement && document.activeElement.classList.contains('page-editor')) {
    document.activeElement.blur();
    await new Promise((r) => setTimeout(r, 320));
  }

  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const quality = format === 'png' ? 1.0 : 0.93;
  const ext = format === 'png' ? 'png' : 'jpg';

  try {
    if (pages.length === 1) {
      showExportToast('Exporting ' + ext.toUpperCase() + '…', 'info');
      pages[0].toBlob(
        (blob) => {
          if (!blob) {
            showExportToast('Export failed: Blob generation failed', 'error');
            return;
          }
          const url = URL.createObjectURL(blob);
          triggerDownload(url, 'inkflow-notes.' + ext);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          showExportToast('✓ ' + ext.toUpperCase() + ' saved!', 'success');
        },
        mimeType,
        quality
      );
    } else {
      for (let i = 0; i < pages.length; i++) {
        showExportToast(`Exporting ${ext.toUpperCase()} (Page ${i + 1}/${pages.length})…`, 'info');
        await new Promise((resolve) => {
          pages[i].toBlob(
            (blob) => {
              if (!blob) {
                resolve();
                return;
              }
              const url = URL.createObjectURL(blob);
              triggerDownload(url, `inkflow-notes-page${i + 1}.${ext}`);
              setTimeout(() => URL.revokeObjectURL(url), 1000);
              resolve();
            },
            mimeType,
            quality
          );
        });
        await new Promise((r) => setTimeout(r, 120));
      }
      showExportToast('✓ ' + ext.toUpperCase() + ' pages saved!', 'success');
    }
  } catch (e) {
    showExportToast('Export failed: ' + e.message, 'error');
    console.error('[Inkflow] exportImage error:', e);
  }
}

async function exportTransparentPNG() {
  if (!pages || pages.length === 0) {
    showExportToast('Nothing to export — add some text first.', 'warn');
    return;
  }

  if (document.activeElement && document.activeElement.classList.contains('page-editor')) {
    document.activeElement.blur();
    await new Promise((r) => setTimeout(r, 320));
  }

  const queue = window.currentRenderQueue || [];
  const ext = 'png';

  try {
    for (let i = 0; i < pages.length; i++) {
      showExportToast(`Exporting transparent PNG (Page ${i + 1}/${pages.length})…`, 'info');
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = PAGE_W;
      tmpCanvas.height = PAGE_H;
      const tmpCtx = tmpCanvas.getContext('2d');

      const pageItems = queue.filter((item) => item.pageIdx === i);
      if (S.cursiveMode && cursiveConnector && window.ExportRenderers) {
        window.ExportRenderers.renderCursiveConnectionsOn(tmpCtx, tmpCanvas, pageItems);
      }
      if (window.ExportRenderers) {
        window.ExportRenderers.renderQueueItems(tmpCtx, tmpCanvas, pageItems);
      }

      await new Promise((resolve) => {
        tmpCanvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve();
              return;
            }
            const url = URL.createObjectURL(blob);
            triggerDownload(url, `inkflow-transparent-page${i + 1}.${ext}`);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            resolve();
          },
          'image/png',
          1.0
        );
      });
      await new Promise((r) => setTimeout(r, 120));
    }
    showExportToast('✓ Transparent PNGs saved!', 'success');
  } catch (e) {
    showExportToast('Export failed: ' + e.message, 'error');
    console.error('[Inkflow] exportTransparentPNG error:', e);
  }
}

async function exportPDF() {
  if (!pages || pages.length === 0) {
    showExportToast('Nothing to export — add some text first.', 'warn');
    return;
  }

  if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
    showExportToast('PDF library not loaded. Check your internet connection.', 'error');
    return;
  }

  if (document.activeElement && document.activeElement.classList.contains('page-editor')) {
    document.activeElement.blur();
    await new Promise((r) => setTimeout(r, 320));
  }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    for (let i = 0; i < pages.length; i++) {
      showExportToast(`Building PDF (Page ${i + 1}/${pages.length})…`, 'info');
      await new Promise((r) => setTimeout(r, 60));
      if (i > 0) doc.addPage();
      const imgData = pages[i].toDataURL('image/jpeg', 0.93);
      doc.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }

    doc.save('inkflow-notes.pdf');
    showExportToast('✓ PDF saved!', 'success');
  } catch (e) {
    showExportToast('PDF export failed: ' + e.message, 'error');
    console.error('[Inkflow] exportPDF error:', e);
  }
}

async function exportSVG() {
  if (!pages || pages.length === 0) {
    showExportToast('Nothing to export — add some text first.', 'warn');
    return;
  }

  if (document.activeElement && document.activeElement.classList.contains('page-editor')) {
    document.activeElement.blur();
    await new Promise((r) => setTimeout(r, 320));
  }

  try {
    for (let i = 0; i < pages.length; i++) {
      showExportToast(`Building SVG (Page ${i + 1}/${pages.length})…`, 'info');
      await new Promise((r) => setTimeout(r, 60));
      const imgData = pages[i].toDataURL('image/png', 1.0);
      const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${PAGE_W}" height="${PAGE_H}" viewBox="0 0 ${PAGE_W} ${PAGE_H}">
  <image href="${imgData}" x="0" y="0" width="${PAGE_W}" height="${PAGE_H}"/>
</svg>`;
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const suffix = pages.length > 1 ? `-page${i + 1}` : '';
      triggerDownload(url, `inkflow-notes${suffix}.svg`);
      URL.revokeObjectURL(url);
      await new Promise((r) => setTimeout(r, 120));
    }
    showExportToast('✓ SVG saved!', 'success');
  } catch (e) {
    showExportToast('SVG export failed: ' + e.message, 'error');
    console.error('[Inkflow] exportSVG error:', e);
  }
}

async function copyToClipboard() {
  if (!pages || pages.length === 0) {
    showExportToast('Nothing to copy — add some text first.', 'warn');
    return;
  }
  try {
    const canvas = pages[S.currentPage] || pages[0];
    canvas.toBlob(
      async (blob) => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          showExportToast('✓ Copied to clipboard!', 'success');
        } catch (e) {
          showExportToast('Clipboard copy failed: ' + e.message, 'error');
        }
      },
      'image/png',
      1.0
    );
  } catch (e) {
    showExportToast('Copy failed: ' + e.message, 'error');
  }
}

/* ───────────────────────────────────────────
   SHARED EXPORT HELPERS
─────────────────────────────────────────── */
function triggerDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

let exportToastTimer = null;
function showExportToast(msg, type = 'info') {
  let toast = document.getElementById('export-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'export-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = 'export-toast export-toast--' + type;
  toast.style.opacity = '1';
  clearTimeout(exportToastTimer);
  if (type !== 'info') {
    exportToastTimer = setTimeout(() => {
      toast.style.opacity = '0';
    }, 3000);
  }
}
const showToast = showExportToast;

/* ───────────────────────────────────────────
   PHASE 8.6–8.7 — AUTOSAVE & STATE RESTORE
─────────────────────────────────────────── */
const DB_NAME = 'InkflowDB';
const DB_VERSION = 1;
const STORE_NAME = 'draftedGlyphs';
let dbInstance = null;

function getDB() {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => {
      dbInstance = e.target.result;
      resolve(dbInstance);
    };
    request.onerror = (e) => {
      reject(e.target.error);
    };
  });
}

function saveGlyphDB(char, dataUrl) {
  return getDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(dataUrl, char);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

function getGlyphsDB() {
  return getDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      const results = {};
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          results[cursor.key] = cursor.value;
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = () => reject(req.error);
    });
  });
}

// Returns true if a drafted-glyph data URL contains at least one visible
// (non-transparent) pixel. Used to catch stale "blank" entries that were
// saved before the ink-check guard existed in saveActiveCharacter().
function glyphHasInk(dataUrl) {
  return new Promise((resolve) => {
    if (!dataUrl) {
      resolve(false);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth || img.width || 1;
      c.height = img.naturalHeight || img.height || 1;
      const cctx = c.getContext('2d');
      cctx.drawImage(img, 0, 0);
      try {
        // Phase 9.8 � Use stricter isCellBlank check
        resolve(!window.FontCompilation.isCellBlank(c));
      } catch {
        // Can't inspect it (e.g. tainted canvas) � don't destroy data we can't verify.
        resolve(true);
      }
    };
    img.onerror = () => resolve(false);
    img.src = dataUrl;
  });
}

// Strips blank/corrupt entries out of draftedGlyphs (memory + IndexedDB).
// These can linger from before saveActiveCharacter() rejected empty
// sketches (or from an old imported project), and they make renderText()
// draw an invisible image instead of falling back to the system font for
// that character � which is exactly what causes "missing" letters.
async function pruneBlankGlyphs() {
  const chars = Object.keys(draftedGlyphs);
  let pruned = 0;
  for (const char of chars) {
    const inked = await glyphHasInk(draftedGlyphs[char]);
    if (!inked) {
      delete draftedGlyphs[char];
      pruned++;
      try {
        const db = await getDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(char);
      } catch (err) {
        console.error('Could not remove blank glyph from IndexedDB:', char, err);
      }
      const btn = document.getElementById(`char-btn-${char}`);
      if (btn) btn.classList.remove('drafted');
      glyphImageCache.delete(char);
    }
  }
  if (pruned > 0) {
    console.warn(`Inkflow: removed ${pruned} blank drafted glyph(s) that were rendering as invisible characters.`);
  }
  return pruned;
}

let autosaveTimeout;
function autosave() {
  clearTimeout(autosaveTimeout);
  autosaveTimeout = setTimeout(() => {
    const state = {
      text: document.getElementById('text-input').value,
      font: S.font,
      fontSize: S.fontSize,
      lineHeight: S.lineHeight,
      wordSpacing: S.wordSpacing,
      margin: S.margin,
      rotationMax: S.rotationMax,
      inkColor: S.inkColor,
      bleed: S.bleed,
      pressure: S.pressure,
      paperStyle: S.paperStyle,
      noteLayout: S.noteLayout,
      smudgeEffects: S.smudgeEffects,
      cursiveMode: S.cursiveMode,
      hinglishAutoSwitch: S.hinglishAutoSwitch,
      markdownMultiPen: S.markdownMultiPen,
      markdownPenProfiles: S.markdownPenProfiles,
      textAlignment: S.textAlignment,
      animSpeed: S.animSpeed,
    };
    localStorage.setItem('inkflow-state', JSON.stringify(state));
  }, 1000);
}

async function restoreState() {
  const raw = localStorage.getItem('inkflow-state');

  // 1. Try to load from IndexedDB
  try {
    const dbGlyphs = await getGlyphsDB();
    Object.assign(draftedGlyphs, dbGlyphs);
  } catch (err) {
    console.error('Error loading glyphs from IndexedDB:', err);
  }

  if (!raw) return;

  try {
    const state = JSON.parse(raw);
    if (state.text) {
      document.getElementById('text-input').value = state.text;
      S.text = state.text;
    }
    // Restore sliders
    const sliderMap = [
      ['font-size-slider', 'fs-val', 'fontSize'],
      ['line-spacing', 'ls-val', 'lineHeight'],
      ['word-spacing', 'ws-val', 'wordSpacing'],
      ['margin-slider', 'mg-val', 'margin'],
      ['rotation-slider', 'rot-val', 'rotationMax'],
      ['bleed-slider', 'bleed-val', 'bleed'],
      ['pressure-slider', 'pressure-val', 'pressure'],
    ];
    sliderMap.forEach(([id, valId, key]) => {
      if (state[key] !== undefined) {
        S[key] = state[key];
        const el = document.getElementById(id);
        if (el) {
          el.value = state[key];
          document.getElementById(valId).textContent = state[key];
        }
      }
    });
    if (state.inkColor) {
      S.inkColor = state.inkColor;
      document.getElementById('ink-color').value = state.inkColor;
    }
    if (state.font) {
      S.font = state.font;
      const opt = document.querySelector(`#font-select option[value="${state.font}"]`);
      if (opt) {
        fontSelect.value = state.font;
        fontSelect.style.fontFamily = state.font;
      }
    }
    if (state.paperStyle) {
      S.paperStyle = state.paperStyle;
      document.querySelectorAll('.paper-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.style === state.paperStyle);
      });
    }
    if (state.noteLayout) {
      S.noteLayout = state.noteLayout;
      const select = document.getElementById('layout-select');
      if (select) select.value = state.noteLayout;
    }
    if (state.smudgeEffects !== undefined) {
      S.smudgeEffects = state.smudgeEffects;
      const toggle = document.getElementById('smudge-effects-toggle');
      if (toggle) toggle.checked = state.smudgeEffects;
    }
    if (state.cursiveMode !== undefined) {
      S.cursiveMode = state.cursiveMode;
      const toggle = document.getElementById('cursive-mode-toggle');
      if (toggle) toggle.checked = state.cursiveMode;
    }
    if (state.hinglishAutoSwitch !== undefined) {
      S.hinglishAutoSwitch = !!state.hinglishAutoSwitch;
    }
    if (state.markdownMultiPen !== undefined) {
      S.markdownMultiPen = !!state.markdownMultiPen;
    }
    if (state.markdownPenProfiles && typeof state.markdownPenProfiles === 'object') {
      S.markdownPenProfiles = {
        ...S.markdownPenProfiles,
        ...state.markdownPenProfiles,
      };
    }
    syncMarkdownPenControls();
    syncHinglishControls();
    if (state.textAlignment) {
      S.textAlignment = state.textAlignment;
      document.querySelectorAll('.align-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.align === state.textAlignment);
      });
      const labels = { top: 'Upper', middle: 'Middle', bottom: 'Lower' };
      const alignVal = document.getElementById('align-val');
      if (alignVal) alignVal.textContent = labels[state.textAlignment] || 'Middle';
    }
    if (state.animSpeed !== undefined) {
      S.animSpeed = state.animSpeed;
      const slider = document.getElementById('speed-slider');
      if (slider) {
        slider.value = state.animSpeed;
        const label = document.getElementById('spd-val');
        if (label) label.textContent = state.animSpeed;
      }
    }

    // 2. Migrate draftedGlyphs if they exist in localStorage state
    if (state.draftedGlyphs && Object.keys(state.draftedGlyphs).length > 0) {
      Object.assign(draftedGlyphs, state.draftedGlyphs);

      // Save all of them to IndexedDB
      for (const char of Object.keys(state.draftedGlyphs)) {
        const val = state.draftedGlyphs[char];
        if (val && val.length > 0) {
          try {
            await saveGlyphDB(char, val);
          } catch (err) {
            console.error(`Error migrating character "${char}" to IndexedDB:`, err);
          }
        }
      }

      // Remove draftedGlyphs from localStorage and save back
      delete state.draftedGlyphs;
      localStorage.setItem('inkflow-state', JSON.stringify(state));
    }
  } catch {
    /* ignore corrupt state */
  }

  // 2.5. Remove any stale blank glyphs (e.g. saved before the ink-check guard
  // existed, or pulled in via the localStorage migration above) so they
  // don't get drawn as invisible characters.
  await pruneBlankGlyphs();

  // 3. Highlight drafted characters in UI
  ALL_TEMPLATE_CHARS.forEach((char) => {
    if (draftedGlyphs[char] && draftedGlyphs[char].length > 0) {
      const btn = Array.from(document.querySelectorAll('.char-btn')).find((b) => b.textContent === char);
      if (btn) btn.classList.add('drafted');
    }
  });
}

/* ───────────────────────────────────────────
   PHASE 8.8 — PAGE NAVIGATION
─────────────────────────────────────────── */
function updatePageNav() {
  const total = pages.length || 1;
  const cur = Math.min(S.currentPage + 1, total);
  const text = `Page ${cur} of ${total}`;
  document.getElementById('page-indicator').textContent = text;
  document.getElementById('page-indicator-toolbar').textContent = text;
  document.getElementById('nav-prev').disabled = S.currentPage <= 0;
  document.getElementById('nav-next').disabled = S.currentPage >= pages.length - 1;
}

function navigatePage(dir) {
  const newIdx = S.currentPage + dir;
  if (newIdx < 0 || newIdx >= pages.length) return;
  S.currentPage = newIdx;
  const canvas = pages[newIdx];
  canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
  updatePageNav();
}

/* ───────────────────────────────────────────
   PHASE 8.7 + INIT — APP BOOT
─────────────────────────────────────────── */
async function initApp() {
  await restoreState();
  setupFileUpload();
  initHandFontedStudio();

  // Initialize smudge effects toggle
  const smudgeToggle = document.getElementById('smudge-effects-toggle');
  if (smudgeToggle) {
    smudgeToggle.checked = S.smudgeEffects;
  }
  syncMarkdownPenControls();
  syncHinglishControls();

  // Render initial state or blank page
  if (S.text) {
    renderText(S.text);
  } else {
    // Show a blank ruled page with placeholder watermark
    const canvas = createPage(1);
    // If layer compositor is active, draw on background layer; else draw on canvas directly
    let bgCtx;
    if (window.layerCompositor) {
      const bgStack = window.layerCompositor.getStack(0);
      const bgLayer = bgStack.layers.find((l) => l.name === 'Background');
      bgCtx = bgLayer ? bgLayer.canvas.getContext('2d') : canvas.getContext('2d');
    } else {
      bgCtx = canvas.getContext('2d');
    }
    window.PaperRenderer.drawPaperBackground(bgCtx, S.paperStyle);
    window.PaperRenderer.renderSmudgeEffects(bgCtx, 0);
    // Subtle placeholder text
    bgCtx.save();
    const lineH = S.fontSize * S.lineHeight;
    bgCtx.font = `italic 18px "${S.font}"`;
    bgCtx.fillStyle = S.inkColor;
    bgCtx.globalAlpha = 0.18;
    bgCtx.fillText('Start typing in the panel to the left…', S.margin, S.margin + S.fontSize + lineH);
    bgCtx.restore();
    // If we used a layer canvas, composite now; otherwise content is already on the main canvas
    if (window.layerCompositor && bgCtx !== canvas.getContext('2d')) {
      window.layerCompositor.composite(0, canvas.getContext('2d'));
    }
  }
}

// Wire all slider controls to autosave
[
  'font-size-slider',
  'line-spacing',
  'word-spacing',
  'margin-slider',
  'rotation-slider',
  'bleed-slider',
  'pressure-slider',
  'speed-slider',
].forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('change', autosave);
});
if (fontSelect) fontSelect.addEventListener('change', autosave);
if (inkColorInput) inkColorInput.addEventListener('change', autosave);
if (inkColorInput) inkColorInput.addEventListener('change', syncMarkdownPenControls);

// Boot
initApp();

/* ───────────────────────────────────────────
   PREMIUM FILE UPLOAD MODULE
─────────────────────────────────────────── */
function setupFileUpload() {
  const fileUpload = document.getElementById('file-upload');
  const dropZone = document.getElementById('drop-zone');
  const uploadStatus = document.getElementById('upload-status');
  const statusText = document.getElementById('status-text');

  if (!fileUpload || !dropZone) return;

  // Click drop zone to browse files
  dropZone.addEventListener('click', () => fileUpload.click());

  // Drag & drop events
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleUploadedFile(file);
  });

  fileUpload.addEventListener('change', () => {
    const file = fileUpload.files[0];
    if (file) handleUploadedFile(file);
  });

  async function handleUploadedFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();

    // Show status
    uploadStatus.style.display = 'flex';
    const spinner = document.createElement('span');
    spinner.className = 'spinner';
    statusText.replaceChildren(spinner, document.createTextNode(` Processing "${file.name}"...`));

    try {
      let text = '';
      if (ext === 'txt' || ext === 'md') {
        text = await readTextFile(file);
      } else if (ext === 'pdf') {
        const progContainer = document.getElementById('progress-container');
        const progBar = document.getElementById('progress-bar');
        if (progContainer) progContainer.style.display = 'block';
        if (progBar) progBar.style.width = '0%';

        text = await extractTextFromPDF(file, (percent) => {
          if (progBar) progBar.style.width = `${percent}%`;
        });

        if (progContainer) {
          setTimeout(() => {
            progContainer.style.display = 'none';
          }, 500);
        }
      } else if (ext === 'docx') {
        if (typeof mammoth === 'undefined') {
          throw new Error('Mammoth.js is required for DOCX support but failed to load.');
        }
        text = await extractTextFromDOCX(file);
      } else {
        throw new Error('Unsupported file format. Please upload PDF, TXT, MD, or DOCX.');
      }

      if (!text.trim()) {
        throw new Error('File appears to be empty or contains no extractable text.');
      }

      // Populate text-input
      const textarea = document.getElementById('text-input');
      textarea.value = text;
      S.text = text;

      // Render handwriting & save state
      renderText(text);
      autosave();

      statusText.textContent = '✓ File loaded successfully!';
      statusText.style.color = '#2d6a4f';
      statusText.style.fontWeight = '600';
      setTimeout(() => {
        uploadStatus.style.display = 'none';
      }, 3500);
    } catch (e) {
      statusText.textContent = `✕ Error: ${e.message}`;
      statusText.style.color = '#8b0000';
      statusText.style.fontWeight = '600';
      console.error(e);
    }
  }

  function readTextFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  async function extractTextFromDOCX(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function (event) {
        const arrayBuffer = event.target.result;
        mammoth
          .extractRawText({ arrayBuffer: arrayBuffer })
          .then(function (result) {
            resolve(result.value);
          })
          .catch(function (err) {
            reject(err);
          });
      };
      reader.onerror = function (err) {
        reject(err);
      };
      reader.readAsArrayBuffer(file);
    });
  }

  async function extractTextFromPDF(file, onProgress) {
    if (!window.pdfjsLib) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // ponytail: respect hasEOL to preserve paragraph structure
      const pageText = content.items.map((item) => item.str + (item.hasEOL ? '\n' : '')).join('');
      fullText += pageText + '\n\n';
      if (onProgress) onProgress((i / pdf.numPages) * 100);
    }

    return fullText.trim();
  }
}

/* ───────────────────────────────────────────
   RESET PARAMETERS TO DEFAULTS
─────────────────────────────────────────── */
function resetToDefaults() {
  const defaults = {
    font: 'Caveat',
    fontSize: 22,
    lineHeight: 1.5,
    wordSpacing: 1,
    margin: 80,
    rotationMax: 1,
    inkColor: '#1c2340',
    bleed: 0.5,
    pressure: 0.12,
    paperStyle: 'ruled',
    textAlignment: 'middle',
  };

  // Apply state
  Object.keys(defaults).forEach((key) => {
    S[key] = defaults[key];
  });

  // Update DOM sliders & labels
  const sliderMap = [
    ['font-size-slider', 'fs-val', 'fontSize'],
    ['line-spacing', 'ls-val', 'lineHeight'],
    ['word-spacing', 'ws-val', 'wordSpacing'],
    ['margin-slider', 'mg-val', 'margin'],
    ['rotation-slider', 'rot-val', 'rotationMax'],
    ['bleed-slider', 'bleed-val', 'bleed'],
    ['pressure-slider', 'pressure-val', 'pressure'],
  ];

  sliderMap.forEach(([id, valId, key]) => {
    const el = document.getElementById(id);
    if (el) el.value = defaults[key];
    const disp = document.getElementById(valId);
    if (disp) disp.textContent = defaults[key];
  });

  // Update Font Selector
  const fontSelect = document.getElementById('font-select');
  if (fontSelect) {
    fontSelect.value = defaults.font;
    fontSelect.style.fontFamily = defaults.font;
  }

  // Update Ink Color Picker
  const inkColorInput = document.getElementById('ink-color');
  if (inkColorInput) {
    inkColorInput.value = defaults.inkColor;
    document.getElementById('ink-color-label').textContent = defaults.inkColor + ' — Navy';
  }

  // Update Text Alignment
  document.querySelectorAll('.align-btn').forEach((btn) => {
    btn.classList.remove('active');
  });
  const alignBtn = document.querySelector(`.align-btn[data-align="${defaults.textAlignment}"]`);
  if (alignBtn) alignBtn.classList.add('active');
  const alignVal = document.getElementById('align-val');
  if (alignVal) alignVal.textContent = 'Middle';

  // Update Paper styles active classes
  document.querySelectorAll('.paper-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.style === defaults.paperStyle);
  });

  // Save & Render
  autosave();
  debounceRender();
}

/* ───────────────────────────────────────────
   HANDFONTED STUDIO CUSTOM FONT BUILDER
─────────────────────────────────────────── */

// Modal Toggles

// Modal Toggles
function openHandFontedModal() {
  const modal = document.getElementById('handfonted-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal._previousFocus = document.activeElement;
    const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) firstFocusable.focus();
  }
  switchSheet('letters');
}

function closeHandFontedModal() {
  const modal = document.getElementById('handfonted-modal');
  if (modal) {
    modal.classList.add('hidden');
    if (modal._previousFocus) modal._previousFocus.focus();
  }
}

// ponytail: ESC key closes active modal, focus trap keeps Tab inside
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const modals = document.querySelectorAll('.modal-overlay:not(.hidden)');
  modals.forEach((m) => {
    m.classList.add('hidden');
    if (m._previousFocus) m._previousFocus.focus();
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  const modal = document.querySelector('.modal-overlay:not(.hidden)');
  if (!modal) return;
  const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

function switchSheet(sheet) {
  activeSheet = sheet;
  document.querySelectorAll('.sheet-tab').forEach((b) => b.classList.remove('active'));
  const btn = document.getElementById(`sheet-tab-${sheet}`);
  if (btn) btn.classList.add('active');

  renderSketchCharGrid();
  const firstChar = TEMPLATE_SHEETS[sheet][0];
  selectSketchCharacter(firstChar);
}

function switchFontTab(tab) {
  const btnSketch = document.getElementById('tab-btn-sketchpad');
  const btnTemp = document.getElementById('tab-btn-template');
  const panelSketch = document.getElementById('panel-sketchpad');
  const panelTemp = document.getElementById('panel-template');

  if (tab === 'sketchpad') {
    btnSketch.classList.add('active');
    btnTemp.classList.remove('active');
    panelSketch.classList.remove('hidden');
    panelTemp.classList.add('hidden');
  } else {
    btnSketch.classList.remove('active');
    btnTemp.classList.add('active');
    panelSketch.classList.add('hidden');
    panelTemp.classList.remove('hidden');

    // Trigger grid render if aligner already has an image
    if (alignerImages[activeUploadSheet]) {
      setTimeout(updateAlignerGrid, 50);
    }
  }
}

// Live Sketchpad Mechanics
function initHandFontedStudio() {
  const btn = document.getElementById('btn-handfonted-studio');
  if (btn) btn.addEventListener('click', openHandFontedModal);

  // Initialize progress bar
  updateCharProgress();

  // Adjust canvas size based on device
  adjustCanvasSizeForDevice();

  // Listen for orientation changes
  window.addEventListener('resize', adjustCanvasSizeForDevice);
  window.addEventListener('orientationchange', () => {
    setTimeout(adjustCanvasSizeForDevice, 300);
  });

  const canvas = document.getElementById('sketch-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Stroke history for undo functionality
  let strokes = [];
  let currentStroke = [];
  let brushSize = 3;

  // High quality stroke aesthetics
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = brushSize;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  let drawing = false;

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function startDraw(e) {
    e.preventDefault();
    drawing = true;
    currentStroke = [];
    const pos = getPos(e);
    currentStroke.push({ x: pos.x, y: pos.y });
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function draw(e) {
    if (!drawing) return;
    e.preventDefault();
    const pos = getPos(e);
    currentStroke.push({ x: pos.x, y: pos.y });
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function stopDraw() {
    if (drawing && currentStroke.length > 0) {
      strokes.push({
        points: [...currentStroke],
        size: brushSize,
        color: ctx.strokeStyle,
      });
      currentStroke = [];
    }
    drawing = false;
  }

  // Undo functionality
  window.undoSketchStroke = function () {
    if (strokes.length === 0) return;
    strokes.pop();
    redrawCanvas();
  };

  // Brush size update
  window.updateBrushSize = function () {
    const slider = document.getElementById('brush-size-slider');
    brushSize = parseFloat(slider.value);
    document.getElementById('brush-size-val').textContent = brushSize.toFixed(1);
    ctx.lineWidth = brushSize;
  };

  // Redraw all strokes
  function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes.forEach((stroke) => {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.beginPath();
      if (stroke.points.length > 0) {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    });
    // Restore current settings
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = brushSize;
  }

  // Clear canvas - also clear stroke history
  const originalClear = window.clearSketchCanvas;
  window.clearSketchCanvas = function () {
    strokes = [];
    currentStroke = [];
    originalClear();
  };

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDraw);
  canvas.addEventListener('mouseleave', stopDraw);

  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', stopDraw);

  renderSketchCharGrid();
  setupTemplateUploader();
}

function clearSketchCanvas() {
  const canvas = document.getElementById('sketch-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function renderSketchCharGrid() {
  const container = document.getElementById('sketch-char-grid');
  if (!container) return;
  container.innerHTML = '';

  const chars = TEMPLATE_SHEETS[activeSheet];
  chars.forEach((char) => {
    const btn = document.createElement('div');
    btn.className = 'char-btn';
    btn.id = `char-btn-${char}`;
    btn.textContent = char;
    btn.addEventListener('click', () => selectSketchCharacter(char));
    if (draftedGlyphs[char]) btn.classList.add('drafted');
    container.appendChild(btn);
  });
}

function selectSketchCharacter(char) {
  activeChar = char;

  document.querySelectorAll('.char-btn').forEach((btn) => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`char-btn-${char}`);
  if (activeBtn) activeBtn.classList.add('active');

  document.getElementById('current-char-display').textContent = char;
  document.getElementById('canvas-guide-letter').textContent = char;

  if (typeof window.clearSketchCanvas === 'function') window.clearSketchCanvas();
  else clearSketchCanvas();

  if (draftedGlyphs[char]) {
    const img = new Image();
    img.onload = () => {
      const canvas = document.getElementById('sketch-canvas');
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
    };
    img.src = draftedGlyphs[char];
  }
}

function saveActiveCharacter() {
  const canvas = document.getElementById('sketch-canvas');
  if (!canvas) return;

  // Phase 9.8 — Check if canvas has any significant ink before saving
  if (window.FontCompilation.isCellBlank(canvas)) {
    alert('Nothing drawn — sketch the character before saving with dark ink.');
    return;
  }

  // Save canvas as image data URL
  const dataUrl = canvas.toDataURL();
  draftedGlyphs[activeChar] = dataUrl;

  // Update sidebar grids
  const btn = document.getElementById(`char-btn-${activeChar}`);
  if (btn) btn.classList.add('drafted');

  // Update progress indicator
  updateCharProgress();

  // Show preview
  showCharPreview(dataUrl);

  // Persist to IndexedDB
  saveGlyphDB(activeChar, dataUrl).catch((err) => console.error('Error saving glyph to IndexedDB:', err));

  // Micro-interaction: visual confirmation
  const wrapper = canvas.parentElement;
  wrapper.style.borderColor = 'var(--accent)';
  setTimeout(() => {
    wrapper.style.borderColor = '';
  }, 300);
}

// Update progress bar
function updateCharProgress() {
  const totalChars = ALL_TEMPLATE_CHARS.length;
  const completedChars = Object.keys(draftedGlyphs).length;
  const percent = Math.round((completedChars / totalChars) * 100);

  const countEl = document.getElementById('char-progress-count');
  const percentEl = document.getElementById('char-progress-percent');
  const fillEl = document.getElementById('char-progress-fill');

  if (countEl) countEl.textContent = `${completedChars}/${totalChars}`;
  if (percentEl) percentEl.textContent = `${percent}%`;
  if (fillEl) fillEl.style.width = `${percent}%`;
}

// Show preview of saved character
function showCharPreview(dataUrl) {
  const container = document.getElementById('char-preview-container');
  const previewCanvas = document.getElementById('char-preview-canvas');
  if (!container || !previewCanvas) return;

  container.classList.remove('d-none');
  const ctx = previewCanvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, 48, 48);
    ctx.drawImage(img, 0, 0, 48, 48);
  };
  img.src = dataUrl;
}

// Export font project as JSON
function exportFontProject() {
  const projectData = {
    version: '1.0',
    appName: 'Inkflow HandFonted Studio',
    exportDate: new Date().toISOString(),
    glyphs: draftedGlyphs,
    fontName: document.getElementById('custom-font-name')?.value || 'MyHandwriting',
    totalGlyphs: Object.keys(draftedGlyphs).length,
  };

  const dataStr = JSON.stringify(projectData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.download = `${projectData.fontName}-project.json`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast(`✅ Project saved: ${projectData.totalGlyphs} characters`, 'success');
}

// Import font project from JSON
function importFontProject(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const projectData = JSON.parse(e.target.result);

      if (!projectData.glyphs || typeof projectData.glyphs !== 'object') {
        throw new Error('Invalid project file format');
      }

      // Load glyphs
      Object.assign(draftedGlyphs, projectData.glyphs);

      // Strip any blank entries that may have come from an older export
      // (saved before the ink-check guard existed).
      await pruneBlankGlyphs();

      // Update font name if available
      if (projectData.fontName) {
        const nameInput = document.getElementById('custom-font-name');
        if (nameInput) nameInput.value = projectData.fontName;
      }

      // Refresh UI
      renderSketchCharGrid();
      updateCharProgress();

      // Select first character
      if (ALL_TEMPLATE_CHARS.length > 0) {
        selectSketchCharacter(ALL_TEMPLATE_CHARS[0]);
      }

      showToast(`✅ Loaded ${Object.keys(projectData.glyphs).length} characters`, 'success');
    } catch (error) {
      console.error('Error loading project:', error);
      showToast('❌ Failed to load project file', 'error');
    }
  };
  reader.readAsText(file);

  // Reset input so same file can be loaded again
  event.target.value = '';
}

/* ───────────────────────────────────────────
   DEVICE & RESOLUTION DETECTION
─────────────────────────────────────────── */

function getDeviceType() {
  const width = window.innerWidth;
  const _height = window.innerHeight;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  if (width <= 480) {
    return { type: 'mobile', canvasSize: Math.min(280, width - 60), isTouchDevice };
  } else if (width <= 767) {
    return { type: 'tablet-portrait', canvasSize: 240, isTouchDevice };
  } else if (width <= 1023) {
    return { type: 'tablet-landscape', canvasSize: 280, isTouchDevice };
  } else if (width <= 1919) {
    return { type: 'desktop', canvasSize: 256, isTouchDevice };
  } else {
    return { type: 'large-desktop', canvasSize: 320, isTouchDevice };
  }
}

function adjustCanvasSizeForDevice() {
  const device = getDeviceType();
  const canvas = document.getElementById('sketch-canvas');
  const wrapper = document.querySelector('.canvas-wrapper');

  if (!canvas || !wrapper) return;

  // Set canvas internal resolution (for drawing quality)
  const dpr = window.devicePixelRatio || 1;
  const baseSize = 256;

  // High DPI devices get higher resolution canvas
  if (dpr > 1) {
    canvas.width = baseSize * Math.min(dpr, 2);
    canvas.height = baseSize * Math.min(dpr, 2);
  } else {
    canvas.width = baseSize;
    canvas.height = baseSize;
  }

  // Visual size is set by CSS (already responsive)
  // But we can add device-specific optimizations

  if (device.isTouchDevice) {
    // Increase touch target sizes
    canvas.style.touchAction = 'none';
    wrapper.style.cursor = 'crosshair';

    // Prevent zoom on double-tap
    wrapper.style.touchAction = 'pan-x pan-y';
  }
}

// Detect high refresh rate displays
function getOptimalAnimationSettings() {
  const refreshRate = screen.refreshRate || 60;

  return {
    useRAF: refreshRate >= 90, // Use requestAnimationFrame for smooth drawing on high refresh displays
    smoothing: refreshRate >= 120,
  };
}

function advanceActiveCharacter() {
  saveActiveCharacter();

  const chars = TEMPLATE_SHEETS[activeSheet];
  const curIdx = chars.indexOf(activeChar);
  if (curIdx < chars.length - 1) {
    selectSketchCharacter(chars[curIdx + 1]);
  } else {
    if (activeSheet === 'letters') {
      if (confirm('🎉 Finished Letters template! Would you like to switch to Numbers & Symbols?')) {
        switchSheet('symbols');
      }
    } else {
      alert(
        '🎉 You have drafted all characters in this set! Click "Generate & Apply Font" below to compile your TrueType handwriting font.'
      );
    }
  }
}

// Handwriting PDF/PNG Sheet Template Builder
function generateDownloadTemplate() {
  // Create a container for multiple sheets
  const sheets = [];

  // ========================================
  // SHEET 1: FRONT COVER / INSTRUCTIONS
  // ========================================
  const frontCanvas = document.createElement('canvas');
  frontCanvas.width = 1600;
  frontCanvas.height = 1600;
  const frontCtx = frontCanvas.getContext('2d');

  // Background
  frontCtx.fillStyle = '#f7f3ea';
  frontCtx.fillRect(0, 0, 1600, 1600);

  // Decorative border
  frontCtx.strokeStyle = '#c0622a';
  frontCtx.lineWidth = 8;
  frontCtx.strokeRect(40, 40, 1520, 1520);

  // Title
  frontCtx.fillStyle = '#c0622a';
  frontCtx.font = 'bold 72px serif';
  frontCtx.textAlign = 'center';
  frontCtx.fillText('✨ HandFonted Studio', 800, 200);

  frontCtx.fillStyle = '#1c2340';
  frontCtx.font = '42px serif';
  frontCtx.fillText('Custom Handwriting Font Creator', 800, 270);

  // Subtitle
  frontCtx.fillStyle = '#6b6148';
  frontCtx.font = 'italic 28px serif';
  frontCtx.fillText('Transform your handwriting into a digital font', 800, 340);

  // Instructions box
  frontCtx.fillStyle = 'rgba(192, 98, 42, 0.08)';
  frontCtx.fillRect(150, 420, 1300, 900);
  frontCtx.strokeStyle = '#c0622a';
  frontCtx.lineWidth = 3;
  frontCtx.strokeRect(150, 420, 1300, 900);

  // Instructions title
  frontCtx.fillStyle = '#c0622a';
  frontCtx.font = 'bold 36px sans-serif';
  frontCtx.textAlign = 'left';
  frontCtx.fillText('📋 Instructions:', 200, 490);

  // Instructions text
  frontCtx.fillStyle = '#1c2340';
  frontCtx.font = '24px sans-serif';
  const instructions = [
    '1. Print the following template sheets (Letters & Symbols)',
    '',
    '2. Use a dark pen or marker to write each character clearly',
    '   inside its designated box',
    '',
    '3. Write naturally - your unique style will be captured!',
    '',
    '4. For best results:',
    '   • Keep characters centered in each box',
    '   • Use consistent size and slant',
    '   • Write on a flat surface with good lighting',
    '   • Avoid touching the box edges',
    '',
    '5. Scan or photograph the completed sheets',
    '   • Use high contrast (300 DPI recommended)',
    '   • Ensure the image is well-lit and in focus',
    '',
    "6. Upload your sheets in Inkflow's HandFonted Studio",
    '',
    '7. Align the grid overlay to match your written template',
    '',
    '8. Click "Generate & Apply Font" to create your custom font!',
  ];

  let yPos = 550;
  instructions.forEach((line) => {
    if (line === '') {
      yPos += 15;
    } else {
      frontCtx.fillText(line, 220, yPos);
      yPos += 35;
    }
  });

  // Footer
  frontCtx.fillStyle = '#9e9078';
  frontCtx.font = 'italic 20px serif';
  frontCtx.textAlign = 'center';
  frontCtx.fillText('Powered by Inkflow — AI Handwritten Notes Generator', 800, 1500);
  frontCtx.fillText('inkflow.app', 800, 1535);

  sheets.push({
    canvas: frontCanvas,
    name: 'cover',
  });

  // ========================================
  // SHEET 2 & 3: CHARACTER TEMPLATES
  // ========================================
  const sheetTypes = [
    { key: 'letters', title: 'Letters (A-Z, a-z)' },
    { key: 'symbols', title: 'Numbers & Symbols' },
  ];

  sheetTypes.forEach((sheetType) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1600;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1600, 1600);

    // Sheet Headers
    ctx.fillStyle = '#1c2340';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`HandFonted Studio — ${sheetType.title}`, 800, 70);
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#555';
    ctx.fillText('Write each character clearly inside its designated box', 800, 110);

    const startX = 100;
    const startY = 160;
    const size = 175; // 8 * 175 = 1400px wide

    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 2;

    const chars = TEMPLATE_SHEETS[sheetType.key];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const x = startX + c * size;
        const y = startY + r * size;
        const char = chars[r * 8 + c] || '';

        // Outer square
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, size, size);

        // Center baseline helper
        ctx.strokeStyle = '#e2e2e2';
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(x, y + size * 0.7);
        ctx.lineTo(x + size, y + size * 0.7);
        ctx.stroke();
        ctx.setLineDash([]);

        // Guide label tags
        if (char) {
          ctx.fillStyle = '#888888';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(char, x + 8, y + 8);
        }
      }
    }

    sheets.push({
      canvas: canvas,
      name: sheetType.key,
    });
  });

  // ========================================
  // DOWNLOAD ALL SHEETS AS ZIP OR INDIVIDUAL
  // ========================================
  if (sheets.length === 1) {
    // Single sheet download
    const link = document.createElement('a');
    link.download = `handfonted-template-${activeSheet}.png`;
    link.href = sheets[0].canvas.toDataURL();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    // Multiple sheets - download each individually
    sheets.forEach((sheet, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.download = `handfonted-${index === 0 ? 'instructions' : `template-${sheet.name}`}.png`;
        link.href = sheet.canvas.toDataURL();
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 300); // Stagger downloads to avoid browser blocking
    });

    // Show toast notification
    showToast('Downloading 3 sheets: Instructions + 2 templates', 'info');
  }
}

// Aligner Cropping Mechanics
function setupTemplateUploader() {
  const dropzone = document.getElementById('template-dropzone');
  const input = document.getElementById('template-image-input');
  if (!dropzone || !input) return;

  dropzone.addEventListener('click', () => input.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--accent)';
    dropzone.style.background = 'rgba(230, 100, 50, 0.04)';
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = '';
    dropzone.style.background = '';
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = '';
    dropzone.style.background = '';
    const file = e.dataTransfer.files[0];
    if (file) handleTemplateImage(file);
  });

  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleTemplateImage(file);
  });

  const sheetSelect = document.getElementById('upload-template-sheet-select');
  if (sheetSelect) {
    sheetSelect.addEventListener('change', () => {
      activeUploadSheet = sheetSelect.value;

      // Load config to sliders
      const config = gridConfigs[activeUploadSheet];
      document.getElementById('slider-grid-x').value = config.gridX;
      document.getElementById('slider-grid-y').value = config.gridY;
      document.getElementById('slider-grid-w').value = config.gridW;
      document.getElementById('slider-grid-h').value = config.gridH;

      // Show/hide aligner container
      const img = alignerImages[activeUploadSheet];
      const container = document.getElementById('template-aligner-container');
      if (img) {
        container.classList.remove('hidden');
      } else {
        container.classList.add('hidden');
      }

      updateAlignerGrid();
    });
  }
}

function handleTemplateImage(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      alignerImages[activeUploadSheet] = img;
      document.getElementById('template-aligner-container').classList.remove('hidden');

      gridX = 22;
      gridY = 36;
      gridW = 315;
      gridH = 315;

      gridConfigs[activeUploadSheet] = { gridX, gridY, gridW, gridH };

      document.getElementById('slider-grid-x').value = gridX;
      document.getElementById('slider-grid-y').value = gridY;
      document.getElementById('slider-grid-w').value = gridW;
      document.getElementById('slider-grid-h').value = gridH;

      updateAlignerGrid();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function updateAlignerGrid() {
  const img = alignerImages[activeUploadSheet];
  const canvas = document.getElementById('aligner-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (!img) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  // Read dynamic slider parameters
  gridX = parseInt(document.getElementById('slider-grid-x').value);
  gridY = parseInt(document.getElementById('slider-grid-y').value);
  gridW = parseInt(document.getElementById('slider-grid-w').value);
  gridH = parseInt(document.getElementById('slider-grid-h').value);

  // Sync to config
  gridConfigs[activeUploadSheet].gridX = gridX;
  gridConfigs[activeUploadSheet].gridY = gridY;
  gridConfigs[activeUploadSheet].gridW = gridW;
  gridConfigs[activeUploadSheet].gridH = gridH;

  // Display numbers in UI
  document.getElementById('val-grid-x').textContent = gridX;
  document.getElementById('val-grid-y').textContent = gridY;
  document.getElementById('val-grid-w').textContent = gridW;
  document.getElementById('val-grid-h').textContent = gridH;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw base image
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Semi-transparent shading of outer bounding box
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(0, 0, canvas.width, gridY);
  ctx.fillRect(0, gridY + gridH, canvas.width, canvas.height - (gridY + gridH));
  ctx.fillRect(0, gridY, gridX, gridH);
  ctx.fillRect(gridX + gridW, gridY, canvas.width - (gridX + gridW), gridH);

  // Red/Orange alignment grids
  ctx.strokeStyle = 'rgba(230, 100, 50, 0.85)';
  ctx.lineWidth = 1.5;
  const cellW = gridW / 8;
  const cellH = gridH / 8;

  ctx.beginPath();
  for (let i = 0; i <= 8; i++) {
    ctx.moveTo(gridX + i * cellW, gridY);
    ctx.lineTo(gridX + i * cellW, gridY + gridH);
    ctx.moveTo(gridX, gridY + i * cellH);
    ctx.lineTo(gridX + gridW, gridY + i * cellH);
  }
  ctx.stroke();
}

function cropTemplateCell(index, sheetName) {
  const img = alignerImages[sheetName];
  if (!img) return null;
  const config = gridConfigs[sheetName];

  const col = index % 8;
  const row = Math.floor(index / 8);

  const cellCanvas = document.createElement('canvas');
  cellCanvas.width = 128;
  cellCanvas.height = 128;
  const cellCtx = cellCanvas.getContext('2d');

  const scaleX = img.naturalWidth / 360;
  const scaleY = img.naturalHeight / 360;

  const cellW_preview = config.gridW / 8;
  const cellH_preview = config.gridH / 8;

  const srcX = (config.gridX + col * cellW_preview) * scaleX;
  const srcY = (config.gridY + row * cellH_preview) * scaleY;
  const srcW = cellW_preview * scaleX;
  const srcH = cellH_preview * scaleY;

  cellCtx.fillStyle = '#ffffff';
  cellCtx.fillRect(0, 0, 128, 128);

  cellCtx.drawImage(img, srcX, srcY, srcW, srcH, 12, 12, 104, 104);

  // Clear the guide label at the top-left of the cell to prevent it from being traced as ink
  cellCtx.fillStyle = '#ffffff';
  cellCtx.fillRect(12, 12, 32, 24);

  return cellCanvas;
}

// Opentype.js dynamically lazy-loaded CDN script
async function ensureOpentypeLoaded() {
  if (window.opentype) return;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/opentype.js/1.3.4/opentype.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// TTF Compiler Pipeline
async function buildCustomFont() {
  const fontNameInput = document.getElementById('custom-font-name');
  const fontName = fontNameInput.value.replace(/[^a-zA-Z0-9]/g, '') || 'MyHandwriting';

  const progressDiv = document.getElementById('font-build-progress');
  const statusText = document.getElementById('font-build-status-text');

  progressDiv.classList.remove('hidden');
  statusText.textContent = 'Initializing Opentype.js...';

  try {
    await ensureOpentypeLoaded();

    const glyphsList = [];

    // standard blank .notdef glyph
    const notdefGlyph = new window.opentype.Glyph({
      name: '.notdef',
      unicode: 0,
      advanceWidth: 650,
      path: new window.opentype.Path(),
    });
    glyphsList.push(notdefGlyph);

    // standard space glyph
    const spaceGlyph = new window.opentype.Glyph({
      name: 'space',
      unicode: 32,
      advanceWidth: 400, // Reasonable space width for handwriting fonts
      path: new window.opentype.Path(),
    });
    glyphsList.push(spaceGlyph);

    statusText.textContent = 'Analyzing raster paths and extracting contours...';

    const isTemplateTab = !document.getElementById('panel-template').classList.contains('hidden');

    for (let i = 0; i < ALL_TEMPLATE_CHARS.length; i++) {
      const char = ALL_TEMPLATE_CHARS[i];
      let cellCanvas = null;

      let sheetName = 'letters';
      let charIdx = TEMPLATE_SHEETS.letters.indexOf(char);
      if (charIdx === -1) {
        sheetName = 'symbols';
        charIdx = TEMPLATE_SHEETS.symbols.indexOf(char);
      }

      if (isTemplateTab) {
        const img = alignerImages[sheetName];
        if (img) {
          cellCanvas = cropTemplateCell(charIdx, sheetName);
        } else if (draftedGlyphs[char]) {
          cellCanvas = await window.FontCompilation.loadImageToCanvas(draftedGlyphs[char]);
        } else {
          continue; // Skip if neither is present
        }
      } else {
        if (draftedGlyphs[char]) {
          cellCanvas = await window.FontCompilation.loadImageToCanvas(draftedGlyphs[char]);
        } else {
          const img = alignerImages[sheetName];
          if (img) {
            cellCanvas = cropTemplateCell(charIdx, sheetName);
          } else {
            continue; // Skip if neither is present
          }
        }
      }

      // Phase 9.8 — Check if cell is blank before processing
      if (window.FontCompilation.isCellBlank(cellCanvas)) {
        continue;
      }

      const path = window.FontCompilation.canvasToOpentypePath(cellCanvas);

      // Skip cells with no ink — let the browser fall back to a system font
      // for these instead of baking in an invisible glyph.
      if (!path.commands || path.commands.length === 0) {
        continue;
      }

      // Calculate advance width based on glyph's visual width
      // Find bounding box of glyph pixels in the canvas
      const ctx = cellCanvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, cellCanvas.width, cellCanvas.height);
      const pixels = imageData.data;

      let minX = cellCanvas.width,
        maxX = 0;
      for (let y = 0; y < cellCanvas.height; y++) {
        for (let x = 0; x < cellCanvas.width; x++) {
          const idx = (y * cellCanvas.width + x) * 4;
          const alpha = pixels[idx + 3];
          const brightness = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;

          if (alpha > 50 && brightness < 160) {
            // Standard ink threshold
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
          }
        }
      }

      // Scale the width to match the 1000 UPM coordinate system
      const scale = 800 / Math.max(cellCanvas.width, cellCanvas.height);
      const glyphWidth = (maxX - minX) * scale;
      const advanceWidth = Math.max(Math.round(glyphWidth + 100), 250); // Add padding

      const glyph = new window.opentype.Glyph({
        name: char,
        unicode: char.charCodeAt(0),
        advanceWidth: advanceWidth,
        path: path,
      });
      glyphsList.push(glyph);
    }

    if (glyphsList.length <= 2) {
      alert('Please draft at least one character in sketchpad or upload a filled template grid before creating.');
      progressDiv.classList.add('hidden');
      return;
    }

    statusText.textContent = 'Generating TrueType Font binary...';

    const font = new window.opentype.Font({
      familyName: fontName,
      styleName: 'Regular',
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      glyphs: glyphsList,
    });

    const fontBuffer = font.toArrayBuffer();
    const blob = new Blob([fontBuffer], { type: 'font/ttf' });
    const fontUrl = URL.createObjectURL(blob);

    statusText.textContent = 'Registering dynamic font-face inside DOM...';

    const fontFace = new FontFace(fontName, `url(${fontUrl})`);
    await fontFace.load();
    document.fonts.add(fontFace);

    // Append option to selector
    const fontSelect = document.getElementById('font-select');
    const opt = document.createElement('option');
    opt.value = fontName;
    opt.textContent = `${fontName} (created)`;
    opt.style.fontFamily = fontName;
    fontSelect.appendChild(opt);

    // Set active
    fontSelect.value = fontName;
    fontSelect.style.fontFamily = fontName;
    S.font = fontName;

    autosave();
    debounceRender();

    statusText.textContent = 'Success!';
    setTimeout(() => {
      progressDiv.classList.add('hidden');
      closeHandFontedModal();
      alert(`🎉 Congratulation! "${fontName}" has been successfully created and applied to your handwritten notes!`);
    }, 1000);
  } catch (err) {
    console.error(err);
    alert('An error occurred during font building: ' + err.message);
    progressDiv.classList.add('hidden');
  }
}

async function exportCustomFontTTF() {
  const fontNameInput = document.getElementById('custom-font-name');
  const fontName = fontNameInput?.value?.replace(/[^a-zA-Z0-9]/g, '') || 'MyHandwriting';
  try {
    await ensureOpentypeLoaded();
    await window.FontCompilation.exportCustomFontTTF(draftedGlyphs, fontName);
  } catch (e) {
    alert('TTF export failed: ' + e.message);
  }
}

/* ═════════════════════════════════════════
   PHASE 16 - LAYER MANAGER UI
════════════════════════════════════════ */
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
    drag.title = 'Drag to reorder';

    // Visibility toggle
    const vis = document.createElement('div');
    vis.className = 'layer-vis';
    vis.textContent = layer.visible ? '👁️' : '🚫';
    vis.title = 'Toggle visibility';
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
      const newName = prompt('Rename layer:', layer.name);
      if (newName) {
        window.layerCompositor.setLayerProperty(pageIdx, layer.id, 'name', newName);
        updateLayerUI(pageIdx);
      }
    };

    // Opacity
    const op = document.createElement('input');
    op.type = 'range';
    op.className = 'layer-opacity';
    op.min = 0;
    op.max = 1;
    op.step = 0.05;
    op.value = layer.opacity;
    op.title = 'Opacity';
    op.oninput = (e) => {
      window.layerCompositor.setLayerProperty(pageIdx, layer.id, 'opacity', parseFloat(e.target.value));
      requestPageRender(pageIdx);
    };

    // Blend mode
    const blend = document.createElement('select');
    blend.className = 'layer-blend';
    blend.title = 'Blend Mode';
    const modes = window.layerCompositor.BLEND_MODES;
    modes.forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m
        .split('-')
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(' ');
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
    del.title = 'Delete layer';
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
  window.layerCompositor.createLayer(currentLayerPage, 'New Layer');
  updateLayerUI(currentLayerPage);
}

function flattenAllLayers() {
  if (!window.layerCompositor || !confirm('Are you sure you want to flatten all layers on this page?')) return;
  const pageIdx = S.currentPage;
  const canvas = pages[pageIdx];
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  // Flatten: draw all layers onto the main canvas, then remove layers
  const layers = window.layerCompositor.getLayers(pageIdx);
  if (layers && layers.length > 1) {
    layers.forEach((layer) => {
      if (layer.canvas) ctx.drawImage(layer.canvas, 0, 0);
    });
    window.layerCompositor.clearPage(pageIdx);
  }
  updateLayerUI(pageIdx);
}

function requestPageRender(pageIdx) {
  // Simple re-render wrapper
  window.renderSpecificPage(pageIdx, true);
}

/* ═════════════════════════════════════════
   STUDY MODE + FLASHCARDS + VOICE + THEMES
═══════════════════════════════════════ */

let studyModeActive = false;
let flashcards = [];
let currentFlashcardIdx = 0;
let flashcardFlipped = false;

function toggleStudyMode() {
  studyModeActive = !studyModeActive;
  document.body.classList.toggle('study-mode', studyModeActive);
  if (studyModeActive) {
    loadFlashcardsFromText();
    if (flashcards.length > 0) {
      openFlashcardsModal();
    } else {
      alert('No flashcards found. Use Q: and A: format in your text:\n\nQ: What is photosynthesis?\nA: The process by which plants convert light to energy.');
    }
  } else {
    closeFlashcardsModal();
  }
}

function loadFlashcardsFromText() {
  flashcards = [];
  currentFlashcardIdx = 0;
  flashcardFlipped = false;
  const text = S.text || '';
  const { flashcards: parsed } = window.TextLayout.parseRichSyntax(text);
  if (parsed && parsed.length > 0) {
    flashcards = parsed;
  }
  // Also extract from Q:/A: patterns if parseRichSyntax didn't catch them
  if (flashcards.length === 0) {
    const lines = text.split('\n');
    let currentQ = null;
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^Q[:.]\s/.test(trimmed)) {
        currentQ = trimmed.replace(/^Q[:.]\s*/, '');
      } else if (/^A[:.]\s/.test(trimmed) && currentQ) {
        flashcards.push({ question: currentQ, answer: trimmed.replace(/^A[:.]\s*/, '') });
        currentQ = null;
      }
    }
  }
}

function openFlashcardsModal() {
  if (flashcards.length === 0) return;
  document.getElementById('flashcards-modal').classList.remove('hidden');
  currentFlashcardIdx = 0;
  renderFlashcard();
}

function closeFlashcardsModal() {
  document.getElementById('flashcards-modal').classList.add('hidden');
}

function renderFlashcard() {
  if (flashcards.length === 0) return;
  const fc = flashcards[currentFlashcardIdx];
  document.getElementById('flashcard-counter').textContent = `${currentFlashcardIdx + 1} / ${flashcards.length}`;
  document.getElementById('flashcard-front').textContent = fc.question;
  document.getElementById('flashcard-back').textContent = fc.answer;
  const inner = document.getElementById('flashcard-inner');
  inner.style.transform = flashcardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
  document.getElementById('flashcard-hint').textContent = flashcardFlipped ? 'Click to see question' : 'Click to flip';
}

function flipFlashcard() {
  flashcardFlipped = !flashcardFlipped;
  renderFlashcard();
}

function nextFlashcard() {
  if (flashcards.length === 0) return;
  flashcardFlipped = false;
  currentFlashcardIdx = (currentFlashcardIdx + 1) % flashcards.length;
  renderFlashcard();
}

function prevFlashcard() {
  if (flashcards.length === 0) return;
  flashcardFlipped = false;
  currentFlashcardIdx = (currentFlashcardIdx - 1 + flashcards.length) % flashcards.length;
  renderFlashcard();
}

/* ── Voice to Notes ─────────────────────────────────────────────────────── */

let voiceRecognition = null;
let voiceRecording = false;

function startVoiceRecording() {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    alert('Voice recognition not supported in this browser. Try Chrome.');
    return;
  }
  if (voiceRecording && voiceRecognition) {
    voiceRecognition.stop();
    voiceRecording = false;
    document.getElementById('voice-toast').classList.add('hidden');
    document.getElementById('btn-voice').classList.remove('active');
    return;
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  voiceRecognition = new SpeechRecognition();
  voiceRecognition.continuous = true;
  voiceRecognition.interimResults = true;
  voiceRecognition.lang = 'en-US';
  voiceRecognition.onresult = (event) => {
    let finalTranscript = '';
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }
    if (finalTranscript) {
      const textarea = document.getElementById('text-input');
      if (textarea) {
        const current = textarea.value;
        const newText = current ? current + '\n' + finalTranscript : finalTranscript;
        textarea.value = newText;
        S.text = newText;
        renderText(S.text);
        autosave();
      }
    }
  };
  voiceRecognition.onerror = () => {
    voiceRecording = false;
    document.getElementById('voice-toast').classList.add('hidden');
    document.getElementById('btn-voice').classList.remove('active');
  };
  voiceRecognition.onend = () => {
    voiceRecording = false;
    document.getElementById('voice-toast').classList.add('hidden');
    document.getElementById('btn-voice').classList.remove('active');
  };
  voiceRecognition.start();
  voiceRecording = true;
  document.getElementById('voice-toast').classList.remove('hidden');
  document.getElementById('btn-voice').classList.add('active');
}

/* ── Theme Packs ────────────────────────────────────────────────────────── */

const THEME_PACKS = {
  default: { name: 'Default', accent: '#6C63FF', paper: '#f7f3ea', ink: '#1c2340' },
  forest: { name: 'Forest', accent: '#2e7d32', paper: '#f1f8e9', ink: '#1b5e20' },
  sunset: { name: 'Sunset', accent: '#e65100', paper: '#fff3e0', ink: '#bf360c' },
  ocean: { name: 'Ocean', accent: '#0277bd', paper: '#e1f5fe', ink: '#01579b' },
  lavender: { name: 'Lavender', accent: '#7b1fa2', paper: '#f3e5f5', ink: '#4a148c' },
  charcoal: { name: 'Charcoal', accent: '#546e7a', paper: '#eceff1', ink: '#263238' },
};

function applyThemePack(packId) {
  const pack = THEME_PACKS[packId];
  if (!pack) return;
  document.documentElement.style.setProperty('--accent', pack.accent);
  document.documentElement.style.setProperty('--paper-color', pack.paper);
  document.documentElement.style.setProperty('--ink-color', pack.ink);
  S.paperColor = pack.paper;
  S.inkColor = pack.ink;
  S.accentColor = pack.accent;
  autosave();
  debounceRender();
}
