"""Home lobby set pieces, procedural in Blender (bpy), ambient occlusion
baked into vertex colours (kit_common.bake_and_export):
  hangar - the hangar side on the left of the stage, in lobby coordinates
           (three.js x = Blender x, three.js z = -Blender y): corrugated
           cladding, I-beam columns, a low canopy whose lattice truss frames
           the top of the view, a lit bay door, a catwalk with stairs,
           pipes, wall lamps and hazard striping.
  truck  - an armoured six-wheel truck, centred on its own origin (the game
           places it): cab, canvas-covered bed, bumper, grille, lights.
Materials (the game assigns colour, roughness and glow by name): steel,
cladding, concrete, interior, hazard, lamp, glass, olive, canvas, rubber,
chrome, grille.
Usage: <blender-python> scripts/assets/lobby-set.py out.glb"""
import sys
import math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from kit_common import reset, box, join, bake_and_export, mat, active, jitter
import bpy
import bmesh

out = sys.argv[-1]
reset(20261023)


def P(x, z3, y3):
    """Lobby (three.js) coordinates to Blender: x, height y3, depth z3."""
    return (x, -z3, y3)


def bx(size_xyz, at, material, bevel=0.0, uv=1.0):
    """A box sized (x, height, depth) at a lobby position (x, y, z)."""
    sx, sy, sz = size_xyz
    x, y, z = at
    return box((sx, sz, sy), P(x, z, y), material, bevel=bevel, uv=uv)


def cylinder(radius, depth, at, axis, material, verts=16, bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, vertices=verts, location=at)
    o = active()
    if axis == "x":
        o.rotation_euler = (0, math.pi / 2, 0)
    elif axis == "y":
        o.rotation_euler = (math.pi / 2, 0, 0)
    bpy.ops.object.transform_apply(rotation=True)
    if bevel:
        b = o.modifiers.new("bevel", "BEVEL")
        b.width = bevel
        b.segments = 2
        bpy.ops.object.modifier_apply(modifier="bevel")
    o.data.materials.append(mat(material))
    return o


