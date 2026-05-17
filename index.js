/* ───────────────────────────────────────────
   STATE — Global settings object
─────────────────────────────────────────── */
const S = {
  text: '',
  font: 'Caveat',
  fontSize: 16,
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
};

/* Canvas pages array */
let pages = [];
let animFrameId = null;
let isAnimating = false;
let renderTimeout = null;

const TEMPLATE_CHARS = [
  'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
  'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z',
  '0','1','2','3','4','5','6','7','8','9','.',','
];
let activeChar = 'A';
const draftedGlyphs = {};
let alignerImage = null;
let gridX = 22;
let gridY = 36;
let gridW = 315;
let gridH = 315;

const PAGE_W = 794;
const PAGE_H = 1123;

/* ───────────────────────────────────────────
   PHASE 1.4 / 2.6 — DARK MODE TOGGLE
─────────────────────────────────────────── */
const darkToggle = document.getElementById('dark-toggle');
const darkIcon = document.getElementById('dark-icon');
let isDark = localStorage.getItem('inkflow-dark') === '1';
applyDark();

darkToggle.addEventListener('click', () => {
  isDark = !isDark;
  localStorage.setItem('inkflow-dark', isDark ? '1' : '0');
  applyDark();
});

function applyDark() {
  document.documentElement.classList.toggle('dark', isDark);
  darkIcon.textContent = isDark ? '🌙' : '☀️';
}

/* ───────────────────────────────────────────
   PHASE 2.7 — HAMBURGER (MOBILE)
─────────────────────────────────────────── */
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

/* ───────────────────────────────────────────
   PHASE 2.3 — SIDEBAR SECTION TOGGLE
─────────────────────────────────────────── */
function toggleSection(id) {
  document.getElementById(id).classList.toggle('collapsed');
}

/* ───────────────────────────────────────────
   PHASE 3.1/3.2 — FONT SELECTOR + PREVIEW
─────────────────────────────────────────── */
const fontSelect = document.getElementById('font-select');
fontSelect.addEventListener('change', () => {
  S.font = fontSelect.value;
  fontSelect.style.fontFamily = S.font;
  if (document.fonts) {
    document.fonts.load(`${S.fontSize}px "${S.font}"`).then(() => {
      debounceRender();
    }).catch(() => {
      debounceRender();
    });
  } else {
    debounceRender();
  }
});
fontSelect.style.fontFamily = S.font;

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
   PHASE 5.1–5.6 — SLIDER CONTROLS
