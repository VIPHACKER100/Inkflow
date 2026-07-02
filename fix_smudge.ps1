$content = Get-Content "index.js" -Raw

$old = "  } else {`r`n    drawPaperBackground(ctx, S.paperStyle);`r`n  }`r`n`r`n  const activeEditor"
$new = "  } else {`r`n    drawPaperBackground(ctx, S.paperStyle);`r`n    renderSmudgeEffects(ctx, pageIdx);`r`n  }`r`n`r`n  const activeEditor"

if ($content.Contains($old)) {
    $content = $content.Replace($old, $new)
    Set-Content "index.js" $content -NoNewline
    Write-Host "Done"
} else {
    Write-Host "Pattern not found"
}
