"""First-person weapon models, procedural in Blender (bpy), exported as one GLB.

Coordinates match the game's weapon rig: Blender +Y is the muzzle direction
(the game's -Z), +Z is up. Parts the game animates are separate top-level
objects named <weapon>--<part> ("/" would be stripped by three.js); everything
else is <weapon>--body. Materials
are named for the game's weapon finishes: cerakote, polymer, steel, rubber,
glass, reticle, shell, brass.

  carbine--body, carbine--magazine, carbine--bolt, carbine--handle, carbine--glass
  shotgun--body, shotgun--pump, shotgun--breacher (Gatebreaker only)
  pistol--frame, pistol--slide
Usage: <blender-python> scripts/assets/kit-weapons.py out.glb"""
import sys
import math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from kit_common import reset, box, join, mat, active, project, bake_and_export
import bpy
import bmesh

out = sys.argv[-1]
reset(41)


def prism(points, width, material, x=0.0, bevel=0.0, segments=2, name="part"):
    """Extrude a side profile, given as (y, z) points, across X."""
    me = bpy.data.meshes.new(name)
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    bm = bmesh.new()
    verts = [bm.verts.new((x - width / 2, y, z)) for y, z in points]
    face = bm.faces.new(verts)
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    moved = [e for e in ext["geom"] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(width, 0, 0), verts=moved)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    o.data.materials.append(mat(material))
    if bevel:
        bpy.context.view_layer.objects.active = o
        b = o.modifiers.new("bevel", "BEVEL")
        b.width = bevel
        b.segments = segments
        b.limit_method = "ANGLE"
        bpy.ops.object.modifier_apply(modifier="bevel")
    project(o, 0.25)
    return o


