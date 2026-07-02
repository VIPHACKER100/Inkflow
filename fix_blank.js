const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

const old = `  } else {
    // Show a blank ruled page with placeholder watermark
    const canvas = createPage(1);
    const ctx = canvas.getContext('2d');
    drawPaperBackground(ctx, S.paperStyle);
    // Subtle placeholder text
    ctx.save();
    const lineH = S.fontSize * S.lineHeight;
    ctx.font = \`italic 18px "\${S.font}"\`;
    ctx.fillStyle = S.inkColor;
    ctx.globalAlpha = 0.18;
    ctx.fillText('Start typing in the panel to the left\u2026', S.margin, S.margin + S.fontSize + lineH);
    ctx.restore();
  }
}`;

const replacement = `  } else {
    // Show a blank ruled page with placeholder watermark
    const canvas = createPage(1);
    // If layer compositor is active, draw on background layer; else draw on canvas directly
    let bgCtx;
    if (window.layerCompositor) {
      const bgStack = window.layerCompositor.getStack(0);
      const bgLayer = bgStack.layers.find(l => l.name === 'Background');
      bgCtx = bgLayer ? bgLayer.canvas.getContext('2d') : canvas.getContext('2d');
    } else {
      bgCtx = canvas.getContext('2d');
    }
    drawPaperBackground(bgCtx, S.paperStyle);
    renderSmudgeEffects(bgCtx, 0);
    // Subtle placeholder text
    bgCtx.save();
    const lineH = S.fontSize * S.lineHeight;
    bgCtx.font = \`italic 18px "\${S.font}"\`;
    bgCtx.fillStyle = S.inkColor;
    bgCtx.globalAlpha = 0.18;
    bgCtx.fillText('Start typing in the panel to the left\u2026', S.margin, S.margin + S.fontSize + lineH);
    bgCtx.restore();
    // Composite if using layer compositor
    if (window.layerCompositor) {
      window.layerCompositor.composite(0, canvas.getContext('2d'));
    }
  }
}`;

if (code.includes(old)) {
  code = code.replace(old, replacement);
  fs.writeFileSync('index.js', code, 'utf8');
  console.log('Done: blank page compositor fix applied');
} else {
  // Try with \r\n normalised
  const oldNorm = old.replace(/\r\n/g, '\n');
  const codeNorm = code.replace(/\r\n/g, '\n');
  if (codeNorm.includes(oldNorm)) {
    const replaced = codeNorm.replace(oldNorm, replacement.replace(/\r\n/g, '\n'));
    fs.writeFileSync('index.js', replaced, 'utf8');
    console.log('Done (LF normalised)');
  } else {
    console.log('Pattern not found');
    // Print the actual chars around the placeholder
    const idx = code.indexOf('Start typing in the panel');
    if (idx > 0) {
      console.log('Context:', JSON.stringify(code.substring(idx - 50, idx + 100)));
    }
  }
}
