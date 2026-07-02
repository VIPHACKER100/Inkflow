const fs = require('fs');

const code = fs.readFileSync('index.js', 'utf8');

const p1 = code.indexOf('function layoutTextTwoColumn');
const p2 = code.indexOf('function layoutText(text) {');

if (p1 === -1 || p2 === -1) {
    console.error("Could not find boundaries.");
    process.exit(1);
}

let newCode = code.substring(0, p1) + code.substring(p2);

const p3 = newCode.indexOf('function _layoutTextStandard(text) {');
const p4 = newCode.indexOf('// Cache of decoded <img> elements for drafted glyphs');

if (p3 === -1 || p4 === -1) {
    console.error("Could not find _layoutTextStandard boundaries.");
    process.exit(1);
}

const newLayoutTextTemplated = fs.readFileSync('new-layout.js', 'utf8');

newCode = newCode.substring(0, p3) + newLayoutTextTemplated + "\n\n" + newCode.substring(p4);

// Replace the dispatch using a regex to ignore whitespace/newline differences
const searchRegex = /let result;\s+if \(S\.noteLayout === 'twocolumn'\) \{\s+result = layoutTextTwoColumn[^}]+\}\s+else if \(S\.noteLayout === 'cornell'\) \{\s+result = layoutTextCornell[^}]+\}\s+else \{\s+result = _layoutTextStandard\(text\);\s+\}/;

newCode = newCode.replace(searchRegex, 'const result = layoutTextTemplated(text);');

fs.writeFileSync('index.js', newCode);
console.log("Successfully patched index.js");
