"""Dust Outpost dressing set, procedural in Blender (bpy), ambient occlusion
baked into vertex colours. Each piece is a small vignette that stands
against a wall base (ArenaStyles.dress places them; they never block a
lane and have no collision). Origin on the ground at the piece's centre;
+y (Blender) is the wall side, the arena's lane is towards -y.
  prop-power   - floodlight mast with a diesel generator and a cable drum
  prop-tank    - water tank on a steel stand with a tap and a trough
  prop-radio   - radio mast with guy wires, a dish and a field telephone box
  prop-lean    - tarp lean-to over stacked crates on two poles
  prop-stack   - sandbag-free supply stack: oil drums under a camo net
Materials (named; the game assigns the look): steel, olive, rubber, tarp,
lamp, concrete, wood, net.
Usage: <blender-python> scripts/assets/dust-set.py out.glb"""
import sys
import math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from kit_common import reset, box, join, bake_and_export, mat, active, jitter
import bpy
import bmesh

out = sys.argv[-1]
reset(20261025)


def cyl(radius, depth, at, axis, material, verts=14):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, vertices=verts, location=at)
    o = active()
    if axis == "x":
        o.rotation_euler = (0, math.pi / 2, 0)
    elif axis == "y":
        o.rotation_euler = (math.pi / 2, 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    o.data.materials.append(mat(material))
    return o


def wire(a, b, material="steel", thick=0.025):
    from mathutils import Vector
    pa, pb = Vector(a), Vector(b)
    d = (pb - pa).normalized()
    helper = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))
    u = d.cross(helper).normalized() * (thick / 2)
    w = d.cross(u).normalized() * (thick / 2)
    me = bpy.data.meshes.new("wire")
    bm = bmesh.new()
    corners = [bm.verts.new(p + su * u + sw * w) for p in (pa, pb) for su, sw in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((corners[i], corners[j], corners[4 + j], corners[4 + i]))
    bm.faces.new(corners[3::-1])
    bm.faces.new(corners[4:])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new("wire", me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(mat(material))
    return o


def power():
    parts = []
    # Mast: 6.5 m pole on a concrete footing, two floodlights aimed into the lane.
    parts.append(box((0.6, 0.6, 0.25), (0.45, 0.25, 0.125), "concrete", bevel=0.02, uv=0.5))
    parts.append(cyl(0.07, 6.3, (0.45, 0.25, 3.4), "z", "steel", verts=10))
    parts.append(box((0.9, 0.08, 0.08), (0.45, 0.25, 6.45), "steel", uv=0))
    for dx in (-0.3, 0.3):
        parts.append(box((0.32, 0.26, 0.2), (0.45 + dx, 0.12, 6.3), "steel", bevel=0.02, uv=0))
        parts.append(box((0.26, 0.03, 0.15), (0.45 + dx, -0.03, 6.27), "lamp", uv=0))
    # Generator on skids: a boxy olive unit with a radiator grille, exhaust and
    # a control panel, sitting against the wall.
    parts.append(box((1.3, 0.12, 0.1), (-0.5, 0.45, 0.05), "steel", uv=0))
    parts.append(box((1.3, 0.12, 0.1), (-0.5, 0.0, 0.05), "steel", uv=0))
    parts.append(box((1.2, 0.62, 0.8), (-0.5, 0.22, 0.5), "olive", bevel=0.03, uv=0.8))
    parts.append(box((0.04, 0.5, 0.6), (-1.11, 0.22, 0.5), "rubber", uv=0))
    parts.append(cyl(0.05, 0.5, (-0.3, 0.3, 1.12), "z", "steel", verts=10))
    parts.append(box((0.3, 0.02, 0.2), (-0.2, -0.1, 0.62), "steel", uv=0))
    # Cable drum beside it and a cable run up the mast.
    parts.append(cyl(0.3, 0.06, (0.95, -0.12, 0.3), "y", "wood", verts=16))
    parts.append(cyl(0.3, 0.06, (0.95, 0.16, 0.3), "y", "wood", verts=16))
    parts.append(cyl(0.12, 0.26, (0.95, 0.02, 0.3), "y", "rubber", verts=12))
    parts.append(wire((0.1, 0.42, 0.9), (0.45, 0.32, 5.9), "rubber", 0.03))
    return join(parts, "prop-power")


def tank():
    parts = []
    # Steel stand, 1.8 m, with cross braces; a 1,000 l tank on top; a tap, a
    # hose and a water trough at the foot.
    for x, y in ((-0.55, -0.1), (0.55, -0.1), (-0.55, 0.5), (0.55, 0.5)):
        parts.append(box((0.07, 0.07, 1.8), (x, y, 0.9), "steel", uv=0))
    parts.append(box((1.25, 0.72, 0.06), (0, 0.2, 1.82), "steel", uv=0))
    parts.append(wire((-0.55, -0.1, 0.1), (0.55, -0.1, 1.7), "steel", 0.04))
    parts.append(wire((0.55, -0.1, 0.1), (-0.55, -0.1, 1.7), "steel", 0.04))
    parts.append(cyl(0.5, 1.2, (0, 0.2, 2.37), "x", "olive", verts=20))
    parts.append(cyl(0.48, 0.05, (-0.62, 0.2, 2.37), "x", "steel", verts=20))
    parts.append(cyl(0.48, 0.05, (0.62, 0.2, 2.37), "x", "steel", verts=20))
    parts.append(cyl(0.12, 0.12, (0, 0.2, 2.9), "z", "steel", verts=12))
    parts.append(cyl(0.025, 1.9, (0.45, -0.2, 1.3), "z", "steel", verts=8))
    parts.append(box((0.12, 0.05, 0.05), (0.45, -0.24, 0.5), "rubber", uv=0))
    parts.append(box((0.9, 0.4, 0.3), (-0.25, -0.3, 0.15), "steel", bevel=0.02, uv=0.5))
    return join(parts, "prop-tank")


def radio():
    parts = []
    parts.append(box((0.5, 0.5, 0.2), (0, 0.25, 0.1), "concrete", bevel=0.02, uv=0.5))
    parts.append(cyl(0.045, 4.6, (0, 0.25, 2.5), "z", "steel", verts=8))
    for k in range(3):
        a = k * 2.094 + 0.5
        gx, gy = math.cos(a) * 0.75, 0.25 + math.sin(a) * 0.35
        parts.append(wire((0, 0.25, 4.3), (gx, gy, 0.02), "steel", 0.015))
        parts.append(box((0.08, 0.08, 0.05), (gx, gy, 0.025), "steel", uv=0))
    parts.append(cyl(0.3, 0.06, (0.0, -0.05, 3.5), "y", "steel", verts=16))
    parts.append(box((0.04, 0.3, 0.04), (0, 0.1, 3.5), "steel", uv=0))
    parts.append(box((0.08, 0.08, 1.2), (0, 0.25, 5.4), "steel", uv=0))
    # Field telephone box on a post, a crate of batteries.
    parts.append(box((0.06, 0.06, 1.1), (0.7, 0.3, 0.55), "wood", uv=0))
    parts.append(box((0.3, 0.16, 0.4), (0.7, 0.26, 1.2), "olive", bevel=0.01, uv=0.3))
    parts.append(box((0.5, 0.35, 0.3), (-0.6, 0.3, 0.15), "wood", bevel=0.01, uv=0.5))
    return join(parts, "prop-radio")


def lean():
    parts = []
    # Two poles, a tarp sloping from the wall down to the poles, crates under it.
    for x in (-0.75, 0.75):
        parts.append(box((0.07, 0.07, 1.6), (x, -0.2, 0.8), "wood", uv=0))
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0.12, 1.9))
    tarp = active()
    tarp.scale = (1.9, 0.75, 1)
    tarp.rotation_euler = (0.42, 0, 0)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    s = tarp.modifiers.new("solid", "SOLIDIFY")
    s.thickness = 0.02
    bpy.ops.object.modifier_apply(modifier="solid")
    tarp.data.materials.append(mat("tarp"))
    parts.append(tarp)
    for x in (-0.75, 0.75):
        parts.append(wire((x, -0.2, 1.6), (x + (0.35 if x > 0 else -0.35), -0.55, 0.0), "steel", 0.012))
    for i, (x, y, z, w) in enumerate(((-0.45, 0.25, 0.25, 0.8), (0.45, 0.25, 0.25, 0.7), (0.0, 0.25, 0.75, 0.75))):
        parts.append(box((w, 0.55, 0.5), (x + jitter(0.03), y, z), "wood", bevel=0.01, uv=0.6))
    return join(parts, "prop-lean")


def stack():
    parts = []
    for x, y, z, ry in ((-0.3, 0.2, 0.45, 0.0), (0.3, 0.22, 0.45, 0.3), (0.0, 0.18, 1.35, 0.1)):
        parts.append(cyl(0.29, 0.9, (x, y, z), "z", "olive", verts=16))
        for dz in (-0.3, 0.0, 0.3):
            parts.append(cyl(0.3, 0.03, (x, y, z + dz), "z", "steel", verts=16))
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0.05, 1.95))
    net = active()
    net.scale = (1.7, 1.1, 1)
    net.rotation_euler = (0.25, 0, 0)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.subdivide(number_cuts=5)
    bpy.ops.object.mode_set(mode="OBJECT")
    from kit_common import lumpy
    lumpy(net, 0.12, 0.5, 3)
    net.data.materials.append(mat("net"))
    parts.append(net)
    for x in (-0.85, 0.85):
        parts.append(box((0.05, 0.05, 1.7), (x, -0.35, 0.85), "wood", uv=0))
    return join(parts, "prop-stack")


pieces = [power(), tank(), radio(), lean(), stack()]
bake_and_export(pieces, out, smooth=())
