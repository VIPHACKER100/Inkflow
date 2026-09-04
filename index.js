/* ───────────────────────────────────────────
   STATE — Global settings object
─────────────────────────────────────────── */
const S = {
  text: 'This is a sample note starting from the second line of the page. The first line has been skipped automatically as per your request.\n\nYou can continue writing your notes here, and the engine will handle the line spacing and page breaks while always skipping the top line of every new page.',
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
  isStudyMode: false,
  pageDates: {},
  pageNos: {},
  marginNotes: {},
  showHeaderBox: true,
  showMarginLabels: true,
};

/* Canvas pages array */
let pages = [];
let animFrameId = null;

let isAnimating = false;
let renderTimeout = null;

/* Annotations & Study Features State */
let parsedStickies = [];
let parsedCallouts = [];
let highlightRanges = [];
let activeFlashcards = [];
let currentFlashcardIndex = 0;
let activeNotebookId = null;


const TEMPLATE_SHEETS = {
  letters: [
    'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
    'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'
  ],
  symbols: [
    '0','1','2','3','4','5','6','7','8','9',
    ',','.','?','!','@','#','$','%','^','&','*',
    '(',')','-','_','+','=','/',':',';','\'','"'
  ]
};
const ALL_TEMPLATE_CHARS = [
  ...TEMPLATE_SHEETS.letters,
  ...TEMPLATE_SHEETS.symbols
];
let activeChar = 'A';
let activeSheet = 'letters';
let activeUploadSheet = 'letters';
const draftedGlyphs = {};
const alignerImages = { letters: null, symbols: null };
const gridConfigs = {
  letters: { gridX: 22, gridY: 36, gridW: 315, gridH: 315 },
  symbols: { gridX: 22, gridY: 36, gridW: 315, gridH: 315 }
};
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
  if (typeof syncAllEditorStyles === 'function') syncAllEditorStyles();
  if (document.fonts) {
    document.fonts.load(`${S.fontSize}px "${S.font}"`).then(() => {
      if (typeof syncAllEditorStyles === 'function') syncAllEditorStyles();
      debounceRender();
    }).catch(() => {
      if (typeof syncAllEditorStyles === 'function') syncAllEditorStyles();
      debounceRender();
    });
  } else {
    debounceRender();
  }
});
fontSelect.style.fontFamily = S.font;

const layoutSelect = document.getElementById('layout-select');
if (layoutSelect) {
  layoutSelect.addEventListener('change', () => {
    S.noteLayout = layoutSelect.value;
    if (typeof syncAllEditorStyles === 'function') syncAllEditorStyles();
    autosave();
    debounceRender();
  });
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
  // 1. Sync global text from active page editors if available
  if (typeof getGlobalTextFromEditors === 'function') {
    const editorText = getGlobalTextFromEditors();
    if (editorText && editorText.trim()) {
      S.text = editorText;
      const textInput = document.getElementById('text-input');
      if (textInput) textInput.value = editorText;
    }
  }

  const text = (S.text || '').trim();
  if (!text) return;

  const origFontSize = S.fontSize;

  // Determine target page count at current font size
  S.fontSize = origFontSize;
  const initialResult = layoutText(text);
  const targetPages = initialResult.pageCount || 1;

  let min = 12;
  let max = 48;
  let bestSize = origFontSize;

  // Binary search for optimum font size that fits cleanly into targetPages
  for (let i = 0; i < 7; i++) {
    const mid = Math.floor((min + max) / 2);
    S.fontSize = mid;
    const { pageCount } = layoutText(text);

    if (pageCount > targetPages) {
      max = mid - 1;
    } else {
      bestSize = mid;
      min = mid + 1;
    }
  }

  S.fontSize = bestSize;

  // Sync UI slider & label
  const slider = document.getElementById('font-size-slider');
  if (slider) slider.value = S.fontSize;
  const disp = document.getElementById('fs-val');
  if (disp) disp.textContent = S.fontSize;

  // Synchronize DOM page editors and margin overlays with the new font size & line spacing
  if (typeof syncAllEditorStyles === 'function') {
    syncAllEditorStyles();
  }

  debounceRender();
  autosave();
}

/* ───────────────────────────────────────────
   PHASE 5.1–5.6 — SLIDER CONTROLS
─────────────────────────────────────────── */
function syncAllEditorStyles() {
  pages.forEach((c, idx) => {
    const editor = document.getElementById('editor-' + (idx + 1));
    if (editor) {
      updateEditorStyles(editor, c);
    }
  });
}

