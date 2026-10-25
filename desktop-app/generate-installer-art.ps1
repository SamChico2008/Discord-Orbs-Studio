Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'
$assets = Join-Path $PSScriptRoot 'assets'

$bgDark      = [Drawing.ColorTranslator]::FromHtml('#161519')
$bgCard      = [Drawing.ColorTranslator]::FromHtml('#1e1d24')
$textMain    = [Drawing.ColorTranslator]::FromHtml('#F4F2EE')
$textSub     = [Drawing.ColorTranslator]::FromHtml('#CFCCD4')
$textMuted   = [Drawing.ColorTranslator]::FromHtml('#A6A5AD')
$textQuiet   = [Drawing.ColorTranslator]::FromHtml('#787582')
$accent      = [Drawing.ColorTranslator]::FromHtml('#B8ADF2')
$accentHover = [Drawing.ColorTranslator]::FromHtml('#CEC5FF')
$accentCyan  = [Drawing.ColorTranslator]::FromHtml('#8FD3E8')
$accentRose  = [Drawing.ColorTranslator]::FromHtml('#E6A8D8')
$emerald     = [Drawing.ColorTranslator]::FromHtml('#A8CBB4')

$iconPath = Join-Path $assets 'icon.png'
$icon = [Drawing.Image]::FromFile($iconPath)

