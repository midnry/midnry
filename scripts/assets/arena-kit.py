"""Dust Outpost wall kit, one 3 m tile per piece, built procedurally in
Blender (bpy) with ambient occlusion baked into vertex colours:
  hesco  - 2x2x2 sand-filled HESCO cells with bulging faces and corner posts
  block  - chamfered concrete blast block with joints and lifting loops
  crates - stacked military crates with metal corner brackets
Materials are named (fabric, sandtop, steel, concrete, wood, bracket); the
game assigns the textures. Usage: <blender-python> scripts/assets/arena-kit.py out.glb"""
import sys, math, random, bpy, bmesh
from mathutils import Vector
out = sys.argv[-1]
random.seed(11)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
mats = {}
def mat(name, color):
    if name not in mats:
        m = bpy.data.materials.new(name)
        m.diffuse_color = (*color, 1)
        mats[name] = m
    return mats[name]

def finish(obj, name):
    obj.name = name
    obj.data.name = name
    return obj

def cell(bm, cx, cy, z0, s, bulge, matidx, top_idx, top):
    """One HESCO cell: a subdivided box whose side faces bulge outwards."""
    n = 3
    verts = {}
    def v(x, y, z):
        key = (round(x, 5), round(y, 5), round(z, 5))
        if key not in verts:
            verts[key] = bm.verts.new((x, y, z))
        return verts[key]
    h = s / 2
    faces = []
    for side in range(4):
        for i in range(n):
            for j in range(n):
                quad = []
                for di, dj in ((0, 0), (1, 0), (1, 1), (0, 1)):
                    u, w = (i + di) / n, (j + dj) / n
                    # Smooth, deterministic bulge so neighbouring panels share
                    # vertices (random per-corner offsets split the surface).
                    b = bulge * math.sin(math.pi * u) * math.sin(math.pi * w) * (1 + 0.12 * math.sin(7.0 * u + 3.0 * w + side))
                    a = -h + u * s
                    z = z0 + w * s
                    if side == 0: p = (cx + a, cy - h - b, z)
                    elif side == 1: p = (cx + h + b, cy + a, z)
                    elif side == 2: p = (cx - a, cy + h + b, z)
                    else: p = (cx - h - b, cy - a, z)
                    quad.append((v(*p), (u, w)))
                f = bm.faces.new([q[0] for q in quad])
                f.material_index = matidx
                faces.append((f, [q[1] for q in quad]))
    if top:
        # Sand fill, slightly heaped and lumpy, just below the fabric rim.
        m = 4
        grid = [[v(cx - h + s * i / m, cy - h + s * j / m, z0 + s - (0.06 if 0 < i < m and 0 < j < m else 0) + (0.05 * random.random() if 0 < i < m and 0 < j < m else 0)) for j in range(m + 1)] for i in range(m + 1)]
        for i in range(m):
            for j in range(m):
                f = bm.faces.new([grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]])
                f.material_index = top_idx
                faces.append((f, [(i / m, j / m), ((i + 1) / m, j / m), ((i + 1) / m, (j + 1) / m), (i / m, (j + 1) / m)]))
    return faces

def hesco():
    me = bpy.data.meshes.new("hesco")
    obj = bpy.data.objects.new("hesco", me)
    scene.collection.objects.link(obj)
    for m in ("fabric", "sandtop", "steel"):
        me.materials.append(mat(m, {"fabric": (0.7, 0.62, 0.46), "sandtop": (0.75, 0.66, 0.5), "steel": (0.72, 0.73, 0.71)}[m]))
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    s, gap = 1.48, 0.02
    allfaces = []
    for z in range(2):
        for ix in range(2):
            for iy in range(2):
                cx, cy = -0.75 + ix * 1.5, -0.75 + iy * 1.5
                allfaces += cell(bm, cx, cy, z * 1.5 + 0.0, s, 0.05 + 0.02 * random.random(), 0, 1, z == 1)
    for f, uvs in allfaces:
        for loop, (a, b) in zip(f.loops, uvs):
            loop[uv].uv = (a, b)
    bm.to_mesh(me)
    bm.free()
    # Corner coil posts at the cell joints on the outside faces.
    posts = []
    for x in (-1.5, 0, 1.5):
        for y in (-1.5, 0, 1.5):
            if x == 0 and y == 0:
                continue
            bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.018, depth=3.0, location=(x * 0.995, y * 0.995, 1.5))
            p = bpy.context.object
            p.data.materials.append(mats["steel"])
            posts.append(p)
    for p in posts:
        p.select_set(True)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.join()
    return finish(bpy.context.object, "hesco")