function bindSlider(id, valId, key, parse = parseFloat, suffix = '') {
  const el = document.getElementById(id);
  const disp = document.getElementById(valId);
  if (!el || !disp) return;
  el.addEventListener('input', () => {
    S[key] = parse(el.value);
    disp.textContent = parse(el.value) + suffix;
    syncAllEditorStyles();
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
  syncAllEditorStyles();
  debounceRender();
});

function setInkPreset(hex, name) {
  S.inkColor = hex;
  inkColorInput.value = hex;
  document.getElementById('ink-color-label').textContent = hex + ' — ' + name;
  syncAllEditorStyles();
  debounceRender();
}

/* ───────────────────────────────────────────
   PHASE 5.7 — PAPER STYLE BUTTONS
─────────────────────────────────────────── */
function setPaper(btn) {
  document.querySelectorAll('.paper-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  S.paperStyle = btn.dataset.style;
  
  if (S.paperStyle === 'clean') {
    const cleanFonts = ['Kalam', 'Amita', 'Noto Sans Devanagari', 'Noto Serif Devanagari', 'Hind', 'Tiro Devanagari Hindi', 'Baloo 2', 'Martel', 'Roboto', 'Arial'];
    if (!cleanFonts.includes(S.font)) {
      S.font = 'Kalam';
      const fontSelect = document.getElementById('font-select');
      if (fontSelect) {
        fontSelect.value = 'Kalam';
        fontSelect.style.fontFamily = 'Kalam';
      }
    }
  }

  // Toggle worksheet header visibility based on paper style and header toggle checkbox state
  const showHeader = (S.paperStyle === 'ruled' || S.paperStyle === 'clean') && S.showHeaderBox !== false;
  document.querySelectorAll('.worksheet-header').forEach(wh => {
    wh.style.display = showHeader ? 'flex' : 'none';
  });

  const headerToggleContainer = document.getElementById('header-toggle-container');
  if (headerToggleContainer) {
    headerToggleContainer.style.display = (S.paperStyle === 'ruled' || S.paperStyle === 'clean') ? 'flex' : 'none';
  }

  // Sync theme select dropdown
  const themeSelect = document.getElementById('theme-select');
  if (themeSelect) {
    const matched = Object.keys(THEMES).find(k => THEMES[k].paperStyle === S.paperStyle);
    themeSelect.value = matched || 'default';
  }

  autosave();
  debounceRender();
}

/* ───────────────────────────────────────────
   TEXT VERTICAL ALIGNMENT CONTROL
─────────────────────────────────────────── */
function setTextAlignment(alignment) {
  S.textAlignment = alignment;
  
  // Update UI
  document.querySelectorAll('.align-btn').forEach(btn => {
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
   LINE CLICKING & CARET POSITIONING HELPERS
─────────────────────────────────────────── */
function setCursorAtLine(element, targetLineIndex) {
  if (!element) return;
  element.focus();

  const text = element.innerText || '';
  const lines = text.split('\n');
  if (targetLineIndex >= lines.length) targetLineIndex = lines.length - 1;
  if (targetLineIndex < 0) targetLineIndex = 0;

  let targetCharOffset = 0;
  for (let i = 0; i < targetLineIndex; i++) {
    targetCharOffset += lines[i].length + 1; // +1 for \n
  }
  targetCharOffset += lines[targetLineIndex].length;

  const sel = window.getSelection();
  const range = document.createRange();

  let currentOffset = 0;
  let placed = false;

  function walk(node) {
    if (placed) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const len = node.nodeValue.length;
      if (currentOffset + len >= targetCharOffset) {
        const pos = Math.min(targetCharOffset - currentOffset, len);
        range.setStart(node, pos);
        range.setEnd(node, pos);
        placed = true;
      } else {
        currentOffset += len;
      }
    } else if (node.nodeName === 'BR') {
      if (currentOffset >= targetCharOffset) {
        range.setStartBefore(node);
        range.setEndBefore(node);
        placed = true;
      } else {
        currentOffset += 1;
      }
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        walk(node.childNodes[i]);
        if (placed) return;
      }
    }
  }

  walk(element);

  if (!placed) {
    try {
      range.selectNodeContents(element);
      range.collapse(false);
    } catch (err) {}
  }

  try {
    sel.removeAllRanges();
    sel.addRange(range);
  } catch (err) {}
}

function handleLineClick(e, targetElement, canvas) {
  if (!canvas || !targetElement) return;
  const rect = canvas.getBoundingClientRect();
  const clickYInCanvas = (e.clientY - rect.top) * (PAGE_H / rect.height);

  const lineSpacingPx = S.fontSize * S.lineHeight;
  const alignOff = typeof getAlignmentOffset === 'function' ? getAlignmentOffset(S.textAlignment, S.fontSize, S.lineHeight) : 0;

  let topPadding = 0;
  const isCornell = S.noteLayout === 'cornell';
  const isTwoColumn = S.noteLayout === 'twocolumn';
  const firstLineBaseline = (isCornell || isTwoColumn)
    ? (S.margin + S.fontSize + lineSpacingPx + alignOff)
    : (S.margin + lineSpacingPx * 2 + alignOff);

  if (targetElement.classList.contains('margin-text-overlay')) {
    const marginFontSize = Math.max(11, Math.min(S.fontSize, 16));
    topPadding = Math.max(0, firstLineBaseline - marginFontSize * 0.82);
  } else {
    topPadding = Math.max(0, firstLineBaseline - S.fontSize * 0.82);
  }

  let targetLineIndex = Math.floor((clickYInCanvas - topPadding) / lineSpacingPx);
  if (targetLineIndex < 0) targetLineIndex = 0;

  const currentText = targetElement.innerText || '';
  const lines = currentText.split('\n');

  let textChanged = false;
  while (lines.length <= targetLineIndex) {
    lines.push('');
    textChanged = true;
  }

  if (textChanged) {
    targetElement.textContent = lines.join('\n');
    if (targetElement.classList.contains('page-editor')) {
      const globalText = getGlobalTextFromEditors();
      S.text = globalText;
      document.getElementById('text-input').value = globalText;
      autosave();
    }
    // Only set explicit line cursor if new lines were appended to reach an unwritten line
    setCursorAtLine(targetElement, targetLineIndex);
  }
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
  canvas.style.height = Math.min(PAGE_H, 720 * PAGE_H / PAGE_W) + 'px';

  const editor = document.createElement('div');
  editor.className = 'page-editor';
  editor.id = 'editor-' + pageNum;
  editor.contentEditable = 'true';
  editor.setAttribute('aria-label', 'Edit Page ' + pageNum);

  const worksheetHeader = document.createElement('div');
  worksheetHeader.className = 'worksheet-header';
  // Must match the rule in setPaper()/restoreState(): the canvas draws the
  // header box for both 'ruled' and 'clean' when showHeaderBox is enabled.
  worksheetHeader.style.display =
    (S.paperStyle === 'ruled' || S.paperStyle === 'clean') && S.showHeaderBox !== false ? 'flex' : 'none';

  const dateRow = document.createElement('div');
  dateRow.className = 'worksheet-field-row';

  const dateLabel = document.createElement('span');
  dateLabel.className = 'worksheet-label';
  dateLabel.textContent = 'Date :';

  const dateInput = document.createElement('input');
  dateInput.type = 'text';
  dateInput.id = 'date-input-' + pageNum;
  dateInput.className = 'worksheet-input-box';
  dateInput.setAttribute('aria-label', 'Date');
  dateInput.placeholder = 'Date';
  dateInput.value = S.pageDates[pageNum] || '';
  dateInput.style.color = 'transparent';
  dateInput.style.fontFamily = getFontStack(containsDevanagari(dateInput.value));

  dateRow.appendChild(dateLabel);
  dateRow.appendChild(dateInput);

  const pageRow = document.createElement('div');
  pageRow.className = 'worksheet-field-row';

  const pageLabel = document.createElement('span');
  pageLabel.className = 'worksheet-label';
  pageLabel.textContent = 'P. No. :';

  const pageInput = document.createElement('input');
  pageInput.type = 'text';
  pageInput.id = 'page-input-' + pageNum;
  pageInput.className = 'worksheet-input-box';
  pageInput.setAttribute('aria-label', 'Page number');
  pageInput.placeholder = 'P. No.';
  pageInput.value = S.pageNos[pageNum] !== undefined ? S.pageNos[pageNum] : pageNum;
  pageInput.style.color = 'transparent';
  pageInput.style.fontFamily = getFontStack(containsDevanagari(String(pageInput.value)));

  pageRow.appendChild(pageLabel);
  pageRow.appendChild(pageInput);

  worksheetHeader.appendChild(dateRow);
  worksheetHeader.appendChild(pageRow);

  // Focus/Blur/Input event listeners for Date Input
  dateInput.addEventListener('focus', () => {
    dateInput.style.color = S.inkColor;
    dateInput.style.fontFamily = getFontStack(containsDevanagari(dateInput.value));
    redrawPageCanvas(pageNum);
  });

  dateInput.addEventListener('blur', () => {
    dateInput.style.color = 'transparent';
    S.pageDates[pageNum] = dateInput.value;
    autosave();
    redrawPageCanvas(pageNum);
  });

  dateInput.addEventListener('input', () => {
    dateInput.style.fontFamily = getFontStack(containsDevanagari(dateInput.value));
    S.pageDates[pageNum] = dateInput.value;
    autosave();
  });

  // Focus/Blur/Input event listeners for Page Input
  pageInput.addEventListener('focus', () => {
    pageInput.style.color = S.inkColor;
    pageInput.style.fontFamily = getFontStack(containsDevanagari(pageInput.value));
    redrawPageCanvas(pageNum);
  });

  pageInput.addEventListener('blur', () => {
    pageInput.style.color = 'transparent';
    S.pageNos[pageNum] = pageInput.value;
    autosave();
    redrawPageCanvas(pageNum);
  });

  pageInput.addEventListener('input', () => {
    pageInput.style.fontFamily = getFontStack(containsDevanagari(pageInput.value));
    S.pageNos[pageNum] = pageInput.value;
    autosave();
  });

  // Focus: clear canvas text, preserve margin text, and enable overlay text in inkColor
  editor.addEventListener('focus', () => {
    const ctx = canvas.getContext('2d');
    drawPaperBackground(ctx, S.paperStyle, pageNum);
    drawMarginTextOnCanvas(ctx, pageNum);
    updateEditorStyles(editor, canvas);
  });

  // Blur: hide overlay text and redraw THIS page's canvas handwriting only
  editor.addEventListener('blur', () => {
    editor.style.color = 'transparent';
    redrawPageCanvas(pageNum);
  });

  // Input: concatenate all editor contents, sync to sidebar, and autosave
  editor.addEventListener('input', () => {
    const globalText = getGlobalTextFromEditors();
    S.text = globalText;
    document.getElementById('text-input').value = globalText;
    updateEditorStyles(editor, canvas);
    autosave();
  });

  // Click listener on main page editor
  editor.addEventListener('click', (e) => {
    handleLineClick(e, editor, canvas);
  });

  // Create margin text overlay for left side notes
  const marginText = document.createElement('div');
  marginText.className = 'margin-text-overlay';
  marginText.id = 'margin-' + pageNum;
  marginText.contentEditable = 'true';
  marginText.setAttribute('aria-label', 'Margin notes for Page ' + pageNum);
  marginText.setAttribute('placeholder', '📝');
  marginText.textContent = (S.marginNotes && S.marginNotes[pageNum]) ? S.marginNotes[pageNum] : '';
  marginText.style.fontFamily = getFontStack(containsDevanagari(marginText.innerText));

  // Focus: show editable overlay in inkColor; canvas keeps main text visible
  marginText.addEventListener('focus', () => {
    marginText.style.color = S.inkColor;
    marginText.style.caretColor = S.inkColor;
    // redrawPageCanvas draws paper + main text + margin text on canvas;
    // the DOM overlay is now visible on top so the user can edit it
    redrawPageCanvas(pageNum);
    updateEditorStyles(editor, canvas);
  });

  // Blur: hide overlay and redraw canvas handwriting (includes margin text)
  marginText.addEventListener('blur', () => {
    marginText.style.color = 'transparent';
    updateEditorStyles(editor, canvas);
    redrawPageCanvas(pageNum);
  });

  // Input: update font stack, autosave, and sync styles
  marginText.addEventListener('input', () => {
    if (!S.marginNotes) S.marginNotes = {};
    S.marginNotes[pageNum] = marginText.innerText;
    marginText.style.fontFamily = getFontStack(containsDevanagari(marginText.innerText));
    updateEditorStyles(editor, canvas);
    autosave();
  });

  // Click listener on margin overlay
  marginText.addEventListener('click', (e) => {
    handleLineClick(e, marginText, canvas);
  });

  container.appendChild(canvas);
  container.appendChild(editor);
  container.appendChild(marginText);
  wrapper.appendChild(label);
  wrapper.appendChild(container);
  wrapper.appendChild(worksheetHeader);

  document.getElementById('page-container').appendChild(wrapper);
  pages.push(canvas);
  updatePageNav();

  updateEditorStyles(editor, canvas);

  return canvas;
}

function drawMarginTextOnCanvas(ctx, pageNum) {
  const marginTextEl = document.getElementById('margin-' + pageNum);
  if (!marginTextEl) return;
  if (document.activeElement === marginTextEl) return;
  const rawText = marginTextEl.innerText;
  if (!rawText || !rawText.trim()) return;

  const isCornell = S.noteLayout === 'cornell';
  const marginStartX = 8;
  const maxMarginRight = isCornell ? 214 : (S.margin - 18);
  const marginFontSize = Math.max(11, Math.min(S.fontSize, 16));

  const lineH = S.fontSize * S.lineHeight;
  const alignOff = typeof getAlignmentOffset === 'function' ? getAlignmentOffset(S.textAlignment, S.fontSize, S.lineHeight) : 0;

  const paragraphs = rawText.split('\n');
  let currentYIdx = 0;

  ctx.save();
  for (let pi = 0; pi < paragraphs.length; pi++) {
    const para = paragraphs[pi];
    if (pi > 0) {
      currentYIdx++;
    }
    if (!para) continue;

    const words = para.split(' ');
    let x = marginStartX;

    for (let wi = 0; wi < words.length; wi++) {
      const word = words[wi];
      if (!word) {
        if (wi < words.length - 1) x += ctx.measureText(' ').width + S.wordSpacing;
        continue;
      }

      const isIndic = containsDevanagari(word);
      const fontStack = getFontStack(isIndic);

      ctx.font = `${marginFontSize}px ${fontStack}`;
      const wordWidth = ctx.measureText(word).width;

      // Word wrap check if word exceeds margin bounds
      if (x + wordWidth > maxMarginRight && x > marginStartX) {
        x = marginStartX;
        currentYIdx++;
      }

      const graphemes = getGraphemes(word);
      const isUltraLongWord = ctx.measureText(word).width > (maxMarginRight - marginStartX);

      for (let ci = 0; ci < graphemes.length; ci++) {
        const ch = graphemes[ci];
        const v = getCharVariation(S.rotationMax, S.pressure, marginFontSize);

        ctx.font = `${marginFontSize}px ${fontStack}`;
        const charWidth = ctx.measureText(ch).width + v.spacingExtra;

        // Char wrap check if single word exceeds full margin width
        if (isUltraLongWord && x + charWidth > maxMarginRight && x > marginStartX) {
          x = marginStartX;
          currentYIdx++;
        }

        const isTwoColumn = S.noteLayout === 'twocolumn';
        const marginFirstLineOffset = (isCornell || isTwoColumn) ? (S.margin + S.fontSize + lineH) : (S.margin + 2 * lineH);
        const y = marginFirstLineOffset + currentYIdx * lineH + alignOff;

        ctx.save();
        ctx.translate(x, y + v.baselineOff);
        ctx.rotate((v.tiltDeg * (isIndic ? 0.3 : 1) * Math.PI) / 180);
        ctx.scale(v.scaleX, v.scaleY);

        const pxSize = marginFontSize * v.pressureMod;
        ctx.font = `${Math.max(9, pxSize)}px ${fontStack}`;
        ctx.globalAlpha = v.opacity;
        if (S.paperStyle !== 'clean' && S.bleed > 0.05) {
          ctx.shadowColor = S.shadowColor || S.inkColor;
          ctx.shadowBlur = S.bleed * 1.4;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.fillStyle = S.inkColor;
        ctx.fillText(ch, 0, 0);
        ctx.restore();

        x += charWidth;
      }

      // Add space after word
      ctx.font = `${marginFontSize}px ${fontStack}`;
      x += ctx.measureText(' ').width + S.wordSpacing;
    }
  }

  ctx.restore();
}

function redrawPageCanvas(pageNum) {
  const canvas = pages[pageNum - 1];
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // 1. Draw paper background (passing the page index so it paints Date & P.No.)
  drawPaperBackground(ctx, S.paperStyle, pageNum);

  // 2. Pre-process text and layout to get characters queue
  const textInputVal = document.getElementById('text-input').value;
  if (textInputVal.trim()) {
    const { cleanText } = parseRichSyntax(sanitizeText(textInputVal));
    const { queue } = layoutText(cleanText || textInputVal);

    // 3. Draw characters for this specific page
    const answerLineItems = (S.showMarginLabels !== false && S.noteLayout === 'standard')
      ? collectAnswerLineItems(queue)
      : null;
    queue.forEach((item) => {
      if (item.pageIdx !== pageNum - 1) return;
      if (item.isSticky || item.isCallout) return;
      if (answerLineItems && answerLineItems.has(item)) return;

      // Draw highlight
      if (item.highlight) {
        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = S._highlightColor || '#ffe066';
        const hlFs = item.fontSize || S.fontSize;
        const hlW = hlFs * 0.7;
        const hlH = hlFs * 1.3;
        ctx.fillRect(item.x - 1, item.y - hlFs * 0.85, hlW, hlH);
        ctx.restore();
      }

      const v = item.v;
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate((v.tiltDeg * (item.isIndic ? 0.3 : 1) * Math.PI) / 180);
      ctx.scale(v.scaleX, v.scaleY);

      // In clean mode, bypass custom drafted glyphs
      const useGlyph = S.paperStyle !== 'clean' && draftedGlyphs[item.ch];
      if (useGlyph) {
        const glyphImg = getCachedGlyphImage(item.ch, draftedGlyphs[item.ch]);
        if (glyphImg) {
          ctx.globalAlpha = v.opacity;
          const drawSz = S.fontSize * 1.35;
          ctx.drawImage(glyphImg, -drawSz / 2, -drawSz / 2, drawSz, drawSz);
        } else {
          const fontSize = item.fontSize || S.fontSize;
          const weight = item.isBold ? 'bold ' : '';
          const pxSize = fontSize * v.pressureMod;
          ctx.font = `${weight}${Math.max(10, pxSize)}px ${item.fontStack}`;
          ctx.globalAlpha = v.opacity;
          ctx.fillStyle = S.inkColor;
          ctx.fillText(item.ch, 0, 0);
        }
      } else {
        const fontSize = item.fontSize || S.fontSize;
        const weight = item.isBold ? 'bold ' : '';
        const pxSize = fontSize * v.pressureMod;
        ctx.font = `${weight}${Math.max(10, pxSize)}px ${item.fontStack}`;
        ctx.globalAlpha = v.opacity;
        if (S.paperStyle !== 'clean' && S.bleed > 0.05) {
          ctx.shadowColor = S.shadowColor || S.inkColor;
          ctx.shadowBlur = S.bleed * 1.4;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.fillStyle = S.inkColor;
        ctx.fillText(item.ch, 0, 0);
      }
      ctx.restore();
    });

    // 4. Draw stickies and callouts for this page
    paintStickyNotes(queue, pageNum - 1);
    paintCallouts(queue, pageNum - 1);
    if (S.showMarginLabels !== false && S.noteLayout === 'standard') {
      drawMarginQuestionLabels(queue, pageNum - 1);
    }
  }

  // 5. Draw left margin text for this page
  drawMarginTextOnCanvas(ctx, pageNum);
}

function updateEditorStyles(editor, canvas) {
  if (!editor || !canvas) return;
  const actualWidth = canvas.offsetWidth || parseFloat(canvas.style.width) || PAGE_W;
  const scale = actualWidth / PAGE_W;
  const lineSpacingPx = S.fontSize * S.lineHeight;
  const alignOff = typeof getAlignmentOffset === 'function' ? getAlignmentOffset(S.textAlignment, S.fontSize, S.lineHeight) : 0;

  const isCornell = S.noteLayout === 'cornell';
  const isTwoColumn = S.noteLayout === 'twocolumn';

  // Calculate top padding so DOM text baseline sits exactly on the paper ruled line / canvas render baseline
  // Standard & clean standard start on line 2 baseline (S.margin + lineSpacingPx * 2)
  const firstLineBaseline = (isCornell || isTwoColumn)
    ? (S.margin + S.fontSize + lineSpacingPx + alignOff)
    : (S.margin + lineSpacingPx * 2 + alignOff);
  const topPadding = Math.max(0, firstLineBaseline - S.fontSize * 0.82);

  const leftPad = isCornell ? 230 : S.margin;
  const marginWidth = isCornell ? 220 : (S.margin - 10);

  editor.style.fontFamily = getFontStack(containsDevanagari(editor.innerText));
  editor.style.fontSize = (S.fontSize * scale) + 'px';
  editor.style.lineHeight = (lineSpacingPx * scale) + 'px';
  editor.style.paddingTop = (topPadding * scale) + 'px';
  editor.style.paddingLeft = (leftPad * scale) + 'px';
  editor.style.paddingRight = (S.margin * scale) + 'px';
  editor.style.paddingBottom = (S.margin * scale) + 'px';
  editor.style.wordSpacing = (S.wordSpacing * scale) + 'px';
  editor.style.fontStyle = 'normal';

  if (document.activeElement === editor) {
    editor.style.color = S.inkColor;
  } else {
    editor.style.color = 'transparent';
  }
  editor.style.caretColor = S.inkColor;

  // Align left margin overlay text lines with right-hand side paper lines & font style
  const pageId = editor.id ? editor.id.replace('editor-', '') : null;
  if (pageId) {
    const marginText = document.getElementById('margin-' + pageId);
    if (marginText) {
      const marginFontSize = Math.max(11, Math.min(S.fontSize, 16));
      const marginFirstLineBaseline = (isCornell || isTwoColumn)
        ? (S.margin + S.fontSize + lineSpacingPx + alignOff)
        : (S.margin + lineSpacingPx * 2 + alignOff);
      const marginTopPadding = Math.max(0, marginFirstLineBaseline - marginFontSize * 0.82);

      marginText.style.fontFamily = getFontStack(containsDevanagari(marginText.innerText));
      marginText.style.fontSize = (marginFontSize * scale) + 'px';
      marginText.style.lineHeight = (lineSpacingPx * scale) + 'px';
      marginText.style.paddingTop = (marginTopPadding * scale) + 'px';
      marginText.style.paddingLeft = (8 * scale) + 'px';
      marginText.style.paddingRight = '2px';
      marginText.style.width = Math.max(20, marginWidth * scale) + 'px';
      marginText.style.wordSpacing = (S.wordSpacing * scale) + 'px';
      marginText.style.fontStyle = 'normal';
      if (document.activeElement === marginText) {
        marginText.style.color = S.inkColor;
      } else {
        marginText.style.color = 'transparent';
      }
      marginText.style.caretColor = S.inkColor;
    }
  }
}

function getGlobalTextFromEditors() {
  const editors = document.querySelectorAll('.page-editor');
  const parts = [];
  editors.forEach((editor) => {
    // Editors are written via textContent and rendered with pre-wrap, so
    // innerText round-trips 1:1 — reading it live keeps in-flight user edits
    // (typing, deletions) in sync instead of reverting to the last render.
    let t = editor.innerText;
    if (t.endsWith('\n')) {
      t = t.slice(0, -1);
    }
    parts.push(t);
  });
  // Pages must be joined with a newline, otherwise the last word of one
  // page fuses with the first word of the next when syncing editor text.
  return parts.join('\n');
}

window.addEventListener('resize', () => {
  pages.forEach((c, idx) => {
    const editor = document.getElementById('editor-' + (idx + 1));
    if (editor) {
      updateEditorStyles(editor, c);
    }
  });
});


/* ───────────────────────────────────────────
   PHASE 4.2 — PAPER BACKGROUND RENDERER
─────────────────────────────────────────── */
function drawLayoutDecorations(ctx, noteLayout) {
  if (noteLayout !== 'cornell') return;
  const w = PAGE_W, h = PAGE_H;
  ctx.save();
  ctx.strokeStyle = S.inkColor;
  ctx.lineWidth = 1.0;
  ctx.globalAlpha = 0.35; // Faint divider line

  // Vertical line at x = 230px
  ctx.beginPath();
  ctx.moveTo(230, S.margin - 20);
  ctx.lineTo(230, h - 190);
  ctx.stroke();

  // Horizontal line at y = h - 190px
  ctx.beginPath();
  ctx.moveTo(S.margin - 20, h - 190);
  ctx.lineTo(w - S.margin + 20, h - 190);
  ctx.stroke();

  // Section titles: "Cues", "Notes", "Summary"
  ctx.fillStyle = S.inkColor;
  ctx.globalAlpha = 0.5;
  ctx.font = `italic bold 11px sans-serif`;
  ctx.fillText('Cues / Questions', S.margin, S.margin - 10);
  ctx.fillText('Main Notes', 250, S.margin - 10);
  ctx.fillText('Summary', S.margin, h - 200);

  ctx.restore();
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawPaperBackground(ctx, style, pageNum = 1) {
  const w = PAGE_W, h = PAGE_H;
  ctx.clearRect(0, 0, w, h);

  // Paper colors per style
  const configs = {
    ruled: { bg: '#faf9f5', lineColor: '#85add4', lineOpacity: 0.65, redLine: '#ff4d6d' },
    clean: { bg: '#faf9f5', lineColor: '#85add4', lineOpacity: 0.65, redLine: '#ff4d6d' },
    plain: { bg: '#faf7f0', lineColor: null },
    grid: { bg: '#f6f2ec', lineColor: '#c0b49a', lineOpacity: 0.35 },
    legal: { bg: '#fef9c3', lineColor: '#c8b820', lineOpacity: 0.45, redLine: '#e07070' },
    vintage: { bg: '#f2e8ce', lineColor: '#b8a080', lineOpacity: 0.4 },
    dark: { bg: '#1a1a2e', lineColor: '#3a3a5e', lineOpacity: 0.7 },
    dot_grid: { bg: '#f6f2ec', lineColor: '#c0b49a', lineOpacity: 0.35 },
    engineering: { bg: '#eef6ed', lineColor: '#78a67d', lineOpacity: 0.4 },
    music: { bg: '#faf7f0', lineColor: '#4a4a4a', lineOpacity: 0.55 },
  };

  const c = configs[style] || configs.ruled;

  // Fill background
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle paper texture (noise-like grain using very small rects)
  if (style !== 'dark' && style !== 'clean') {
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

  if (style === 'ruled' || style === 'clean') {
    // Ruled paper (Classmate-style)
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = c.redLine || '#ff4d6d';
    ctx.lineWidth = 1.0;

    // Double vertical red lines (separated by 4px)
    ctx.beginPath();
    ctx.moveTo(S.margin - 10, 0);
    ctx.lineTo(S.margin - 10, h);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(S.margin - 14, 0);
    ctx.lineTo(S.margin - 14, h);
    ctx.stroke();

    // Double horizontal red lines (separated by 4px)
    ctx.beginPath();
    ctx.moveTo(0, S.margin);
    ctx.lineTo(w, S.margin);
    ctx.stroke();

    // Double horizontal red lines (separated by 4px)
    ctx.beginPath();
    ctx.moveTo(0, S.margin - 4);
    ctx.lineTo(w, S.margin - 4);
    ctx.stroke();

    ctx.restore();

    if (S.showHeaderBox !== false) {
      // Date & P. No. box in top-right header area
      ctx.save();
      ctx.strokeStyle = c.redLine || '#ff4d6d';
      ctx.fillStyle = c.redLine || '#ff4d6d';
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 1.2;

      const boxW = 145;
      const boxH = 42;
      const boxX = w - boxW - 30;
      const boxY = 20;

      // Draw the box
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 6);
      ctx.stroke();

      // Draw horizontal dividing line in the middle of the box
      ctx.beginPath();
      ctx.moveTo(boxX, boxY + boxH / 2);
      ctx.lineTo(boxX + boxW, boxY + boxH / 2);
      ctx.stroke();

      // Draw Date and P. No. text inside the box
      ctx.font = 'bold 9px sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText('DATE:', boxX + 8, boxY + boxH / 4);
      ctx.fillText('P. NO.:', boxX + 8, boxY + 3 * boxH / 4);

      // Draw thin line for writing date and page number
      ctx.lineWidth = 0.6;
      ctx.globalAlpha = 0.4;
      // Date line
      ctx.beginPath();
      ctx.moveTo(boxX + 42, boxY + boxH / 4 + 3);
      ctx.lineTo(boxX + boxW - 8, boxY + boxH / 4 + 3);
      ctx.stroke();
      // P. No. line
      ctx.beginPath();
      ctx.moveTo(boxX + 48, boxY + 3 * boxH / 4 + 3);
      ctx.lineTo(boxX + boxW - 8, boxY + 3 * boxH / 4 + 3);
      ctx.stroke();

      ctx.restore();

      // Render handwriting inside the box (only if NOT focused)
      const dateInput = document.getElementById('date-input-' + pageNum);
      const pageInput = document.getElementById('page-input-' + pageNum);
      
      const isDateFocused = dateInput && (document.activeElement === dateInput);
      const isPageFocused = pageInput && (document.activeElement === pageInput);

      const dateText = S.pageDates[pageNum] !== undefined ? S.pageDates[pageNum] : '';
      const pageText = S.pageNos[pageNum] !== undefined ? S.pageNos[pageNum] : pageNum;

      if (dateText && !isDateFocused) {
        ctx.save();
        ctx.fillStyle = S.inkColor;
        const isIndic = containsDevanagari(dateText);
        ctx.font = `italic ${Math.max(12, S.fontSize * 0.62)}px ${getFontStack(isIndic)}`;
        ctx.textBaseline = 'middle';
        ctx.translate(boxX + 44, boxY + boxH / 4 - 1);
        ctx.rotate(-1.2 * Math.PI / 180); // Small realistic handwriting angle
        ctx.fillText(dateText, 0, 0);
        ctx.restore();
      }

      if (pageText !== undefined && pageText !== '' && !isPageFocused) {
        ctx.save();
        ctx.fillStyle = S.inkColor;
        const isIndic = containsDevanagari(String(pageText));
        ctx.font = `italic ${Math.max(12, S.fontSize * 0.62)}px ${getFontStack(isIndic)}`;
        ctx.textBaseline = 'middle';
        ctx.translate(boxX + 50, boxY + 3 * boxH / 4 - 1);
        ctx.rotate(1.0 * Math.PI / 180); // Small realistic handwriting angle
        ctx.fillText(String(pageText), 0, 0);
        ctx.restore();
      }
    }

    // Horizontal ruled lines (blue/cyan)
    ctx.save();
    ctx.globalAlpha = c.lineOpacity;
    ctx.strokeStyle = c.lineColor || '#85add4';
    ctx.lineWidth = 0.8;
    const lineSpacingPx = S.fontSize * S.lineHeight;
    for (let y = S.margin + lineSpacingPx; y < h - 20; y += lineSpacingPx) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();

  } else if (style === 'legal') {
    // Red margin line
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = c.redLine || '#e07070';
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
    const gridSz = S.fontSize * S.lineHeight;
    // Align with S.margin for clean layout
    for (let x = S.margin; x < w; x += gridSz) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let x = S.margin - gridSz; x > 0; x -= gridSz) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = S.margin; y < h; y += gridSz) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    for (let y = S.margin - gridSz; y > 0; y -= gridSz) {
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

  if (style === 'dot_grid') {
    ctx.save();
    ctx.fillStyle = c.lineColor || '#c0b49a';
    ctx.globalAlpha = c.lineOpacity;
    const dotSz = S.fontSize * S.lineHeight;
    for (let x = S.margin; x < w; x += dotSz) {
      for (let y = S.margin; y < h; y += dotSz) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (let x = S.margin - dotSz; x > 0; x -= dotSz) {
      for (let y = S.margin; y < h; y += dotSz) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  if (style === 'engineering') {
    ctx.save();
    ctx.strokeStyle = c.lineColor || '#78a67d';
    const majorSize = S.fontSize * S.lineHeight;
    const minorSize = majorSize / 5;

    // Draw minor lines
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 0.4;
    for (let x = S.margin; x < w; x += minorSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let x = S.margin - minorSize; x > 0; x -= minorSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = S.margin; y < h; y += minorSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    for (let y = S.margin - minorSize; y > 0; y -= minorSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Draw major lines
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 0.8;
    for (let x = S.margin; x < w; x += majorSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let x = S.margin - majorSize; x > 0; x -= majorSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = S.margin; y < h; y += majorSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    for (let y = S.margin - majorSize; y > 0; y -= majorSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Margins
    ctx.strokeStyle = '#a66858'; // Reddish-brown
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(S.margin - 10, 0); ctx.lineTo(S.margin - 10, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, S.margin); ctx.lineTo(w, S.margin); ctx.stroke();
    ctx.restore();
  }

  if (style === 'music') {
    ctx.save();
    ctx.strokeStyle = c.lineColor || '#4a4a4a';
    ctx.lineWidth = 0.8;
    const baseSpacing = S.fontSize * S.lineHeight;
    const lineSpacing = baseSpacing * (8 / 33);
    const staffSpacing = baseSpacing * (72 / 33);
    const startY = S.margin;
    ctx.globalAlpha = c.lineOpacity;

    for (let y = startY; y < h - 80; y += staffSpacing) {
      // Draw 5 staff lines
      for (let i = 0; i < 5; i++) {
        const ly = y + i * lineSpacing;
        ctx.beginPath();
        ctx.moveTo(S.margin - 20, ly);
        ctx.lineTo(w - S.margin + 20, ly);
        ctx.stroke();
      }
      // Vertical bracket lines at start and end of staff
      ctx.beginPath();
      ctx.moveTo(S.margin - 20, y);
      ctx.lineTo(S.margin - 20, y + 4 * lineSpacing);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(w - S.margin + 20, y);
      ctx.lineTo(w - S.margin + 20, y + 4 * lineSpacing);
      ctx.stroke();
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

  // Draw Layout Decorations (Cornell, etc.)
  drawLayoutDecorations(ctx, S.noteLayout);
}

/* ───────────────────────────────────────────
   PHASE 4.3 — PER-CHARACTER VARIATION ENGINE
   All offsets scale proportionally with fontSize
   so the handwriting looks natural at any size.
─────────────────────────────────────────── */
function getCharVariation(rotMax, pressure, fontSize) {
  const rand = (min, max) => min + Math.random() * (max - min);
  // Scale factor: at 22px baseline, factors equal ~1.0
  const k = (fontSize || 22) / 22;
  return {
    tiltDeg: rand(-rotMax, rotMax),
    scaleY: rand(0.97, 1.03),
    scaleX: rand(0.98, 1.02),
    baselineOff: rand(-0.4, 0.4) * k,
    spacingExtra: rand(-0.4, 0.6) * k,
    pressureMod: 1 - (Math.random() * pressure * 1.4),  // stroke weight variation
    opacity: rand(0.92, 1.0),
  };
}

/* ───────────────────────────────────────────
   PHASE 4.1–4.8 — CLEAR & INIT PAGES
─────────────────────────────────────────── */

/* Get vertical alignment offset based on text alignment setting */
function getAlignmentOffset(alignment, fontSize, lineHeight) {
  const lineH = fontSize * lineHeight;
  
  switch (alignment) {
    case 'top':
      // Upper: Text touches upper line (shift baseline up towards top line)
      return -(lineH * 0.62);
    case 'bottom':
      // Lower: Text baseline sits directly on the lower line
      return 0;
    case 'middle':
    default:
      // Middle: Text centered vertically between upper and lower lines
      return -(lineH * 0.32);
  }
}

function clearPages() {
  pages = [];
  S.currentPage = 0;
  document.getElementById('page-container').innerHTML = '';
  updatePageNav();
}

function clearText() {
  document.getElementById('text-input').value = '';
  S.text = '';
  S.marginNotes = {};
  clearPages();
  const canvas = createPage(1);
  drawPaperBackground(canvas.getContext('2d'), S.paperStyle, 1);
  const editor = document.getElementById('editor-1');
  if (editor) {
    editor.textContent = '';
    updateEditorStyles(editor, canvas);
  }
  const marginText = document.getElementById('margin-1');
  if (marginText) {
    marginText.textContent = '';
  }
  autosave();
}

/* ───────────────────────────────────────────
   PHASE 4.4 — HELPER FUNCTIONS
─────────────────────────────────────────── */
function sanitizeText(str) {
  if (!str) return '';
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uE000-\uF8FF]/g, '');
}

/* ───────────────────────────────────────────
   SYNTAX PARSING & PREPROCESSING FOR STUDY TOOLS
─────────────────────────────────────────── */
function parseRichSyntax(rawText) {
  // When handed already-processed text (it contains \uFFF0/\uFFF1 placeholders),
  // a second pass would reset parsedStickies/parsedCallouts/highlightRanges that
  // the first pass populated — layoutText() re-invokes this parser internally, so
  // without this guard sticky notes, callouts, and highlights would never render.
  if (rawText && (rawText.includes('\uFFF0') || rawText.includes('\uFFF1'))) {
    return { cleanText: rawText, flashcards: activeFlashcards };
  }

  parsedStickies = [];
  parsedCallouts = [];
  highlightRanges = [];
  activeFlashcards = [];
  
  if (!rawText) return { cleanText: '', flashcards: [] };
  
  // 1. Extract Flashcards: Q: and A:
  const lines = rawText.split('\n');
  let currentQ = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^(Q|q)\s*:/i.test(line)) {
      currentQ = line.replace(/^(Q|q)\s*:/i, '').trim();
    } else if (/^(A|a)\s*:/i.test(line) && currentQ) {
      const currentA = line.replace(/^(A|a)\s*:/i, '').trim();
      activeFlashcards.push({ q: currentQ, a: currentA });
      currentQ = null;
    }
  }
  
  // Update flashcards indicator UI
  const fcBtn = document.getElementById('btn-open-flashcards');
  const fcIndicator = document.getElementById('flashcard-count-indicator');
  if (fcBtn && fcIndicator) {
    if (activeFlashcards.length > 0) {
      fcBtn.style.display = 'inline-flex';
      fcIndicator.textContent = activeFlashcards.length;
    } else {
      fcBtn.style.display = 'none';
    }
  }

  // 2. Parse Sticky Notes: [sticky:color] content [sticky]
  let textWithStickies = rawText.replace(/\[sticky:?(\w*)\](.*?)\[sticky\]/gs, (match, color, content) => {
    parsedStickies.push({
      color: color || 'yellow',
      text: content.trim()
    });
    return '\uFFF0';
  });

  // 3. Parse Callouts: [callout:type] content [callout]
  let textWithCallouts = textWithStickies.replace(/\[callout:?(\w*)\](.*?)\[callout\]/gs, (match, type, content) => {
    parsedCallouts.push({
      type: type || 'info',
      text: content.trim()
    });
    return '\uFFF1';
  });

  // 4. Parse Highlights: ==content==
  let cleanText = '';
  let i = 0;
  let inHighlight = false;
  let highlightStart = -1;

  while (i < textWithCallouts.length) {
    if (textWithCallouts.startsWith('==', i)) {
      if (inHighlight) {
        highlightRanges.push({
          start: highlightStart,
          end: cleanText.length
        });
        inHighlight = false;
      } else {
        highlightStart = cleanText.length;
        inHighlight = true;
      }
      i += 2;
    } else {
      cleanText += textWithCallouts[i];
      i++;
    }
  }

  if (inHighlight) {
    highlightRanges.push({
      start: highlightStart,
      end: cleanText.length
    });
  }

  return { cleanText, flashcards: activeFlashcards };
}

function splitRawTextIntoPages(rawText, cleanPageTexts) {
  if (!rawText) return [];
  const rawPages = [];
  let rawIdx = 0;

  for (let p = 0; p < cleanPageTexts.length; p++) {
    const cleanPage = cleanPageTexts[p];
    if (!cleanPage) {
      rawPages.push('');
      continue;
    }

    let matchedClean = '';
    let pageRaw = '';

    while (rawIdx < rawText.length && matchedClean.length < cleanPage.length) {
      const rawChar = rawText[rawIdx];
      const cleanChar = cleanPage[matchedClean.length];

      if (rawChar === cleanChar) {
        pageRaw += rawChar;
        matchedClean += cleanChar;
        rawIdx++;
      } else {
        pageRaw += rawChar;
        rawIdx++;
      }
    }

    if (p < cleanPageTexts.length - 1) {
      const nextCleanStart = cleanPageTexts[p + 1][0];
      while (rawIdx < rawText.length && rawText[rawIdx] !== nextCleanStart) {
        pageRaw += rawText[rawIdx];
        rawIdx++;
      }
    } else {
      while (rawIdx < rawText.length) {
        pageRaw += rawText[rawIdx];
        rawIdx++;
      }
    }

    rawPages.push(pageRaw);
  }

  return rawPages;
}

/* ───────────────────────────────────────────
   CANVAS DRAWING OF STICKY NOTES & CALLOUTS
─────────────────────────────────────────── */
function paintStickyNotes(queue, targetPageIdx = null) {
  const stickies = parsedStickies;
  if (!stickies || stickies.length === 0) return;

  queue.forEach((item) => {
    if (!item.isSticky) return;
    if (targetPageIdx !== null && item.pageIdx !== targetPageIdx) return;
    const canvas = pages[item.pageIdx];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const sticky = stickies[item.stickyIdx];
    if (!sticky) return;

    // Sticky colors mapping
    const colors = {
      yellow: { bg: '#fffde7', border: '#fff59d', text: '#5d4037' },
      cyan: { bg: '#e0f7fa', border: '#b2ebf2', text: '#006064' },
      pink: { bg: '#fce4ec', border: '#f8bbd0', text: '#880e4f' },
      mint: { bg: '#e8f5e9', border: '#c8e6c9', text: '#1b5e20' }
    };
    const c = colors[sticky.color.toLowerCase()] || colors.yellow;

    ctx.save();
    
    // Deterministic position and tilt
    const hash = (item.x * 3 + item.y * 7) % 100;
    const x = PAGE_W - 165 + (hash % 10 - 5); // float in right margin
    const y = item.y - 30 + (hash % 6 - 3);
    const tilt = ((hash % 8) - 4) * Math.PI / 180;

    ctx.translate(x + 65, y + 55);
    ctx.rotate(tilt);

    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;

    // Sticky paper box
    ctx.fillStyle = c.bg;
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-65, -55, 130, 110, 4);
    ctx.fill();
    ctx.stroke();

    // Turn off shadow for text
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Text drawing
    ctx.fillStyle = c.text;
    ctx.font = `11px "Caveat", "Indie Flower", "Shadows Into Light", sans-serif`;
    ctx.textAlign = 'left';

    drawWrappedText(ctx, sticky.text, -55, -35, 110, 14, 6);

    ctx.restore();
  });
}

function paintCallouts(queue, targetPageIdx = null) {
  const callouts = parsedCallouts;
  if (!callouts || callouts.length === 0) return;

  queue.forEach((item) => {
    if (!item.isCallout) return;
    if (targetPageIdx !== null && item.pageIdx !== targetPageIdx) return;
    const canvas = pages[item.pageIdx];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const callout = callouts[item.calloutIdx];
    if (!callout) return;

    const types = {
      warning: { bg: '#fff3e0', border: '#ffe0b2', text: '#e65100', icon: '⚠️' },
      info: { bg: '#e3f2fd', border: '#bbdefb', text: '#0d47a1', icon: 'ℹ️' },
      formula: { bg: '#f3e5f5', border: '#e1bee7', text: '#4a148c', icon: '📐' }
    };
    const c = types[callout.type.toLowerCase()] || types.info;

    ctx.save();
    
    // Left margin tag placement
    const hash = (item.x * 2 + item.y * 5) % 100;
    const x = 12 + (hash % 6 - 3);
    const y = item.y - 25;
    const tilt = ((hash % 4) - 2) * Math.PI / 180;

    ctx.translate(x + 75, y + 25);
    ctx.rotate(tilt);

    // Box outline
    ctx.fillStyle = c.bg;
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-75, -25, 150, 50, 6);
    ctx.fill();
    ctx.stroke();

    // Draw icon
    ctx.font = '14px sans-serif';
    ctx.fillText(c.icon, -65, 5);

    // Draw text
    ctx.fillStyle = c.text;
    ctx.font = `10px "Caveat", "Indie Flower", sans-serif`;
    ctx.textAlign = 'left';
    drawWrappedText(ctx, callout.text, -45, -10, 110, 12, 3);

    ctx.restore();
  });
}

/* ───────────────────────────────────────────
   MARGIN LABELS — question numbers and
   "Ans" markers drawn in the left margin,
   aligned with their lines on the page.
─────────────────────────────────────────── */
function clusterQueueLines(queue) {
  const byPage = new Map();
  for (const it of queue) {
    if (!byPage.has(it.pageIdx)) byPage.set(it.pageIdx, []);
    byPage.get(it.pageIdx).push(it);
  }

  const lineTol = S.fontSize * S.lineHeight * 0.5;
  const clusters = [];
  for (const [pageIdx, items] of byPage) {
    items.sort((a, b) => a.y - b.y || a.x - b.x);
    let cluster = [];
    for (const it of items) {
      // Wobble keeps same-line y within ~1px, so half a line separates rows
      if (cluster.length > 0 && it.y - cluster[cluster.length - 1].y > lineTol) {
        clusters.push({ pageIdx, items: cluster });
        cluster = [];
      }
      cluster.push(it);
    }
    if (cluster.length > 0) clusters.push({ pageIdx, items: cluster });
  }
  return clusters;
}

const ANSWER_LINE_RE = /^answer:?$/i;

function collectAnswerLineItems(queue) {
  // "Answer:" lines are represented on canvas by the margin "Ans" label;
  // the text itself stays visible in the editors.
  const hidden = new Set();
  if (S.noteLayout !== 'standard') return hidden;
  for (const { items } of clusterQueueLines(queue)) {
    items.sort((a, b) => a.x - b.x);
    if (Math.abs(items[0].x - S.margin) > 2) continue;
    const lineText = items.map(i => i.ch).join('');
    if (ANSWER_LINE_RE.test(lineText)) items.forEach(i => hidden.add(i));
  }
  return hidden;
}

function drawMarginQuestionLabels(queue, onlyPageIdx = null) {
  for (const { pageIdx, items } of clusterQueueLines(queue)) {
    if (onlyPageIdx !== null && pageIdx !== onlyPageIdx) continue;
    items.sort((a, b) => a.x - b.x);
    // Only lines that START at the left margin (not wrapped continuations)
    if (Math.abs(items[0].x - S.margin) > 2) continue;

    // The queue holds no space characters, so joined line text is squashed
    // ("1.Whatare…"). Questions end with '?' — numbered sub-points don't.
    const lineText = items.map(i => i.ch).join('');
    const qMatch = lineText.match(/^(\d+)\.\s*\S.*\?\s*$/);
    const isAnswer = ANSWER_LINE_RE.test(lineText);
    if (!qMatch && !isAnswer) continue;

    const canvas = pages[pageIdx];
    if (!canvas) continue;
    const ctx = canvas.getContext('2d');
    const label = qMatch ? 'Q' + qMatch[1] : 'Ans';
    // "Ans" sits one line down: its own row (the hidden "Answer:" slot) is
    // blank, so the label aligns with the first line of the answer content
    const anchorY = qMatch
      ? items[0].y
      : items[0].y + S.fontSize * S.lineHeight;
    // Optical centering: a text line's ink center sits slightly ABOVE its
    // baseline, so the label baseline is raised a touch (−0.15 × font size)
    const labelFont = Math.max(13, Math.round(S.fontSize * 0.78));
    ctx.save();
    ctx.font = `bold ${labelFont}px ${items[0].fontStack || S.font}`;
    ctx.fillStyle = S.inkColor;
    ctx.globalAlpha = 0.95;
    ctx.textAlign = 'right';
    // Keep clear of both red margin rules (x = margin−10 and margin−14)
    ctx.fillText(label, S.margin - 24, anchorY - S.fontSize * 0.15);
    ctx.restore();
  }
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = text.split(' ');
  let line = '';
  let linesDrawn = 0;
  
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
      linesDrawn++;
      if (linesDrawn >= maxLines) return;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}



function getGraphemes(text) {
  if (!text) return [];
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text)).map(s => s.segment);
  }
  return Array.from(text);
}

function isIndicScript(text) {
  return /[\u0900-\u097F\uA8E0-\uA8FF\u1CD0-\u1CFF\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0D80-\u0DFF]/.test(text);
}

const containsDevanagari = isIndicScript;

/* Fonts known to include Devanagari glyphs */
const DEVANAGARI_FONTS = new Set([
  'Kalam', 'Amita', 'Noto Sans Devanagari', 'Noto Serif Devanagari',
  'Hind', 'Tiro Devanagari Hindi', 'Baloo 2', 'Martel'
]);

/* Build a font-family string that guarantees proper Devanagari rendering. */
function getFontStack(isIndic) {
  if (!isIndic || DEVANAGARI_FONTS.has(S.font)) {
    return `"${S.font}"`;
  }
  return `"${S.font}", "Noto Sans Devanagari", "Hind", sans-serif`;
}

function layoutTextTwoColumn(text, S, PAGE_W, PAGE_H, sanitizeText, containsDevanagari, getFontStack, getCharVariation, getGraphemes, ctx) {
  const queue = [];
  const pageTexts = [];
  let currentPageText = '';

  const margin = S.margin;
  const colWidth = (PAGE_W - margin * 2 - 40) / 2;
  const col1Left = margin;
  const col1Right = margin + colWidth;
  const col2Left = PAGE_W - margin - colWidth;
  const col2Right = PAGE_W - margin;

  let activeCol = 1; // 1 or 2
  let x = col1Left;
  const lineH = S.fontSize * S.lineHeight;
  let y = margin + S.fontSize + lineH;

  let pageIdx = 0;
  let charIndex = 0;
  let lineCharIndex = 0;
  let stickyCounter = 0;
  let calloutCounter = 0;
  const words = text.split(' ');

  for (let wi = 0; wi < words.length; wi++) {
    const word = words[wi];
    const lines = word.split('\n');

    for (let li = 0; li < lines.length; li++) {
      if (li > 0) {
        // Explicit newline
        x = activeCol === 1 ? col1Left : col2Left;
        y += lineH;
        lineCharIndex = 0;
        if (y + S.fontSize * 0.5 > PAGE_H - margin) {
          if (activeCol === 1) {
            activeCol = 2;
            x = col2Left;
            y = margin + S.fontSize + lineH;
          } else {
            pageTexts.push(currentPageText);
            currentPageText = '';
            pageIdx++;
            activeCol = 1;
            x = col1Left;
            y = margin + S.fontSize + lineH;
          }
        }
        currentPageText += '\n';
        charIndex++;
      }

      const lineWord = lines[li];
      if (!lineWord) continue;

      const wordIsIndic = containsDevanagari(lineWord);
      const fontStack = getFontStack(wordIsIndic);

      // Measure word width
      ctx.font = `${S.fontSize}px ${fontStack}`;
      const wordWidth = ctx.measureText(lineWord).width;

      let rightBoundary = activeCol === 1 ? col1Right : col2Right;
      let leftBoundary = activeCol === 1 ? col1Left : col2Left;

      // Word wrap
      if (x + wordWidth > (rightBoundary + 2.5) && x > leftBoundary) {
        x = leftBoundary;
        y += lineH;
        lineCharIndex = 0;
        if (y + S.fontSize * 0.5 > PAGE_H - margin) {
          if (activeCol === 1) {
            activeCol = 2;
            x = col2Left;
            leftBoundary = col2Left;
            rightBoundary = col2Right;
            y = margin + S.fontSize + lineH;
          } else {
            pageTexts.push(currentPageText);
            currentPageText = '';
            pageIdx++;
            activeCol = 1;
            x = col1Left;
            leftBoundary = col1Left;
            rightBoundary = col1Right;
            y = margin + S.fontSize + lineH;
          }
        }
      }

      if (wordIsIndic) {
        const v = S.paperStyle === 'clean' ? {
          tiltDeg: 0,
          scaleY: 1,
          scaleX: 1,
          baselineOff: 0,
          spacingExtra: 0,
          pressureMod: 1,
          opacity: 1
        } : getCharVariation(S.rotationMax, S.pressure, S.fontSize);
        const wobble = S.paperStyle === 'clean' ? 0 : Math.sin(lineCharIndex * 0.04) * 0.4 * (S.fontSize / 22);
        const alignOffset = getAlignmentOffset(S.textAlignment, S.fontSize, S.lineHeight);
        const cy = y + (v.baselineOff * 0.4) + wobble + alignOffset;

        const isHighlighted = highlightRanges.some(r => charIndex >= r.start && charIndex < r.start + lineWord.length);

        queue.push({
          ch: lineWord,
          x,
          y: cy,
          v,
          pageIdx,
          isIndic: true,
          fontStack,
          highlight: isHighlighted,
          fontSize: S.fontSize,
          isBold: false
        });

        x += ctx.measureText(lineWord).width + v.spacingExtra;
        charIndex += lineWord.length;
        lineCharIndex += lineWord.length;
        currentPageText += lineWord;
      } else {
        const graphemes = getGraphemes(lineWord);
        const isUltraLongWord = ctx.measureText(lineWord).width > (rightBoundary - leftBoundary);
        for (let ci = 0; ci < graphemes.length; ci++) {
          const ch = graphemes[ci];
          const v = S.paperStyle === 'clean' ? {
            tiltDeg: 0,
            scaleY: 1,
            scaleX: 1,
            baselineOff: 0,
            spacingExtra: 0,
            pressureMod: 1,
            opacity: 1
          } : getCharVariation(S.rotationMax, S.pressure, S.fontSize);

          ctx.font = `${S.fontSize}px ${fontStack}`;
          const charWidth = ctx.measureText(ch).width + v.spacingExtra;

          if (isUltraLongWord && x + charWidth > (rightBoundary + 2.5) && x > leftBoundary) {
            x = leftBoundary;
            y += lineH;
            lineCharIndex = 0;
            if (y + S.fontSize * 0.5 > PAGE_H - margin) {
              if (activeCol === 1) {
                activeCol = 2;
                x = col2Left;
                leftBoundary = col2Left;
                rightBoundary = col2Right;
                y = margin + S.fontSize + lineH;
              } else {
                pageTexts.push(currentPageText);
                currentPageText = '';
                pageIdx++;
                activeCol = 1;
                x = col1Left;
                leftBoundary = col1Left;
                rightBoundary = col1Right;
                y = margin + S.fontSize + lineH;
              }
            }
          }

          const wobble = S.paperStyle === 'clean' ? 0 : Math.sin(lineCharIndex * 0.04) * 0.8 * (S.fontSize / 22);
          const alignOffset = getAlignmentOffset(S.textAlignment, S.fontSize, S.lineHeight);
          const cy = y + v.baselineOff + wobble + alignOffset;

          const isHighlighted = highlightRanges.some(r => charIndex >= r.start && charIndex < r.end);

          let item = {
            ch,
            x,
            y: cy,
            v,
            pageIdx,
            isIndic: false,
            fontStack,
            highlight: isHighlighted,
            fontSize: S.fontSize,
            isBold: false
          };

          if (ch === '\uFFF0') {
            item.isSticky = true;
            item.stickyIdx = stickyCounter++;
          } else if (ch === '\uFFF1') {
            item.isCallout = true;
            item.calloutIdx = calloutCounter++;
          }

          queue.push(item);

          x += ctx.measureText(ch).width + v.spacingExtra;
          charIndex++;
          lineCharIndex++;
          currentPageText += ch;
        }
      }

      // Space after word
      if (li === lines.length - 1) {
        ctx.font = `${S.fontSize}px ${fontStack}`;
        x += ctx.measureText(' ').width + S.wordSpacing;
        if (wi < words.length - 1) {
          currentPageText += ' ';
          charIndex++;
        }
      }
    }
  }

  pageTexts.push(currentPageText);
  return { queue, pageTexts, pageCount: pageIdx + 1 };
}

function layoutTextCornell(text, S, PAGE_W, PAGE_H, sanitizeText, containsDevanagari, getFontStack, getCharVariation, getGraphemes, ctx) {
  const queue = [];
  const pageTexts = [];
  let currentPageText = '';

  const margin = S.margin;
  const leftColRight = 210;
  const rightColLeft = 250;
  const rightColRight = PAGE_W - margin;

  const lineH = S.fontSize * S.lineHeight;
  let yCues = margin + S.fontSize + lineH;
  let yNotes = margin + S.fontSize + lineH;
  let ySummary = PAGE_H - 170;

  let pageIdx = 0;
  let charIndex = 0;
  let stickyCounter = 0;
  let calloutCounter = 0;

  const lines = text.split('\n');

  for (let li = 0; li < lines.length; li++) {
    if (li > 0) charIndex++; // account for split \n
    const rawLine = lines[li];
    let type = 'note';
    let lineText = rawLine;

    if (rawLine.trim().startsWith('? ')) {
      type = 'cue';
      lineText = rawLine.replace(/^\?\s*/, '');
    } else if (rawLine.toLowerCase().trim().startsWith('cue:')) {
      type = 'cue';
      lineText = rawLine.replace(/^cue:\s*/i, '');
    } else if (rawLine.trim().startsWith('== ')) {
      type = 'summary';
      lineText = rawLine.replace(/^==\s*/, '');
    } else if (rawLine.toLowerCase().trim().startsWith('summary:')) {
      type = 'summary';
      lineText = rawLine.replace(/^summary:\s*/i, '');
    }

    if (!lineText.trim()) {
      if (type === 'note') {
        yNotes += lineH * 0.5;
      } else if (type === 'cue') {
        yCues += lineH * 0.5;
      }
      currentPageText += '\n';
      // If empty line, we still consumed it, but lineText has length 0.
      continue;
    }

    // Skip the prefix tags in charIndex since we stripped them for cleanText
    // Wait! Did parseRichSyntax strip the '== ' cue and summary prefixes?
    // Ah! parseRichSyntax only handles highlights ==text== and sticky/callout tags.
    // Cornell cues ('? ' or 'cue:') and summary ('== ' or 'summary:') are stripped in layoutTextCornell itself!
    // So rawLine's prefix was removed.
    // If rawLine starts with '? ' (length 2) or '== ' (length 3), we should adjust charIndex by adding the length of the prefix
    // because in cleanText, these prefixes were NOT stripped by parseRichSyntax!
    // Wait! Is that correct?
    // Yes! parseRichSyntax is run on the *entire* raw text before layoutText. It output cleanText.
    // So the cleanText still contains the Cornell prefixes like '? ' or '== '!
    // Then layoutTextCornell receives cleanText, and splits it by lines, and detects prefixes!
    // So yes, cleanText still had these prefixes, which layoutTextCornell now parses and strips.
    // So we must increment charIndex by the length of the prefix we strip here!
    let prefixLength = 0;
    if (rawLine.trim().startsWith('? ')) {
      prefixLength = rawLine.indexOf('? ') + 2;
    } else if (rawLine.toLowerCase().trim().startsWith('cue:')) {
      prefixLength = rawLine.toLowerCase().indexOf('cue:') + 4;
    } else if (rawLine.trim().startsWith('== ')) {
      prefixLength = rawLine.indexOf('== ') + 3;
    } else if (rawLine.toLowerCase().trim().startsWith('summary:')) {
      prefixLength = rawLine.toLowerCase().indexOf('summary:') + 8;
    }
    charIndex += prefixLength;

    const words = lineText.split(' ');
    let x = margin;
    let y = margin + S.fontSize + lineH;

    if (type === 'cue') {
      y = Math.max(yCues, yNotes);
      if (y + lineH > PAGE_H - 190) {
        pageTexts.push(currentPageText);
        currentPageText = '';
        pageIdx++;
        yCues = margin + S.fontSize + lineH;
        yNotes = margin + S.fontSize + lineH;
        ySummary = PAGE_H - 170;
        y = margin + S.fontSize + lineH;
      }
      x = margin;
    } else if (type === 'summary') {
      y = ySummary;
      if (y + S.fontSize * 0.5 > PAGE_H - margin) {
        pageTexts.push(currentPageText);
        currentPageText = '';
        pageIdx++;
        yCues = margin + S.fontSize + lineH;
        yNotes = margin + S.fontSize + lineH;
        ySummary = PAGE_H - 170;
        y = PAGE_H - 170;
      }
      x = margin;
    } else {
      y = Math.max(yNotes, yCues);
      if (y + lineH > PAGE_H - 190) {
        pageTexts.push(currentPageText);
        currentPageText = '';
        pageIdx++;
        yCues = margin + S.fontSize + lineH;
        yNotes = margin + S.fontSize + lineH;
        ySummary = PAGE_H - 170;
        y = margin + S.fontSize + lineH;
      }
      x = rightColLeft;
    }

    let lineCharIndex = 0;

    for (let wi = 0; wi < words.length; wi++) {
      const word = words[wi];
      if (!word) {
        // If multiple spaces occurred
        if (wi < words.length - 1) {
          currentPageText += ' ';
          charIndex++;
        }
        continue;
      }

      const wordIsIndic = containsDevanagari(word);
      const fontStack = getFontStack(wordIsIndic);

      ctx.font = `${S.fontSize}px ${fontStack}`;
      const wordWidth = ctx.measureText(word).width;

      let leftBoundary = margin;
      let rightBoundary = rightColRight;

      if (type === 'cue') {
        leftBoundary = margin;
        rightBoundary = leftColRight;
      } else if (type === 'summary') {
        leftBoundary = margin;
        rightBoundary = rightColRight;
      } else {
        leftBoundary = rightColLeft;
        rightBoundary = rightColRight;
      }

      if (x + wordWidth > (rightBoundary + 2.5) && x > leftBoundary) {
        x = leftBoundary;
        y += lineH;
        lineCharIndex = 0;
        
        if (type === 'summary') {
          if (y + S.fontSize * 0.5 > PAGE_H - margin) {
            pageTexts.push(currentPageText);
            currentPageText = '';
            pageIdx++;
            yCues = margin + S.fontSize + lineH;
            yNotes = margin + S.fontSize + lineH;
            ySummary = PAGE_H - 170;
            y = PAGE_H - 170;
          }
        } else {
          if (y + lineH > PAGE_H - 190) {
            pageTexts.push(currentPageText);
            currentPageText = '';
            pageIdx++;
            yCues = margin + S.fontSize + lineH;
            yNotes = margin + S.fontSize + lineH;
            ySummary = PAGE_H - 170;
            y = margin + S.fontSize + lineH;
          }
        }
      }

      if (wordIsIndic) {
        const v = S.paperStyle === 'clean' ? {
          tiltDeg: 0,
          scaleY: 1,
          scaleX: 1,
          baselineOff: 0,
          spacingExtra: 0,
          pressureMod: 1,
          opacity: 1
        } : getCharVariation(S.rotationMax, S.pressure, S.fontSize);
        const wobble = S.paperStyle === 'clean' ? 0 : Math.sin(lineCharIndex * 0.04) * 0.4 * (S.fontSize / 22);
        const alignOffset = getAlignmentOffset(S.textAlignment, S.fontSize, S.lineHeight);
        const cy = y + (v.baselineOff * 0.4) + wobble + alignOffset;

        const isHighlighted = highlightRanges.some(r => charIndex >= r.start && charIndex < r.start + word.length);

        queue.push({
          ch: word,
          x,
          y: cy,
          v,
          pageIdx,
          isIndic: true,
          fontStack,
          cornellType: type,
          highlight: isHighlighted,
          fontSize: S.fontSize,
          isBold: false
        });

        x += ctx.measureText(word).width + v.spacingExtra;
        charIndex += word.length;
        lineCharIndex += word.length;
        currentPageText += word;
      } else {
        const graphemes = getGraphemes(word);
        const isUltraLongWord = ctx.measureText(word).width > (rightBoundary - leftBoundary);
        for (let ci = 0; ci < graphemes.length; ci++) {
          const ch = graphemes[ci];
          const v = S.paperStyle === 'clean' ? {
            tiltDeg: 0,
            scaleY: 1,
            scaleX: 1,
            baselineOff: 0,
            spacingExtra: 0,
            pressureMod: 1,
            opacity: 1
          } : getCharVariation(S.rotationMax, S.pressure, S.fontSize);

          ctx.font = `${S.fontSize}px ${fontStack}`;
          const charWidth = ctx.measureText(ch).width + v.spacingExtra;

          if (isUltraLongWord && x + charWidth > (rightBoundary + 2.5) && x > leftBoundary) {
            x = leftBoundary;
            y += lineH;
            lineCharIndex = 0;
            
            if (type === 'summary') {
              if (y + S.fontSize * 0.5 > PAGE_H - margin) {
                pageTexts.push(currentPageText);
                currentPageText = '';
                pageIdx++;
                yCues = margin + S.fontSize + lineH;
                yNotes = margin + S.fontSize + lineH;
                ySummary = PAGE_H - 170;
                y = PAGE_H - 170;
              }
            } else {
              if (y + lineH > PAGE_H - 190) {
                pageTexts.push(currentPageText);
                currentPageText = '';
                pageIdx++;
                yCues = margin + S.fontSize + lineH;
                yNotes = margin + S.fontSize + lineH;
                ySummary = PAGE_H - 170;
                y = margin + S.fontSize + lineH;
              }
            }
          }

          const wobble = S.paperStyle === 'clean' ? 0 : Math.sin(lineCharIndex * 0.04) * 0.8 * (S.fontSize / 22);
          const alignOffset = getAlignmentOffset(S.textAlignment, S.fontSize, S.lineHeight);
          const cy = y + v.baselineOff + wobble + alignOffset;

          const isHighlighted = highlightRanges.some(r => charIndex >= r.start && charIndex < r.end);

          let item = {
            ch,
            x,
            y: cy,
            v,
            pageIdx,
            isIndic: false,
            fontStack,
            cornellType: type,
            highlight: isHighlighted,
            fontSize: S.fontSize,
            isBold: false
          };

          if (ch === '\uFFF0') {
            item.isSticky = true;
            item.stickyIdx = stickyCounter++;
          } else if (ch === '\uFFF1') {
            item.isCallout = true;
            item.calloutIdx = calloutCounter++;
          }

          queue.push(item);

          x += ctx.measureText(ch).width + v.spacingExtra;
          charIndex++;
          lineCharIndex++;
          currentPageText += ch;
        }
      }

      ctx.font = `${S.fontSize}px ${fontStack}`;
      if (wi < words.length - 1) {
        x += ctx.measureText(' ').width + S.wordSpacing;
        currentPageText += ' ';
        charIndex++;
      }
    }

    if (type === 'cue') {
      yCues = y + lineH;
    } else if (type === 'summary') {
      ySummary = y + lineH;
    } else {
      yNotes = y + lineH;
    }
    currentPageText += '\n';
  }

  pageTexts.push(currentPageText);
  return { queue, pageTexts, pageCount: pageIdx + 1 };
}

function parseStructuredContent(text) {
  const lines = text.split('\n');
  const blocks = [];
  let questionCounter = 1;
  let activeParagraph = null;

  function commitParagraph() {
    if (activeParagraph) {
      blocks.push(activeParagraph);
      activeParagraph = null;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') {
      commitParagraph();
      continue;
    }

    // 1. Check for heading level 2 (subheading)
    if (trimmed.startsWith('##')) {
      commitParagraph();
      const content = trimmed.substring(2).trim();
      blocks.push({ type: 'subheading', text: content });
      continue;
    }

    // 2. Check for heading level 1
    if (trimmed.startsWith('#')) {
      commitParagraph();
      const content = trimmed.substring(1).trim();
      blocks.push({ type: 'heading', text: content });
      continue;
    }

    // 3. Check for bullet points
    const bulletMatch = line.match(/^(\s*)([\-\*])\s+(.*)/);
    if (bulletMatch) {
      commitParagraph();
      const indent = bulletMatch[1];
      const content = bulletMatch[3].trim();
      const level = (indent.length >= 2 || indent.includes('\t')) ? 2 : 1;
      blocks.push({ type: 'bullet', text: content, level: level });
      continue;
    }

    // 4. Check for questions: "Q3. text" style
    const questionMatch = trimmed.match(/^Q(\d+)?[\.:\-\s]+(.*)/i);
    if (questionMatch) {
      commitParagraph();
      const explicitNum = questionMatch[1];
      const content = questionMatch[2].trim();
      let num = explicitNum ? parseInt(explicitNum, 10) : questionCounter++;
      if (explicitNum) {
        questionCounter = Math.max(questionCounter, num + 1);
      }
      blocks.push({ type: 'question', text: content, questionNum: num, numStyle: 'Q' });
      continue;
    }

    // 4b. Numbered questions: "3. What are the two types … ?" (ends with '?')
    const numberedQuestionMatch = trimmed.match(/^(\d+)[.):]\s+(.+\?)\s*$/);
    if (numberedQuestionMatch) {
      commitParagraph();
      const num = parseInt(numberedQuestionMatch[1], 10);
      questionCounter = Math.max(questionCounter, num + 1);
      blocks.push({ type: 'question', text: numberedQuestionMatch[2].trim(), questionNum: num, numStyle: 'digit' });
      continue;
    }

    // 4c. Bare "Answer:" marker lines become their own block (hidden on canvas,
    // represented by the margin "Ans" label; editors keep the word)
    if (/^answer\s*:?$/i.test(trimmed)) {
      commitParagraph();
      blocks.push({ type: 'paragraph', text: 'Answer:' });
      continue;
    }

    // 4d. Other numbered lines are self-contained blocks — the following
    // line starts a fresh paragraph instead of fusing into them
    // ("1. Cardinality Constraint" stays separate from "It specifies …")
    if (/^\d+[.):]\s+\S/.test(trimmed)) {
      commitParagraph();
      blocks.push({ type: 'paragraph', text: trimmed });
      continue;
    }

    // 5. Otherwise, paragraph text
    if (activeParagraph) {
      activeParagraph.text += ' ' + trimmed;
    } else {
      activeParagraph = { type: 'paragraph', text: trimmed };
    }
  }

  commitParagraph();
  return blocks;
}

function layoutTextCleanStandard(cleanText, S, PAGE_W, PAGE_H, ctx) {
  const blocks = parseStructuredContent(cleanText);
  const queue = [];
  const pageTexts = [];
  let currentPageText = '';

  const margin = S.margin;
  const rightMargin = PAGE_W - margin;

  let pageIdx = 0;
  let charIndex = 0;
  let stickyCounter = 0;
  let calloutCounter = 0;

  // Grid line height of notebook ruled paper
  const gridLineH = S.fontSize * S.lineHeight;

  // Skipped top line: start at margin + 2 * gridLineH (matching ruled grid lines)
  let y = margin + gridLineH * 2;
  const alignOffset = getAlignmentOffset(S.textAlignment, S.fontSize, S.lineHeight);

  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi];

    // One empty line of breathing room after a finished answer — inserted
    // before each new question block (except at the top of a page). The row
    // is also appended to pageTexts so the editor overlay stays aligned.
    if (block.type === 'question' && y > margin + gridLineH * 2) {
      y += gridLineH;
      currentPageText += '\n';
      if (y + gridLineH > PAGE_H - margin) {
        pageTexts.push(currentPageText);
        currentPageText = '';
        pageIdx++;
        y = margin + gridLineH * 2;
      }
    }

    // Determine block style
    let blockFontSize = S.fontSize;
    let isBold = false;
    if (block.type === 'heading') {
      blockFontSize = Math.round(S.fontSize * 1.25);
      isBold = true;
    } else if (block.type === 'subheading') {
      blockFontSize = Math.round(S.fontSize * 1.12);
      isBold = true;
    } else if (block.type === 'question') {
      blockFontSize = Math.round(S.fontSize * 1.05);
      isBold = true;
    }

    // Set left and right boundaries
    let leftBoundary = margin;
    if (block.type === 'bullet') {
      leftBoundary = margin + (block.level === 2 ? 48 : 24);
    }

    let x = leftBoundary;

    // Font stack for this block
    const wordIsIndic = containsDevanagari(block.text);
    const fontStack = getFontStack(wordIsIndic);
    ctx.font = `${isBold ? 'bold ' : ''}${blockFontSize}px ${fontStack}`;

    // If it's a bullet block, draw the bullet glyph first
    if (block.type === 'bullet') {
      const bulletChar = block.level === 2 ? '◦' : '•';
      const bulletX = margin + (block.level === 2 ? 24 : 8);
      
      const v = {
        tiltDeg: 0,
        scaleY: 1,
        scaleX: 1,
        baselineOff: 0,
        spacingExtra: 0,
        pressureMod: 1,
        opacity: 1
      };

      queue.push({
        ch: bulletChar,
        x: bulletX,
        y: y + alignOffset,
        v,
        pageIdx,
        isIndic: false,
        fontStack,
        highlight: false,
        isBold: isBold,
        fontSize: blockFontSize
      });
    }

    // If it's a question block, let's prepend the question number if not already present
    let textToLayout = block.text;
    if (block.type === 'question') {
      const numPrefix = block.numStyle === 'digit' ? `${block.questionNum}. ` : `Q${block.questionNum}. `;
      if (!textToLayout.startsWith(numPrefix) && !/^\s*Q\d+/i.test(textToLayout)) {
        textToLayout = numPrefix + textToLayout;
      }
    }

    const words = textToLayout.split(' ');

    for (let wi = 0; wi < words.length; wi++) {
      const word = words[wi];
      if (!word) {
        if (wi < words.length - 1) {
          currentPageText += ' ';
          charIndex++;
        }
        continue;
      }

      ctx.font = `${isBold ? 'bold ' : ''}${blockFontSize}px ${fontStack}`;
      const wordWidth = ctx.measureText(word).width;

      // Word wrap check
      if (x + wordWidth > (rightMargin + 2.5) && x > leftBoundary) {
        x = leftBoundary;
        y += gridLineH;
        // Check page break
        if (y + gridLineH > PAGE_H - margin) {
          pageTexts.push(currentPageText);
          currentPageText = '';
          pageIdx++;
          y = margin + gridLineH * 2;
        }
      }

      // Lay out characters in the word
      const graphemes = getGraphemes(word);
      const isUltraLongWord = ctx.measureText(word).width > (rightMargin - leftBoundary);
      for (let ci = 0; ci < graphemes.length; ci++) {
        const ch = graphemes[ci];

        ctx.font = `${isBold ? 'bold ' : ''}${blockFontSize}px ${fontStack}`;
        const charWidth = ctx.measureText(ch).width;

        // Char-level wrap check (only for ultra long words exceeding a line)
        if (isUltraLongWord && x + charWidth > (rightMargin + 2.5) && x > leftBoundary) {
          x = leftBoundary;
          y += gridLineH;
          if (y + gridLineH > PAGE_H - margin) {
            pageTexts.push(currentPageText);
            currentPageText = '';
            pageIdx++;
            y = margin + gridLineH * 2;
          }
        }

        const isHighlighted = highlightRanges.some(r => charIndex >= r.start && charIndex < r.end);

        const v = {
          tiltDeg: 0,
          scaleY: 1,
          scaleX: 1,
          baselineOff: 0,
          spacingExtra: 0,
          pressureMod: 1,
          opacity: 1
        };

        let item = {
          ch,
          x,
          y: y + alignOffset,
          v,
          pageIdx,
          isIndic: false,
          fontStack,
          highlight: isHighlighted,
          isBold: isBold,
          fontSize: blockFontSize
        };

        if (ch === '\uFFF0') {
          item.isSticky = true;
          item.stickyIdx = stickyCounter++;
        } else if (ch === '\uFFF1') {
          item.isCallout = true;
          item.calloutIdx = calloutCounter++;
        }

        queue.push(item);

        x += charWidth;
        charIndex++;
        currentPageText += ch;
      }

      // Space after word
      ctx.font = `${isBold ? 'bold ' : ''}${blockFontSize}px ${fontStack}`;
      const spaceWidth = ctx.measureText(' ').width + S.wordSpacing;
      x += spaceWidth;
      if (wi < words.length - 1) {
        currentPageText += ' ';
        charIndex++;
      }
    }

    // Advance to next ruled grid line for next block
    y += gridLineH;
    currentPageText += '\n';

    // Check page break after finishing block
    if (y + gridLineH > PAGE_H - margin && bi < blocks.length - 1) {
      pageTexts.push(currentPageText);
      currentPageText = '';
      pageIdx++;
      y = margin + gridLineH * 2;
    }
  }

  pageTexts.push(currentPageText);
  return { queue, pageTexts, pageCount: pageIdx + 1 };
}

function layoutText(text) {
  text = sanitizeText(text);
  if (!text.trim()) {
    return { queue: [], pageTexts: [], pageCount: 1 };
  }

  const { cleanText } = parseRichSyntax(text);

  // Use a temporary canvas context to measure text sizes properly
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = PAGE_W;
  tmpCanvas.height = PAGE_H;
  const ctx = tmpCanvas.getContext('2d');

  if (S.paperStyle === 'clean' && S.noteLayout === 'standard') {
    return layoutTextCleanStandard(cleanText, S, PAGE_W, PAGE_H, ctx);
  }

  if (S.noteLayout === 'twocolumn') {
    return layoutTextTwoColumn(cleanText, S, PAGE_W, PAGE_H, sanitizeText, containsDevanagari, getFontStack, getCharVariation, getGraphemes, ctx);
  } else if (S.noteLayout === 'cornell') {
    return layoutTextCornell(cleanText, S, PAGE_W, PAGE_H, sanitizeText, containsDevanagari, getFontStack, getCharVariation, getGraphemes, ctx);
  }

  const queue = [];
  const pageTexts = [];
  let currentPageText = '';

  const margin = S.margin;
  const rightMargin = PAGE_W - margin;
  let x = margin;
  const lineH = S.fontSize * S.lineHeight;
  
  // Skip the 1st line of every page, starting on line 2 grid baseline
  let y = margin + lineH * 2;

  let pageIdx = 0;
  let charIndex = 0;
  let lineCharIndex = 0;
  let stickyCounter = 0;
  let calloutCounter = 0;
  const words = cleanText.split(' ');

  for (let wi = 0; wi < words.length; wi++) {
    const word = words[wi];
    const lines = word.split('\n');

    for (let li = 0; li < lines.length; li++) {
      if (li > 0) {
        // Explicit newline
        x = margin;
        y += lineH;
        lineCharIndex = 0;
        if (y + S.fontSize * 0.5 > PAGE_H - margin) {
          pageTexts.push(currentPageText);
          currentPageText = '';
          pageIdx++;
          y = margin + lineH * 2; // Skip 1st line on new page
        }
        currentPageText += '\n';
        charIndex++;
      }

      const lineWord = lines[li];
      if (!lineWord) continue;

      const wordIsIndic = containsDevanagari(lineWord);
      const fontStack = getFontStack(wordIsIndic);

      // Measure word width
      ctx.font = `${S.fontSize}px ${fontStack}`;
      const wordWidth = ctx.measureText(lineWord).width;

      // Word wrap
      if (x + wordWidth > (rightMargin + 2.5) && x > margin) {
        x = margin;
        y += lineH;
        lineCharIndex = 0;
        if (y + S.fontSize * 0.5 > PAGE_H - margin) {
          pageTexts.push(currentPageText);
          currentPageText = '';
          pageIdx++;
          y = margin + lineH * 2; // Skip 1st line on new page
        }
      }

      if (wordIsIndic) {
        const v = getCharVariation(S.rotationMax, S.pressure, S.fontSize);
        const wobble = Math.sin(lineCharIndex * 0.04) * 0.4 * (S.fontSize / 22);
        const alignOffset = getAlignmentOffset(S.textAlignment, S.fontSize, S.lineHeight);
        const cy = y + (v.baselineOff * 0.4) + wobble + alignOffset;

        const isHighlighted = highlightRanges.some(r => charIndex >= r.start && charIndex < r.start + lineWord.length);

        queue.push({
          ch: lineWord,
          x,
          y: cy,
          v,
          pageIdx,
          isIndic: true,
          fontStack,
          highlight: isHighlighted,
          fontSize: S.fontSize,
          isBold: false
        });

        x += ctx.measureText(lineWord).width + v.spacingExtra;
        charIndex += lineWord.length;
        lineCharIndex += lineWord.length;
        currentPageText += lineWord;
      } else {
        const graphemes = getGraphemes(lineWord);
        const isUltraLongWord = ctx.measureText(lineWord).width > (rightMargin - margin);
        for (let ci = 0; ci < graphemes.length; ci++) {
          const ch = graphemes[ci];
          const v = getCharVariation(S.rotationMax, S.pressure, S.fontSize);

          ctx.font = `${S.fontSize}px ${fontStack}`;
          const charWidth = ctx.measureText(ch).width + v.spacingExtra;

          if (isUltraLongWord && x + charWidth > (rightMargin + 2.5) && x > margin) {
            x = margin;
            y += lineH;
            lineCharIndex = 0;
            if (y + S.fontSize * 0.5 > PAGE_H - margin) {
              pageTexts.push(currentPageText);
              currentPageText = '';
              pageIdx++;
              y = margin + lineH * 2;
            }
          }

          const wobble = Math.sin(lineCharIndex * 0.04) * 0.8 * (S.fontSize / 22);
          const alignOffset = getAlignmentOffset(S.textAlignment, S.fontSize, S.lineHeight);
          const cy = y + v.baselineOff + wobble + alignOffset;

          const isHighlighted = highlightRanges.some(r => charIndex >= r.start && charIndex < r.end);

          let item = {
            ch,
            x,
            y: cy,
            v,
            pageIdx,
            isIndic: false,
            fontStack,
            highlight: isHighlighted,
            fontSize: S.fontSize,
            isBold: false
          };

          if (ch === '\uFFF0') {
            item.isSticky = true;
            item.stickyIdx = stickyCounter++;
          } else if (ch === '\uFFF1') {
            item.isCallout = true;
            item.calloutIdx = calloutCounter++;
          }

          queue.push(item);

          x += ctx.measureText(ch).width + v.spacingExtra;
          charIndex++;
          lineCharIndex++;
          currentPageText += ch;
        }
      }

      // Space after word (not on last word of line)
      if (li === lines.length - 1) {
        ctx.font = `${S.fontSize}px ${fontStack}`;
        x += ctx.measureText(' ').width + S.wordSpacing;
        if (wi < words.length - 1) {
          currentPageText += ' ';
          charIndex++;
        }
      }
    }
  }

  pageTexts.push(currentPageText);

  return { queue, pageTexts, pageCount: pageIdx + 1 };
}

/* ───────────────────────────────────────────
   PHASE 3 — CONNECTED CURSIVE LIGATURE ENGINE
─────────────────────────────────────────── */
const CURSIVE_FONTS = new Set([
  'Caveat',
  'Homemade Apple',
  'Shadows Into Light',
  'Nanum Pen Script',
  'Reey',
  'Amita',
  'Kalam',
]);

function drawCursiveConnector(ctx, item1, item2, S) {
  // Disabled: Google Fonts (e.g. Caveat, Kalam) naturally handle glyph cursive joins.
  // Artificial canvas bezier strokes between characters create unwanted ink drop/sagging arc artifacts.
  return;
}

// Cache of decoded <img> elements for drafted glyphs, keyed by character.
// renderText() only draws an entry once it's fully decoded (img.complete-
// equivalent ready flag), so the drawImage() call always happens
// synchronously inside the correct save()/translate()/restore() block for
// that character instead of racing an async onload against ctx.restore().
const glyphImageCache = {};

function getCachedGlyphImage(char, src) {
  let entry = glyphImageCache[char];
  if (entry && entry.src === src) {
    return entry.ready ? entry.img : null;
  }
  // New character, or its drafted artwork changed — (re)decode it.
  const img = new Image();
  entry = { img, src, ready: false };
  glyphImageCache[char] = entry;
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
    drawPaperBackground(canvas.getContext('2d'), S.paperStyle, 1);
    const editor = document.getElementById('editor-1');
    if (editor) {
      editor.textContent = '';
      updateEditorStyles(editor, canvas);
    }
    return;
  }

  // Pre-process rich syntax before layout
  const { cleanText } = parseRichSyntax(text);
  const layoutInput = cleanText || text;

  const { queue, pageTexts, pageCount } = layoutText(layoutInput);

  for (let i = 0; i < pageCount; i++) {
    const canvas = createPage(i + 1);
    const ctx = canvas.getContext('2d');
    drawPaperBackground(ctx, S.paperStyle, i + 1);
  }

  // "Answer:" lines collapse to the margin "Ans" label when labels are shown
  const answerLineItems = (S.showMarginLabels !== false && S.noteLayout === 'standard')
    ? collectAnswerLineItems(queue)
    : null;

  queue.forEach((item) => {
    const canvas = pages[item.pageIdx];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const v = item.v;

    const activeEditor = document.getElementById('editor-' + (item.pageIdx + 1));
    if (document.activeElement === activeEditor) return;

    // Skip rendering placeholder chars for stickies/callouts, and the bare
    // "Answer:" marker lines (their margin "Ans" label carries the meaning)
    if (item.isSticky || item.isCallout) return;
    if (answerLineItems && answerLineItems.has(item)) return;

    // Draw highlight background BEFORE character
    if (item.highlight) {
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = S._highlightColor || '#ffe066';
      const hlFs = item.fontSize || S.fontSize;
      const hlW = hlFs * 0.7;
      const hlH = hlFs * 1.3;
      ctx.fillRect(item.x - 1, item.y - hlFs * 0.85, hlW, hlH);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate((v.tiltDeg * (item.isIndic ? 0.3 : 1) * Math.PI) / 180);
    ctx.scale(v.scaleX, v.scaleY);

    // In clean mode, bypass custom drafted glyphs
    const useGlyph = S.paperStyle !== 'clean' && draftedGlyphs[item.ch];
    if (useGlyph) {
      const glyphImg = getCachedGlyphImage(item.ch, draftedGlyphs[item.ch]);
      if (glyphImg) {
        ctx.globalAlpha = v.opacity;
        const drawSz = S.fontSize * 1.35;
        ctx.drawImage(glyphImg, -drawSz / 2, -drawSz / 2, drawSz, drawSz);
      } else {
        const fontSize = item.fontSize || S.fontSize;
        const weight = item.isBold ? 'bold ' : '';
        const pxSize = fontSize * v.pressureMod;
        ctx.font = `${weight}${Math.max(10, pxSize)}px ${item.fontStack}`;
        ctx.globalAlpha = v.opacity;
        ctx.fillStyle = S.inkColor;
        ctx.fillText(item.ch, 0, 0);
      }
    } else {
      // Fallback to system font
      const fontSize = item.fontSize || S.fontSize;
      const weight = item.isBold ? 'bold ' : '';
      const pxSize = fontSize * v.pressureMod;
      ctx.font = `${weight}${Math.max(10, pxSize)}px ${item.fontStack}`;
      ctx.globalAlpha = v.opacity;

      if (S.paperStyle !== 'clean' && S.bleed > 0.05) {
        ctx.shadowColor = S.shadowColor || S.inkColor;
        ctx.shadowBlur = S.bleed * 1.4;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = S.inkColor;
      ctx.fillText(item.ch, 0, 0);
    }
    ctx.restore();
  });



  // ── POST-PASS: Draw Sticky Notes ──
  paintStickyNotes(queue);
  // ── POST-PASS: Draw Callout Boxes ──
  paintCallouts(queue);
  // ── POST-PASS: Question / answer labels in the left margin ──
  if (S.showMarginLabels !== false && S.noteLayout === 'standard') {
    drawMarginQuestionLabels(queue);
  }

  pages.forEach((c, idx) => {
    const editor = document.getElementById('editor-' + (idx + 1));
    if (editor) {
      if (document.activeElement !== editor) {
        editor.textContent = pageTexts[idx] || '';
      }
      c.dataset.text = pageTexts[idx] || '';
      updateEditorStyles(editor, c);
    }
    drawMarginTextOnCanvas(c.getContext('2d'), idx + 1);
  });
}

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

function buildCharQueue(text) {
  const { queue } = layoutText(text);
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

  // Pre-process rich syntax before layout
  const { cleanText } = parseRichSyntax(text);
  const layoutInput = cleanText || text;

  // Clear and recreate pages with backgrounds
  clearPages();
  const { queue, pageTexts, pageCount } = layoutText(layoutInput);
  const answerLineItems = (S.showMarginLabels !== false && S.noteLayout === 'standard')
    ? collectAnswerLineItems(queue)
    : null;
  for (let i = 0; i < pageCount; i++) {
    const c = createPage(i + 1);
    drawPaperBackground(c.getContext('2d'), S.paperStyle, i + 1);
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
      const v = item.v;

      // Skip sticky/callout placeholders in animation, and bare "Answer:" lines
      if (item.isSticky || item.isCallout) continue;
      if (answerLineItems && answerLineItems.has(item)) continue;

      // Draw highlight BEFORE character
      if (item.highlight) {
        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = S._highlightColor || '#ffe066';
        const hlFs = item.fontSize || S.fontSize;
        const hlW = hlFs * 0.7;
        const hlH = hlFs * 1.3;
        ctx.fillRect(item.x - 1, item.y - hlFs * 0.85, hlW, hlH);
        ctx.restore();
      }

      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate((v.tiltDeg * (item.isIndic ? 0.3 : 1) * Math.PI) / 180);
      ctx.scale(v.scaleX, v.scaleY);
      const fontSize = item.fontSize || S.fontSize;
      const weight = item.isBold ? 'bold ' : '';
      const pxSize = fontSize * v.pressureMod;
      ctx.font = `${weight}${Math.max(10, pxSize)}px ${item.fontStack}`;
      ctx.globalAlpha = v.opacity;
      if (S.paperStyle !== 'clean' && S.bleed > 0.05) {
        ctx.shadowColor = S.inkColor;
        ctx.shadowBlur = S.bleed * 1.4;
      } else {
        ctx.shadowBlur = 0;
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
            behavior: 'smooth'
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

/* ─────────────────────────────────────────────
   PHASE 7.2 — MULTI-PROVIDER AI ENGINE
   Supports: OpenRouter (100+ models), Anthropic Direct,
   and Ollama Local (privacy-first, 100% offline)
───────────────────────────────────────────── */

const AI_MODELS = {
  openrouter: [
    // ── Free Models ──
    { id: 'openrouter/free', name: '🎁 OpenRouter Free Auto-Router (Free)' },
    { id: 'google/gemma-4-31b-it:free', name: '⚡ Gemma 4 31B (Free)' },
    { id: 'nvidia/nemotron-3.5-lightning:free', name: '🟩 Nemotron 3.5 Lightning (Free)' },
    { id: 'z-ai/glm-5.2:free', name: '✨ GLM 5.2 (Free)' },
    { id: 'liquid/lfm-2.5-2.6b:free', name: '💧 Liquid LFM 2.5 (Free)' },

    // ── Google ──
    { id: 'google/gemini-3.7-flash', name: '⚡ Gemini 3.7 Flash' },
    { id: 'google/gemini-3.6-flash', name: '⚡ Gemini 3.6 Flash' },
    { id: 'google/gemini-3.5-flash', name: '⚡ Gemini 3.5 Flash' },
    { id: 'google/gemini-3.5-flash-lite', name: '⚡ Gemini 3.5 Flash Lite' },

    // ── Anthropic ──
    { id: 'anthropic/claude-sonnet-5', name: '🟣 Claude Sonnet 5' },
    { id: 'anthropic/claude-opus-5', name: '🟣 Claude Opus 5' },
    { id: 'anthropic/claude-fable-5', name: '🟣 Claude Fable 5' },
    { id: 'anthropic/claude-3.5-sonnet', name: '🟣 Claude 3.5 Sonnet' },

    // ── OpenAI ──
    { id: 'openai/gpt-5.6-luna', name: '🟢 GPT-5.6 Luna' },
    { id: 'openai/gpt-5.6-terra', name: '🟢 GPT-5.6 Terra' },
    { id: 'openai/gpt-4o', name: '🟢 GPT-4o' },
    { id: 'openai/gpt-4o-mini', name: '🟢 GPT-4o Mini' },

    // ── DeepSeek ──
    { id: 'deepseek/deepseek-v4-flash', name: '🌊 DeepSeek V4 Flash' },
    { id: 'deepseek/deepseek-v4-pro', name: '🌊 DeepSeek V4 Pro' },
    { id: 'deepseek/deepseek-v3.2', name: '🌊 DeepSeek V3.2' },
    { id: 'deepseek/deepseek-r1', name: '🌊 DeepSeek R1 (Reasoning)' },

    // ── Meta ──
    { id: 'meta-llama/llama-4-maverick', name: '🦙 Llama 4 Maverick' },
    { id: 'meta-llama/llama-4-scout', name: '🦙 Llama 4 Scout' },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: '🦙 Llama 3.3 70B (Free)' },

    // ── Mistral ──
    { id: 'mistralai/mistral-medium-3-5', name: '🔷 Mistral Medium 3.5' },
    { id: 'mistralai/mistral-small-2603', name: '🔷 Mistral Small 4' },
    { id: 'mistralai/mistral-large-2512', name: '🔷 Mistral Large 3' },

    // ── Qwen ──
    { id: 'qwen/qwen3.8-flash', name: '🟠 Qwen 3.8 Flash' },
    { id: 'qwen/qwen3.8-max', name: '🟠 Qwen 3.8 Max' },
    { id: 'qwen/qwen3.7-flash', name: '🟠 Qwen 3.7 Flash' },

    // ── xAI ──
    { id: 'x-ai/grok-4.6', name: '✖ Grok 4.6' },
    { id: 'x-ai/grok-4.5', name: '✖ Grok 4.5' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4 (Latest)' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast)' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus (Powerful)' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku (Budget)' },
  ],
  // ── Ollama — local models (user must have Ollama running) ──
  ollama: [
    { id: 'llama3.2', name: '🦙 Llama 3.2 (3B)' },
    { id: 'llama3.2:1b', name: '🦙 Llama 3.2 (1B — Fastest)' },
    { id: 'llama3.1', name: '🦙 Llama 3.1 (8B)' },
    { id: 'llama3.1:70b', name: '🦙 Llama 3.1 (70B)' },
    { id: 'mistral', name: '🔷 Mistral (7B)' },
    { id: 'mistral-nemo', name: '🔷 Mistral Nemo (12B)' },
    { id: 'phi4', name: '🪩 Phi-4 (14B — Fast & Capable)' },
    { id: 'phi3.5', name: '🪩 Phi-3.5 (3.8B)' },
    { id: 'gemma2', name: '⚡ Gemma 2 (9B)' },
    { id: 'gemma2:2b', name: '⚡ Gemma 2 (2B — Fastest)' },
    { id: 'gemma2:27b', name: '⚡ Gemma 2 (27B)' },
    { id: 'qwen2.5', name: '🟠 Qwen 2.5 (7B)' },
    { id: 'qwen2.5:14b', name: '🟠 Qwen 2.5 (14B)' },
    { id: 'qwen2.5:72b', name: '🟠 Qwen 2.5 (72B)' },
    { id: 'deepseek-r1', name: '🌊 DeepSeek R1 (7B — Reasoning)' },
    { id: 'deepseek-r1:14b', name: '🌊 DeepSeek R1 (14B — Reasoning)' },
    { id: 'codellama', name: '👨‍💻 CodeLlama (7B)' },
    { id: 'neural-chat', name: '💬 Neural Chat (7B)' },
  ],
};

/* ───────────────────────────────────────────
   AUTOMATICALLY UPDATED AI MODEL LIST SYSTEM
─────────────────────────────────────────── */
let openRouterModelsLoaded = false;
let isFetchingOpenRouterModels = false;

// 1. Load cached OpenRouter models instantly from localStorage on startup
function loadCachedOpenRouterModels() {
  try {
    const raw = localStorage.getItem('inkflow-cached-openrouter-models');
    if (raw) {
      const cached = JSON.parse(raw);
      if (Array.isArray(cached) && cached.length > 0) {
        AI_MODELS.openrouter = cached;
        openRouterModelsLoaded = true;
        updateModelSyncBadge(`Cached (${cached.length} models)`, false);
      }
    }
  } catch (e) {
    console.warn('[Inkflow] Failed to load cached OpenRouter models:', e);
  }
}

// Helper to update the UI status badge next to the Model label
function updateModelSyncBadge(text, isSyncing = false) {
  const syncText = document.getElementById('model-sync-text');
  const syncIcon = document.getElementById('model-sync-icon');
  if (syncText) syncText.textContent = text;
  if (syncIcon) {
    if (isSyncing) {
      syncIcon.classList.add('fa-spin');
    } else {
      syncIcon.classList.remove('fa-spin');
    }
  }
}

// 2. Fetch OpenRouter models dynamically from API
async function fetchOpenRouterModels(force = false) {
  if (!force && openRouterModelsLoaded && isFetchingOpenRouterModels) return;
  isFetchingOpenRouterModels = true;
  updateModelSyncBadge('Syncing models...', true);

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
        else if (id.startsWith('meta-llama/') || id.startsWith('meta/')) emoji = '🦙 ';
        else if (id.startsWith('deepseek/')) emoji = '🌊 ';
        else if (id.startsWith('mistralai/')) emoji = '🔷 ';
        else if (id.startsWith('qwen/')) emoji = '🟠 ';
        else if (id.startsWith('x-ai/')) emoji = '✖ ';
        else if (id.startsWith('cohere/')) emoji = '🔴 ';
        else if (id.startsWith('nvidia/')) emoji = '🟩 ';
        else if (id.startsWith('microsoft/')) emoji = '🪟 ';
        else if (id.startsWith('openrouter/')) emoji = '🎁 ';
        
        const isFree = id.endsWith(':free') || (item.pricing && parseFloat(item.pricing.prompt) === 0 && parseFloat(item.pricing.completion) === 0);
        let displayName = item.name || item.id;
        
        // Strip out redundant provider prefixes to keep UI compact
        displayName = displayName.replace(/^(google|anthropic|openai|meta|deepseek|mistral|qwen|x-ai|cohere|nvidia|microsoft|llama|spacexai|z\.ai|dots studio|liquidai):\s*/i, '');
        
        let name = `${emoji}${displayName}`;
        if (isFree && !name.toLowerCase().includes('(free)')) {
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
        
        // Cache in localStorage
        try {
          localStorage.setItem('inkflow-cached-openrouter-models', JSON.stringify(fetched));
          localStorage.setItem('inkflow-cached-openrouter-time', Date.now().toString());
        } catch (e) {}

        updateModelSyncBadge(`Live (${fetched.length} models)`, false);

        // Refresh UI if currently viewing OpenRouter
        const providerEl = document.getElementById('ai-provider');
        if (providerEl && providerEl.value === 'openrouter') {
          onProviderChange();
        }
      }
    }
  } catch (e) {
    console.warn('[Inkflow] Could not auto-fetch OpenRouter models, using current catalog:', e);
    updateModelSyncBadge('Offline / Fallback', false);
  } finally {
    isFetchingOpenRouterModels = false;
  }
}

// 3. Auto-detect installed local Ollama models
async function fetchOllamaModels(force = false) {
  const endpointInput = document.getElementById('ollama-endpoint');
  const endpoint = (endpointInput && endpointInput.value.trim()) || 'http://localhost:11434';
  updateModelSyncBadge('Checking Ollama...', true);

  try {
    const res = await fetch(endpoint + '/api/tags');
    if (!res.ok) throw new Error('HTTP status ' + res.status);
    const data = await res.json();
    if (data && Array.isArray(data.models) && data.models.length > 0) {
      AI_MODELS.ollama = data.models.map(m => ({
        id: m.name,
        name: '🦙 ' + m.name
      }));
      updateModelSyncBadge(`Local (${data.models.length} installed)`, false);
      const providerEl = document.getElementById('ai-provider');
      if (providerEl && providerEl.value === 'ollama') {
        onProviderChange();
      }
    } else {
      updateModelSyncBadge('Ollama Ready (Default list)', false);
    }
  } catch (e) {
    updateModelSyncBadge('Ollama Offline (Default list)', false);
  }
}

// 4. Manual or Provider-based Trigger Refresh
function refreshCurrentProviderModels(manual = false) {
  const provider = document.getElementById('ai-provider').value;
  if (provider === 'openrouter') {
    fetchOpenRouterModels(true);
  } else if (provider === 'ollama') {
    fetchOllamaModels(true);
  } else {
    updateModelSyncBadge('Anthropic Direct', false);
  }
}

// 5. Automatic periodic background timer & event listeners
loadCachedOpenRouterModels();
window.addEventListener('online', () => refreshCurrentProviderModels(true));
setInterval(() => refreshCurrentProviderModels(false), 30 * 60 * 1000); // Auto update every 30 minutes

/* ───────────────────────────────────────────
   API KEY PERSISTENCE (Remember API Key option)
─────────────────────────────────────────── */
function initApiKeyPersistence() {
  const providerSelect = document.getElementById('ai-provider');
  const keyInput = document.getElementById('api-key');
  const rememberCheckbox = document.getElementById('remember-api-key');

  if (!providerSelect || !keyInput || !rememberCheckbox) return;

  // Restore global checkbox preference (default to checked if a key was previously saved)
  const globalRemember = localStorage.getItem('inkflow-remember-api-key');
  if (globalRemember === '1') {
    rememberCheckbox.checked = true;
  } else if (globalRemember === '0') {
    rememberCheckbox.checked = false;
  } else {
    // Default to checked
    rememberCheckbox.checked = true;
  }

  function loadSavedKey() {
    const provider = providerSelect.value;
    if (provider === 'ollama') return;

    const savedKey = localStorage.getItem('inkflow-api-key-' + provider) || '';

    // If checkbox is checked, restore saved key if available
    if (rememberCheckbox.checked && savedKey) {
      keyInput.value = savedKey;
    }
  }

  function saveOrClearKey() {
    const provider = providerSelect.value;
    if (provider === 'ollama') return;

    if (rememberCheckbox.checked) {
      localStorage.setItem('inkflow-remember-api-key', '1');
      const val = keyInput.value.trim();
      if (val) {
        localStorage.setItem('inkflow-api-key-' + provider, val);
      }
    } else {
      localStorage.setItem('inkflow-remember-api-key', '0');
      localStorage.removeItem('inkflow-api-key-openrouter');
      localStorage.removeItem('inkflow-api-key-anthropic');
    }
  }

  // Event listeners: save whenever key is edited or checkbox state changes
  keyInput.addEventListener('input', () => {
    if (rememberCheckbox.checked) {
      saveOrClearKey();
    }
  });

  keyInput.addEventListener('change', () => {
    if (rememberCheckbox.checked) {
      saveOrClearKey();
    }
  });

  rememberCheckbox.addEventListener('change', () => {
    if (rememberCheckbox.checked) {
      saveOrClearKey();
    } else {
      saveOrClearKey();
      keyInput.value = '';
    }
  });

  window._loadSavedApiKey = loadSavedKey;
  loadSavedKey();
}

function onProviderChange() {
  const provider = document.getElementById('ai-provider').value;
  const modelSelect = document.getElementById('ai-model');
  const keyLabel = document.getElementById('api-key-label');
  const keyInput = document.getElementById('api-key');
  const rememberLabel = document.getElementById('remember-api-key-label');
  const ollamaRow = document.getElementById('ollama-endpoint-row');

  // Update model dropdown
  modelSelect.innerHTML = '';
  if (AI_MODELS[provider]) {
    AI_MODELS[provider].forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      modelSelect.appendChild(opt);
    });
  }

  // Show/hide Ollama endpoint row
  if (ollamaRow) ollamaRow.style.display = provider === 'ollama' ? 'block' : 'none';

  // Reset label style
  if (keyLabel) keyLabel.style.color = '';

  // Update key label, placeholder, and container visibility
  if (provider === 'openrouter') {
    if (keyLabel) { keyLabel.textContent = 'OpenRouter API Key'; keyLabel.style.display = ''; }
    if (keyInput) { keyInput.placeholder = 'sk-or-v1-…'; keyInput.style.display = ''; }
    if (rememberLabel) rememberLabel.style.display = 'flex';
    fetchOpenRouterModels();
  } else if (provider === 'anthropic') {
    if (keyLabel) { keyLabel.textContent = 'Anthropic API Key'; keyLabel.style.display = ''; }
    if (keyInput) { keyInput.placeholder = 'sk-ant-api…'; keyInput.style.display = ''; }
    if (rememberLabel) rememberLabel.style.display = 'flex';
    updateModelSyncBadge('Anthropic Direct', false);
  } else if (provider === 'ollama') {
    // Ollama runs locally — hide key input & remember checkbox completely
    if (keyLabel) keyLabel.style.display = 'none';
    if (keyInput) keyInput.style.display = 'none';
    if (rememberLabel) rememberLabel.style.display = 'none';
    fetchOllamaModels();
  }

  if (window._loadSavedApiKey) window._loadSavedApiKey();
}

// Initialize API key persistence first, then setup model dropdown and start auto-fetching on load
initApiKeyPersistence();
onProviderChange();
fetchOpenRouterModels();

async function callClaude(prompt, systemPrompt, onChunk) {
  const provider = document.getElementById('ai-provider').value;
  const model = document.getElementById('ai-model').value;
  const key = document.getElementById('api-key').value.trim();

  if (!key) {
    setAiStatus('⚠ Enter your ' + (provider === 'openrouter' ? 'OpenRouter' : 'Anthropic') + ' API key first.');
    return null;
  }

  setAiStatus('✦ Generating via ' + (provider === 'openrouter' ? 'OpenRouter' : 'Anthropic') + '…');

  try {
    let res;

    if (provider === 'openrouter') {
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
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt || AI_SYSTEM_BASE_PROMPT },
            { role: 'user', content: prompt },
          ],
        }),
      });
    } else {
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
          stream: true,
          system: systemPrompt || AI_SYSTEM_BASE_PROMPT,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setAiStatus('✕ API Error: ' + (err.error?.message || res.status));
      return null;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let textContent = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const cleaned = line.trim();
        if (!cleaned) continue;
        if (cleaned.startsWith('data: ')) {
          const dataStr = cleaned.slice(6);
          if (dataStr === '[DONE]') continue;
          try {
            const dataObj = JSON.parse(dataStr);
            if (provider === 'openrouter') {
              const delta = dataObj.choices?.[0]?.delta?.content || '';
              if (delta) {
                textContent += delta;
                if (onChunk) onChunk(textContent);
              }
            } else {
              if (dataObj.type === 'content_block_delta') {
                const delta = dataObj.delta?.text || '';
                if (delta) {
                  textContent += delta;
                  if (onChunk) onChunk(textContent);
                }
              }
            }
          } catch (err) {
            // Ignore incomplete chunks
          }
        }
      }
    }

    setAiStatus('✓ Done — ' + model.split('/').pop());
    setTimeout(() => setAiStatus(''), 3000);
    return textContent;

  } catch (e) {
    setAiStatus('✕ Network error: ' + e.message);
    return null;
  }
}

