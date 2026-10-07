#!/usr/bin/env python3
"""Cut a painted character sheet into the game's sprite files.

Two kinds of sheet:

  walk   One person, 3 rows (front, side, back) x 4 walk frames.
         python3 scripts/art/cut_sheet.py walk you-m-dark-3 sheet.png
         -> public/abuja/people/you-m-dark-3-walk-{front,side,back}-{1..4}.png

  views  One person per row, each row FRONT, SIDE (facing right), BACK.
         A five-view row (front, angled, side, back, angled) keeps the straight three.
         python3 scripts/art/cut_sheet.py views sheet.png you-k-f-brown-child you-k-f-brown-teen
         -> public/abuja/people/<name>-{front,side,back}.png

Sheets may have a real transparent background or a painted grey-and-white
checkerboard (what ChatGPT usually gives); both work. Every figure comes out
220px tall, cropped tight, on a transparent background. Walk frames are
centred on the head so the body doesn't jitter from frame to frame.

Needs Python 3 with numpy, scipy and Pillow:  pip install numpy scipy pillow
"""

import os
import sys

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

OUT = os.environ.get("ART_OUT") or os.path.join(os.path.dirname(__file__), "..", "..", "public", "abuja", "people")
H = 220  # height of a standing figure in the game's files, in pixels
VIEWS = ["front", "side", "back"]


def load(path):
    """The sheet as RGBA, with a painted checkerboard background turned transparent."""
    im = Image.open(path)
    if im.mode == "RGBA" and (np.array(im)[:, :, 3] < 128).mean() > 0.2:
        return np.array(im)
    rgb = np.array(im.convert("RGB")).astype(int)
    mx, mn = rgb.max(2), rgb.min(2)
    # Painted checkerboard: bright, nearly colourless pixels connected to the edge.
    cand = (mn > 196) & (mx - mn < 24)
    lab, _ = ndi.label(cand)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))
    # Big enclosed checker pockets too (between arms and body): bright, colourless, large.
    sizes = ndi.sum(cand, lab, range(1, lab.max() + 1))
    for i, sz in enumerate(sizes, 1):
        if i in edge or sz < 1500:
            continue
        region = lab == i
        vals = rgb[region].mean(1)
        if (vals > 248).mean() > 0.25 and ((vals > 215) & (vals < 242)).mean() > 0.25:
            bg |= region
    alpha = ndi.binary_opening(~bg, iterations=1)
    alpha = ndi.binary_erosion(alpha, iterations=1).astype(np.uint8) * 255
    img = Image.fromarray(np.dstack([rgb.astype(np.uint8), alpha]), "RGBA")
    img.putalpha(img.getchannel("A").filter(ImageFilter.GaussianBlur(0.7)))
    return np.array(img)


