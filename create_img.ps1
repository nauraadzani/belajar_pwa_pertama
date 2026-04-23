Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap 1920, 1080
$graphics = [System.Drawing.Graphics]::FromImage($bmp)
$graphics.Clear([System.Drawing.Color]::Teal)
$font = New-Object System.Drawing.Font("Arial", 100)
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$graphics.DrawString("WaroengPintar Desktop", $font, $brush, 400, 400)
$bmp.Save("c:\Users\asus\Documents\Nora\belajar_pwa_pertama\icons\screenshot-wide.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
$graphics.Dispose()