function setAiStatus(msg) {
  document.getElementById('ai-status').textContent = msg;
}

/* ───────────────────────────────────────────
   PHASE 7.2.3 — OLLAMA LOCAL AI ENGINE
   Routes AI requests to a local Ollama instance
   (default: http://localhost:11434). No API key needed.
   100% private — no data leaves your machine.
─────────────────────────────────────────── */
async function callOllama(prompt, systemPrompt, model, onChunk) {
  const endpointInput = document.getElementById('ollama-endpoint');
  const baseUrl = (endpointInput ? endpointInput.value.trim() : 'http://localhost:11434').replace(/\/$/, '');
  const url = baseUrl + '/api/chat';

  setAiStatus('🦙 Generating via Ollama (' + model + ')…');

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt || AI_SYSTEM_BASE_PROMPT },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.status);
      setAiStatus('✕ Ollama error: ' + errText);
      return null;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let textContent = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      // Ollama streams one JSON object per line
      const lines = chunk.split('\n').filter(l => l.trim());
      for (const line of lines) {
        try {
          const obj = JSON.parse(line);
          const delta = obj.message?.content || '';
          if (delta) {
            textContent += delta;
            if (onChunk) onChunk(textContent);
          }
          if (obj.done) break;
        } catch {
          // Ignore incomplete JSON lines
        }
      }
    }

    setAiStatus('✓ Done — Ollama: ' + model);
    setTimeout(() => setAiStatus(''), 3000);
    return textContent;

  } catch (e) {
    if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
      setAiStatus('✕ Cannot reach Ollama. Run: ollama serve');
    } else {
      setAiStatus('✕ Ollama error: ' + e.message);
    }
    return null;
  }
}

