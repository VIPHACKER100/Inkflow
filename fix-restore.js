const fs = require('fs');

const file = 'index.js';
let content = fs.readFileSync(file, 'utf8');

const missingFunc = `// Strips blank/corrupt entries out of draftedGlyphs (memory + IndexedDB).
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
      const btn = document.getElementById(\`char-btn-\${char}\`);
      if (btn) btn.classList.remove('drafted');
      delete glyphImageCache[char];
    }
  }
  if (pruned > 0) {
    console.warn(\`Inkflow: removed \${pruned} blank drafted glyph(s) that were rendering as invisible characters.\`);
  }
  return pruned;
}

`;

// 1. Re-insert `pruneBlankGlyphs` function before `autosave` if missing
if (!content.includes('async function pruneBlankGlyphs() {')) {
  content = content.replace('let autosaveTimeout;', missingFunc + 'let autosaveTimeout;');
}

// 2. Re-insert missing logic in `restoreState()`
const restoreStateHook = `  } catch (e) { /* ignore corrupt state */ }\r\n\r\n/* ───────────────────────────────────────────\r\n   PHASE 8.8 — PAGE NAVIGATION`;
const restoreStateMissingLogic = `  } catch (e) { /* ignore corrupt state */ }\r\n\r\n  // 2.5. Remove any stale blank glyphs (e.g. saved before the ink-check guard\r\n  // existed, or pulled in via the localStorage migration above) so they\r\n  // don't get drawn as invisible characters.\r\n  await pruneBlankGlyphs();\r\n\r\n  // 3. Highlight drafted characters in UI\r\n  ALL_TEMPLATE_CHARS.forEach(char => {\r\n    if (draftedGlyphs[char] && draftedGlyphs[char].length > 0) {\r\n      const btn = Array.from(document.querySelectorAll('.char-btn')).find(b => b.textContent === char);\r\n      if (btn) btn.classList.add('drafted');\r\n    }\r\n  });\r\n\r\n  // Optionally redraw if studio is open\r\n  if (typeof drawStudioCanvas === 'function') drawStudioCanvas();\r\n}\r\n\r\n\r\n/* ───────────────────────────────────────────\r\n   PHASE 8.8 — PAGE NAVIGATION`;

// Try both \n and \r\n variations for the hook
const hook1 = restoreStateHook;
const hook2 = restoreStateHook.replace(/\\r\\n/g, '\n');

if (content.includes(hook1)) {
  content = content.replace(hook1, restoreStateMissingLogic);
} else if (content.includes(hook2)) {
  content = content.replace(hook2, restoreStateMissingLogic.replace(/\\r\\n/g, '\n'));
}

// 3. Re-insert missing logic in `handleCustomProjectUpload()`
const handleCustomHook = `      // (saved before the ink-check guard existed).\r\n      \r\n      // Update font name if available`;
const handleCustomMissingLogic = `      // (saved before the ink-check guard existed).\r\n      await pruneBlankGlyphs();\r\n      \r\n      // Update font name if available`;

const hook3 = handleCustomHook;
const hook4 = handleCustomHook.replace(/\\r\\n/g, '\n');

if (content.includes(hook3)) {
  content = content.replace(hook3, handleCustomMissingLogic);
} else if (content.includes(hook4)) {
  content = content.replace(hook4, handleCustomMissingLogic.replace(/\\r\\n/g, '\n'));
}

fs.writeFileSync(file, content);
console.log('Restored deleted code sections successfully.');
