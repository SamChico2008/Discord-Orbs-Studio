Add-Type -AssemblyName System.Drawing

$assetsDir = Join-Path $PSScriptRoot "assets"
$sourcePng = Join-Path $assetsDir "icon.png"
$targetIco = Join-Path $assetsDir "icon.ico"

if (-not (Test-Path $sourcePng)) {
    Write-Error "Source image not found: $sourcePng"
    exit 1
}

$bmp = [System.Drawing.Bitmap]::FromFile($sourcePng)
$iconHandle = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($iconHandle)

$fs = New-Object System.IO.FileStream($targetIco, [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
$icon.Dispose()
$bmp.Dispose()

Write-Host "[OK] Icon converted successfully to: $targetIco"