def block():
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.object
    o.scale = (2.9, 2.9, 2.6)
    o.location = (0, 0, 1.3)
    bpy.ops.object.transform_apply(scale=True, location=True)
    bev = o.modifiers.new("bevel", "BEVEL")
    bev.width = 0.07
    bev.segments = 2
    bpy.ops.object.modifier_apply(modifier="bevel")
    o.data.materials.append(mat("concrete", (0.6, 0.58, 0.54)))
    # Two lifting loops on top.
    loops = []
    for x in (-0.8, 0.8):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.12, minor_radius=0.025, major_segments=10, minor_segments=5, location=(x, 0, 2.62), rotation=(math.pi / 2, 0, 0))
        l = bpy.context.object
        l.data.materials.append(mat("steel", (0.6, 0.6, 0.6)))
        loops.append(l)
    for l in loops:
        l.select_set(True)
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.join()
    o = bpy.context.object
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.cube_project(cube_size=2.9)
    bpy.ops.object.mode_set(mode="OBJECT")
    return finish(o, "block")

def crates():
    parts = []
    for z in range(2):
        for ix in range(2):
            for iy in range(2):
                if z == 1 and ix == 1 and iy == 0:
                    continue  # a gap at the top reads as a real stack
                w = 1.42 - 0.04 * random.random()
                bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.75 + ix * 1.5 + (random.random() - 0.5) * 0.06, -0.75 + iy * 1.5 + (random.random() - 0.5) * 0.06, z * 1.45 + 0.72), rotation=(0, 0, (random.random() - 0.5) * 0.08))
                c = bpy.context.object
                c.scale = (w, w, 1.42)
                bpy.ops.object.transform_apply(scale=True)
                bev = c.modifiers.new("bevel", "BEVEL"); bev.width = 0.025; bev.segments = 1
                bpy.ops.object.modifier_apply(modifier="bevel")
                c.data.materials.append(mat("wood", (0.55, 0.45, 0.3)))
                bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
                bpy.ops.uv.cube_project(cube_size=1.45)
                bpy.ops.object.mode_set(mode="OBJECT")
                parts.append(c)
                # Steel corner brackets.
                for sx in (-1, 1):
                    for sy in (-1, 1):
                        for sz in (-1, 1):
                            bpy.ops.mesh.primitive_cube_add(size=1, location=(c.location.x + sx * (w / 2 - 0.06), c.location.y + sy * (w / 2 - 0.06), c.location.z + sz * (0.71 - 0.06)))
                            br = bpy.context.object
                            br.scale = (0.14, 0.14, 0.14)
                            bpy.ops.object.transform_apply(scale=True)
                            br.data.materials.append(mat("bracket", (0.25, 0.27, 0.24)))
                            parts.append(br)
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    return finish(bpy.context.object, "crates")

pieces = [hesco(), block(), crates()]
# Bake ambient occlusion into vertex colours (with a ground plane so bases darken).
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
ground = bpy.context.object
scene.render.engine = "CYCLES"
scene.cycles.samples = 64
scene.cycles.device = "CPU"
for i, p in enumerate(pieces):
    p.location.x = i * 50  # keep pieces from shadowing each other
for i, p in enumerate(pieces):
    ground.location.x = p.location.x
    bpy.ops.object.select_all(action="DESELECT")
    p.select_set(True)
    bpy.context.view_layer.objects.active = p
    if not p.data.color_attributes:
        p.data.color_attributes.new("AO", "BYTE_COLOR", "CORNER")
    p.data.color_attributes.active_color = p.data.color_attributes[0]
    bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
    print("baked", p.name, len(p.data.polygons), "faces")
bpy.data.objects.remove(ground)
for p in pieces:
    p.location.x = 0
    bpy.ops.object.select_all(action="DESELECT")
    p.select_set(True)
    bpy.context.view_layer.objects.active = p
    bpy.ops.object.shade_flat() if p.name != "hesco" else bpy.ops.object.shade_smooth()
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=True, export_yup=True,
    export_apply=True, export_attributes=True, export_vertex_color="ACTIVE", export_all_vertex_colors=False,
    export_materials="EXPORT", export_image_format="NONE")
print("exported", out)
