"""Print-finish pass for the loading-screen key art: makes generated
illustration read as printed comic art rather than glossy AI render.

  1. Edge-preserving smoothing flattens the uniform, over-sharp micro-detail
     (the "AI crunch") while keeping silhouettes and line work.
  2. Line work is reinforced as ink, so shapes read like drawn outlines.
  3. A 45-degree halftone screen sits in the mid-tones and shadows.
  4. One colour grade: slightly calmer saturation, warm ink blacks, rolled-off
     highlights.
  5. Paper grain.

    <python with opencv> scripts/assets/key-art-finish.py in.png out.webp
Source art is the owner's, kept outside the repo (see docs/HANDOVER.md)."""
import sys
import cv2
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
# Optional strength: 1 (default) or higher for crunchier source art.
strength = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
rgb = np.asarray(Image.open(src).convert("RGB"))
h, w = rgb.shape[:2]
img = rgb.astype(np.float32) / 255

# 1. Flatten micro-detail, keep edges; mix back some original texture.
smooth = cv2.edgePreservingFilter(rgb, flags=cv2.RECURS_FILTER, sigma_s=24 * strength, sigma_r=min(0.4, 0.22 * strength)).astype(np.float32) / 255
keep = 0.35 / strength
base = smooth * (1 - keep) + img * keep

# 2. Ink: strong luminance edges of the smoothed image, slightly thickened.
lum = cv2.cvtColor((smooth * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY)
edges = cv2.Canny(cv2.GaussianBlur(lum, (3, 3), 0), 60, 150)
edges = cv2.GaussianBlur(edges.astype(np.float32) / 255, (3, 3), 0.7)
base *= (1 - 0.35 * np.clip(edges, 0, 1))[..., None]

# 3. Halftone: dots on a 45-degree grid, bigger where darker, mid-tones down.
cell = max(4, round(w / 420))
yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
u = (xx + yy) / np.sqrt(2) / cell
v = (xx - yy) / np.sqrt(2) / cell
dist = np.sqrt((u - np.round(u)) ** 2 + (v - np.round(v)) ** 2)
L = (0.299 * base[..., 0] + 0.587 * base[..., 1] + 0.114 * base[..., 2])
radius = np.clip((0.62 - L) / 0.5, 0, 1) * 0.5
dots = np.clip((radius - dist) * cell, 0, 1)
base *= (1 - 0.16 * dots)[..., None]

# 4. Grade: calmer saturation, warm ink blacks, rolled-off highlights.
grey = (0.299 * base[..., 0] + 0.587 * base[..., 1] + 0.114 * base[..., 2])[..., None]
base = grey + (base - grey) * (0.94 if strength <= 1 else 0.86)
ink = np.array([0.06, 0.05, 0.04])
base = ink + (1 - ink) * base
base = base / (1 + 0.1 * base) * 1.1

# 5. Paper: fine grain plus faint large mottling.
rng = np.random.default_rng(3)
grain = rng.normal(0, 0.018, (h, w)).astype(np.float32)
mottle = cv2.resize(rng.random((h // 64 + 2, w // 64 + 2)).astype(np.float32), (w, h), interpolation=cv2.INTER_CUBIC)
base *= (1 + grain + 0.03 * (mottle - 0.5))[..., None]

Image.fromarray((np.clip(base, 0, 1) * 255).astype(np.uint8)).save(out, "WEBP", quality=82, method=6)
print("finished", out, w, h)