/* ───────────────────────────────────────────
   UPGRADED AI SYSTEM PROMPTS (Rich Syntax Aware)
─────────────────────────────────────────── */
const AI_SYSTEM_BASE_PROMPT = `You are an expert AI notebook assistant for Inkflow, a high-fidelity handwritten notes app.

Format your output using Inkflow's native structured syntax so notes render beautifully on paper:
1. HEADINGS: Use '# Title' for the main note title and '## Subtitle' for section headers.
2. LISTS: Use '- Item' for bullet lists and '1. Item' for step-by-step numbered points.
3. HIGHLIGHTS: Wrap core concepts or keywords in '==key term==' to highlight them.
4. STICKY NOTES: Add margin sticky notes for crucial takeaways using '[sticky:yellow] Note text [sticky]' (colors: yellow, cyan, pink, mint).
5. CALLOUT BOXES: Add callouts for formulas, definitions, or warnings using '[callout:info] Info text [callout]' (types: info, warning, formula).
6. FLASHCARDS: Include study questions using 'Q: Question' followed by 'A: Answer' on the next line.

GUIDELINES:
- Output clean text with Inkflow syntax tags only. Do NOT use markdown code fences (\`\`\`), HTML tags, or raw bold asterisks (\*\*).
- Keep formatting elegant, human-like, and easy to read on handwritten notebook pages.`;

