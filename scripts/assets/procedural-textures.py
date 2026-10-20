"""Procedural tileable textures for the arena kits (no photo source exists):
  hedge     - clipped boxwood: thousands of small leaves over deep shade
  cardboard - shipping-carton board with faint fibres
  aluminium - brushed aluminium skin for air-cargo containers
  sandbag   - woven polypropylene/burlap sack cloth, dusty

    python3 scripts/assets/procedural-textures.py
Writes 1K and 2K (hd/) colour/normal/roughness JPEGs to
public/games/military/textures/arena/."""
from pathlib import Path
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = Path("public/games/military/textures/arena")
S = 2048
rng = np.random.default_rng(7)


def normal_from_height(h, strength):
    gy, gx = np.gradient(h)
    n = np.dstack((-gx * strength, -gy * strength, np.ones_like(h)))
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return Image.fromarray(((n * 0.5 + 0.5) * 255).astype(np.uint8))


def save(name, color, normal, rough):
    for out, size in ((OUT, S // 2), (OUT / "hd", S)):
        out.mkdir(parents=True, exist_ok=True)
        color.resize((size, size), Image.LANCZOS).save(out / f"{name}-color.jpg", quality=88)
        normal.resize((size, size), Image.LANCZOS).save(out / f"{name}-normal.jpg", quality=92)
        rough.resize((size, size), Image.LANCZOS).save(out / f"{name}-roughness.jpg", quality=88)


def blur_noise(cells, sigma):
    """Tileable soft noise: random cells, wrapped and blurred."""
    small = rng.random((cells, cells)).astype(np.float32)
    big = Image.fromarray((small * 255).astype(np.uint8)).resize((S, S), Image.BICUBIC)
    tiled = Image.new("L", (S * 3, S * 3))
    for i in range(3):
        for j in range(3):
            tiled.paste(big, (i * S, j * S))
    tiled = tiled.filter(ImageFilter.GaussianBlur(sigma))
    return np.asarray(tiled.crop((S, S, 2 * S, 2 * S)), np.float32) / 255


def hedge():
    color = Image.new("RGB", (S, S), (30, 50, 24))
    height = Image.new("L", (S, S), 0)
    dc, dh = ImageDraw.Draw(color), ImageDraw.Draw(height)
    # Leaves are drawn back to front in layers; later layers sit higher,
    # catch more light and are a touch yellower.
    for layer in range(5):
        for _ in range(5200):
            x, y = rng.random(2) * S
            a = rng.random() * math.tau
            length, width = 20 + rng.random() * 16, 9 + rng.random() * 6
            ca, sa = math.cos(a), math.sin(a)
            pts = []
            for k in range(10):
                t = k / 10 * math.tau
                px, py = math.cos(t) * length / 2, math.sin(t) * width / 2 * (1 - 0.3 * math.cos(t))
                pts.append((px * ca - py * sa, px * sa + py * ca))
            light = 0.72 + 0.11 * layer + rng.random() * 0.2
            g = (int((34 + 20 * rng.random()) * light), int((84 + 40 * rng.random()) * light), int((26 + 14 * rng.random()) * light))
            h = int(40 + layer * 42 + rng.random() * 18)
            for ox in (-S, 0, S):
                for oy in (-S, 0, S):
                    if -40 < x + ox < S + 40 and -40 < y + oy < S + 40:
                        poly = [(x + ox + px, y + oy + py) for px, py in pts]
                        dc.polygon(poly, fill=g)
                        dh.polygon(poly, fill=h)
    h = np.asarray(height.filter(ImageFilter.GaussianBlur(1.2)), np.float32) / 255
    # Broad clumps: the clipped surface is not flat.
    clump = blur_noise(10, 40)
    c = np.asarray(color, np.float32) * (0.78 + 0.34 * clump[..., None])
    save(
        "hedge",
        Image.fromarray(np.clip(c, 0, 255).astype(np.uint8)),
        normal_from_height(h * 6 + clump * 10, 2.2),
        Image.fromarray((np.clip(0.62 + 0.3 * (1 - h), 0, 1) * 255).astype(np.uint8)),
    )


def cardboard():
    fibre = blur_noise(512, 1.5)
    streak = np.repeat(blur_noise(1024, 0.8).mean(axis=0, keepdims=True), S, axis=0)
    blotch = blur_noise(12, 30)
    base = np.array([0.66, 0.5, 0.33]) * (0.9 + 0.12 * fibre[..., None] + 0.08 * streak[..., None]) * (0.92 + 0.12 * blotch[..., None])
    save(
        "cardboard",
        Image.fromarray((np.clip(base, 0, 1) * 255).astype(np.uint8)),
        normal_from_height(fibre * 3 + streak * 4, 1.0),
        Image.fromarray((np.clip(0.78 + 0.12 * fibre, 0, 1) * 255).astype(np.uint8)),
    )


def aluminium():
    brushed = np.repeat(blur_noise(2048, 0.6).mean(axis=1, keepdims=True), S, axis=1)
    grime = blur_noise(9, 45)
    base = (0.72 + 0.1 * brushed - 0.12 * grime)[..., None] * np.array([1.0, 1.01, 1.03])
    save(
        "aluminium",
        Image.fromarray((np.clip(base, 0, 1) * 255).astype(np.uint8)),
        normal_from_height(brushed * 2, 0.6),
        Image.fromarray((np.clip(0.32 + 0.25 * grime + 0.08 * brushed, 0, 1) * 255).astype(np.uint8)),
    )


def sandbag():
    y, x = np.mgrid[0:S, 0:S].astype(np.float32)
    period = S / 96  # threads per texture repeat
    # Over-under weave: warp and weft threads alternate which is on top.
    wx = np.sin(x / period * math.pi) ** 2
    wy = np.sin(y / period * math.pi) ** 2
    cell = ((np.floor(x / period) + np.floor(y / period)) % 2).astype(np.float32)
    weave = np.where(cell > 0, wx * 0.7 + 0.3, wy * 0.7 + 0.3)
    jitter = blur_noise(256, 1.0)
    fibre = blur_noise(1024, 0.6)
    dirt = blur_noise(8, 50)
    dust = np.clip((blur_noise(24, 18) - 0.55) * 3, 0, 1)
    height = weave * (0.85 + 0.3 * jitter) + 0.25 * fibre
    tone = (0.78 + 0.22 * weave) * (0.9 + 0.12 * jitter) * (0.82 + 0.25 * dirt)
    burlap = np.array([0.66, 0.56, 0.4])
    sand = np.array([0.8, 0.72, 0.56])
    c = tone[..., None] * burlap * (1 - 0.5 * dust[..., None]) + sand * 0.5 * dust[..., None]
    save(
        "sandbag",
        Image.fromarray((np.clip(c, 0, 1) * 255).astype(np.uint8)),
        normal_from_height(height * 3, 1.6),
        Image.fromarray((np.clip(0.8 + 0.15 * (1 - weave) + 0.05 * dust, 0, 1) * 255).astype(np.uint8)),
    )


hedge()
cardboard()
aluminium()
sandbag()
print("procedural textures written")
