const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const replacements = [
  {
    old: '<label class="checkbox-label" style="margin-top: 8px;">',
    new: '<label class="checkbox-label mt-8">'
  },
  {
    old: '<div class="sb-label" style="margin-top:10px;">Upload Custom Font</div>',
    new: '<div class="sb-label mt-10">Upload Custom Font</div>'
  },
  {
    old: '<label class="checkbox-label" style="margin-top: 12px;">',
    new: '<label class="checkbox-label mt-12">'
  },
  {
    old: '<div class="sb-label" style="margin-top: 12px;">Active Users</div>',
    new: '<div class="sb-label mt-12">Active Users</div>'
  },
  {
    old: '<div id="recording-status-panel" class="hidden" style="margin-top: 10px; padding: 10px; background: var(--bg-alt); border-radius: 6px; display: flex; align-items: center; gap: 10px; font-size: 14px;">',
    new: '<div id="recording-status-panel" class="hidden recording-status">'
  },
  {
    old: '<span id="recording-size" style="color: var(--text-muted); font-size: 12px;">0 KB</span>',
    new: '<span id="recording-size" class="recording-size">0 KB</span>'
  },
  {
    old: '<div class="progress-fill" id="char-progress-fill" style="width: 0%"></div>',
    new: '<div class="progress-fill" id="char-progress-fill"></div>' // The script sets this, but removing the inline style init is fine. Or wait, does the IDE complain about inline style? Yes, line 515. 
    // Actually wait, if the script sets it, it's fine. I will just leave the initial empty or set it to class="progress-fill w-0" and update css. Let's just remove it and let JS add it later. Wait, it needs to start at 0. CSS width: 0 is fine.
  },
  {
    old: '<div style="display: flex; gap: 4px;">',
    new: '<div class="flex-gap-4">'
  },
  {
    old: '<div class="char-preview" id="char-preview-container" style="display: none;">',
    new: '<div class="char-preview d-none" id="char-preview-container">'
  },
  {
    old: '<input type="file" id="import-font-project" accept=".json" style="display: none;" onchange="importFontProject(event)" title="Import Font Project" />',
    new: '<input type="file" id="import-font-project" accept=".json" class="d-none" onchange="importFontProject(event)" title="Import Font Project" />'
  },
  {
    old: '<div class="template-actions" style="margin-top: 8px; justify-content: center; gap: 8px;">',
    new: '<div class="template-actions template-actions-extended">'
  },
  {
    old: '<div style="display: flex; align-items: center; gap: 6px;">',
    new: '<div class="flex-align-center-gap-6">'
  },
  {
    old: '<span class="sb-label" style="margin: 0; font-size: 12px; color: var(--text-secondary);">Upload Sheet:</span>',
    new: '<span class="sb-label sheet-label">Upload Sheet:</span>'
  },
  {
    old: '<select id="upload-template-sheet-select" style="font-size: 12px; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--btn-border); background: var(--btn-bg); color: var(--text-primary); outline: none;" title="Select template sheet type">',
    new: '<select id="upload-template-sheet-select" class="sheet-select" title="Select template sheet type">'
  },
  {
    old: '<div class="modal-card" style="max-width: 800px; width: 90%;">',
    new: '<div class="modal-card modal-card-lg">'
  },
  {
    old: '<div class="modal-body" style="display: flex; gap: 20px; text-align: left;">',
    new: '<div class="modal-body modal-body-flex">'
  },
  {
    old: '<div style="flex: 1;">',
    new: '<div class="flex-1">'
  },
  {
    old: '<textarea id="grammar-original" class="text-input" readonly style="height: 300px; background: var(--bg-alt);"></textarea>',
    new: '<textarea id="grammar-original" class="text-input grammar-textarea-readonly" readonly title="Original Text" placeholder="Original text"></textarea>'
  },
  {
    old: '<textarea id="grammar-corrected" class="text-input" style="height: 300px;"></textarea>',
    new: '<textarea id="grammar-corrected" class="text-input grammar-textarea" title="Corrected Text" placeholder="Corrected text"></textarea>'
  },
  {
    old: '<div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px;">',
    new: '<div class="modal-footer modal-footer-flex">'
  }
];

let allGood = true;
replacements.forEach(r => {
  if (html.includes(r.old)) {
    html = html.replace(r.old, r.new);
  } else {
    // Try normalizing CR LF
    const oldNorm = r.old.replace(/\r\n/g, '\n');
    const htmlNorm = html.replace(/\r\n/g, '\n');
    if (htmlNorm.includes(oldNorm)) {
      html = htmlNorm.replace(oldNorm, r.new.replace(/\r\n/g, '\n'));
    } else {
      console.error("Could not find:", r.old);
      allGood = false;
    }
  }
});

if (allGood) {
  fs.writeFileSync('index.html', html, 'utf8');
  console.log("HTML successfully updated.");
  
  // Append new classes to index.css
  const newCss = `
/* UI cleanup utilities extracted from inline styles */
.mt-8 { margin-top: 8px; }
.mt-10 { margin-top: 10px; }
.mt-12 { margin-top: 12px; }
.flex-gap-4 { display: flex; gap: 4px; }
.flex-align-center-gap-6 { display: flex; align-items: center; gap: 6px; }
.flex-1 { flex: 1; }
.d-none { display: none !important; }
.recording-status { margin-top: 10px; padding: 10px; background: var(--bg-alt); border-radius: 6px; display: flex; align-items: center; gap: 10px; font-size: 14px; }
.recording-size { color: var(--text-muted); font-size: 12px; }
.template-actions-extended { margin-top: 8px; justify-content: center; gap: 8px; }
.sheet-label { margin: 0; font-size: 12px; color: var(--text-secondary); }
.sheet-select { font-size: 12px; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--btn-border); background: var(--btn-bg); color: var(--text-primary); outline: none; }
.modal-card-lg { max-width: 800px; width: 90%; }
.modal-body-flex { display: flex; gap: 20px; text-align: left; }
.grammar-textarea { height: 300px; }
.grammar-textarea-readonly { height: 300px; background: var(--bg-alt); }
.modal-footer-flex { display: flex; justify-content: flex-end; gap: 10px; }
#char-progress-fill { width: 0%; } /* Default fallback if style removed */
`;
  let css = fs.readFileSync('index.css', 'utf8');
  if (!css.includes('.mt-8 { margin-top: 8px; }')) {
    fs.writeFileSync('index.css', css + newCss, 'utf8');
    console.log("CSS successfully updated.");
  }
}
