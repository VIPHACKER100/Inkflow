$content = Get-Content "index.js" -Raw

# Fix the blank page startup to use layer compositor
$old = @'
  } else {
    // Show a blank ruled page with placeholder watermark
    const canvas = createPage(1);
    const ctx = canvas.getContext('2d');
    drawPaperBackground(ctx, S.paperStyle);
    // Subtle placeholder text
    ctx.save();
    const lineH = S.fontSize * S.lineHeight;
    ctx.font = `italic 18px "${S.font}"`;
    ctx.fillStyle = S.inkColor;
    ctx.globalAlpha = 0.18;
    ctx.fillText('Start typing in the panel to the left…', S.margin, S.margin + S.fontSize + lineH);
    ctx.restore();
  }
'@

$new = @'
  } else {
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
    bgCtx.font = `italic 18px "${S.font}"`;
    bgCtx.fillStyle = S.inkColor;
    bgCtx.globalAlpha = 0.18;
    bgCtx.fillText('Start typing in the panel to the left…', S.margin, S.margin + S.fontSize + lineH);
    bgCtx.restore();
    // Composite if using layer compositor
    if (window.layerCompositor) {
      window.layerCompositor.composite(0, canvas.getContext('2d'));
    }
  }
'@

if ($content.Contains($old)) {
    $content = $content.Replace($old, $new)
    Set-Content "index.js" $content -NoNewline
    Write-Host "Done: blank page compositor fix applied"
} else {
    Write-Host "Pattern not found - check line endings"
    # Try with LF only
    $old2 = $old -replace "`r`n", "`n"
    if ($content.Contains($old2)) {
        $content = $content.Replace($old2, ($new -replace "`r`n", "`n"))
        Set-Content "index.js" $content -NoNewline
        Write-Host "Done with LF"
    } else {
        Write-Host "Still not found"
    }
}
