"""Wide (16:9) cut of a portrait painting for laptop loading screens: the
painting at full height on the right, over a blurred, darkened enlargement
of itself, with the seam feathered. The left side stays calm for the text.
    python3 scripts/assets/key-art-wide.py in.webp out.webp [width=1920]"""
import sys
from PIL import Image, ImageFilter, ImageEnhance

src, out = sys.argv[1], sys.argv[2]
W = int(sys.argv[3]) if len(sys.argv) > 3 else 1920
H = W * 9 // 16
art = Image.open(src).convert("RGB")
# Background: cover the frame, blur hard, darken and cool slightly.
scale = W / art.width
bg = art.resize((W, int(art.height * scale)), Image.LANCZOS)
top = int(bg.height * 0.18)
bg = bg.crop((0, top, W, top + H)).filter(ImageFilter.GaussianBlur(W / 60))
bg = ImageEnhance.Brightness(bg).enhance(0.55)
bg = ImageEnhance.Color(bg).enhance(0.8)
# Foreground: the painting at full height, on the right.
fh = H
fw = art.width * fh // art.height
fg = art.resize((fw, fh), Image.LANCZOS)
x = W - fw - W // 24
mask = Image.new("L", (fw, fh), 255)
feather = fw // 9
px = mask.load()
for i in range(feather):
    a = int(255 * (i / feather) ** 1.5)
    for y in range(fh):
        px[i, y] = min(px[i, y], a)
        px[fw - 1 - i, y] = min(px[fw - 1 - i, y], a)
bg.paste(fg, (x, 0), mask)
bg.save(out, "WEBP", quality=84, method=6)
print("wide", out, bg.size)