─────────────────────────────────────────── */
function bindSlider(id, valId, key, parse = parseFloat, suffix = '') {
  const el = document.getElementById(id);
  const disp = document.getElementById(valId);
  el.addEventListener('input', () => {
    S[key] = parse(el.value);
    disp.textContent = parse(el.value) + suffix;
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
inkColorInput.addEventListener('input', () => {
  S.inkColor = inkColorInput.value;
  document.getElementById('ink-color-label').textContent = S.inkColor;
  debounceRender();
});

function setInkPreset(hex, name) {
  S.inkColor = hex;
  inkColorInput.value = hex;
  document.getElementById('ink-color-label').textContent = hex + ' — ' + name;
  debounceRender();
}

/* ───────────────────────────────────────────
   PHASE 5.7 — PAPER STYLE BUTTONS
─────────────────────────────────────────── */
function setPaper(btn) {
  document.querySelectorAll('.paper-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  S.paperStyle = btn.dataset.style;
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

  const canvas = document.createElement('canvas');
  canvas.className = 'canvas-page';
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  canvas.id = 'page-' + pageNum;
  canvas.style.width = Math.min(PAGE_W, 720) + 'px';
  canvas.style.height = Math.min(PAGE_H, 720 * PAGE_H / PAGE_W) + 'px';

  wrapper.appendChild(label);
  wrapper.appendChild(canvas);
  document.getElementById('page-container').appendChild(wrapper);
  pages.push(canvas);
  updatePageNav();
  return canvas;
}

/* ───────────────────────────────────────────
   PHASE 4.2 — PAPER BACKGROUND RENDERER
─────────────────────────────────────────── */
function drawPaperBackground(ctx, style) {
  const w = PAGE_W, h = PAGE_H;
  ctx.clearRect(0, 0, w, h);

  // Paper colors per style
  const configs = {
    ruled: { bg: '#f8f4ea', lineColor: '#c5b9a0', lineOpacity: 0.55, redLine: '#e08080' },
    plain: { bg: '#faf7f0', lineColor: null },
    grid: { bg: '#f6f2ec', lineColor: '#c0b49a', lineOpacity: 0.35 },
    legal: { bg: '#fef9c3', lineColor: '#c8b820', lineOpacity: 0.45, redLine: '#e07070' },
    vintage: { bg: '#f2e8ce', lineColor: '#b8a080', lineOpacity: 0.4 },
    dark: { bg: '#1a1a2e', lineColor: '#3a3a5e', lineOpacity: 0.7 },
  };

  const c = configs[style] || configs.ruled;

  // Fill background
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle paper texture (noise-like grain using very small rects)
  if (style !== 'dark') {
    ctx.save();
    ctx.globalAlpha = 0.018;
    for (let i = 0; i < 2200; i++) {
      const gx = Math.random() * w;
      const gy = Math.random() * h;
      const gs = Math.random() * 3 + 1;
      ctx.fillStyle = Math.random() > 0.5 ? '#8b7355' : '#c8b090';
      ctx.fillRect(gx, gy, gs, gs * 0.5);
    }
    ctx.restore();
  }

  if (style === 'ruled' || style === 'legal') {
    // Red margin line
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = c.redLine || '#e08080';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(S.margin - 10, 0);
    ctx.lineTo(S.margin - 10, h);
    ctx.stroke();
    ctx.restore();

    // Horizontal ruled lines
    ctx.save();
    ctx.globalAlpha = c.lineOpacity;
    ctx.strokeStyle = c.lineColor;
    ctx.lineWidth = 0.8;
    const lineSpacingPx = S.fontSize * S.lineHeight;
    for (let y = S.margin + lineSpacingPx; y < h - 20; y += lineSpacingPx) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (style === 'grid') {
    ctx.save();
    ctx.globalAlpha = c.lineOpacity;
    ctx.strokeStyle = c.lineColor;
    ctx.lineWidth = 0.6;
    const gridSz = 28;
    for (let x = 0; x < w; x += gridSz) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSz) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.restore();
  }

  if (style === 'vintage') {
    // Aged edges
    ctx.save();
    const grd = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.85);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(120,80,20,0.14)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // Faint lines
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = c.lineColor;
    ctx.lineWidth = 0.7;
    const vs = S.fontSize * S.lineHeight;
    for (let y = S.margin + vs; y < h - 20; y += vs) {
      ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(w - 20, y); ctx.stroke();
    }
    ctx.restore();
  }

  if (style === 'dark') {
    ctx.save();
    ctx.globalAlpha = c.lineOpacity;
    ctx.strokeStyle = c.lineColor;
    ctx.lineWidth = 0.7;
    const vs = S.fontSize * S.lineHeight;
    for (let y = S.margin + vs; y < h - 20; y += vs) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.restore();
  }

  // Page shadow edge
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 4, h);
  ctx.fillRect(w - 4, 0, 4, h);
  ctx.restore();
}

/* ───────────────────────────────────────────
   PHASE 4.3 — PER-CHARACTER VARIATION ENGINE
─────────────────────────────────────────── */
function getCharVariation(rotMax, pressure) {
  const rand = (min, max) => min + Math.random() * (max - min);
  return {
    tiltDeg: rand(-rotMax, rotMax),
    scaleY: rand(0.88, 1.12),
    scaleX: rand(0.94, 1.06),
    baselineOff: rand(-2.2, 2.2),
    spacingExtra: rand(-1.2, 2.4),
    pressureMod: 1 - (Math.random() * pressure * 2),  // stroke weight variation
    opacity: rand(0.82, 1.0),
  };
}

/* ───────────────────────────────────────────
   PHASE 4.1–4.8 — CLEAR & INIT PAGES
─────────────────────────────────────────── */
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
  createPage(1);
  drawPaperBackground(pages[0].getContext('2d'), S.paperStyle);
}

/* ───────────────────────────────────────────
   PHASE 4.4–4.8 — TEXT-TO-CANVAS RENDERER
─────────────────────────────────────────── */
function sanitizeText(str) {
  if (!str) return '';
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uE000-\uF8FF]/g, '');
}

function getGraphemes(text) {
  if (!text) return [];
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text)).map(s => s.segment);
  }
  return [...text];
}

function containsDevanagari(text) {
  return /[\u0900-\u097F]/.test(text);
}