def beam(a, b, thick, material):
    """A square-section bar between two Blender-space points, built from its
    eight corners (no object rotation, so nothing can end up misplaced)."""
    from mathutils import Vector
    pa, pb = Vector(a), Vector(b)
    d = (pb - pa).normalized()
    helper = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))
    u = d.cross(helper).normalized() * (thick / 2)
    w = d.cross(u).normalized() * (thick / 2)
    me = bpy.data.meshes.new("beam")
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
    o = bpy.data.objects.new("beam", me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(mat(material))
    from kit_common import project
    project(o, 1.0)
    return o


def corrugated(x, z0, z1, y0, y1, depth=0.045, pitch=0.22, material="cladding"):
    """A wall of vertical corrugated sheeting facing +x (towards the stage)."""
    me = bpy.data.meshes.new("corrugated")
    bm = bmesh.new()
    steps = int(abs(z1 - z0) / (pitch / 4))
    cols = []
    for i in range(steps + 1):
        z = z0 + (z1 - z0) * i / steps
        off = math.sin(i / 4 * math.tau) * depth
        cols.append((bm.verts.new(P(x + off, z, y0)), bm.verts.new(P(x + off, z, y1))))
    for i in range(steps):
        a, b = cols[i], cols[i + 1]
        bm.faces.new((a[0], b[0], b[1], a[1]))
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new("corrugated", me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(mat(material))
    bpy.context.view_layer.objects.active = o
    # Make sure the sheet faces the stage (+x).
    if o.data.polygons[0].normal.x < 0:
        bpy.ops.object.select_all(action="DESELECT")
        o.select_set(True)
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.mesh.flip_normals()
        bpy.ops.object.mode_set(mode="OBJECT")
    from kit_common import project
    project(o, 1.0)
    return o


def hangar():
    parts = []
    wx = -7.2  # the cladding plane
    # Concrete plinth along the foot of the wall.
    parts.append(bx((0.5, 1.0, 21.5), (wx + 0.1, 0.5, -13.5), "concrete", bevel=0.03, uv=1.5))
    # Cladding: lower run beside the bay door, and the full height above it.
    parts.append(corrugated(wx, -3.0, -9.2, 1.0, 11.0))
    parts.append(corrugated(wx, -13.8, -24.0, 1.0, 11.0))
    parts.append(corrugated(wx, -9.2, -13.8, 4.6, 11.0))
    # The bay door: a lit interior behind a framed opening with hazard stripes.
    parts.append(bx((0.2, 3.6, 4.6), (wx - 2.6, 1.8, -11.5), "interior", uv=1.0))
    parts.append(bx((2.6, 0.1, 4.6), (wx - 1.3, 3.65, -11.5), "steel", uv=1.0))  # ceiling
    parts.append(bx((2.6, 3.6, 0.1), (wx - 1.3, 1.8, -9.2), "steel", uv=1.0))
    parts.append(bx((2.6, 3.6, 0.1), (wx - 1.3, 1.8, -13.8), "steel", uv=1.0))
    for z in (-9.15, -13.85):
        parts.append(bx((0.25, 4.6, 0.25), (wx + 0.05, 2.3, z), "hazard", bevel=0.01, uv=0.4))
    parts.append(bx((0.25, 0.3, 4.95), (wx + 0.05, 4.45, -11.5), "hazard", bevel=0.01, uv=0.4))
    # Rolled-up door drum and guide rails.
    parts.append(cylinder(0.32, 4.7, P(wx + 0.25, -11.5, 4.0), "y", "steel", verts=20))
    # Inside the bay: shelving uprights and a hanging lamp.
    for z in (-10.0, -13.0):
        parts.append(bx((0.08, 3.0, 0.08), (wx - 2.2, 1.5, z), "steel", uv=0))
    for y in (0.6, 1.5, 2.4):
        parts.append(bx((0.6, 0.05, 3.1), (wx - 2.2, y, -11.5), "steel", uv=0))
    parts.append(bx((0.6, 0.12, 0.6), (wx - 1.2, 3.4, -11.5), "lamp", uv=0))
    # I-beam columns along the wall, every 3.5 m (avoiding the door).
    for z in (-3.6, -7.1, -15.4, -18.9, -22.4):
        parts.append(bx((0.32, 10.6, 0.06), (wx + 0.4, 5.3, z - 0.13), "steel", uv=0))
        parts.append(bx((0.32, 10.6, 0.06), (wx + 0.4, 5.3, z + 0.13), "steel", uv=0))
        parts.append(bx((0.06, 10.6, 0.26), (wx + 0.4, 5.3, z), "steel", uv=0))
        parts.append(bx((0.5, 0.25, 0.5), (wx + 0.4, 0.12, z), "steel", bevel=0.02, uv=0))  # base plate
    # Eaves beam and the wall top.
    parts.append(bx((0.5, 0.45, 21.5), (wx + 0.3, 10.8, -13.5), "steel", uv=0))
    # The low canopy over the stage side: a roof deck from the wall out to
    # x = -2.6 at 5.4 m, held by a lattice truss along its front edge. It is
    # what frames the top-left of the lobby view (the concept's hangar mouth).
    deck_y, front = 5.4, -2.6
    parts.append(bx((abs(front - wx), 0.12, 13.0), ((front + wx) / 2, deck_y + 0.95, -9.6), "steel", uv=1.0))
    zs, ze = -3.1, -16.1
    for y in (deck_y, deck_y + 0.9):
        parts.append(bx((0.16, 0.16, abs(ze - zs)), (front, y, (zs + ze) / 2), "steel", uv=0))
    n = 10
    for i in range(n + 1):
        z = zs + (ze - zs) * i / n
        parts.append(bx((0.1, 0.9, 0.1), (front, deck_y + 0.45, z), "steel", uv=0))
        if i < n:
            z2 = zs + (ze - zs) * (i + 1) / n
            a, b = (P(front, z, deck_y), P(front, z2, deck_y + 0.9)) if i % 2 == 0 else (P(front, z, deck_y + 0.9), P(front, z2, deck_y))
            parts.append(beam(a, b, 0.07, "steel"))
    # Rafters from the truss back to the wall, with hanging work lamps.
    for i in range(0, n + 1, 2):
        z = zs + (ze - zs) * i / n
        parts.append(bx((abs(front - wx), 0.22, 0.12), ((front + wx) / 2, deck_y + 0.75, z), "steel", uv=0))
    for z in (-5.0, -9.0, -13.0):
        parts.append(bx((0.04, 0.6, 0.04), (-4.6, deck_y + 0.4, z), "steel", uv=0))
        parts.append(cylinder(0.28, 0.16, P(-4.6, z, deck_y + 0.02), "z", "steel", verts=20))
        parts.append(cylinder(0.24, 0.04, P(-4.6, z, deck_y - 0.07), "z", "lamp", verts=20))
    # One canopy post at the far corner (the near end overhangs, so no post
    # cuts down the view beside the stage).
    for z in (ze,):
        parts.append(bx((0.22, deck_y, 0.22), (front, deck_y / 2, z), "steel", bevel=0.01, uv=0))
    # Catwalk along the far wall section, with railings and a stair.
    cy, cz0, cz1 = 3.2, -16.0, -23.6
    parts.append(bx((1.2, 0.08, abs(cz1 - cz0)), (wx + 0.9, cy, (cz0 + cz1) / 2), "grille", uv=1.0))
    for z in [cz0 + (cz1 - cz0) * k / 6 for k in range(7)]:
        parts.append(bx((0.05, 1.05, 0.05), (wx + 1.47, cy + 0.52, z), "steel", uv=0))
        parts.append(bx((1.2, 0.08, 0.08), (wx + 0.9, cy - 0.06, z), "steel", uv=0))
    for y in (cy + 0.55, cy + 1.05):
        parts.append(bx((0.05, 0.05, abs(cz1 - cz0)), (wx + 1.47, y, (cz0 + cz1) / 2), "steel", uv=0))
    # The stair climbs from the floor (towards the stage) up to the catwalk's
    # near end, with a stringer on its open side.
    for k in range(12):
        t = k / 11
        parts.append(bx((1.0, 0.05, 0.28), (wx + 1.0, 0.27 * (k + 1), cz0 + 3.4 - t * 3.2), "grille", uv=0))
    parts.append(beam(P(wx + 1.5, cz0 + 3.6, 0.05), P(wx + 1.5, cz0 + 0.1, cy), 0.08, "steel"))
    # Pipes along the wall at two heights, with brackets.
    for y, r in ((2.4, 0.09), (2.75, 0.06)):
        parts.append(cylinder(r, 21.0, P(wx + 0.22, -13.5, y), "y", "chrome" if r < 0.07 else "steel", verts=12))
    # Wall lamps (caged boxes with a lit face) between the columns.
    for z in (-16.8, -20.6):
        parts.append(bx((0.18, 0.32, 0.5), (wx + 0.14, 3.9, z), "steel", bevel=0.02, uv=0))
        parts.append(bx((0.04, 0.24, 0.42), (wx + 0.25, 3.9, z), "lamp", uv=0))
    # Electrical cabinets and a fire point by the door.
    parts.append(bx((0.35, 1.3, 0.9), (wx + 0.2, 1.65, -8.2), "steel", bevel=0.02, uv=0.8))
    parts.append(bx((0.3, 0.6, 0.45), (wx + 0.18, 1.5, -15.0), "hazard", bevel=0.02, uv=0.5))
    o = join(parts, "hangar")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return o


def wheel(x, y, parts):
    """A tyre with tread blocks and a steel hub, axle along Blender y."""
    parts.append(cylinder(0.52, 0.42, (x, y, 0.52), "y", "rubber", verts=28, bevel=0.06))
    for k in range(18):
        a = k / 18 * math.tau
        tx, tz = math.cos(a) * 0.53, math.sin(a) * 0.53 + 0.52
        b = box((0.075, 0.36, 0.03), (x + tx * 0.985, y, 0.52 + (tz - 0.52) * 0.985), "rubber", uv=0, rotation=(0, -a + math.pi / 2, 0))
        parts.append(b)
    side = 1 if y > 0 else -1
    parts.append(cylinder(0.3, 0.06, (x, y + side * 0.2, 0.52), "y", "steel", verts=20))
    parts.append(cylinder(0.1, 0.1, (x, y + side * 0.24, 0.52), "y", "chrome", verts=12))


def truck():
    parts = []
    # Chassis rails and body (Blender: x = length, y = width, z = up).
    parts.append(box((6.0, 1.0, 0.3), (0, 0, 0.75), "steel", bevel=0.02, uv=0))
    for x in (-1.9, -0.6, 2.0):
        for y in (-1.02, 1.02):
            wheel(x, y, parts)
    # Mudguards over the wheels.
    for x, w in ((-1.25, 2.3), (2.0, 1.4)):
        for y in (-1.08, 1.08):
            parts.append(box((w, 0.5, 0.08), (x, y, 1.13), "olive", bevel=0.02, uv=0))
    # Cab: a slab-sided armoured cab with a raked windscreen.
    parts.append(box((1.9, 2.3, 1.5), (2.05, 0, 1.75), "olive", bevel=0.06, uv=1.0))
    parts.append(box((1.0, 2.2, 0.25), (2.6, 0, 2.6), "olive", bevel=0.05, uv=1.0))
    ws = box((0.06, 1.9, 0.62), (2.98, 0, 2.18), "glass", uv=0, rotation=(0, -0.32, 0))
    parts.append(ws)
    for y in (-1.16, 1.16):
        parts.append(box((1.0, 0.04, 0.5), (2.0, y, 2.15), "glass", uv=0))
        parts.append(box((0.08, 0.3, 0.45), (2.85, y * 1.12, 2.3), "steel", uv=0))  # mirror arm
    # Bonnet, grille, bumper and lights.
    parts.append(box((0.9, 2.2, 0.75), (3.35, 0, 1.4), "olive", bevel=0.06, uv=1.0))
    parts.append(box((0.06, 1.3, 0.55), (3.82, 0, 1.4), "grille", uv=0))
    for z in (1.22, 1.32, 1.42, 1.52, 1.62):
        parts.append(box((0.05, 1.3, 0.03), (3.85, 0, z), "chrome", uv=0))
    parts.append(box((0.3, 2.4, 0.28), (3.95, 0, 0.92), "steel", bevel=0.03, uv=0))
    for y in (-0.82, 0.82):
        parts.append(cylinder(0.11, 0.08, (3.84, y, 1.5), "x", "lamp", verts=16))
    parts.append(box((0.25, 1.5, 0.12), (2.4, 0, 2.8), "steel", uv=0))  # roof light bar
    for y in (-0.5, 0, 0.5):
        parts.append(box((0.08, 0.3, 0.08), (2.53, y, 2.8), "lamp", uv=0))
    # Load bed with a canvas tilt over hoops.
    parts.append(box((3.6, 2.35, 0.7), (-0.95, 0, 1.3), "olive", bevel=0.04, uv=1.0))
    bpy.ops.mesh.primitive_cylinder_add(radius=1.18, depth=3.5, vertices=32, location=(-0.95, 0, 1.65))
    tilt = active()
    tilt.rotation_euler = (0, math.pi / 2, 0)
    tilt.scale = (1, 1, 1)
    bpy.ops.object.transform_apply(rotation=True)
    # Keep the upper half of the cylinder: the canvas roof.
    bpy.ops.object.mode_set(mode="EDIT")
    bm = bmesh.from_edit_mesh(tilt.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < 0], context="VERTS")
    bmesh.update_edit_mesh(tilt.data)
    bpy.ops.object.mode_set(mode="OBJECT")
    tilt.scale = (1, 1, 0.75)
    bpy.ops.object.transform_apply(scale=True)
    tilt.data.materials.append(mat("canvas"))
    parts.append(tilt)
    # Spare wheel on the back, tool boxes and a step.
    parts.append(cylinder(0.45, 0.32, (-2.95, 0, 1.45), "x", "rubber", verts=24, bevel=0.05))
    for y in (-1.2, 1.2):
        parts.append(box((0.9, 0.3, 0.45), (0.85, y, 0.95), "steel", bevel=0.02, uv=0))
    o = join(parts, "truck")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return o


pieces = [hangar(), truck()]
bake_and_export(pieces, out, smooth=())
