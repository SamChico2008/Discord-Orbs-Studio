Add-Type -AssemblyName System.Drawing

$sourcePng = "c:\Users\SamChicoPC\Documents\DISCORD ORB APP\desktop-app\assets\icon.png"
$targetIco = "c:\Users\SamChicoPC\Documents\DISCORD ORB APP\desktop-app\assets\icon.ico"

$sizes = @(256, 128, 64, 48, 32, 16)
$srcImg = [System.Drawing.Image]::FromFile($sourcePng)

$pngEntries = @()

foreach ($sz in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($sz, $sz, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($srcImg, 0, 0, $sz, $sz)
    $g.Dispose()

    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    
    $bytes = $ms.ToArray()
    $ms.Dispose()

    $pngEntries += [PSCustomObject]@{
        Size = $sz
        Bytes = $bytes
    }
}

$srcImg.Dispose()

# Create ICO file
$fs = New-Object System.IO.FileStream($targetIco, [System.IO.FileMode]::Create)
$bw = New-Object System.IO.BinaryWriter($fs)

# ICO Header: 6 bytes
$bw.Write([uint16]0)                 # Reserved (must be 0)
$bw.Write([uint16]1)                 # Type (1 = ICO)
$bw.Write([uint16]$pngEntries.Count) # Image Count

# Calculate offsets
$offset = 6 + (16 * $pngEntries.Count)

foreach ($entry in $pngEntries) {
    $sz = $entry.Size
    $dataLen = $entry.Bytes.Length

    $wByte = if ($sz -eq 256) { [byte]0 } else { [byte]$sz }
    $hByte = if ($sz -eq 256) { [byte]0 } else { [byte]$sz }

    $bw.Write($wByte)
    $bw.Write($hByte)
    $bw.Write([byte]0)              # Color count (0 for 256 or 32bpp)
    $bw.Write([byte]0)              # Reserved
    $bw.Write([uint16]1)            # Color planes
    $bw.Write([uint16]32)           # Bits per pixel
    $bw.Write([uint32]$dataLen)     # Resource size
    $bw.Write([uint32]$offset)      # File offset

    $offset += $dataLen
}

# Write image data
foreach ($entry in $pngEntries) {
    $bw.Write($entry.Bytes)
}

$bw.Flush()
$bw.Close()
$fs.Close()

Write-Output "ICO successfully created at $targetIco with $( (Get-Item $targetIco).Length ) bytes"
