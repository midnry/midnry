"""Shared helpers for the procedural arena kits (Blender bpy): materials by
name, joining parts, box-projected UVs, ambient occlusion baked into vertex
colours, and GLB export. Each kit piece is one top-level object filling a
3 x 3 m tile, origin at the tile centre on the ground."""
import math
import random
import bpy

mats = {}


def reset(seed):
    random.seed(seed)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats.clear()


def mat(name, color=(0.6, 0.6, 0.6)):
    """A named material; the game assigns the real textures by this name."""
    if name not in mats:
        m = bpy.data.materials.new(name)
        m.diffuse_color = (*color, 1)
        mats[name] = m
    return mats[name]


def active():
    return bpy.context.object


def box(size, location, material, bevel=0.0, rotation=(0, 0, 0), uv=1.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location, rotation=rotation)
    o = active()
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        b = o.modifiers.new("bevel", "BEVEL")
        b.width = bevel
        b.segments = 2
        bpy.ops.object.modifier_apply(modifier="bevel")
    o.data.materials.append(mat(material))
    if uv:
        project(o, uv)
    return o


def project(o, size):
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.cube_project(cube_size=size)
    bpy.ops.object.mode_set(mode="OBJECT")


def lumpy(o, strength, scale, seed):
    """Displace along normals with soft cloud noise: foliage clumps."""
    tex = bpy.data.textures.new(f"clouds{seed}", "CLOUDS")
    tex.noise_scale = scale
    tex.noise_depth = 2
    d = o.modifiers.new("displace", "DISPLACE")
    d.texture = tex
    d.strength = strength
    d.mid_level = 0.5
    d.texture_coords = "GLOBAL"
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier="displace")


def subdivide(o, levels):
    s = o.modifiers.new("subsurf", "SUBSURF")
    s.levels = levels
    s.render_levels = levels
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier="subsurf")


def join(parts, name):
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    o = active()
    o.name = name
    o.data.name = name
    return o


def bake_and_export(pieces, out, smooth=()):
    """AO into vertex colours (a ground plane darkens the bases), then GLB."""
    scene = bpy.context.scene
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
    ground = active()
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 64
    scene.cycles.device = "CPU"
    for i, p in enumerate(pieces):
        p.location.x = i * 50  # keep pieces from shadowing each other
    for p in pieces:
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
        if p.name in smooth:
            bpy.ops.object.shade_smooth()
        else:
            bpy.ops.object.shade_flat()
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=True, export_yup=True,
        export_apply=True, export_attributes=True, export_vertex_color="ACTIVE", export_all_vertex_colors=False,
        export_materials="EXPORT", export_image_format="NONE")
    print("exported", out)


def jitter(amount):
    return (random.random() - 0.5) * amount


TAU = math.tau