function renderText(text) {
  text = sanitizeText(text);
  clearPages();
  if (!text.trim()) {
    createPage(1);
    drawPaperBackground(pages[0].getContext('2d'), S.paperStyle);
    return;
  }

  let pageIdx = 0;
  let canvas = createPage(1);
  let ctx = canvas.getContext('2d');
  drawPaperBackground(ctx, S.paperStyle);

  const margin = S.margin;
  const rightMargin = PAGE_W - margin;
  let x = margin;
  let y = margin + S.fontSize;
  const lineH = S.fontSize * S.lineHeight;

  ctx.textBaseline = 'alphabetic';

  let charIndex = 0;
  const words = text.split(' ');

  for (let wi = 0; wi < words.length; wi++) {
    const word = words[wi];
    const lines = word.split('\n');

    for (let li = 0; li < lines.length; li++) {
      if (li > 0) {
        // Explicit newline
        x = margin;
        y += lineH;
        if (y + lineH > PAGE_H - margin) {
          pageIdx++;
          canvas = createPage(pageIdx + 1);
          ctx = canvas.getContext('2d');
          drawPaperBackground(ctx, S.paperStyle);
          y = margin + S.fontSize;
        }
      }

      const lineWord = lines[li];
      if (!lineWord) continue;

      // Measure word width using current font
      ctx.font = `${S.fontSize}px "${S.font}"`;
      const wordWidth = ctx.measureText(lineWord).width + S.wordSpacing;

      // Word wrap
      if (x + wordWidth > rightMargin && x > margin) {
        x = margin;
        y += lineH;
        if (y + lineH > PAGE_H - margin) {
          pageIdx++;
          canvas = createPage(pageIdx + 1);
          ctx = canvas.getContext('2d');
          drawPaperBackground(ctx, S.paperStyle);
          y = margin + S.fontSize;
        }
      }

      if (containsDevanagari(lineWord)) {
        // Render Hindi / Devanagari words as single shaped block to preserve combining marks & conjunct ligatures
        const v = getCharVariation(S.rotationMax, S.pressure);

        // Baseline wobble
        const wobble = Math.sin(charIndex * 0.18) * 1.8;
        const cy = y + v.baselineOff + wobble;

        ctx.save();
        ctx.translate(x, cy);
        ctx.rotate((v.tiltDeg * Math.PI) / 180);
        ctx.scale(v.scaleX, v.scaleY);

        // Pressure variation
        const pxSize = S.fontSize * v.pressureMod;
        ctx.font = `${Math.max(10, pxSize)}px "${S.font}"`;
        ctx.globalAlpha = v.opacity;

        // Ink bleed
        if (S.bleed > 0.05) {
          ctx.shadowColor = S.inkColor;
          ctx.shadowBlur = S.bleed * 1.4;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = S.inkColor;
        ctx.fillText(lineWord, 0, 0);
        ctx.restore();

        // Advance cursor
        ctx.font = `${S.fontSize}px "${S.font}"`;
        x += ctx.measureText(lineWord).width + v.spacingExtra;
        charIndex += lineWord.length;
      } else {
        // Render each character of the word (using grapheme clusters for Latin/ASCII/emojis)
        const graphemes = getGraphemes(lineWord);
        for (let ci = 0; ci < graphemes.length; ci++) {
          const ch = graphemes[ci];
          const v = getCharVariation(S.rotationMax, S.pressure);

          // Baseline wobble
          const wobble = Math.sin(charIndex * 0.18) * 1.8;
          const cy = y + v.baselineOff + wobble;

          ctx.save();
          ctx.translate(x, cy);
          ctx.rotate((v.tiltDeg * Math.PI) / 180);
          ctx.scale(v.scaleX, v.scaleY);

          // Pressure / font-size variation
          const pxSize = S.fontSize * v.pressureMod;
          ctx.font = `${Math.max(10, pxSize)}px "${S.font}"`;
          ctx.globalAlpha = v.opacity;

          // Ink bleed
          if (S.bleed > 0.05) {
            ctx.shadowColor = S.inkColor;
            ctx.shadowBlur = S.bleed * 1.4;
          } else {
            ctx.shadowBlur = 0;
          }

          ctx.fillStyle = S.inkColor;
          ctx.fillText(ch, 0, 0);
          ctx.restore();

          // Advance cursor
          ctx.font = `${S.fontSize}px "${S.font}"`;
          x += ctx.measureText(ch).width + v.spacingExtra;
          charIndex++;
        }
      }

      // Space after word (not on last word of line)
      if (li === lines.length - 1) {
        ctx.font = `${S.fontSize}px "${S.font}"`;
        x += ctx.measureText(' ').width + S.wordSpacing;
      }
    }
  }
}

/* ───────────────────────────────────────────
   PHASE 4.9 — DEBOUNCE RENDER ON INPUT
─────────────────────────────────────────── */
document.getElementById('text-input').addEventListener('input', function () {
  S.text = this.value;
  debounceRender();
  autosave();
});

function debounceRender() {
  clearTimeout(renderTimeout);
  renderTimeout = setTimeout(() => renderText(S.text), 280);
}

function triggerRender() {
  S.text = document.getElementById('text-input').value;
  renderText(S.text);
}

/* ───────────────────────────────────────────
   PHASE 6.1–6.4 — WRITING ANIMATION
─────────────────────────────────────────── */
function buildCharQueue(text) {
  text = sanitizeText(text);
  const queue = [];
  if (!text.trim()) return queue;

  // Temporary off-screen canvas for measurement
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = PAGE_W; tmpCanvas.height = PAGE_H;
  const ctx = tmpCanvas.getContext('2d');

  const margin = S.margin;
  const rightMargin = PAGE_W - margin;
  let x = margin;
  let y = margin + S.fontSize;
  const lineH = S.fontSize * S.lineHeight;
  let pageIdx = 0;
  let charIndex = 0;
  const words = text.split(' ');

  for (let wi = 0; wi < words.length; wi++) {
    const word = words[wi];
    const lines = word.split('\n');
    for (let li = 0; li < lines.length; li++) {
      if (li > 0) {
        x = margin;
        y += lineH;
        if (y + lineH > PAGE_H - margin) { pageIdx++; y = margin + S.fontSize; }
      }
      const lineWord = lines[li];
      if (!lineWord) continue;
      ctx.font = `${S.fontSize}px "${S.font}"`;
      const wordWidth = ctx.measureText(lineWord).width + S.wordSpacing;
      if (x + wordWidth > rightMargin && x > margin) {
        x = margin; y += lineH;
        if (y + lineH > PAGE_H - margin) { pageIdx++; y = margin + S.fontSize; }
      }
      if (containsDevanagari(lineWord)) {
        const v = getCharVariation(S.rotationMax, S.pressure);
        const wobble = Math.sin(charIndex * 0.18) * 1.8;
        queue.push({ ch: lineWord, x, y: y + v.baselineOff + wobble, v, pageIdx });
        ctx.font = `${S.fontSize}px "${S.font}"`;
        x += ctx.measureText(lineWord).width + v.spacingExtra;
        charIndex += lineWord.length;
      } else {
        const graphemes = getGraphemes(lineWord);
        for (let ci = 0; ci < graphemes.length; ci++) {
          const ch = graphemes[ci];
          const v = getCharVariation(S.rotationMax, S.pressure);
          const wobble = Math.sin(charIndex * 0.18) * 1.8;
          queue.push({ ch, x, y: y + v.baselineOff + wobble, v, pageIdx });
          ctx.font = `${S.fontSize}px "${S.font}"`;
          x += ctx.measureText(ch).width + v.spacingExtra;
          charIndex++;
        }
      }
      if (li === lines.length - 1) {
        ctx.font = `${S.fontSize}px "${S.font}"`;
        x += ctx.measureText(' ').width + S.wordSpacing;
      }
    }
  }
  return queue;
}

function stopAnimation() {
  if (animFrameId) cancelAnimationFrame(animFrameId);
  animFrameId = null;
  isAnimating = false;
  document.getElementById('pen-cursor').style.display = 'none';
}

function startAnimation() {
  stopAnimation();
  const text = document.getElementById('text-input').value;
  if (!text.trim()) return;
  isAnimating = true;

  // Clear and recreate pages with backgrounds
  clearPages();
  const pagesNeeded = Math.ceil(text.length / 600) + 1;
  for (let i = 0; i < pagesNeeded; i++) {
    const c = createPage(i + 1);
    drawPaperBackground(c.getContext('2d'), S.paperStyle);
  }

  const queue = buildCharQueue(text);
  let idx = 0;
  const penEl = document.getElementById('pen-cursor');
  penEl.style.display = 'block';

  function step() {
    if (!isAnimating || idx >= queue.length) {
      penEl.style.display = 'none';
      isAnimating = false;
      return;
    }
    const charsPerFrame = S.animSpeed;
    for (let i = 0; i < charsPerFrame && idx < queue.length; i++, idx++) {
      const item = queue[idx];
      const canvas = pages[item.pageIdx] || pages[pages.length - 1];
      if (!canvas) continue;
      const ctx = canvas.getContext('2d');
      const v = item.v;
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate((v.tiltDeg * Math.PI) / 180);
      ctx.scale(v.scaleX, v.scaleY);
      const pxSize = S.fontSize * v.pressureMod;
      ctx.font = `${Math.max(10, pxSize)}px "${S.font}"`;
      ctx.globalAlpha = v.opacity;
      if (S.bleed > 0.05) { ctx.shadowColor = S.inkColor; ctx.shadowBlur = S.bleed * 1.4; }
      ctx.fillStyle = S.inkColor;
      ctx.fillText(item.ch, 0, 0);
      ctx.restore();

      // Move pen cursor to current char screen position (Phase 6.3)
      if (i === charsPerFrame - 1 || idx === queue.length - 1) {
        const canvasEl = canvas;
        const rect = canvasEl.getBoundingClientRect();
        const scaleX = rect.width / PAGE_W;
        const scaleY = rect.height / PAGE_H;
        penEl.style.left = (rect.left + item.x * scaleX) + 'px';
        penEl.style.top = (rect.top + item.y * scaleY + window.scrollY) + 'px';
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
      const fetched = data.data.map(item => {
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
        
        const isFree = item.pricing && parseFloat(item.pricing.prompt) === 0 && parseFloat(item.pricing.completion) === 0;
        let displayName = item.name || item.id;
        
        // Strip out redundant provider prefixes to keep UI compact
        displayName = displayName.replace(/^(google|anthropic|openai|meta|deepseek|mistral|qwen|x-ai|cohere|nvidia|microsoft|llama):\s*/i, '');
        
        let name = `${emoji}${displayName}`;
        if (isFree) {
          name += ' (Free)';
        }
        
        return {
          id: item.id,
          name: name,
          isFree: isFree
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
  AI_MODELS[provider].forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.name;
    modelSelect.appendChild(opt);
  });

  // Update key label and placeholder
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

// Initialize model dropdown and start auto-fetching on load
onProviderChange();
fetchOpenRouterModels();

async function callClaude(prompt, systemPrompt) {
  const provider = document.getElementById('ai-provider').value;
  const model = document.getElementById('ai-model').value;
  const key = document.getElementById('api-key').value.trim();

  if (!key) {
    setAiStatus('⚠ Enter your ' + (provider === 'openrouter' ? 'OpenRouter' : 'Anthropic') + ' API key first.');
    return null;
  }

  setAiStatus('✦ Generating via ' + (provider === 'openrouter' ? 'OpenRouter' : 'Anthropic') + '…');

  try {
    let res, data, text;

    if (provider === 'openrouter') {
      // ── OpenRouter API (OpenAI-compatible format) ──
      res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + key,
          'HTTP-Referer': window.location.href,
          'X-Title': 'Inkflow Notes Generator',
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 1500,
          messages: [
            { role: 'system', content: systemPrompt || 'You are a helpful assistant for a handwritten notes app.' },
            { role: 'user', content: prompt },
          ],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setAiStatus('✕ API Error: ' + (err.error?.message || res.status));
        return null;
      }

      data = await res.json();
      text = data.choices?.[0]?.message?.content || '';

    } else {
      // ── Anthropic Direct API ──
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 1500,
          system: systemPrompt || 'You are a helpful assistant for a handwritten notes app.',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setAiStatus('✕ API Error: ' + (err.error?.message || res.status));
        return null;
      }

      data = await res.json();
      text = data.content?.find(b => b.type === 'text')?.text || '';
    }

    setAiStatus('✓ Done — ' + model.split('/').pop());
    setTimeout(() => setAiStatus(''), 3000);
    return text;

  } catch (e) {
    setAiStatus('✕ Network error: ' + e.message);
    return null;
  }
}

function setAiStatus(msg) {
  document.getElementById('ai-status').textContent = msg;
}

/* ───────────────────────────────────────────
   PHASE 7.3–7.6 — AI ACTION DISPATCHER
─────────────────────────────────────────── */
async function aiAction(type) {
  const textarea = document.getElementById('text-input');
  const currentText = textarea.value.trim();

  const btns = document.querySelectorAll('.ai-btn-group .btn');
  btns.forEach(b => b.disabled = true);

  let result = null;

  if (type === 'summarize') {
    if (!currentText) { setAiStatus('⚠ Add some text first.'); btns.forEach(b => b.disabled = false); return; }
    result = await callClaude(
      currentText,
      'Summarize the following text into clear, concise bullet-point notes. Use short sentences. No markdown formatting — plain text only.'
    );
  }

  if (type === 'grammar') {
    if (!currentText) { setAiStatus('⚠ Add some text first.'); btns.forEach(b => b.disabled = false); return; }
    result = await callClaude(
      currentText,
      'Fix the grammar, spelling, and phrasing of this text. Keep the content and meaning identical. Return plain text only, no markdown.'
    );
  }

  if (type === 'lecture') {
    if (!currentText) { setAiStatus('⚠ Paste lecture text first.'); btns.forEach(b => b.disabled = false); return; }
    result = await callClaude(
      currentText,
      'Convert this raw lecture transcript into clean, well-structured handwritten-style notes. Use headings, bullet points, and numbered lists where appropriate. Plain text only, no markdown symbols.'
    );
  }

  if (type === 'assignment') {
    const topic = document.getElementById('ai-topic').value.trim() || currentText;
    if (!topic) { setAiStatus('⚠ Enter a topic first.'); btns.forEach(b => b.disabled = false); return; }
    result = await callClaude(
      'Write a detailed, well-structured academic assignment on the topic: ' + topic,
      'Generate a complete handwritten-style assignment with an introduction, body paragraphs, and conclusion. Use plain text only. No markdown. Write naturally as someone would write in a notebook.'
    );
  }

  if (result) {
    textarea.value = result;
    S.text = result;
    renderText(S.text);
    autosave();
  }

  btns.forEach(b => b.disabled = false);
}

/* ───────────────────────────────────────────
   PHASE 8.1–8.2 — IMAGE EXPORT
─────────────────────────────────────────── */
async function exportImage(format) {
  const container = document.getElementById('page-container');
  try {
    const canvas = await html2canvas(container, {
      backgroundColor: null,
      scale: 1.5,
      useCORS: true,
      allowTaint: true,
    });
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    const quality = format === 'png' ? 1 : 0.92;
    const a = document.createElement('a');
    a.href = canvas.toDataURL(mimeType, quality);
    a.download = 'inkflow-notes.' + format;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    alert('Export failed: ' + e.message);
  }
}

/* ───────────────────────────────────────────
   PHASE 8.3–8.4 — PDF EXPORT (MULTI-PAGE)
─────────────────────────────────────────── */
async function exportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  for (let i = 0; i < pages.length; i++) {
    if (i > 0) doc.addPage();
    const canvas = pages[i];
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    doc.addImage(imgData, 'JPEG', 0, 0, 210, 297);
  }
  doc.save('inkflow-notes.pdf');
}

/* ───────────────────────────────────────────
   PHASE 8.6–8.7 — AUTOSAVE & STATE RESTORE
─────────────────────────────────────────── */
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
      draftedGlyphs: draftedGlyphs,
    };
    localStorage.setItem('inkflow-state', JSON.stringify(state));
  }, 1000);
}