/* ───────────────────────────────────────────
   PHASE 7.3–7.6 — AI ACTION DISPATCHER
─────────────────────────────────────────── */
async function callAI(prompt, systemPrompt, onChunk) {
  const provider = document.getElementById('ai-provider').value;
  if (provider === 'ollama') {
    const model = document.getElementById('ai-model').value;
    return callOllama(prompt, systemPrompt, model, onChunk);
  }
  return callClaude(prompt, systemPrompt, onChunk);
}

/* ───────────────────────────────────────────
   SMART ARRANGE — offline text tidy-up
   Deterministic structuring used by the
   Smart Arrange button so it works with no
   AI provider or API key.
─────────────────────────────────────────── */
function smartArrangeLocal(text) {
  let fixes = 0;
  const isFillIn = (l) => /_{2,}/.test(l);
  const out = [];

  for (let line of text.split('\n')) {
    // Trim trailing whitespace
    const trimmed = line.replace(/[ \t]+$/, '');
    if (trimmed !== line) { fixes++; line = trimmed; }

    // Normalize bullet markers (*, •, ‣ → "- ")
    const bullet = line.match(/^\s*([*•‣]|-(?!\s*-))\s+(.*)$/);
    if (bullet) {
      const normalized = '- ' + bullet[2];
      if (normalized !== line) fixes++;
      line = normalized;
    }

    // Spacing cleanup — fill-in lines (Runs of underscores) are preserved as-is
    if (!isFillIn(line)) {
      const noSpaceBeforePunct = line.replace(/[ \t]+([,.;:!?])/g, '$1');
      let spaced = noSpaceBeforePunct;
      let prev;
      do {
        prev = spaced;
        spaced = spaced.replace(/(^|[^_]) {2,}(?=[^_]|$)/g, '$1 ');
      } while (spaced !== prev);
      if (spaced !== line) fixes++;
      line = spaced;
    }

    out.push(line);
  }

  let result = out.join('\n');

  // Collapse 3+ consecutive newlines to one blank line
  const collapsed = result.replace(/\n{3,}/g, '\n\n');
  if (collapsed !== result) fixes++;
  result = collapsed;

  // Add a blank line before numbered questions ("12. How does ... ?")
  const structured = [];
  for (const l of result.split('\n')) {
    const prev = structured[structured.length - 1];
    if (/^\d+\.\s+.*\?\s*$/.test(l) && prev !== undefined && prev !== '' && !/^\d+\./.test(prev)) {
      structured.push('');
      fixes++;
    }
    structured.push(l);
  }
  result = structured.join('\n');

  // End with exactly one newline
  const finalText = result.replace(/\s+$/, '') + '\n';
  if (finalText !== result) fixes++;
  result = finalText;

  return { text: result, fixes };
}

