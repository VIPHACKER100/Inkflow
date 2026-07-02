const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// Split by \n (the actual newline without \r)
const lines = code.split('\n');

// Lines 612-630 (0-indexed 611-629) are the bad block
// We need to replace lines 612 through 631 (0-indexed 611-630) 
// with just: "    const ctx = canvas.getContext('2d');"
// and keep line 631 as the normal "    drawPaperBackground(ctx, S.paperStyle);\r"

// Current state (0-indexed line 611-629): corrupted
// We want:
//   line 611: "  editor.addEventListener('focus', () => {\r"  (keep)
//   line 612: "    const ctx = canvas.getContext('2d');\r"  (replace)
//   line 613: "    drawPaperBackground(ctx, S.paperStyle);\r"  (was line 630)
//   line 614: "    editor.style.color = S.inkColor;\r"  (was line 631)

// Remove lines 612-630 (0-indexed) and insert the clean version
const before = lines.slice(0, 611); // up to and including line 611 (editor.addEventListener)
const badBlock = lines.slice(611, 630); // lines 611-629 = the bad block starting from "    let ctx"
const after = lines.slice(630); // from "    drawPaperBackground(ctx, S.paperStyle);\r" onwards

// Replace bad block (lines 611-629) with clean version
const cleanBlock = ["    const ctx = canvas.getContext('2d');\r"];

const newLines = [...before, ...cleanBlock, ...after];
const newCode = newLines.join('\n');

fs.writeFileSync('index.js', newCode);
console.log("Fixed the focus handler using line-level surgery.");