function restoreState() {
  const raw = localStorage.getItem('inkflow-state');
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
        if (el) { el.value = state[key]; document.getElementById(valId).textContent = state[key]; }
      }
    });
    if (state.inkColor) {
      S.inkColor = state.inkColor;
      document.getElementById('ink-color').value = state.inkColor;
    }
    if (state.font) {
      S.font = state.font;
      const opt = document.querySelector(`#font-select option[value="${state.font}"]`);
      if (opt) { fontSelect.value = state.font; fontSelect.style.fontFamily = state.font; }
    }
    if (state.paperStyle) {
      S.paperStyle = state.paperStyle;
      document.querySelectorAll('.paper-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.style === state.paperStyle);
      });
    }
    // Restore custom handwriting drafts
    if (state.draftedGlyphs) {
      Object.assign(draftedGlyphs, state.draftedGlyphs);
      // Ensure the studio character buttons highlight to reflect saved drafts
      TEMPLATE_CHARS.forEach(char => {
        if (draftedGlyphs[char] && draftedGlyphs[char].length > 0) {
          const btn = Array.from(document.querySelectorAll('.char-btn')).find(b => b.textContent === char);
          if (btn) btn.classList.add('has-data');
        }
      });
      // Optionally redraw if studio is open
      if (typeof drawStudioCanvas === 'function') drawStudioCanvas();
    }
  } catch (e) { /* ignore corrupt state */ }
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
function initApp() {
  restoreState();
  setupFileUpload();
  initHandFontedStudio();

  // Render initial state or blank page
  if (S.text) {
    renderText(S.text);
  } else {
    // Show a blank ruled page with placeholder watermark
    const canvas = createPage(1);
    const ctx = canvas.getContext('2d');
    drawPaperBackground(ctx, S.paperStyle);
    // Subtle placeholder text
    ctx.save();
    ctx.font = `italic 18px "${S.font}"`;
    ctx.fillStyle = S.inkColor;
    ctx.globalAlpha = 0.18;
    ctx.fillText('Start typing in the panel to the left…', S.margin, S.margin + S.fontSize);
    ctx.restore();
  }
}