async function aiAction(type) {
  const textarea = document.getElementById('text-input');
  const currentText = textarea.value.trim();

  const btns = document.querySelectorAll('.ai-btn-group .btn');
  btns.forEach(b => b.disabled = true);

  let result = null;
  let lastRenderTime = 0;

  const onChunk = (text) => {
    textarea.value = text;
    S.text = text;
    const now = Date.now();
    if (now - lastRenderTime > 200) {
      renderText(text);
      lastRenderTime = now;
    }
  };

  if (type === 'summarize') {
    if (!currentText) { setAiStatus('⚠ Add some text first.'); btns.forEach(b => b.disabled = false); return; }
    result = await callAI(
      currentText,
      `${AI_SYSTEM_BASE_PROMPT}\n\nTASK: Summarize the provided text into clear, structured notebook notes. Include a '# Summary' header, main bullet points with ==highlighted== key terms, a '[sticky:cyan] Key Takeaway [sticky]' box, and 2-3 'Q: ... \\n A: ...' flashcards at the end.`,
      onChunk
    );
  }

  if (type === 'arrange') {
    if (!currentText) { setAiStatus('⚠ Add some text first.'); btns.forEach(b => b.disabled = false); return; }
    // Smart Arrange runs fully offline — deterministic structuring, no API key needed.
    const arranged = smartArrangeLocal(textarea.value);
    result = arranged.text;
    setAiStatus('✦ Smart Arrange applied offline — ' + arranged.fixes + ' tidy-up' + (arranged.fixes === 1 ? '' : 's') + ', no AI needed.');
    showToast('✓ Smart Arrange: ' + arranged.fixes + ' fixes (no AI needed)', 'success');
  }

  if (type === 'grammar') {
    if (!currentText) { setAiStatus('⚠ Add some text first.'); btns.forEach(b => b.disabled = false); return; }
    result = await callAI(
      currentText,
      `${AI_SYSTEM_BASE_PROMPT}\n\nTASK: Fix all grammar, spelling, and phrasing errors in the provided text. Enhance sentence flow while keeping the original meaning intact. Format the polished text into clean notebook sections using '#' headers and bullet points where helpful.`,
      onChunk
    );
  }

  if (type === 'lecture') {
    if (!currentText) { setAiStatus('⚠ Paste lecture text first.'); btns.forEach(b => b.disabled = false); return; }
    result = await callAI(
      currentText,
      `${AI_SYSTEM_BASE_PROMPT}\n\nTASK: Transform raw lecture transcripts or audio notes into an expert study note set. Include a '# Lecture Notes' title, '## Key Themes', '- ' bullet points, '[callout:formula] Core Concept [callout]', '[sticky:pink] Exam Tip [sticky]', and 'Q: / A:' revision flashcards.`,
      onChunk
    );
  }

  if (type === 'assignment') {
    const topic = document.getElementById('ai-topic').value.trim() || currentText;
    if (!topic) { setAiStatus('⚠ Enter a topic first.'); btns.forEach(b => b.disabled = false); return; }
    result = await callAI(
      'Write a detailed, well-structured academic assignment on the topic: ' + topic,
      `${AI_SYSTEM_BASE_PROMPT}\n\nTASK: Write a complete, comprehensive academic assignment on the topic. Include an introduction, structured body sections ('## Section Title'), supporting bullet points, ==highlighted key terminology==, '[callout:info] Conclusion [callout]', and revision flashcards ('Q: / A:').`,
      onChunk
    );
  }

  if (result !== null) {
    textarea.value = result;
    S.text = result;
    renderText(S.text);
    autosave();
  }

  btns.forEach(b => b.disabled = false);
}


/* ───────────────────────────────────────────
   PHASE 8.1–8.2 — IMAGE EXPORT (PNG / JPG)
   Reads directly from the canvas elements at full native resolution.
   For single-page docs: one file. For multi-page: one file per page.
─────────────────────────────────────────── */
/**
 * Renders a canvas to a high-DPI off-screen canvas at the given scale factor
 * and returns it. Used by all export paths to boost output resolution.
 */
function _upscaleCanvas(src, scale) {
  const hq = document.createElement('canvas');
  hq.width  = src.width  * scale;
  hq.height = src.height * scale;
  const ctx = hq.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, hq.width, hq.height);
  return hq;
}

async function exportImage(format) {
  if (!pages || pages.length === 0) {
    showExportToast('Nothing to export — add some text first.', 'warn');
    return;
  }

  if (document.activeElement && (document.activeElement.classList.contains('page-editor') || document.activeElement.classList.contains('margin-text-overlay'))) {
    document.activeElement.blur();
    await new Promise(r => setTimeout(r, 320));
  }

  // PNG is lossless; JPEG quality raised to 0.97 for near-lossless output.
  // Both formats are upscaled 2× for higher DPI (≈150 DPI on A4 canvas).
  const EXPORT_SCALE = 2;
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const quality  = format === 'png' ? 1.0 : 0.97;
  const ext      = format === 'png' ? 'png' : 'jpg';

  try {
    if (pages.length === 1) {
      showExportToast('Exporting ' + ext.toUpperCase() + '…', 'info');
      const hq = _upscaleCanvas(pages[0], EXPORT_SCALE);
      hq.toBlob((blob) => {
        if (!blob) {
          showExportToast('Export failed: Blob generation failed', 'error');
          return;
        }
        const url = URL.createObjectURL(blob);
        triggerDownload(url, 'inkflow-notes.' + ext);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showExportToast('✓ ' + ext.toUpperCase() + ' saved!', 'success');
      }, mimeType, quality);
    } else {
      for (let i = 0; i < pages.length; i++) {
        showExportToast(`Exporting ${ext.toUpperCase()} (Page ${i + 1}/${pages.length})…`, 'info');
        await new Promise((resolve) => {
          const hq = _upscaleCanvas(pages[i], EXPORT_SCALE);
          hq.toBlob((blob) => {
            if (!blob) { resolve(); return; }
            const url = URL.createObjectURL(blob);
            triggerDownload(url, `inkflow-notes-page${i + 1}.${ext}`);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            resolve();
          }, mimeType, quality);
        });
        await new Promise(r => setTimeout(r, 120));
      }
      showExportToast('✓ ' + ext.toUpperCase() + ' pages saved!', 'success');
    }
  } catch (e) {
    showExportToast('Export failed: ' + e.message, 'error');
    console.error('[Inkflow] exportImage error:', e);
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

  if (document.activeElement && (document.activeElement.classList.contains('page-editor') || document.activeElement.classList.contains('margin-text-overlay'))) {
    document.activeElement.blur();
    await new Promise(r => setTimeout(r, 320));
  }

  try {
    const { jsPDF } = window.jspdf;
    // Use high-quality PNG (lossless) embedded in the PDF with no re-compression
    // for the sharpest possible output. Pages are upscaled 2× before encoding.
    const PDF_SCALE = 2;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: false, // avoid double-compression on top of PNG
    });

    for (let i = 0; i < pages.length; i++) {
      showExportToast(`Building PDF (Page ${i + 1}/${pages.length})…`, 'info');
      await new Promise(r => setTimeout(r, 60));
      if (i > 0) doc.addPage();
      const hq = _upscaleCanvas(pages[i], PDF_SCALE);
      const imgData = hq.toDataURL('image/png', 1.0);
      // 'NONE' compression preserves pixel-perfect quality at the cost of a
      // slightly larger file, which is ideal for print/archive use.
      doc.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'NONE');
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

  if (document.activeElement && (document.activeElement.classList.contains('page-editor') || document.activeElement.classList.contains('margin-text-overlay'))) {
    document.activeElement.blur();
    await new Promise(r => setTimeout(r, 320));
  }

  try {
    for (let i = 0; i < pages.length; i++) {
      showExportToast(`Building SVG (Page ${i + 1}/${pages.length})…`, 'info');
      await new Promise(r => setTimeout(r, 60));
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
      await new Promise(r => setTimeout(r, 120));
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
    canvas.toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        showExportToast('✓ Copied to clipboard!', 'success');
      } catch (e) {
        showExportToast('Clipboard copy failed: ' + e.message, 'error');
      }
    }, 'image/png', 1.0);
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
    exportToastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
  }
}

let appToastTimer = null;
function showToast(msg, type = 'info') {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = 'export-toast export-toast--' + type;
  toast.style.opacity = '1';
  clearTimeout(appToastTimer);
  appToastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}


