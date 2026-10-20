"""Skyport wall kit, one 3 m tile per piece, procedural in Blender (bpy):
  uld     - aluminium air-cargo container with ribs and a curtain door (type 2)
  pallets - shrink-strapped cardboard on wooden pallets, two tiers (type 3)
  prop-cone - traffic cone, used as a small wall-side prop
Materials: aluminium, rail, curtain, strap, cardboard, wood, cone, reflect,
rubber. The game assigns the textures by name.
Usage: <blender-python> scripts/assets/kit-skyport.py out.glb"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from kit_common import reset, box, join, bake_and_export, mat, active, jitter
import bpy

out = sys.argv[-1]
reset(31)


def uld():
    parts = [
        box((2.98, 2.98, 0.12), (0, 0, 0.06), "rail", bevel=0.01, uv=0),
        box((2.9, 2.9, 2.38), (0, 0, 1.31), "aluminium", bevel=0.015, uv=1.2),
        box((2.96, 2.96, 0.08), (0, 0, 2.54), "rail", bevel=0.01, uv=0),
    ]
    # Vertical stiffening ribs on three sides; the fourth is the door.
    for side in range(3):
        for k in range(6):
            u = -1.2 + k * 0.48
            if side == 0:
                parts.append(box((0.07, 0.05, 2.36), (1.465, u, 1.31), "aluminium", uv=0.5))
            elif side == 1:
                parts.append(box((0.05, 0.07, 2.36), (u, 1.465, 1.31), "aluminium", uv=0.5))
            else:
                parts.append(box((0.07, 0.05, 2.36), (-1.465, u, 1.31), "aluminium", uv=0.5))
    # Curtain door with webbing straps on the -Y face.
    parts.append(box((2.6, 0.04, 2.1), (0, -1.465, 1.3), "curtain", uv=1.0))
    for z in (0.55, 1.15, 1.75, 2.25):
        parts.append(box((2.66, 0.06, 0.06), (0, -1.49, z), "strap", uv=0))
    for x in (-1.45, 1.45):
        parts.append(box((0.08, 0.08, 2.5), (x, -1.45, 1.3), "rail", uv=0))
    return join(parts, "uld")


def stack(x, y, z, parts):
    """One pallet with a strapped block of cartons on it."""
    w = 1.42
    parts.append(box((w, w, 0.03), (x, y, z + 0.135), "wood", uv=0.8))
    for u in (-0.6, 0, 0.6):
        parts.append(box((w, 0.12, 0.1), (x, y + u, z + 0.07), "wood", uv=0.8))
    parts.append(box((w, w, 0.025), (x, y, z + 0.0125), "wood", uv=0.8))
    zc = z + 0.15
    for layer in range(2):
        for i in range(2):
            for j in range(2):
                s = 0.69 - 0.03 * (abs(jitter(1)))
                parts.append(box((s, s, 0.56), (x - 0.35 + i * 0.7 + jitter(0.03), y - 0.35 + j * 0.7 + jitter(0.03), zc + 0.28 + layer * 0.57), "cardboard", uv=0.7))
    for u in (-0.4, 0.4):
        parts.append(box((1.44, 0.04, 1.16), (x, y + u, zc + 0.57), "strap", uv=0))
    return zc + 1.14


def pallets():
    parts = []
    for i in range(2):
        for j in range(2):
            x, y = -0.75 + i * 1.5, -0.75 + j * 1.5
            top = stack(x + jitter(0.04), y + jitter(0.04), 0, parts)
            if not (i == 1 and j == 0):  # a gap on the top tier reads as a real store
                stack(x + jitter(0.06), y + jitter(0.06), top, parts)
    return join(parts, "pallets")


def cone():
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.17, radius2=0.03, depth=0.7, location=(0, 0, 0.39))
    c = active()
    c.data.materials.append(mat("cone"))
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.115, depth=0.12, location=(0, 0, 0.5))
    band = active()
    band.data.materials.append(mat("reflect"))
    base = box((0.42, 0.42, 0.04), (0, 0, 0.02), "rubber", uv=0)
    return join([c, band, base], "prop-cone")


pieces = [uld(), pallets(), cone()]
bake_and_export(pieces, out)