// Wire all slider controls to autosave
['font-size-slider', 'line-spacing', 'word-spacing', 'margin-slider',
  'rotation-slider', 'bleed-slider', 'pressure-slider', 'speed-slider'].forEach(id => {
    document.getElementById(id).addEventListener('change', autosave);
  });
fontSelect.addEventListener('change', autosave);
inkColorInput.addEventListener('change', autosave);

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
    statusText.innerHTML = `<span class="spinner"></span> Processing "${file.name}"...`;
    
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
          setTimeout(() => { progContainer.style.display = 'none'; }, 500);
        }
      } else {
        throw new Error('Unsupported file format. Please upload PDF, TXT, or MD.');
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
      
      statusText.innerHTML = '<span style="color:#2d6a4f;font-weight:600;">✓ File loaded successfully!</span>';
      setTimeout(() => {
        uploadStatus.style.display = 'none';
      }, 3500);
    } catch (e) {
      statusText.innerHTML = `<span style="color:#8b0000;font-weight:600;">✕ Error: ${e.message}</span>`;
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
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
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
    fontSize: 16,
    lineHeight: 1.5,
    wordSpacing: 1,
    margin: 80,
    rotationMax: 1,
    inkColor: '#1c2340',
    bleed: 0.5,
    pressure: 0.12,
    paperStyle: 'ruled',
  };

  // Apply state
  Object.keys(defaults).forEach(key => {
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

  // Update Paper styles active classes
  document.querySelectorAll('.paper-btn').forEach(btn => {
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
  if (modal) modal.classList.remove('hidden');
  selectSketchCharacter('A');
}

function closeHandFontedModal() {
  const modal = document.getElementById('handfonted-modal');
  if (modal) modal.classList.add('hidden');
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
    if (alignerImage) {
      setTimeout(updateAlignerGrid, 50);
    }
  }
}

// Live Sketchpad Mechanics
function initHandFontedStudio() {
  const btn = document.getElementById('btn-handfonted-studio');
  if (btn) btn.addEventListener('click', openHandFontedModal);
  
  const canvas = document.getElementById('sketch-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  // High quality stroke aesthetics
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  let drawing = false;
  
  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }
  
  function startDraw(e) {
    e.preventDefault();
    drawing = true;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }
  
  function draw(e) {
    if (!drawing) return;
    e.preventDefault();
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }
  
  function stopDraw() {
    drawing = false;
  }
  
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
  
  TEMPLATE_CHARS.forEach(char => {
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
  
  document.querySelectorAll('.char-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`char-btn-${char}`);
  if (activeBtn) activeBtn.classList.add('active');
  
  document.getElementById('current-char-display').textContent = char;
  document.getElementById('canvas-guide-letter').textContent = char;
  
  clearSketchCanvas();
  
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
  
  // Save canvas as image data URL
  const dataUrl = canvas.toDataURL();
  draftedGlyphs[activeChar] = dataUrl;
  
  // Update sidebar grids
  const btn = document.getElementById(`char-btn-${activeChar}`);
  if (btn) btn.classList.add('drafted');
  
  // Micro-interaction: visual confirmation
  const wrapper = canvas.parentElement;
  wrapper.style.borderColor = 'var(--accent)';
  setTimeout(() => {
    wrapper.style.borderColor = '';
  }, 300);
}

function advanceActiveCharacter() {
  saveActiveCharacter();
  
  const curIdx = TEMPLATE_CHARS.indexOf(activeChar);
  if (curIdx < TEMPLATE_CHARS.length - 1) {
    selectSketchCharacter(TEMPLATE_CHARS[curIdx + 1]);
  } else {
    alert('🎉 You have drafted all characters in the set! Click "Generate & Apply Font" below to compile your TrueType handwriting font.');
  }
}

// Handwriting PDF/PNG Sheet Template Builder
function generateDownloadTemplate() {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1600;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1600, 1600);
  
  // Labeled Sheet Headers
  ctx.fillStyle = '#1c2340';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HandFonted Studio — Handwriting Template Grid', 800, 70);
  ctx.font = '22px sans-serif';
  ctx.fillStyle = '#555';
  ctx.fillText('Write each letter clearly inside its designated box, scan/photo this sheet, and upload it!', 800, 110);
  
  const startX = 100;
  const startY = 160;
  const size = 175; // 8 * 175 = 1400px wide
  
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 2;
  
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const x = startX + c * size;
      const y = startY + r * size;
      const char = TEMPLATE_CHARS[r * 8 + c] || '';
      
      // Outer square
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, size, size);
      
      // Center dotted line helper
      ctx.strokeStyle = '#e2e2e2';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(x, y + size * 0.7);
      ctx.lineTo(x + size, y + size * 0.7);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Guide label tags
      ctx.fillStyle = '#888888';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(char, x + 8, y + 8);
    }
  }
  
  const link = document.createElement('a');
  link.download = 'handfonted-template.png';
  link.href = canvas.toDataURL();
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
}

function handleTemplateImage(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    alignerImage = new Image();
    alignerImage.onload = () => {
      document.getElementById('template-aligner-container').classList.remove('hidden');
      
      // Set reasonable startup values that roughly frame standard templates
      gridX = 22;
      gridY = 36;
      gridW = 315;
      gridH = 315;
      
      document.getElementById('slider-grid-x').value = gridX;
      document.getElementById('slider-grid-y').value = gridY;
      document.getElementById('slider-grid-w').value = gridW;
      document.getElementById('slider-grid-h').value = gridH;
      
      updateAlignerGrid();
    };
    alignerImage.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function updateAlignerGrid() {
  if (!alignerImage) return;
  const canvas = document.getElementById('aligner-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  // Read dynamic slider parameters
  gridX = parseInt(document.getElementById('slider-grid-x').value);
  gridY = parseInt(document.getElementById('slider-grid-y').value);
  gridW = parseInt(document.getElementById('slider-grid-w').value);
  gridH = parseInt(document.getElementById('slider-grid-h').value);
  
  // Display numbers in UI
  document.getElementById('val-grid-x').textContent = gridX;
  document.getElementById('val-grid-y').textContent = gridY;
  document.getElementById('val-grid-w').textContent = gridW;
  document.getElementById('val-grid-h').textContent = gridH;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw base image
  ctx.drawImage(alignerImage, 0, 0, canvas.width, canvas.height);
  
  // Semi-transparent shading of outer bounding box
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  // Top padding
  ctx.fillRect(0, 0, canvas.width, gridY);
  // Bottom padding
  ctx.fillRect(0, gridY + gridH, canvas.width, canvas.height - (gridY + gridH));
  // Left padding
  ctx.fillRect(0, gridY, gridX, gridH);
  // Right padding
  ctx.fillRect(gridX + gridW, gridY, canvas.width - (gridX + gridW), gridH);
  
  // Red/Orange alignment grids
  ctx.strokeStyle = 'rgba(230, 100, 50, 0.85)';
  ctx.lineWidth = 1.5;
  const cellW = gridW / 8;
  const cellH = gridH / 8;
  
  ctx.beginPath();
  for (let i = 0; i <= 8; i++) {
    // Vertical
    ctx.moveTo(gridX + i * cellW, gridY);
    ctx.lineTo(gridX + i * cellW, gridY + gridH);
    // Horizontal
    ctx.moveTo(gridX, gridY + i * cellH);
    ctx.lineTo(gridX + gridW, gridY + i * cellH);
  }
  ctx.stroke();
}

function cropTemplateCell(index) {
  const col = index % 8;
  const row = Math.floor(index / 8);
  
  const cellCanvas = document.createElement('canvas');
  cellCanvas.width = 128;
  cellCanvas.height = 128;
  const cellCtx = cellCanvas.getContext('2d');
  
  // Map 360-scaled preview grids to native uploader dimensions
  const scale = alignerImage.naturalWidth / 360;
  
  const cellW_preview = gridW / 8;
  const cellH_preview = gridH / 8;
  
  const srcX = (gridX + col * cellW_preview) * scale;
  const srcY = (gridY + row * cellH_preview) * scale;
  const srcW = cellW_preview * scale;
  const srcH = cellH_preview * scale;
  
  cellCtx.fillStyle = '#ffffff';
  cellCtx.fillRect(0, 0, 128, 128);
  
  // Draw cell with safe centering margins
  cellCtx.drawImage(alignerImage, srcX, srcY, srcW, srcH, 12, 12, 104, 104);
  return cellCanvas;
}

// Connected Component Vector Tracer
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
    
    // Trigger outline on dark drawings
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
          let dir = 7; // left start
          
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
      let t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
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

function loadImageToCanvas(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.src = dataUrl;
  });
}

function canvasToOpentypePath(canvas) {
  const contours = traceCanvasContours(canvas);
  const path = new window.opentype.Path();
  
  contours.forEach(points => {
    if (points.length < 3) return;
    
    // Scale points to 1000 UnitsEm box and center
    const x0 = (points[0].x / canvas.width) * 800 + 100;
    const y0 = 800 - (points[0].y / canvas.height) * 1000;
    path.moveTo(x0, y0);
    
    for (let i = 1; i < points.length; i++) {
      const px = (points[i].x / canvas.width) * 800 + 100;
      const py = 800 - (points[i].y / canvas.height) * 1000;
      path.lineTo(px, py);
    }
    path.closePath();
  });
  return path;
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
      path: new window.opentype.Path()
    });
    glyphsList.push(notdefGlyph);
    
    // standard space glyph
    const spaceGlyph = new window.opentype.Glyph({
      name: 'space',
      unicode: 32,
      advanceWidth: 320,
      path: new window.opentype.Path()
    });
    glyphsList.push(spaceGlyph);
    
    statusText.textContent = 'Analyzing raster paths and extracting contours...';
    
    const isTemplateTab = !document.getElementById('panel-template').classList.contains('hidden');
    
    for (let i = 0; i < TEMPLATE_CHARS.length; i++) {
      const char = TEMPLATE_CHARS[i];
      let cellCanvas = null;
      
      if (isTemplateTab) {
        if (!alignerImage) continue;
        cellCanvas = cropTemplateCell(i);
      } else {
        const dataUrl = draftedGlyphs[char];
        if (!dataUrl) continue; // Skip undrafted characters
        cellCanvas = await loadImageToCanvas(dataUrl);
      }
      
      const path = canvasToOpentypePath(cellCanvas);
      const glyph = new window.opentype.Glyph({
        name: char,
        unicode: char.charCodeAt(0),
        advanceWidth: 650,
        path: path
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
      glyphs: glyphsList
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