/* ───────────────────────────────────────────
   PHASE 8.6–8.7 — AUTOSAVE & STATE RESTORE
─────────────────────────────────────────── */
const DB_NAME = 'InkflowDB';
const DB_VERSION = 2;
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
      // Both stores must be created here: onupgradeneeded only fires when the
      // version increases, so a handler that creates just one store would
      // permanently lock the other out of this database.
      if (!db.objectStoreNames.contains(NOTEBOOKS_STORE)) {
        db.createObjectStore(NOTEBOOKS_STORE, { keyPath: 'id' });
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
  return getDB().then(db => {
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
  return getDB().then(db => {
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
    if (!dataUrl) { resolve(false); return; }
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth || img.width || 1;
      c.height = img.naturalHeight || img.height || 1;
      const cctx = c.getContext('2d');
      cctx.drawImage(img, 0, 0);
      try {
        // Phase 9.8 — Use stricter isCellBlank check
        resolve(!isCellBlank(c));
      } catch (e) {
        // Can't inspect it (e.g. tainted canvas) — don't destroy data we can't verify.
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
// that character — which is exactly what causes "missing" letters.
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
      delete glyphImageCache[char];
    }
  }
  if (pruned > 0) {
    console.warn(`Inkflow: removed ${pruned} blank drafted glyph(s) that were rendering as invisible characters.`);
  }
  return pruned;
}

let autosaveTimeout;
function autosave() {
  const indicator = document.getElementById('autosave-indicator');
  if (indicator) {
    indicator.className = 'autosave-badge saving';
    indicator.innerHTML = '<span class="autosave-icon">⏳</span> <span class="autosave-text">Saving...</span>';
  }
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
      activeNotebookId: activeNotebookId,
      pageDates: S.pageDates,
      pageNos: S.pageNos,
      marginNotes: S.marginNotes,
      textAlignment: S.textAlignment,
      showHeaderBox: S.showHeaderBox,
      showMarginLabels: S.showMarginLabels
    };
    localStorage.setItem('inkflow-state', JSON.stringify(state));

    // Save to active notebook in IndexedDB if exists
    if (activeNotebookId) {
      const titleInput = document.getElementById('text-input').value.split('\n')[0].replace(/[#*?]/g, '').trim().substring(0, 30) || 'Untitled Note';
      const notebook = {
        id: activeNotebookId,
        title: titleInput,
        content: S.text,
        updatedAt: new Date().toISOString(),
        settings: {
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
          pageDates: S.pageDates,
          pageNos: S.pageNos,
          marginNotes: S.marginNotes,
          textAlignment: S.textAlignment,
          showHeaderBox: S.showHeaderBox,
          showMarginLabels: S.showMarginLabels
        }
      };
      
      getNotebooksDB().then(db => {
        const tx = db.transaction(NOTEBOOKS_STORE, 'readonly');
        tx.objectStore(NOTEBOOKS_STORE).get(activeNotebookId).onsuccess = (e) => {
          const existing = e.target.result;
          if (existing) {
            notebook.folder = existing.folder;
            notebook.tags = existing.tags;
            notebook.createdAt = existing.createdAt;
          } else {
            notebook.folder = 'Drafts';
            notebook.tags = [];
            notebook.createdAt = new Date().toISOString();
          }
          saveNotebook(notebook).then(() => {
            renderNotebooksList();
          });
        };
      }).catch(err => console.error("Error autosaving notebook in DB:", err));
    }

    if (indicator) {
      indicator.className = 'autosave-badge saved';
      indicator.innerHTML = '<span class="autosave-icon">☁️</span> <span class="autosave-text">Saved</span>';
    }
  }, 1000);
}

async function restoreState() {
  const raw = localStorage.getItem('inkflow-state');
  
  // 1. Try to load from IndexedDB
  try {
    const dbGlyphs = await getGlyphsDB();
    Object.assign(draftedGlyphs, dbGlyphs);
  } catch (err) {
    console.error("Error loading glyphs from IndexedDB:", err);
  }

  if (!raw) return;

  try {
    const state = JSON.parse(raw);
    if (state.activeNotebookId) {
      activeNotebookId = state.activeNotebookId;
    }
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
    if (state.noteLayout) {
      S.noteLayout = state.noteLayout;
      const select = document.getElementById('layout-select');
      if (select) select.value = state.noteLayout;
    }

    // Restore pageDates, pageNos, and marginNotes
    if (state.pageDates) S.pageDates = state.pageDates;
    if (state.pageNos) S.pageNos = state.pageNos;
    if (state.marginNotes) S.marginNotes = state.marginNotes;
    if (state.textAlignment) {
      S.textAlignment = state.textAlignment;
      document.querySelectorAll('.align-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.align === S.textAlignment);
      });
      const labels = { top: 'Upper', middle: 'Middle', bottom: 'Lower' };
      const alignVal = document.getElementById('align-val');
      if (alignVal) alignVal.textContent = labels[S.textAlignment] || 'Middle';
    }
    if (state.showHeaderBox !== undefined) {
      S.showHeaderBox = state.showHeaderBox;
      const headerToggle = document.getElementById('header-toggle');
      if (headerToggle) headerToggle.checked = S.showHeaderBox;
    }
    if (state.showMarginLabels !== undefined) {
      S.showMarginLabels = state.showMarginLabels;
      const marginLabelsToggle = document.getElementById('margin-labels-toggle');
      if (marginLabelsToggle) marginLabelsToggle.checked = S.showMarginLabels;
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
  } catch (e) { /* ignore corrupt state */ }

  // 2.5. Remove any stale blank glyphs (e.g. saved before the ink-check guard
  // existed, or pulled in via the localStorage migration above) so they
  // don't get drawn as invisible characters.
  await pruneBlankGlyphs();

  // 3. Highlight drafted characters in UI
  ALL_TEMPLATE_CHARS.forEach(char => {
    if (draftedGlyphs[char] && draftedGlyphs[char].length > 0) {
      const btn = Array.from(document.querySelectorAll('.char-btn')).find(b => b.textContent === char);
      if (btn) btn.classList.add('drafted');
    }
  });

  // Update header and toggle visibility in UI based on restored paper style and checkbox state
  const showHeader = (S.paperStyle === 'ruled' || S.paperStyle === 'clean') && S.showHeaderBox !== false;
  document.querySelectorAll('.worksheet-header').forEach(wh => {
    wh.style.display = showHeader ? 'flex' : 'none';
  });
  const headerToggleContainer = document.getElementById('header-toggle-container');
  if (headerToggleContainer) {
    headerToggleContainer.style.display = (S.paperStyle === 'ruled' || S.paperStyle === 'clean') ? 'flex' : 'none';
  }

  // Optionally redraw if studio is open
  if (typeof drawStudioCanvas === 'function') drawStudioCanvas(); // eslint-disable-line no-undef -- optional studio hook
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
/* ───────────────────────────────────────────
   UI ACTION BINDING — all click/input handlers
   are attached here instead of inline HTML
   onclick attributes, so markup never embeds
   global function calls.
─────────────────────────────────────────── */
function bindUIActions() {
  const $ = (id) => document.getElementById(id);

  /* Toolbar */
  $('btn-study-mode').addEventListener('click', () => toggleStudyMode());
  $('btn-open-flashcards').addEventListener('click', () => openFlashcardsModal());

  /* Sidebar collapsible sections */
  document.querySelectorAll('.sb-section-header').forEach((header) => {
    header.addEventListener('click', () => toggleSection(header.closest('.sb-section').id));
  });

  /* Notebooks */
  $('btn-new-notebook').addEventListener('click', () => createNewNotebook());
  $('btn-new-folder').addEventListener('click', () => createNewFolder());

  /* Text input */
  $('btn-render').addEventListener('click', () => triggerRender());
  $('btn-voice').addEventListener('click', () => toggleVoiceInput());
  $('btn-clear-text').addEventListener('click', () => clearText());

  /* Font & style */
  $('btn-autofit').addEventListener('click', () => autoFitFontSize());
  $('margin-labels-toggle').addEventListener('change', (e) => {
    S.showMarginLabels = e.target.checked;
    debounceRender();
    autosave();
  });
  document.querySelectorAll('.align-btn').forEach((btn) => {
    btn.addEventListener('click', () => setTextAlignment(btn.dataset.align));
  });
  $('btn-reset-defaults').addEventListener('click', () => resetToDefaults());

  /* Paper style */
  document.querySelectorAll('.paper-btn').forEach((btn) => {
    btn.addEventListener('click', () => setPaper(btn));
  });

  /* Ink presets */
  document.querySelectorAll('button[data-ink]').forEach((btn) => {
    btn.addEventListener('click', () => setInkPreset(btn.dataset.ink, btn.dataset.inkName));
  });

  /* AI tools */
  $('ai-provider').addEventListener('change', () => onProviderChange());
  $('model-sync-status').addEventListener('click', () => refreshCurrentProviderModels(true));
  document.querySelectorAll('[data-ai-action]').forEach((btn) => {
    btn.addEventListener('click', () => aiAction(btn.dataset.aiAction));
  });

  /* Export */
  document.querySelectorAll('[data-export]').forEach((btn) => {
    btn.addEventListener('click', () => exportImage(btn.dataset.export));
  });
  $('btn-export-pdf').addEventListener('click', () => exportPDF());
  $('btn-export-svg').addEventListener('click', () => exportSVG());
  $('btn-copy-clipboard').addEventListener('click', () => copyToClipboard());
  $('btn-print').addEventListener('click', () => window.print());

  /* Animation */
  $('btn-anim-start').addEventListener('click', () => startAnimation());
  $('btn-anim-stop').addEventListener('click', () => stopAnimation());

  /* Theme packs */
  document.querySelectorAll('.theme-pack-btn').forEach((btn) => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
  });

  /* Page navigation */
  $('nav-prev').addEventListener('click', () => navigatePage(-1));
  $('nav-next').addEventListener('click', () => navigatePage(1));

  /* HandFonted Studio modal */
  $('handfonted-modal-close').addEventListener('click', () => closeHandFontedModal());
  document.querySelectorAll('.tab-btn[data-font-tab]').forEach((btn) => {
    btn.addEventListener('click', () => switchFontTab(btn.dataset.fontTab));
  });
  document.querySelectorAll('.sheet-tab[data-sheet]').forEach((btn) => {
    btn.addEventListener('click', () => switchSheet(btn.dataset.sheet));
  });
  $('btn-sketch-undo').addEventListener('click', () => window.undoSketchStroke());
  $('btn-sketch-clear').addEventListener('click', () => clearSketchCanvas());
  $('brush-size-slider').addEventListener('input', () => window.updateBrushSize());
  $('btn-save-char').addEventListener('click', () => saveActiveCharacter());
  $('btn-next-char').addEventListener('click', () => advanceActiveCharacter());
  $('btn-export-font-project').addEventListener('click', () => exportFontProject());
  $('btn-import-font-project-trigger').addEventListener('click', () => $('import-font-project').click());
  $('import-font-project').addEventListener('change', (e) => importFontProject(e));
  $('btn-generate-template').addEventListener('click', () => generateDownloadTemplate());
  ['slider-grid-x', 'slider-grid-y', 'slider-grid-w', 'slider-grid-h'].forEach((id) => {
    $(id).addEventListener('input', () => updateAlignerGrid());
  });
  $('btn-download-font').addEventListener('click', () => exportCustomFontTTF());
  $('btn-build-font').addEventListener('click', () => buildCustomFont());

  /* Flashcards modal */
  $('flashcards-modal-close').addEventListener('click', () => closeFlashcardsModal());
  $('flashcard-container').addEventListener('click', () => flipFlashcard());
  $('btn-flashcard-prev').addEventListener('click', () => prevFlashcard());
  $('btn-flashcard-next').addEventListener('click', () => nextFlashcard());

  /* Study mode */
  $('btn-exit-study-mode').addEventListener('click', () => toggleStudyMode());
}

async function initApp() {
  bindUIActions();
  await restoreState();
  setupFileUpload();
  initHandFontedStudio();

  // Load and render notebooks explorer
  try {
    const list = await getAllNotebooks();
    if (list.length === 0) {
      // Create first welcome note
      const welcomeNote = {
        id: 'welcome-note',
        title: 'Welcome to Inkflow',
        content: S.text,
        folder: 'Drafts',
        tags: ['welcome'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        settings: {
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
          noteLayout: S.noteLayout
        }
      };
      await saveNotebook(welcomeNote);
      activeNotebookId = 'welcome-note';
    } else {
      if (!activeNotebookId && list.length > 0) {
        activeNotebookId = list[0].id;
      }
    }
    await loadNotebook(activeNotebookId);
  } catch (err) {
    console.error("Error initializing notebooks explorer:", err);
  }
  
  renderNotebooksList();
}

// Wire all slider controls to autosave
['font-size-slider', 'line-spacing', 'word-spacing', 'margin-slider',
  'rotation-slider', 'bleed-slider', 'pressure-slider', 'speed-slider'].forEach(id => {
    document.getElementById(id).addEventListener('change', autosave);
  });
fontSelect.addEventListener('change', autosave);
inkColorInput.addEventListener('change', autosave);

const headerToggle = document.getElementById('header-toggle');
if (headerToggle) {
  headerToggle.addEventListener('change', function() {
    S.showHeaderBox = this.checked;
    const showHeader = (S.paperStyle === 'ruled' || S.paperStyle === 'clean') && S.showHeaderBox !== false;
    document.querySelectorAll('.worksheet-header').forEach(wh => {
      wh.style.display = showHeader ? 'flex' : 'none';
    });
    autosave();
    debounceRender();
  });
}

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
    showHeaderBox: true,
    showMarginLabels: true,
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

  // Update Text Alignment
  document.querySelectorAll('.align-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const alignBtn = document.querySelector(`.align-btn[data-align="${defaults.textAlignment}"]`);
  if (alignBtn) alignBtn.classList.add('active');
  const alignVal = document.getElementById('align-val');
  if (alignVal) alignVal.textContent = 'Middle';

  // Update Paper styles active classes
  document.querySelectorAll('.paper-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.style === defaults.paperStyle);
  });

  // Reset Header checkbox
  const headerToggle = document.getElementById('header-toggle');
  if (headerToggle) headerToggle.checked = true;

  const headerToggleContainer = document.getElementById('header-toggle-container');
  if (headerToggleContainer) {
    headerToggleContainer.style.display = 'flex'; // 'ruled' is the default
  }

  document.querySelectorAll('.worksheet-header').forEach(wh => {
    wh.style.display = 'flex';
  });

  // Sync theme select dropdown to default
  const themeSelect = document.getElementById('theme-select');
  if (themeSelect) themeSelect.value = 'default';

  // Save & Render
  autosave();
  debounceRender();
}

/* ───────────────────────────────────────────
   HANDFONTED STUDIO CUSTOM FONT BUILDER
─────────────────────────────────────────── */

// Modal Toggles

/* ───────────────────────────────────────────
   ACCESSIBILITY & MODAL FOCUS TRAPPING (WCAG 2.1)
─────────────────────────────────────────── */
let currentModalFocusTrapCleanups = new Map();

function trapFocusModal(modalElement) {
  if (!modalElement) return;

  if (currentModalFocusTrapCleanups.has(modalElement)) {
    currentModalFocusTrapCleanups.get(modalElement)();
    currentModalFocusTrapCleanups.delete(modalElement);
  }

  const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const focusables = Array.from(modalElement.querySelectorAll(focusableSelector)).filter(el => {
    return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
  });

  if (focusables.length === 0) return;

  const firstEl = focusables[0];
  const lastEl = focusables[focusables.length - 1];
  const previouslyFocused = document.activeElement;

  firstEl.focus();

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      modalElement.classList.add('hidden');
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
      return;
    }

    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstEl) {
        lastEl.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastEl) {
        firstEl.focus();
        e.preventDefault();
      }
    }
  };

  modalElement.addEventListener('keydown', handleKeyDown);

  const cleanup = () => {
    modalElement.removeEventListener('keydown', handleKeyDown);
  };

  currentModalFocusTrapCleanups.set(modalElement, cleanup);
}

// Modal Toggles
function openHandFontedModal() {
  const modal = document.getElementById('handfonted-modal');
  if (modal) {
    modal.classList.remove('hidden');
    trapFocusModal(modal);
  }
  switchSheet('letters');
}

function closeHandFontedModal() {
  const modal = document.getElementById('handfonted-modal');
  if (modal) modal.classList.add('hidden');
}

