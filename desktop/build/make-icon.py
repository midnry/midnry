"""Draw the Outpost Zero app icon: an amber sight reticle on a dark tile.
    python3 desktop/build/make-icon.py   -> desktop/build/icon.png (1024 px)"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

S = 4096  # drawn at 4x, then downsampled for clean edges
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
pad, r = 200, 820
# Dark tile with a soft vertical gradient (macOS-style margin).
tile = Image.new("RGBA", (S, S))
td = ImageDraw.Draw(tile)
for y in range(S):
    t = y / S
    td.line([(0, y), (S, y)], fill=(int(30 - 12 * t), int(37 - 14 * t), int(46 - 16 * t), 255))
mask = Image.new("L", (S, S), 0)
ImageDraw.Draw(mask).rounded_rectangle([pad, pad, S - pad, S - pad], r, fill=255)
img.paste(tile, (0, 0), mask)
c, amber = S / 2, (242, 181, 68, 255)
# Glow behind the reticle.
glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
ImageDraw.Draw(glow).ellipse([c - 1150, c - 1150, c + 1150, c + 1150], outline=(242, 160, 50, 150), width=260)
img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(120)))
# Ring broken at the four ticks, ticks, and a centre dot.
R, w, gap = 1050, 170, 22
for a in (0, 90, 180, 270):
    d.arc([c - R, c - R, c + R, c + R], a + gap, a + 90 - gap, fill=amber, width=w)
for dx, dy in ((0, -1), (1, 0), (0, 1), (-1, 0)):
    x0, y0 = c + dx * 640, c + dy * 640
    x1, y1 = c + dx * 1420, c + dy * 1420
    d.line([(x0, y0), (x1, y1)], fill=amber, width=150)
d.ellipse([c - 150, c - 150, c + 150, c + 150], fill=(255, 92, 64, 255))
# The tile itself is the clip: nothing outside the rounded square.
out = Image.new("RGBA", (S, S), (0, 0, 0, 0))
out.paste(img, (0, 0), mask)
out.resize((1024, 1024), Image.LANCZOS).save(Path(__file__).with_name("icon.png"))
