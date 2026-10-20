"""HESCO barrier face texture: sand-filled geotextile pillowing behind a
welded galvanised wire mesh, dusty towards the bottom. Generates colour,
OpenGL normal and roughness maps. Source fabric: ambientCG Fabric061 (CC0).
Usage: python3 scripts/assets/hesco-texture.py <size> <out-dir>"""
import sys, numpy as np
from PIL import Image, ImageFilter
size = int(sys.argv[1]) if len(sys.argv) > 1 else 1024
out = sys.argv[2] if len(sys.argv) > 2 else "public/games/military/textures/arena"
src = "assets-src/ambientcg/Fabric061/Fabric061_2K-JPG_"
rng = np.random.default_rng(7)

def load(name, mode="RGB"):
    im = Image.open(src + name + ".jpg").convert(mode)
    # Tile the fabric 3x across one 1.5 m face (a 50 cm photo patch).
    t = im.resize((size // 3 + 1, size // 3 + 1), Image.LANCZOS)
    big = Image.new(mode, (size, size))
    for y in range(3):
        for x in range(3):
            big.paste(t, (x * (size // 3), y * (size // 3)))
    return np.asarray(big, dtype=np.float32) / 255

fabric = load("Color")
fdisp = load("Displacement", "L")
frough = load("Roughness", "L")
# Geotextile is a pale khaki polypropylene: desaturate, then tint.
lum = fabric.mean(axis=2, keepdims=True)
tint = np.array([0.74, 0.66, 0.50])
base = (0.3 * fabric + 0.7 * lum) / max(lum.mean(), 1e-3) * tint * 0.95
# Large, soft lumps where the sand presses the fabric unevenly.
lumps = Image.fromarray((rng.random((6, 6)) * 255).astype(np.uint8)).resize((size, size), Image.BICUBIC)
lumps = np.asarray(lumps, dtype=np.float32) / 255

yy, xx = np.mgrid[0:size, 0:size] / size
# Welded mesh: 20 squares across a face, 3 mm wire.
cells = 20
gx = np.abs(((xx * cells) % 1) - 0.5) * 2  # 1 at wire, 0 mid-cell
gy = np.abs(((yy * cells) % 1) - 0.5) * 2
wire_w = 0.085
wire = np.clip((np.maximum(gx, gy) - (1 - wire_w)) / wire_w, 0, 1) ** 0.6
# The fabric pillows out between wires.
pillow = (1 - gx ** 2) * (1 - gy ** 2)
# Heavier corner coils at the face edges (cell joints).
edge = np.clip(1 - np.minimum(xx, 1 - xx) * size / (size * 0.018), 0, 1)
coil = edge * (0.5 + 0.5 * np.sin(yy * size * 0.9) ** 2)
height = 0.45 * pillow + 0.2 * fdisp + 0.25 * lumps + 0.9 * wire + 0.8 * coil
# Dust and sand staining: heavier near the ground, streaks from the top.
streak = Image.fromarray((rng.random((size // 8, size // 64)) * 255).astype(np.uint8)).resize((size, size), Image.BICUBIC)
streak = np.asarray(streak, dtype=np.float32) / 255
dust = np.clip((yy - 0.55) / 0.45, 0, 1) ** 1.6 * 0.55 + streak * 0.12 * (1 - yy)
sand = np.array([0.78, 0.68, 0.50])
color = base * (1 - dust[..., None]) + sand * dust[..., None]
# Shade the fabric into the pillows (cavity) and add the steel wire.
cavity = (0.84 + 0.16 * pillow) * (0.95 + 0.1 * lumps)
color *= cavity[..., None]
steel = np.array([0.62, 0.63, 0.61]) * (0.85 + 0.3 * rng.random((size, size, 1)))
rust = (rng.random((size // 16, size // 16)) > 0.93).astype(np.float32)
rust = np.asarray(Image.fromarray((rust * 255).astype(np.uint8)).resize((size, size), Image.BILINEAR).filter(ImageFilter.GaussianBlur(3)), dtype=np.float32)[..., None] / 255
steel = steel * (1 - rust * 0.6) + np.array([0.42, 0.26, 0.15]) * rust * 0.6
m = np.clip(np.maximum(wire, coil * 0.9), 0, 1)[..., None]
color = color * (1 - m) + steel * m
Image.fromarray((np.clip(color, 0, 1) ** (1 / 1.0) * 255).astype(np.uint8)).save(f"{out}/hesco-color.jpg", quality=90)
# Normal (OpenGL, +Y up) from the height field.
h = Image.fromarray((np.clip(height / height.max(), 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1))
h = np.asarray(h, dtype=np.float32) / 255
dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 3.0
dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 3.0
n = np.dstack([-dx, dy, np.ones_like(h)])
n /= np.linalg.norm(n, axis=2, keepdims=True)
Image.fromarray(((n * 0.5 + 0.5) * 255).astype(np.uint8)).save(f"{out}/hesco-normal.jpg", quality=92)
rough = frough * 0.25 + 0.72
rough = rough * (1 - m[..., 0]) + 0.42 * m[..., 0]
Image.fromarray((np.clip(rough, 0, 1) * 255).astype(np.uint8)).save(f"{out}/hesco-roughness.jpg", quality=90)
print("hesco", size)