function Create-Canvas([int]$w, [int]$h, [Drawing.Color]$bg) {
  $bmp = [Drawing.Bitmap]::new($w, $h, [Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear($bg)
  return @($bmp, $g)
}

# -------------------------------------------------------------
# 1. SETUP HERO BANNER (470 x 100) — Full width top hero banner
# -------------------------------------------------------------
$bannerArt = Create-Canvas 470 100 $bgDark
$bBmp = $bannerArt[0]
$bg   = $bannerArt[1]

# Subtle radial / gradient glow around the orb
$glowBrush = [Drawing.Drawing2D.LinearGradientBrush]::new(
  [Drawing.Point]::new(0, 0),
  [Drawing.Point]::new(470, 100),
  [Drawing.Color]::FromArgb(255, 30, 26, 42),
  $bgDark
)
$bg.FillRectangle($glowBrush, 0, 0, 470, 100)
$glowBrush.Dispose()

# Radial accent highlight
$path = [Drawing.Drawing2D.GraphicsPath]::new()
$path.AddEllipse(10, -20, 140, 140)
$pthGrBrush = [Drawing.Drawing2D.PathGradientBrush]::new($path)
$pthGrBrush.CenterColor = [Drawing.Color]::FromArgb(45, $accent)
$pthGrBrush.SurroundColors = @([Drawing.Color]::FromArgb(0, $bgDark))
$bg.FillEllipse($pthGrBrush, 10, -20, 140, 140)
$path.Dispose()
$pthGrBrush.Dispose()

# Orbital rings behind the icon
$orbitPen1 = [Drawing.Pen]::new([Drawing.Color]::FromArgb(70, $accent), 1.2)
$orbitPen2 = [Drawing.Pen]::new([Drawing.Color]::FromArgb(40, $accentCyan), 1.0)
$st = $bg.Save()
$bg.TranslateTransform(52, 50)
$bg.RotateTransform(-25)
$bg.DrawEllipse($orbitPen1, -44, -16, 88, 32)
$bg.Restore($st)

$st = $bg.Save()
$bg.TranslateTransform(52, 50)
$bg.RotateTransform(40)
$bg.DrawEllipse($orbitPen2, -38, -26, 76, 52)
$bg.Restore($st)

# Little orbiting satellite
$satBrush = [Drawing.SolidBrush]::new($accentCyan)
$bg.FillEllipse($satBrush, 85, 30, 4, 4)
$satBrush.Dispose()

# Icon
$bg.DrawImage($icon, 24, 22, 56, 56)

# Typography
$fontTitle = [Drawing.Font]::new('Segoe UI', 16, [Drawing.FontStyle]::Bold, [Drawing.GraphicsUnit]::Pixel)
$fontSub   = [Drawing.Font]::new('Segoe UI', 10, [Drawing.FontStyle]::Regular, [Drawing.GraphicsUnit]::Pixel)
$fontBadge = [Drawing.Font]::new('Segoe UI', 8, [Drawing.FontStyle]::Bold, [Drawing.GraphicsUnit]::Pixel)

$brushMain  = [Drawing.SolidBrush]::new($textMain)
$brushMuted = [Drawing.SolidBrush]::new($textMuted)
$brushAcc   = [Drawing.SolidBrush]::new($accent)

$bg.DrawString('Discord Orb Studio', $fontTitle, $brushMain, 94, 22)
$bg.DrawString('Your automated companion for Discord quests & rewards.', $fontSub, $brushMuted, 96, 47)

# Pill badge "OFFICIAL INSTALLER · V3.3.1"
$pillBg = [Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(255, 34, 31, 46))
$pillBorder = [Drawing.Pen]::new([Drawing.Color]::FromArgb(100, $accent), 1)
$rect = [Drawing.Rectangle]::new(96, 68, 175, 18)
$bg.FillRectangle($pillBg, $rect)
$bg.DrawRectangle($pillBorder, $rect)
$bg.DrawString('OFFICIAL INSTALLER  -  V3.3.1', $fontBadge, $brushAcc, 102, 70)
$pillBg.Dispose()
$pillBorder.Dispose()

# Bottom separator line with subtle gradient
$linePen = [Drawing.Pen]::new([Drawing.Color]::FromArgb(40, $accent), 1)
$bg.DrawLine($linePen, 0, 99, 470, 99)
$linePen.Dispose()

$bBmp.Save((Join-Path $assets 'installerBanner.bmp'), [Drawing.Imaging.ImageFormat]::Bmp)
$bg.Dispose()
$bBmp.Dispose()

# -------------------------------------------------------------
# 2. FINISH HERO BANNER (470 x 100) — Success banner
# -------------------------------------------------------------
$finArt = Create-Canvas 470 100 $bgDark
$fBmp = $finArt[0]
$fg   = $finArt[1]

# Green/Emerald subtle gradient glow
$glowBrush2 = [Drawing.Drawing2D.LinearGradientBrush]::new(
  [Drawing.Point]::new(0, 0),
  [Drawing.Point]::new(470, 100),
  [Drawing.Color]::FromArgb(255, 23, 34, 28),
  $bgDark
)
$fg.FillRectangle($glowBrush2, 0, 0, 470, 100)
$glowBrush2.Dispose()

# Ring around icon
$emPen = [Drawing.Pen]::new([Drawing.Color]::FromArgb(80, $emerald), 1.2)
$fg.DrawEllipse($emPen, 18, 16, 68, 68)
$emPen.Dispose()

$fg.DrawImage($icon, 24, 22, 56, 56)

$fg.DrawString('Your Studio is Installed!', $fontTitle, $brushMain, 94, 22)
$fg.DrawString('Setup complete. Connect your Discord account to get started.', $fontSub, $brushMuted, 96, 47)

# Pill badge
$pillBg2 = [Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(255, 26, 38, 30))
$pillBorder2 = [Drawing.Pen]::new([Drawing.Color]::FromArgb(100, $emerald), 1)
$rect2 = [Drawing.Rectangle]::new(96, 68, 160, 18)
$fg.FillRectangle($pillBg2, $rect2)
$fg.DrawRectangle($pillBorder2, $rect2)
$brushEm = [Drawing.SolidBrush]::new($emerald)
$fg.DrawString('SUCCESS  -  STUDIO READY', $fontBadge, $brushEm, 102, 70)
$brushEm.Dispose()
$pillBg2.Dispose()
$pillBorder2.Dispose()

$linePen2 = [Drawing.Pen]::new([Drawing.Color]::FromArgb(40, $emerald), 1)
$fg.DrawLine($linePen2, 0, 99, 470, 99)
$linePen2.Dispose()

$fBmp.Save((Join-Path $assets 'installerFinishBanner.bmp'), [Drawing.Imaging.ImageFormat]::Bmp)
$fg.Dispose()
$fBmp.Dispose()

# -------------------------------------------------------------
# 3. SEAMLESS SIDEBAR (164 x 314) — for standard MUI fallback
# -------------------------------------------------------------
$sideArt = Create-Canvas 164 314 $bgDark
$sBmp = $sideArt[0]
$sg   = $sideArt[1]

$sGradient = [Drawing.Drawing2D.LinearGradientBrush]::new(
  [Drawing.Point]::new(0, 0),
  [Drawing.Point]::new(0, 314),
  [Drawing.Color]::FromArgb(255, 26, 23, 33),
  $bgDark
)
$sg.FillRectangle($sGradient, 0, 0, 164, 314)
$sGradient.Dispose()

$sg.DrawImage($icon, 20, 22, 28, 28)
$fontSideTitle = [Drawing.Font]::new('Segoe UI', 13, [Drawing.FontStyle]::Bold, [Drawing.GraphicsUnit]::Pixel)
$sg.DrawString('Orb Studio', $fontSideTitle, $brushMain, 54, 26)

# Orbit in center
$st = $sg.Save()
$sg.TranslateTransform(82, 126)
$sg.RotateTransform(-30)
$sg.DrawEllipse($orbitPen1, -65, -22, 130, 44)
$sg.Restore($st)

$st = $sg.Save()
$sg.TranslateTransform(82, 126)
$sg.RotateTransform(42)
$sg.DrawEllipse($orbitPen2, -50, -35, 100, 70)
$sg.Restore($st)

$sg.DrawImage($icon, 47, 91, 70, 70)

$fontCaption = [Drawing.Font]::new('Segoe UI', 8, [Drawing.FontStyle]::Regular, [Drawing.GraphicsUnit]::Pixel)
$fontTagline = [Drawing.Font]::new('Segoe UI', 12, [Drawing.FontStyle]::Bold, [Drawing.GraphicsUnit]::Pixel)
$brushQuiet  = [Drawing.SolidBrush]::new($textQuiet)

$sg.DrawString('Your Discord Companion', $fontCaption, $brushQuiet, 18, 200)
$sg.DrawString('Play a bit.', $fontTagline, $brushMain, 18, 220)
$sg.DrawString('Earn great', $fontTagline, $brushMain, 18, 238)
$sg.DrawString('rewards.', $fontTagline, $brushMain, 18, 256)

$subtleLine = [Drawing.Pen]::new([Drawing.Color]::FromArgb(25, $accent), 1)
$sg.DrawLine($subtleLine, 18, 290, 146, 290)
$subtleLine.Dispose()

$sBmp.Save((Join-Path $assets 'installerSidebar.bmp'), [Drawing.Imaging.ImageFormat]::Bmp)
$sBmp.Save((Join-Path $assets 'installerSidebar.png'), [Drawing.Imaging.ImageFormat]::Png)
$sg.Dispose()
$sBmp.Dispose()

# -------------------------------------------------------------
# 4. SEAMLESS HEADER (150 x 57)
# -------------------------------------------------------------
$hdrArt = Create-Canvas 150 57 $bgDark
$hBmp = $hdrArt[0]
$hg   = $hdrArt[1]
$hg.DrawImage($icon, 108, 11, 34, 34)
$hg.DrawString('Orb Studio', $fontSideTitle, $brushMain, 8, 13)
$hg.DrawString('Preparing your workspace.', $fontCaption, $brushMuted, 8, 32)
$hBmp.Save((Join-Path $assets 'installerHeader.bmp'), [Drawing.Imaging.ImageFormat]::Bmp)
$hBmp.Save((Join-Path $assets 'installerHeader.png'), [Drawing.Imaging.ImageFormat]::Png)
$hg.Dispose()
$hBmp.Dispose()

# Clean up resources
$icon.Dispose()
foreach ($r in @($fontTitle, $fontSub, $fontBadge, $fontSideTitle, $fontCaption, $fontTagline, $brushMain, $brushMuted, $brushAcc, $brushQuiet, $orbitPen1, $orbitPen2)) {
  $r.Dispose()
}

Write-Output "Artwork generation complete: banners, sidebar and headers in high-definition (English)."
