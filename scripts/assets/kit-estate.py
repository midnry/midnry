"""Wreck Estate wall kit, one 3 m tile per piece, procedural in Blender (bpy):
  hedge   - clipped boxwood hedge on a limestone kerb (wall type 2)
  planter - limestone planter box overflowing with shrubs (wall type 3)
Materials: leaves, stone, soil. The game assigns the textures by name.
Usage: <blender-python> scripts/assets/kit-estate.py out.glb"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from kit_common import reset, box, lumpy, subdivide, join, project, bake_and_export, mat, active, jitter
import bpy

out = sys.argv[-1]
reset(21)


def hedge():
    kerb = box((2.96, 2.96, 0.24), (0, 0, 0.12), "stone", bevel=0.02, uv=1.5)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1.47))
    h = active()
    # Full tile width with only slightly softened edges, so neighbouring
    # tiles read as one continuous clipped hedge rather than green cubes.
    h.scale = (2.98, 2.98, 2.5)
    bpy.ops.object.transform_apply(scale=True)
    b = h.modifiers.new("bevel", "BEVEL")
    b.width = 0.08
    b.segments = 2
    bpy.ops.object.modifier_apply(modifier="bevel")
    subdivide(h, 2)
    lumpy(h, 0.12, 0.55, 1)
    h.data.materials.append(mat("leaves"))
    project(h, 1.5)
    return join([h, kerb], "hedge")


def planter():
    parts = [
        box((2.9, 2.9, 1.0), (0, 0, 0.5), "stone", bevel=0.03, uv=1.5),
        # Coping lip around the top.
        box((3.0, 3.0, 0.1), (0, 0, 1.03), "stone", bevel=0.02, uv=1.5),
        box((2.6, 2.6, 0.04), (0, 0, 1.06), "soil", uv=1.5),
    ]
    # Shrubs: lumpy spheres heaped up to about 2.7 m.
    for x, y, r, z in ((-0.7, -0.7, 0.85, 1.6), (0.75, -0.6, 0.8, 1.55), (-0.6, 0.75, 0.8, 1.55), (0.7, 0.7, 0.9, 1.65), (0.0, 0.0, 1.0, 1.95)):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=r, location=(x + jitter(0.1), y + jitter(0.1), z))
        s = active()
        s.scale = (1, 1, 0.9)
        bpy.ops.object.transform_apply(scale=True)
        lumpy(s, 0.18, 0.45, len(parts))
        s.data.materials.append(mat("leaves"))
        project(s, 1.5)
        parts.append(s)
    return join(parts, "planter")


pieces = [hedge(), planter()]
bake_and_export(pieces, out, smooth={"hedge", "planter"})