function switchSheet(sheet) {
  activeSheet = sheet;
  document.querySelectorAll('.sheet-tab').forEach(b => b.classList.remove('active'));
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
      y: (clientY - rect.top) * scaleY
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
        color: ctx.strokeStyle
      });
      currentStroke = [];
    }
    drawing = false;
  }
  
  // Undo functionality
  window.undoSketchStroke = function() {
    if (strokes.length === 0) return;
    strokes.pop();
    redrawCanvas();
  };
  
  // Brush size update
  window.updateBrushSize = function() {
    const slider = document.getElementById('brush-size-slider');
    brushSize = parseFloat(slider.value);
    document.getElementById('brush-size-val').textContent = brushSize.toFixed(1);
    ctx.lineWidth = brushSize;
  };
  
  // Redraw all strokes
  function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes.forEach(stroke => {
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
  window.clearSketchCanvas = function() {
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
  chars.forEach(char => {
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
  
  // Phase 9.8 — Check if canvas has any significant ink before saving
  if (isCellBlank(canvas)) {
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
  saveGlyphDB(activeChar, dataUrl).catch(err => console.error("Error saving glyph to IndexedDB:", err));
  
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
  
  container.style.display = 'flex';
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
    totalGlyphs: Object.keys(draftedGlyphs).length
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
  reader.onload = async function(e) {
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
  const height = window.innerHeight;
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
  
  // Log device info for debugging
  console.log(`Device: ${device.type}, Canvas: ${canvas.width}x${canvas.height}, DPR: ${dpr}, Touch: ${device.isTouchDevice}`);
}

// Detect high refresh rate displays
function getOptimalAnimationSettings() {
  const refreshRate = screen.refreshRate || 60;
  
  return {
    useRAF: refreshRate >= 90, // Use requestAnimationFrame for smooth drawing on high refresh displays
    smoothing: refreshRate >= 120
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
      alert('🎉 You have drafted all characters in this set! Click "Generate & Apply Font" below to compile your TrueType handwriting font.');
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
    '6. Upload your sheets in Inkflow\'s HandFonted Studio',
    '',
    '7. Align the grid overlay to match your written template',
    '',
    '8. Click "Generate & Apply Font" to create your custom font!',
  ];
  
  let yPos = 550;
  instructions.forEach(line => {
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
    name: 'cover'
  });
  
  // ========================================
  // SHEET 2 & 3: CHARACTER TEMPLATES
  // ========================================
  const sheetTypes = [
    { key: 'letters', title: 'Letters (A-Z, a-z)' },
    { key: 'symbols', title: 'Numbers & Symbols' }
  ];
  
  sheetTypes.forEach(sheetType => {
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
      name: sheetType.key
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

/**
 * Checks if a canvas cell contains any significant ink (dark pixels).
 * This prevents empty glyphs from being added to the custom font.
 */
function isCellBlank(canvas) {
  const ctx = canvas.getContext('2d');
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Scans for any pixel that is both opaque enough and dark enough to count as handwriting
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha > 50) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (brightness < 160) {
        return false; // Found ink
      }
    }
  }
  return true; // No ink found
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
      // Draw image centered and scaled to fit within 256×256 while preserving aspect ratio
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

function canvasToOpentypePath(canvas) {
  const contours = traceCanvasContours(canvas);
  const path = new window.opentype.Path();
  
  if (contours.length === 0) return path;
  
  // Find global bounding box of all contours
  let globalMinX = Infinity, globalMaxX = -Infinity;
  let globalMinY = Infinity, globalMaxY = -Infinity;
  
  contours.forEach(points => {
    points.forEach(p => {
      globalMinX = Math.min(globalMinX, p.x);
      globalMaxX = Math.max(globalMaxX, p.x);
      globalMinY = Math.min(globalMinY, p.y);
      globalMaxY = Math.max(globalMaxY, p.y);
    });
  });
  
  // Calculate dimensions
  const width = globalMaxX - globalMinX || 1;
  const height = globalMaxY - globalMinY || 1;
  
  // Scale to fit within 600x700 units in the 1000 UPM box, maintaining aspect ratio
  const scale = Math.min(600 / width, 700 / height);
  
  // Center the glyph
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  const offsetX = 100 + (600 - scaledWidth) / 2;
  const offsetY = 100;
  
  contours.forEach(points => {
    if (points.length < 3) return;
    
    // Transform first point
    const x0 = ((points[0].x - globalMinX) * scale) + offsetX;
    const y0 = 800 - ((points[0].y - globalMinY) * scale) - offsetY;
    path.moveTo(x0, y0);
    
    // Transform remaining points
    for (let i = 1; i < points.length; i++) {
      const px = ((points[i].x - globalMinX) * scale) + offsetX;
      const py = 800 - ((points[i].y - globalMinY) * scale) - offsetY;
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
      advanceWidth: 400, // Reasonable space width for handwriting fonts
      path: new window.opentype.Path()
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
          cellCanvas = await loadImageToCanvas(draftedGlyphs[char]);
        } else {
          continue; // Skip if neither is present
        }
      } else {
        if (draftedGlyphs[char]) {
          cellCanvas = await loadImageToCanvas(draftedGlyphs[char]);
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
      if (isCellBlank(cellCanvas)) {
        continue;
      }

      const path = canvasToOpentypePath(cellCanvas);
      
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
      
      let minX = cellCanvas.width, maxX = 0;
      for (let y = 0; y < cellCanvas.height; y++) {
        for (let x = 0; x < cellCanvas.width; x++) {
          const idx = (y * cellCanvas.width + x) * 4;
          const alpha = pixels[idx + 3];
          const brightness = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
          
          if (alpha > 50 && brightness < 160) { // Standard ink threshold
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

/* ───────────────────────────────────────────
   HANDFONTED STUDIO — TTF FONT EXPORTER
   Compiles vector glyphs into a standalone .ttf file
   ready for installation on Windows, macOS, or mobile.
─────────────────────────────────────────── */
async function exportCustomFontTTF() {
  const fontNameInput = document.getElementById('custom-font-name');
  const fontName = (fontNameInput ? fontNameInput.value.replace(/[^a-zA-Z0-9]/g, '') : '') || 'MyHandwriting';
  
  const progressDiv = document.getElementById('font-build-progress');
  const statusText = document.getElementById('font-build-status-text');
  
  if (progressDiv) progressDiv.classList.remove('hidden');
  if (statusText) statusText.textContent = 'Compiling OpenType TTF binary...';

  try {
    await ensureOpentypeLoaded();

    const glyphsList = [];
    const notdefGlyph = new window.opentype.Glyph({
      name: '.notdef',
      unicode: 0,
      advanceWidth: 650,
      path: new window.opentype.Path()
    });
    glyphsList.push(notdefGlyph);

    const spaceGlyph = new window.opentype.Glyph({
      name: 'space',
      unicode: 32,
      advanceWidth: 400,
      path: new window.opentype.Path()
    });
    glyphsList.push(spaceGlyph);

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
        if (img) cellCanvas = cropTemplateCell(charIdx, sheetName);
        else if (draftedGlyphs[char]) cellCanvas = await loadImageToCanvas(draftedGlyphs[char]);
        else continue;
      } else {
        if (draftedGlyphs[char]) cellCanvas = await loadImageToCanvas(draftedGlyphs[char]);
        else if (alignerImages[sheetName]) cellCanvas = cropTemplateCell(charIdx, sheetName);
        else continue;
      }

      if (isCellBlank(cellCanvas)) continue;
      const path = canvasToOpentypePath(cellCanvas);
      if (!path.commands || path.commands.length === 0) continue;

      const ctx = cellCanvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, cellCanvas.width, cellCanvas.height);
      const pixels = imageData.data;
      let minX = cellCanvas.width, maxX = 0;
      for (let y = 0; y < cellCanvas.height; y++) {
        for (let x = 0; x < cellCanvas.width; x++) {
          const idx = (y * cellCanvas.width + x) * 4;
          if (pixels[idx + 3] > 50 && (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3 < 160) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
          }
        }
      }
      const scale = 800 / Math.max(cellCanvas.width, cellCanvas.height);
      const glyphWidth = (maxX - minX) * scale;
      const advanceWidth = Math.max(Math.round(glyphWidth + 100), 250);

      const glyph = new window.opentype.Glyph({
        name: char,
        unicode: char.charCodeAt(0),
        advanceWidth: advanceWidth,
        path: path
      });
      glyphsList.push(glyph);
    }

    if (glyphsList.length <= 2) {
      alert('Please draft at least one character in sketchpad or upload a filled template grid before exporting.');
      if (progressDiv) progressDiv.classList.add('hidden');
      return;
    }

    const font = new window.opentype.Font({
      familyName: fontName,
      styleName: 'Regular',
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      glyphs: glyphsList
    });

    font.download(`${fontName}.ttf`);

    if (progressDiv) progressDiv.classList.add('hidden');
    showToast(`✓ Downloaded ${fontName}.ttf! Double-click to install on Windows/macOS.`, 'success');
  } catch (err) {
    console.error('[Inkflow] exportCustomFontTTF error:', err);
    alert('Error exporting TTF font: ' + err.message);
    if (progressDiv) progressDiv.classList.add('hidden');
  }
}

/* ───────────────────────────────────────────
   THEME PACKS ENGINE
─────────────────────────────────────────── */
const THEMES = {
  default: { paperStyle: 'ruled', inkColor: '#1c2340', rotationMax: 1, bleed: 0.5, pressure: 0.12, fontSize: 22 },
  vintage: { paperStyle: 'vintage', inkColor: '#3c2f2f', rotationMax: 3, bleed: 0.8, pressure: 0.15, fontSize: 22 },
  cute: { paperStyle: 'plain', inkColor: '#5d3f6a', rotationMax: 1.5, bleed: 0.4, pressure: 0.10, fontSize: 22 },
  science: { paperStyle: 'engineering', inkColor: '#1a331e', rotationMax: 0, bleed: 0.3, pressure: 0.08, fontSize: 20 },
  minimal: { paperStyle: 'dark', inkColor: '#e0e0e0', rotationMax: 0.8, bleed: 0.2, pressure: 0.10, fontSize: 22 },
  scrapbook: { paperStyle: 'dot_grid', inkColor: '#1c3144', rotationMax: 2.2, bleed: 0.6, pressure: 0.14, fontSize: 24 }
};

function applyTheme(themeId) {
  const theme = THEMES[themeId];
  if (!theme) return;
  
  S.activeTheme = themeId;
  S.paperStyle = theme.paperStyle;
  S.inkColor = theme.inkColor;
  S.rotationMax = theme.rotationMax;
  S.bleed = theme.bleed;
  S.pressure = theme.pressure;
  S.fontSize = theme.fontSize;
  
  if (themeId === 'minimal') {
    S._highlightColor = '#8d6e63'; // warmer brown for dark theme
  } else {
    S._highlightColor = '#ffe066';
  }
  
  // Sync UI paper selector
  const paperGrid = document.querySelector('.paper-grid');
  if (paperGrid) {
    const btns = paperGrid.querySelectorAll('.paper-btn');
    btns.forEach(btn => {
      if (btn.dataset.style === theme.paperStyle) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }
  
  // Sync UI ink color picker
  const colorInput = document.getElementById('ink-color');
  const colorLabel = document.getElementById('ink-color-label');
  if (colorInput) {
    colorInput.value = theme.inkColor;
  }
  if (colorLabel) {
    colorLabel.textContent = `${theme.inkColor}`;
  }
  
  // Sync UI sliders
  const sliderSize = document.getElementById('font-size-slider');
  if (sliderSize) {
    sliderSize.value = theme.fontSize;
    const valSize = document.getElementById('fs-val');
    if (valSize) valSize.textContent = theme.fontSize;
  }
  const sliderRot = document.getElementById('rotation-slider');
  if (sliderRot) {
    sliderRot.value = theme.rotationMax;
    const valRot = document.getElementById('rot-val');
    if (valRot) valRot.textContent = theme.rotationMax;
  }
  const sliderBleed = document.getElementById('bleed-slider');
  if (sliderBleed) {
    sliderBleed.value = theme.bleed;
    const valBleed = document.getElementById('bleed-val');
    if (valBleed) valBleed.textContent = theme.bleed;
  }
  const sliderPress = document.getElementById('pressure-slider');
  if (sliderPress) {
    sliderPress.value = theme.pressure;
    const valPress = document.getElementById('pressure-val');
    if (valPress) valPress.textContent = theme.pressure;
  }
  // Toggle worksheet header visibility based on paper style and the
  // header checkbox, matching the rule used by setPaper()/restoreState().
  const showHeader = (S.paperStyle === 'ruled' || S.paperStyle === 'clean') && S.showHeaderBox !== false;
  document.querySelectorAll('.worksheet-header').forEach(wh => {
    wh.style.display = showHeader ? 'flex' : 'none';
  });
  const headerToggleContainer = document.getElementById('header-toggle-container');
  if (headerToggleContainer) {
    headerToggleContainer.style.display = (S.paperStyle === 'ruled' || S.paperStyle === 'clean') ? 'flex' : 'none';
  }

  debounceRender();
  autosave();
}

/* ───────────────────────────────────────────
   STUDY MODE ENGINE
─────────────────────────────────────────── */
function toggleStudyMode() {
  document.body.classList.toggle('study-mode-active');
  const isActive = document.body.classList.contains('study-mode-active');
  S.isStudyMode = isActive;
  
  const floatingBtn = document.getElementById('btn-exit-study-mode');
  const toolbarBtn = document.getElementById('btn-study-mode');
  
  if (floatingBtn) {
    floatingBtn.style.display = isActive ? 'inline-flex' : 'none';
  }

  // Close mobile sidebar overlay if open
  if (isActive) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
  }
  
  if (toolbarBtn) {
    if (isActive) {
      toolbarBtn.classList.add('active');
    } else {
      toolbarBtn.classList.remove('active');
    }
  }

  // Smoothly center the current page canvas in the viewport
  setTimeout(() => {
    const pageToScroll = pages[S.currentPage] || pages[0];
    if (pageToScroll) {
      pageToScroll.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 60);
}

// Global Escape key listener to exit Study Mode easily
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('study-mode-active')) {
    toggleStudyMode();
  }
});

/* ───────────────────────────────────────────
   FLASHCARDS REVIEW DECK ENGINE
─────────────────────────────────────────── */
function openFlashcardsModal() {
  if (activeFlashcards.length === 0) return;
  currentFlashcardIndex = 0;
  
  const modal = document.getElementById('flashcards-modal');
  if (modal) {
    modal.classList.remove('hidden');
    trapFocusModal(modal);
  }
  
  const inner = document.getElementById('flashcard-inner');
  if (inner) {
    inner.classList.remove('flipped');
  }
  
  updateFlashcardUI();
}

function closeFlashcardsModal() {
  const modal = document.getElementById('flashcards-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function flipFlashcard() {
  const inner = document.getElementById('flashcard-inner');
  if (inner) {
    inner.classList.toggle('flipped');
  }
}

function nextFlashcard() {
  if (activeFlashcards.length === 0) return;
  currentFlashcardIndex = (currentFlashcardIndex + 1) % activeFlashcards.length;
  
  const inner = document.getElementById('flashcard-inner');
  if (inner) {
    inner.classList.remove('flipped');
  }
  
  setTimeout(updateFlashcardUI, 150);
}

function prevFlashcard() {
  if (activeFlashcards.length === 0) return;
  currentFlashcardIndex = (currentFlashcardIndex - 1 + activeFlashcards.length) % activeFlashcards.length;
  
  const inner = document.getElementById('flashcard-inner');
  if (inner) {
    inner.classList.remove('flipped');
  }
  
  setTimeout(updateFlashcardUI, 150);
}

function updateFlashcardUI() {
  const card = activeFlashcards[currentFlashcardIndex];
  if (!card) return;
  
  const qEl = document.getElementById('flashcard-question-text');
  const aEl = document.getElementById('flashcard-answer-text');
  const progEl = document.getElementById('flashcard-progress');
  
  if (qEl) qEl.textContent = card.q;
  if (aEl) aEl.textContent = card.a;
  if (progEl) progEl.textContent = `Card ${currentFlashcardIndex + 1} of ${activeFlashcards.length}`;
}

/* ───────────────────────────────────────────
   VOICE TO NOTES (SPEECH TO TEXT) ENGINE
─────────────────────────────────────────── */
let voiceRecognition = null;
let isVoiceActive = false;

function initVoiceToNotes() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const micBtn = document.getElementById('btn-voice');
  
  if (!SpeechRecognition) {
    if (micBtn) {
      micBtn.disabled = true;
      micBtn.style.opacity = '0.5';
      micBtn.title = 'Voice input not supported in this browser';
    }
    return;
  }
  
  voiceRecognition = new SpeechRecognition();
  voiceRecognition.continuous = true;
  voiceRecognition.interimResults = false;
  voiceRecognition.lang = 'en-US';
  
  voiceRecognition.onstart = () => {
    isVoiceActive = true;
    if (micBtn) {
      micBtn.classList.add('accent');
      micBtn.style.boxShadow = '0 0 10px var(--accent)';
      micBtn.innerHTML = '<i class="fa-solid fa-microphone-lines"></i>';
    }
  };
  
  voiceRecognition.onend = () => {
    isVoiceActive = false;
    if (micBtn) {
      micBtn.classList.remove('accent');
      micBtn.style.boxShadow = 'none';
      micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
    }
  };
  
  voiceRecognition.onerror = (e) => {
    console.error('Speech recognition error:', e);
    let errorMsg = 'Speech recognition error occurred.';
    if (e.error === 'not-allowed') {
      errorMsg = 'Microphone permission denied. Please allow microphone access.';
    } else if (e.error === 'no-speech') {
      errorMsg = 'No speech detected. Please speak clearly.';
    } else if (e.error === 'network') {
      errorMsg = 'Network error during speech recognition.';
    } else if (e.error === 'aborted') {
      errorMsg = 'Speech recognition stopped.';
    }
    showToast(errorMsg, 'error');
  };
  
  voiceRecognition.onresult = (event) => {
    const lastResultIdx = event.results.length - 1;
    const transcript = event.results[lastResultIdx][0].transcript;
    
    const inputEl = document.getElementById('text-input');
    if (inputEl) {
      const spacing = inputEl.value.trim().length > 0 ? '\n' : '';
      inputEl.value = inputEl.value + spacing + transcript.trim();
      S.text = inputEl.value;
      debounceRender();
      autosave();
    }
  };
}

function toggleVoiceInput() {
  if (!voiceRecognition) {
    initVoiceToNotes();
  }
  
  if (!voiceRecognition) return;
  
  if (isVoiceActive) {
    try {
      voiceRecognition.stop();
    } catch (err) {
      console.warn('Failed to stop speech recognition:', err);
    }
  } else {
    try {
      voiceRecognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      showToast('Failed to start speech recognition. Please try again.', 'error');
    }
  }
}

// Auto-initialize voice API on load
setTimeout(initVoiceToNotes, 500);

/* ───────────────────────────────────────────
   NOTEBOOKS & FOLDERS INDEXEDDB PERSISTENCE
─────────────────────────────────────────── */
const NOTEBOOKS_DB_NAME = 'InkflowDB';
const NOTEBOOKS_DB_VERSION = 2;
const NOTEBOOKS_STORE = 'notebooks';
let notebooksDbInstance = null;

function getNotebooksDB() {
  if (notebooksDbInstance) return Promise.resolve(notebooksDbInstance);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(NOTEBOOKS_DB_NAME, NOTEBOOKS_DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(NOTEBOOKS_STORE)) {
        db.createObjectStore(NOTEBOOKS_STORE, { keyPath: 'id' });
      }
      // See getDB(): both stores are created in every upgrade path.
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => {
      notebooksDbInstance = e.target.result;
      resolve(notebooksDbInstance);
    };
    request.onerror = (e) => {
      reject(e.target.error);
    };
  });
}

function saveNotebook(notebook) {
  return getNotebooksDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(NOTEBOOKS_STORE, 'readwrite');
      const store = tx.objectStore(NOTEBOOKS_STORE);
      const req = store.put(notebook);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

function getAllNotebooks() {
  return getNotebooksDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(NOTEBOOKS_STORE, 'readonly');
      const store = tx.objectStore(NOTEBOOKS_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  });
}

function deleteNotebook(id) {
  return getNotebooksDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(NOTEBOOKS_STORE, 'readwrite');
      const store = tx.objectStore(NOTEBOOKS_STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

/* ───────────────────────────────────────────
   NOTEBOOK ACTIONS & EXPLORER PANEL UI
─────────────────────────────────────────── */
async function createNewNotebook() {
  const name = prompt('Enter notebook title:', 'New Notebook');
  if (!name) return;
  
  const id = 'note-' + Date.now();
  const folder = prompt('Enter folder name:', 'Drafts') || 'Drafts';
  const newNote = {
    id: id,
    title: name,
    content: '# ' + name + '\nStart writing notes...',
    folder: folder,
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: {
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
      pageDates: {},
      pageNos: {}
    }
  };
  
  await saveNotebook(newNote);
  activeNotebookId = id;
  await loadNotebook(id);
  renderNotebooksList();
}

async function createNewFolder() {
  const folderName = prompt('Enter folder name:');
  if (!folderName) return;
  
  const id = 'note-' + Date.now();
  const newNote = {
    id: id,
    title: 'Untitled Note',
    content: 'Start writing notes...',
    folder: folderName,
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: {
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
      pageDates: {},
      pageNos: {}
    }
  };
  
  await saveNotebook(newNote);
  activeNotebookId = id;
  await loadNotebook(id);
  renderNotebooksList();
}

async function loadNotebook(id) {
  if (!id) return;
  try {
    const db = await getNotebooksDB();
    const tx = db.transaction(NOTEBOOKS_STORE, 'readonly');
    tx.objectStore(NOTEBOOKS_STORE).get(id).onsuccess = (e) => {
      const notebook = e.target.result;
      if (!notebook) return;
      
      activeNotebookId = id;
      
      // Load content
      document.getElementById('text-input').value = notebook.content;
      S.text = notebook.content;
      
      // Load settings if they exist
      if (notebook.settings) {
        Object.keys(notebook.settings).forEach(key => {
          S[key] = notebook.settings[key];
        });
        
        // Sync UI inputs
        const sliderMap = [
          ['font-size-slider', 'fs-val', 'fontSize'],
          ['line-spacing', 'ls-val', 'lineHeight'],
          ['word-spacing', 'ws-val', 'wordSpacing'],
          ['margin-slider', 'mg-val', 'margin'],
          ['rotation-slider', 'rot-val', 'rotationMax'],
          ['bleed-slider', 'bleed-val', 'bleed'],
          ['pressure-slider', 'pressure-val', 'pressure'],
        ];
        sliderMap.forEach(([sid, valId, key]) => {
          if (notebook.settings[key] !== undefined) {
            const el = document.getElementById(sid);
            if (el) { el.value = notebook.settings[key]; document.getElementById(valId).textContent = notebook.settings[key]; }
          }
        });
        
        const inkSelect = document.getElementById('ink-color');
        const inkLabel = document.getElementById('ink-color-label');
        if (inkSelect && notebook.settings.inkColor) {
          inkSelect.value = notebook.settings.inkColor;
          if (inkLabel) inkLabel.textContent = notebook.settings.inkColor;
        }

        const layoutSelect = document.getElementById('layout-select');
        if (layoutSelect && notebook.settings.noteLayout) {
          layoutSelect.value = notebook.settings.noteLayout;
        }
        
        document.querySelectorAll('.paper-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.style === S.paperStyle);
        });
      }
      
      // Render text
      renderText(notebook.content);
      
      // Highlight selection in explorer
      renderNotebooksList();
    };
  } catch (err) {
    console.error("Error loading notebook:", err);
  }
}

async function deleteNotebookClicked(id, event) {
  event.stopPropagation();
  if (!confirm('Are you sure you want to delete this note?')) return;
  
  await deleteNotebook(id);
  
  if (activeNotebookId === id) {
    const remaining = await getAllNotebooks();
    if (remaining.length > 0) {
      activeNotebookId = remaining[0].id;
      await loadNotebook(activeNotebookId);
    } else {
      activeNotebookId = null;
      clearText();
    }
  }
  renderNotebooksList();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderNotebooksList() {
  getAllNotebooks().then(notes => {
    const container = document.getElementById('notebook-list-container');
    if (!container) return;
    
    if (notes.length === 0) {
      container.innerHTML = '<div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 10px;">No notebooks yet. Click "New Note" above to create one.</div>';
      return;
    }
    
    // Group notes by folder
    const groups = {};
    notes.forEach(note => {
      const folder = note.folder || 'Uncategorized';
      if (!groups[folder]) groups[folder] = [];
      groups[folder].push(note);
    });
    
    container.innerHTML = '';
    
    Object.keys(groups).forEach(folder => {
      const folderHeader = document.createElement('div');
      folderHeader.className = 'folder-header';
      folderHeader.innerHTML = `<i class="fa-solid fa-folder-open" style="margin-right:6px; color:var(--accent);"></i> ${folder}`;
      container.appendChild(folderHeader);
      
      groups[folder].forEach(note => {
        const item = document.createElement('div');
        item.className = 'notebook-item';
        if (note.id === activeNotebookId) {
          item.classList.add('active');
        }
        
        item.onclick = () => loadNotebook(note.id);

        item.innerHTML = `<span>📝 ${escapeHtml(note.title)}</span>`;
        const actions = document.createElement('div');
        actions.className = 'notebook-item-actions';
        const deleteBtn = document.createElement('button');
        deleteBtn.title = 'Delete note';
        deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
        deleteBtn.addEventListener('click', (e) => deleteNotebookClicked(note.id, e));
        actions.appendChild(deleteBtn);
        item.appendChild(actions);
        container.appendChild(item);
      });
    });
  });
}