def cyl(radius, length, y0, z, material, x=0.0, vertices=24):
    """A cylinder along +Y from y0."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=length,
                                        location=(x, y0 + length / 2, z), rotation=(math.pi / 2, 0, 0))
    o = active()
    o.data.materials.append(mat(material))
    project(o, 0.25)
    return o


def cut(target, cutter):
    """Boolean difference, then remove the cutter."""
    m = target.modifiers.new("cut", "BOOLEAN")
    m.operation = "DIFFERENCE"
    m.object = cutter
    m.solver = "EXACT"
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier="cut")
    bpy.data.objects.remove(cutter)


def cutter_box(size, location, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location, rotation=rotation)
    c = active()
    c.scale = size
    bpy.ops.object.transform_apply(scale=True)
    return c


def ring_prism(points_xz, y0, y1, material, bevel=0.0, name="tube"):
    """Extrude a cross-section, given as (x, z) points, along +Y."""
    me = bpy.data.meshes.new(name)
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    bm = bmesh.new()
    verts = [bm.verts.new((x, y0, z)) for x, z in points_xz]
    face = bm.faces.new(verts)
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    moved = [e for e in ext["geom"] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, y1 - y0, 0), verts=moved)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    o.data.materials.append(mat(material))
    if bevel:
        bpy.context.view_layer.objects.active = o
        bv = o.modifiers.new("bevel", "BEVEL")
        bv.width = bevel
        bv.segments = 2
        bv.limit_method = "ANGLE"
        bpy.ops.object.modifier_apply(modifier="bevel")
    project(o, 0.25)
    return o


def octagon(r, cz, flat=0.92):
    pts = []
    for k in range(8):
        a = math.pi / 8 + k * math.pi / 4
        pts.append((math.cos(a) * r * flat, cz + math.sin(a) * r))
    return pts


def pin(x, y, z, r=0.0045, material="steel"):
    o = cyl(r, 0.004, 0, 0, material, vertices=12)
    o.rotation_euler = (0, 0, math.pi / 2)
    bpy.ops.object.transform_apply(rotation=True)
    o.location = (x, y, z)
    bpy.ops.object.transform_apply(location=True)
    return o


def carbine():
    body = []
    # Upper receiver: flat-top with a stepped profile, ejection port (right),
    # brass deflector and forward assist behind it.
    upper = prism([(0.393, -0.026), (0.631, -0.026), (0.631, 0.04), (0.405, 0.04), (0.393, 0.03)],
                  0.054, "cerakote", bevel=0.003)
    cut(upper, cutter_box((0.012, 0.062, 0.022), (0.026, 0.505, 0.009)))
    body.append(upper)
    body.append(prism([(0.462, 0.0), (0.478, 0.0), (0.478, 0.028), (0.462, 0.022)], 0.012, "cerakote",
                      x=0.031, bevel=0.002))  # brass deflector
    body.append(prism([(0.425, 0.002), (0.452, 0.002), (0.452, 0.026), (0.425, 0.02)], 0.012, "cerakote",
                      x=0.031, bevel=0.003))  # forward assist housing
    body.append(pin(0.0375, 0.438, 0.012, r=0.0065))  # forward assist plunger
    # Dust cover hinged open below the port.
    body.append(box((0.0025, 0.064, 0.016), (0.032, 0.505, -0.017), "cerakote", uv=0.25))
    # Lower receiver: flared magwell, trigger housing, pins and controls.
    lower = prism([(0.40, -0.026), (0.598, -0.026), (0.598, -0.07), (0.586, -0.086), (0.536, -0.086),
                   (0.528, -0.066), (0.47, -0.064), (0.432, -0.052), (0.40, -0.042)], 0.058, "cerakote", bevel=0.003)
    cut(lower, cutter_box((0.046, 0.066, 0.07), (0, 0.567, -0.08)))
    body.append(lower)
    for x in (-0.03, 0.03):
        body.append(pin(x, 0.413, -0.031))   # takedown pin
        body.append(pin(x, 0.588, -0.031))   # pivot pin
        body.append(pin(x, 0.478, -0.048, r=0.0035))  # trigger pins
        body.append(pin(x, 0.497, -0.048, r=0.0035))
    body.append(pin(0.031, 0.535, -0.046, r=0.006, material="cerakote"))  # magazine release
    body.append(box((0.004, 0.022, 0.014), (-0.031, 0.536, -0.038), "cerakote", bevel=0.001, uv=0.25))  # bolt catch
    body.append(box((0.006, 0.024, 0.006), (-0.031, 0.452, -0.04), "steel", uv=0.25))  # safety lever
    # Trigger guard and trigger.
    body.append(box((0.01, 0.072, 0.006), (0, 0.49, -0.093), "cerakote", bevel=0.002, uv=0.25))
    body.append(box((0.01, 0.006, 0.03), (0, 0.523, -0.079), "cerakote", bevel=0.001, uv=0.25))
    body.append(prism([(0.478, -0.064), (0.487, -0.064), (0.489, -0.08), (0.483, -0.091), (0.476, -0.082)],
                      0.006, "steel", bevel=0.001))
    # Pistol grip: raked, finger groove, beavertail and flared base.
    body.append(prism([(0.452, -0.05), (0.476, -0.056), (0.468, -0.085), (0.473, -0.103), (0.464, -0.124),
                       (0.45, -0.176), (0.42, -0.182), (0.413, -0.172), (0.421, -0.13), (0.43, -0.09),
                       (0.428, -0.068), (0.418, -0.058), (0.43, -0.05)],
                      0.034, "polymer", bevel=0.006, segments=3))
    # Buffer tube, castle nut, and an adjustable stock with cheek weld,
    # adjustment latch, sling loop and grooved rubber pad.
    body.append(cyl(0.0155, 0.225, 0.176, 0.006, "steel"))
    body.append(cyl(0.019, 0.01, 0.388, 0.006, "steel", vertices=10))
    body.append(prism([(0.186, 0.036), (0.24, 0.036), (0.33, 0.03), (0.348, 0.016), (0.348, -0.012),
                       (0.31, -0.024), (0.27, -0.042), (0.22, -0.06), (0.186, -0.066)],
                      0.044, "polymer", bevel=0.006, segments=3))
    body.append(box((0.018, 0.04, 0.008), (0, 0.3, -0.03), "polymer", bevel=0.002, uv=0.25))  # latch
    bpy.ops.mesh.primitive_torus_add(major_radius=0.011, minor_radius=0.0025, location=(0, 0.2, -0.074),
                                     rotation=(0, math.pi / 2, 0), major_segments=14, minor_segments=6)
    sling = active()
    sling.data.materials.append(mat("steel"))
    body.append(sling)
    body.append(prism([(0.168, 0.04), (0.187, 0.04), (0.187, -0.07), (0.168, -0.07)], 0.05, "rubber", bevel=0.005))
    for k in range(5):
        body.append(box((0.052, 0.004, 0.004), (0, 0.166, 0.026 - k * 0.02), "rubber", uv=0))
    # Continuous top rail (Picatinny) with teeth, from receiver to muzzle end.
    body.append(box((0.022, 0.46, 0.01), (0, 0.63, 0.045), "cerakote", uv=0.25))
    for i in range(36):
        body.append(box((0.022, 0.0062, 0.006), (0, 0.405 + i * 0.0127, 0.0525), "cerakote", uv=0.25))
    # Flip-up rear sight at the back of the rail.
    body.append(prism([(0.4, 0.055), (0.425, 0.055), (0.422, 0.068), (0.405, 0.084), (0.4, 0.084)], 0.024,
                      "cerakote", bevel=0.002))
    # Free-float handguard: a solid octagonal tube with recessed M-LOK slots
    # and an end cap; the barrel nut ring shows where it meets the receiver.
    hg = ring_prism(octagon(0.034, 0.012), 0.631, 0.858, "cerakote", bevel=0.003)
    for k in range(4):
        y = 0.668 + k * 0.05
        for side in (-1, 1):
            cut(hg, cutter_box((0.012, 0.032, 0.009), (side * 0.032, y, 0.004)))
        cut(hg, cutter_box((0.009, 0.032, 0.012), (0, y, -0.022)))
    body.append(hg)
    body.append(ring_prism(octagon(0.029, 0.012), 0.64, 0.85, "steel"))  # visible floor of the slots
    body.append(ring_prism(octagon(0.031, 0.012), 0.856, 0.864, "cerakote", bevel=0.002))  # end cap
    # Barrel, low-profile gas block and a ported muzzle brake.
    body.append(cyl(0.0105, 0.16, 0.86, 0.019, "steel"))
    body.append(box((0.026, 0.024, 0.026), (0, 0.885, 0.021), "steel", bevel=0.003, uv=0.25))
    brake = cyl(0.0165, 0.048, 1.01, 0.019, "steel", vertices=20)
    for k in range(3):
        cut(brake, cutter_box((0.05, 0.007, 0.013), (0, 1.019 + k * 0.012, 0.026)))
    body.append(brake)
    # Folding front sight on the rail's far end.
    body.append(prism([(0.836, 0.057), (0.858, 0.057), (0.855, 0.1), (0.84, 0.1)], 0.018, "cerakote", bevel=0.002))
    # Micro red-dot on a low riser, well forward on the rail: a compact
    # housing with a hooded window, windage/elevation turrets and a lever.
    oy = 0.585
    body.append(box((0.024, 0.04, 0.018), (0, oy, 0.066), "cerakote", bevel=0.003, uv=0.25))
    body.append(box((0.005, 0.024, 0.008), (0.015, oy, 0.062), "steel", bevel=0.001, uv=0.25))
    housing = ring_prism([(-0.016, 0.075), (0.016, 0.075), (0.017, 0.095), (0.011, 0.112), (-0.011, 0.112),
                          (-0.017, 0.095)], oy - 0.02, oy + 0.022, "cerakote", bevel=0.002)
    cut(housing, ring_prism([(-0.0125, 0.081), (0.0125, 0.081), (0.0125, 0.098), (0.008, 0.106), (-0.008, 0.106),
                             (-0.0125, 0.098)], oy - 0.03, oy + 0.03, "steel"))
    body.append(housing)
    body.append(cyl(0.0055, 0.01, oy - 0.006, 0.117, "cerakote", vertices=12))
    knob = cyl(0.0055, 0.01, 0, 0, "cerakote", vertices=12)
    knob.rotation_euler = (0, 0, -math.pi / 2)
    bpy.ops.object.transform_apply(rotation=True)
    knob.location = (0.017, oy, 0.094)
    bpy.ops.object.transform_apply(location=True)
    body.append(knob)
    # Separate parts the game moves.
    # Magazine: curved polymer magazine built from convex segments that follow
    # the curve (each seam reads as a moulded rib), with a flared base plate.
    spine = [(0.538, 0.596, -0.066), (0.545, 0.604, -0.12), (0.556, 0.62, -0.17),
             (0.572, 0.64, -0.215), (0.592, 0.656, -0.256)]
    parts = []
    for k in range(len(spine) - 1):
        (b0, f0, z0), (b1, f1, z1) = spine[k], spine[k + 1]
        width = 0.034 if k % 2 == 0 else 0.0355
        parts.append(prism([(b0, z0), (f0, z0), (f1, z1), (b1, z1)], width, "polymer", bevel=0.0025))
    parts.append(prism([(0.586, -0.252), (0.664, -0.252), (0.666, -0.27), (0.588, -0.272)], 0.042, "polymer",
                       bevel=0.003))
    mag = join(parts, "carbine--magazine")
    bolt = box((0.004, 0.058, 0.018), (0.024, 0.505, 0.009), "steel", uv=0.25)
    bolt.name = "carbine--bolt"
    handle = join([prism([(0.396, 0.03), (0.418, 0.03), (0.418, 0.044), (0.396, 0.044)], 0.046, "cerakote",
                         bevel=0.002),
                   box((0.012, 0.016, 0.01), (-0.026, 0.405, 0.037), "cerakote", bevel=0.002, uv=0.25)],
                  "carbine--handle")
    glass = ring_prism([(-0.0125, 0.081), (0.0125, 0.081), (0.0125, 0.098), (0.008, 0.106), (-0.008, 0.106),
                        (-0.0125, 0.098)], 0.6, 0.6025, "glass")
    dot = cyl(0.0009, 0.001, 0.598, 0.093, "reticle", vertices=8)
    glass = join([glass, dot], "carbine--glass")
    return [join(body, "carbine--body"), mag, bolt, handle, glass]


def shotgun():
    body = []
    # Receiver with ejection port (right) and loading port (underneath).
    rec = prism([(0.40, -0.03), (0.62, -0.03), (0.62, 0.035), (0.415, 0.035), (0.40, 0.022)], 0.052, "cerakote",
                bevel=0.003)
    cut(rec, cutter_box((0.012, 0.07, 0.024), (0.026, 0.53, 0.005)))
    cut(rec, cutter_box((0.03, 0.08, 0.02), (0, 0.565, -0.03)))
    body.append(rec)
    body.append(box((0.003, 0.068, 0.02), (0.022, 0.53, 0.005), "steel", uv=0.25))  # bolt face in the port
    for x in (-0.027, 0.027):
        body.append(pin(x, 0.43, -0.012))
        body.append(pin(x, 0.6, -0.012))
    # Side saddle with four shells on the left.
    body.append(box((0.008, 0.11, 0.036), (-0.03, 0.535, 0.004), "polymer", bevel=0.002, uv=0.25))
    for k in range(4):
        y = 0.494 + k * 0.027
        shell = cyl(0.0095, 0.05, 0, 0, "shell", vertices=14)
        shell.rotation_euler = (0, 0, 0)
        bpy.ops.object.transform_apply(rotation=True)
        bpy.ops.transform.rotate(value=math.pi / 2, orient_axis="Y")
        bpy.ops.object.transform_apply(rotation=True)
        shell.location = (-0.04, y, 0.0)
        bpy.ops.object.transform_apply(location=True)
        body.append(shell)
        base = cyl(0.0098, 0.012, 0, 0, "brass", vertices=14)
        bpy.ops.transform.rotate(value=math.pi / 2, orient_axis="Y")
        bpy.ops.object.transform_apply(rotation=True)
        base.location = (-0.04, y, 0.024)
        bpy.ops.object.transform_apply(location=True)
        body.append(base)
    # Trigger group, guard and the carbine-pattern grip and stock.
    body.append(prism([(0.43, -0.03), (0.53, -0.03), (0.53, -0.048), (0.44, -0.05)], 0.044, "polymer", bevel=0.003))
    body.append(box((0.01, 0.07, 0.006), (0, 0.488, -0.09), "polymer", bevel=0.002, uv=0.25))
    body.append(box((0.01, 0.006, 0.03), (0, 0.52, -0.074), "polymer", bevel=0.001, uv=0.25))
    body.append(prism([(0.478, -0.05), (0.487, -0.05), (0.489, -0.072), (0.483, -0.083), (0.476, -0.074)],
                      0.006, "steel", bevel=0.001))
    body.append(prism([(0.452, -0.05), (0.476, -0.056), (0.468, -0.085), (0.473, -0.103), (0.464, -0.124),
                       (0.45, -0.176), (0.42, -0.182), (0.413, -0.172), (0.421, -0.13), (0.43, -0.09),
                       (0.428, -0.068), (0.418, -0.058), (0.43, -0.05)],
                      0.034, "polymer", bevel=0.006, segments=3))
    body.append(cyl(0.0155, 0.23, 0.176, 0.006, "steel"))
    body.append(prism([(0.186, 0.036), (0.24, 0.036), (0.33, 0.03), (0.348, 0.016), (0.348, -0.012),
                       (0.31, -0.024), (0.27, -0.042), (0.22, -0.06), (0.186, -0.066)],
                      0.044, "polymer", bevel=0.006, segments=3))
    body.append(prism([(0.168, 0.04), (0.187, 0.04), (0.187, -0.07), (0.168, -0.07)], 0.05, "rubber", bevel=0.005))
    # Barrel with ventilated heat shield, magazine tube and cap, sights.
    body.append(cyl(0.0125, 0.42, 0.62, 0.012, "steel"))
    shield = cyl(0.0165, 0.2, 0.64, 0.015, "cerakote", vertices=20)
    cut(shield, cyl(0.0145, 0.24, 0.62, 0.015, "steel", vertices=20))
    for k in range(6):
        cut(shield, cutter_box((0.05, 0.016, 0.008), (0, 0.66 + k * 0.03, 0.022)))
    body.append(shield)
    body.append(cyl(0.012, 0.34, 0.62, -0.02, "cerakote"))
    body.append(cyl(0.0135, 0.025, 0.955, -0.02, "steel", vertices=16))
    body.append(box((0.012, 0.03, 0.038), (0, 0.97, -0.004), "cerakote", bevel=0.002, uv=0.25))  # barrel clamp
    body.append(prism([(0.4, 0.035), (0.43, 0.035), (0.43, 0.058), (0.4, 0.058)], 0.03, "cerakote", bevel=0.002))
    ring = cyl(0.0065, 0.004, 0.414, 0.058, "steel", vertices=14)
    cut(ring, cyl(0.0035, 0.02, 0.405, 0.058, "steel", vertices=10))
    body.append(ring)
    body.append(prism([(1.0, 0.024), (1.016, 0.024), (1.014, 0.04), (1.003, 0.04)], 0.008, "cerakote", bevel=0.001))
    body.append(cyl(0.0016, 0.004, 1.009, 0.041, "reticle", vertices=8))  # fibre-optic bead
    pump = ring_prism(octagon(0.026, -0.016, 0.95), 0.69, 0.84, "polymer", bevel=0.004)
    for k in range(7):
        cut(pump, cutter_box((0.07, 0.006, 0.006), (0, 0.705 + k * 0.02, -0.04)))
    pump.name = "shotgun--pump"
    breacher = cyl(0.016, 0.05, 1.04, 0.012, "steel", vertices=6)
    for k in range(3):
        cut(breacher, cutter_box((0.012, 0.03, 0.04), (0, 1.09, 0.012), rotation=(0, k * math.pi / 3, 0)))
    breacher.name = "shotgun--breacher"
    return [join(body, "shotgun--body"), pump, breacher]


def pistol():
    # A polymer striker pistol at the rig's pistol scale (the slide spans the
    # same 0.39-0.65 m as the earlier pistol box).
    frame = [prism([(0.39, -0.03), (0.6, -0.03), (0.63, -0.02), (0.63, -0.012), (0.39, -0.012)], 0.05, "polymer",
                   bevel=0.003)]
    for k in range(3):  # accessory rail slots under the dust cover
        frame.append(box((0.046, 0.008, 0.004), (0, 0.565 + k * 0.018, -0.032), "polymer", uv=0.25))
    frame.append(prism([(0.4, -0.03), (0.47, -0.03), (0.452, -0.1), (0.448, -0.17), (0.392, -0.178),
                        (0.387, -0.12), (0.392, -0.05)], 0.047, "polymer", bevel=0.007, segments=3))
    frame.append(prism([(0.384, -0.17), (0.456, -0.168), (0.458, -0.186), (0.382, -0.188)], 0.05, "polymer",
                       bevel=0.003))  # magazine base
    frame.append(box((0.008, 0.075, 0.006), (0, 0.5, -0.07), "polymer", bevel=0.002, uv=0.25))  # guard
    frame.append(box((0.008, 0.006, 0.04), (0, 0.537, -0.05), "polymer", bevel=0.001, uv=0.25))
    frame.append(prism([(0.485, -0.035), (0.494, -0.035), (0.496, -0.055), (0.49, -0.064), (0.483, -0.056)],
                       0.006, "steel", bevel=0.001))
    frame.append(pin(0.026, 0.505, -0.022, r=0.003))
    frame.append(box((0.006, 0.012, 0.01), (-0.025, 0.47, -0.04), "steel", bevel=0.001, uv=0.25))  # mag release
    frame = join(frame, "pistol--frame")
    slide = prism([(0.385, -0.012), (0.65, -0.012), (0.65, 0.03), (0.64, 0.042), (0.395, 0.042), (0.385, 0.032)],
                  0.044, "cerakote", bevel=0.003)
    cut(slide, cutter_box((0.012, 0.06, 0.02), (0.02, 0.56, 0.026)))  # ejection port
    for side in (-1, 1):  # shallow grip serrations on both flanks
        for k in range(7):
            cut(slide, cutter_box((0.006, 0.0035, 0.03), (side * 0.022, 0.4 + k * 0.009, 0.016)))
        for k in range(4):
            cut(slide, cutter_box((0.006, 0.0035, 0.03), (side * 0.022, 0.6 + k * 0.009, 0.016)))
    parts = [slide, box((0.004, 0.058, 0.018), (0.016, 0.56, 0.026), "steel", uv=0.25),
             cyl(0.0085, 0.012, 0.645, 0.012, "steel", vertices=14),
             prism([(0.398, 0.042), (0.42, 0.042), (0.42, 0.056), (0.402, 0.056)], 0.03, "cerakote", bevel=0.002),
             prism([(0.62, 0.042), (0.636, 0.042), (0.634, 0.055), (0.622, 0.055)], 0.007, "cerakote", bevel=0.001),
             cyl(0.0015, 0.003, 0.636, 0.051, "reticle", vertices=8)]
    for x in (-0.009, 0.009):
        parts.append(cyl(0.0012, 0.003, 0.42, 0.05, "reticle", x=x, vertices=8))
    return [frame, join(parts, "pistol--slide")]


pieces = carbine() + shotgun() + pistol()
bake_and_export(pieces, out, smooth=())