def figures(a, nrows):
    """Figures as connected shapes, sorted into rows and then left to right.
    Shapes that run into the next row (feet touching a head) are split at their
    narrowest point near the row boundary; detached bits join the figure they belong to."""
    solid = a[:, :, 3] > 100
    hh = solid.shape[0]
    lab, n = ndi.label(solid, structure=np.ones((3, 3)))
    rowh = hh / nrows
    nxt = n + 1
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        if sl is None:
            continue
        for k in range(1, nrows):
            b = int(k * rowh)
            if sl[0].start < b - 40 and sl[0].stop > b + 40:
                m = lab[:, sl[1]] == i
                ys = range(max(sl[0].start, b - 80), min(sl[0].stop, b + 80))
                cut = min((m[y].sum(), abs(y - b), y) for y in ys)[2]
                block = lab[cut:, sl[1]]
                block[block == i] = nxt
                nxt += 1
    pieces = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        if sl is None:
            continue
        area = int((lab[sl] == i).sum())
        # Specks, divider lines and frame edges.
        if area < 30 or min(sl[0].stop - sl[0].start, sl[1].stop - sl[1].start) < 8:
            continue
        pieces.append({"id": i, "y0": sl[0].start, "y1": sl[0].stop, "x0": sl[1].start, "x1": sl[1].stop, "area": area, "cy": (sl[0].start + sl[0].stop) / 2, "cx": (sl[1].start + sl[1].stop) / 2})
    big = [p for p in pieces if p["area"] > 1500]
    small = [p for p in pieces if p["area"] <= 1500]
    rows = [[] for _ in range(nrows)]
    for p in big:
        rows[min(nrows - 1, int(p["cy"] // rowh))].append(p)
    out = []
    for ps in rows:
        ps.sort(key=lambda p: -p["area"])
        figs = []
        for p in ps:
            # A piece over or under an existing figure (a detached head, a bag) joins it.
            host = next((f for f in figs if min(f["x1"], p["x1"]) - max(f["x0"], p["x0"]) > 0.4 * (p["x1"] - p["x0"])), None)
            if host:
                host["ids"].append(p["id"])
                host.update(y0=min(host["y0"], p["y0"]), y1=max(host["y1"], p["y1"]), x0=min(host["x0"], p["x0"]), x1=max(host["x1"], p["x1"]))
            else:
                figs.append({**p, "ids": [p["id"]]})
        for q in small:
            f = next((f for f in figs if f["x0"] - 6 <= q["cx"] <= f["x1"] + 6 and f["y0"] - 6 <= q["cy"] <= f["y1"] + 6), None)
            if f:
                f["ids"].append(q["id"])
        figs.sort(key=lambda f: f["x0"])
        out.append([(lab, f["ids"], (f["y0"], f["y1"], f["x0"], f["x1"])) for f in figs])
    return out


def crop(a, f):
    lab, ids, (y0, y1, x0, x1) = f
    piece = a[y0:y1, x0:x1].copy()
    keep = ndi.binary_dilation(np.isin(lab[y0:y1, x0:x1], ids), iterations=2)
    piece[:, :, 3] = np.where(keep, piece[:, :, 3], 0)
    return Image.fromarray(piece, "RGBA")


def cut_walk(oid, path):
    a = load(path)
    rows = figures(a, 3)
    counts = [len(r) for r in rows]
    if counts != [4, 4, 4]:
        sys.exit(f"Expected 3 rows of 4 poses, found {counts}. Ask for a cleaner sheet: more space between poses, nothing touching.")
    for view, figs in zip(VIEWS, rows):
        ims = [crop(a, f) for f in figs]
        k = H / max(i.height for i in ims)
        for n, im in enumerate(ims, 1):
            im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
            # Centre each frame on the head so the body doesn't jitter between frames.
            top = np.array(im)[: max(4, im.height // 7), :, 3] > 100
            xs = np.where(top.any(0))[0]
            hx = int((xs[0] + xs[-1]) / 2) if len(xs) else im.width // 2
            half = max(hx, im.width - hx) + 2
            canvas = Image.new("RGBA", (half * 2, H), (0, 0, 0, 0))
            canvas.paste(im, (half - hx, H - im.height), im)
            dest = os.path.join(OUT, f"{oid}-walk-{view}-{n}.png")
            canvas.save(dest, optimize=True)
            print("wrote", os.path.normpath(dest))


def cut_views(path, names):
    a = load(path)
    rows = figures(a, len(names))
    for name, figs in zip(names, rows):
        if len(figs) == 5:
            figs = [figs[0], figs[2], figs[3]]
        if len(figs) != 3:
            sys.exit(f"{name}: expected 3 views (front, side, back), found {len(figs)}.")
        k = H / max(f[2][1] - f[2][0] for f in figs)
        for f, view in zip(figs, VIEWS):
            im = crop(a, f)
            im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
            dest = os.path.join(OUT, f"{name}-{view}.png")
            im.save(dest, optimize=True)
            print("wrote", os.path.normpath(dest))


if __name__ == "__main__":
    if len(sys.argv) >= 4 and sys.argv[1] == "walk":
        cut_walk(sys.argv[2], sys.argv[3])
    elif len(sys.argv) >= 4 and sys.argv[1] == "views":
        cut_views(sys.argv[2], sys.argv[3:])
    else:
        sys.exit(__doc__)
