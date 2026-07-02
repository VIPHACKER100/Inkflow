const fs = require('fs');

// 1. Fix the remaining inline style in index.html (line 656)
let html = fs.readFileSync('index.html', 'utf8');
if (html.includes('<div style="flex: 1;">')) {
  html = html.replace('<div style="flex: 1;">', '<div class="flex-1">');
  fs.writeFileSync('index.html', html, 'utf8');
  console.log('Fixed index.html inline style.');
}

// 2. Fix index.css missing and unordered vendor prefixes
let css = fs.readFileSync('index.css', 'utf8');
const lines = css.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Fix missing backdrop-filter prefix
  if (line.match(/^\s*backdrop-filter:/) && !lines[i-1].includes('-webkit-backdrop-filter')) {
    // If it's missing, add it before
    const match = line.match(/^(\s*)(backdrop-filter:\s*[^;]+;)/);
    if (match) {
      lines[i] = match[1] + '-webkit-' + match[2] + '\n' + line;
    }
  }
  
  // Fix missing user-select prefix
  if (line.match(/^\s*user-select:/) && !lines[i-1].includes('-webkit-user-select')) {
    // If it's missing, add it before
    const match = line.match(/^(\s*)(user-select:\s*[^;]+;)/);
    if (match) {
      lines[i] = match[1] + '-webkit-' + match[2] + '\n' + line;
    }
  }
  
  // Fix ordering for backdrop-filter
  if (line.match(/^\s*backdrop-filter:/) && i < lines.length - 1 && lines[i+1].match(/^\s*-webkit-backdrop-filter:/)) {
    // Swap them
    const temp = lines[i];
    lines[i] = lines[i+1];
    lines[i+1] = temp;
  }

  // Fix ordering for user-select
  if (line.match(/^\s*user-select:/) && i < lines.length - 1 && lines[i+1].match(/^\s*-webkit-user-select:/)) {
    // Swap them
    const temp = lines[i];
    lines[i] = lines[i+1];
    lines[i+1] = temp;
  }
}

fs.writeFileSync('index.css', lines.join('\n'), 'utf8');
console.log('Fixed index.css vendor prefixes.');
