$c = Get-Content "index.js" -Raw
$idx = $c.IndexOf("Start typing in the panel")
Write-Host "Found at: $idx"
if ($idx -gt 0) {
    Write-Host $c.Substring($idx - 300, 600)
}
