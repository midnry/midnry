"""Build the Dust Outpost photo textures from ambientCG CC0 sources.

    python3 scripts/assets/arena-textures.py
Sources (gitignored, fetched by hand from ambientcg.com, 2K JPG):
assets-src/ambientcg/<id>/<id>_2K-JPG_{Color,NormalGL,Roughness}.jpg.
Writes 1K and 2K (hd/) colour/normal/roughness sets to
public/games/military/textures/arena/. HESCO comes from hesco-texture.py;
hedge leaves, cardboard and aluminium from procedural-textures.py.
"""
from pathlib import Path
import numpy as np
from PIL import Image

SRC = Path("assets-src/ambientcg")
OUT = Path("public/games/military/textures/arena")
# name: (source id, colour gain, colour tint, roughness floor)
# Dry desert surfaces get a high roughness floor so the sun never glares.
SETS = {
    "blast-concrete": ("Concrete044D", 1.5, (1.0, 0.98, 0.94), 0.6),
    "desert-ground": ("Ground079S", 1.0, (1, 1, 1), 0.82),
    "desert-sand": ("Ground093C", 1.0, (1, 1, 1), 0.85),
    "crate-wood": ("Planks037A", 1.25, (1, 1, 1), 0.55),
    # Wreck Estate
    "estate-paving": ("Tiles143", 1.0, (1, 1, 1), 0.6),
    "estate-stone": ("Tiles139", 1.0, (1, 0.98, 0.95), 0.55),
    "villa-plaster": ("Plaster007", 1.0, (1, 0.96, 0.88), 0.6),
    # Skyport
    "apron-concrete": ("Concrete031", 1.15, (1, 1, 1), 0.6),
    "terminal-panel": ("Concrete034", 1.0, (0.97, 0.99, 1.0), 0.5),
}

def save(img, name, size):
    for out, s in ((OUT, size // 2), (OUT / "hd", size)):
        out.mkdir(parents=True, exist_ok=True)
        img.resize((s, s), Image.LANCZOS).save(out / f"{name}.jpg", quality=88)

for name, (sid, gain, tint, floor) in SETS.items():
    base = SRC / sid / f"{sid}_2K-JPG"
    color = np.asarray(Image.open(f"{base}_Color.jpg").convert("RGB"), np.float32) / 255
    color = np.clip(color * gain * np.array(tint), 0, 1)
    save(Image.fromarray((color * 255).astype(np.uint8)), f"{name}-color", 2048)
    save(Image.open(f"{base}_NormalGL.jpg").convert("RGB"), f"{name}-normal", 2048)
    rough = np.asarray(Image.open(f"{base}_Roughness.jpg").convert("L"), np.float32) / 255
    rough = floor + (1 - floor) * rough
    save(Image.fromarray((rough * 255).astype(np.uint8)), f"{name}-roughness", 2048)
    print(name, color.mean((0, 1)).round(3))
