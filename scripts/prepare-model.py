import json
import os
import sys

import bpy
from mathutils import Vector

LENGTH = 4.7


def arguments():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if len(argv) < 2:
        raise SystemExit(
            'usage: blender -b --disable-autoexec -P prepare-model.py -- '
            '<input.glb|input.blend> <output.usdz> [report.json] [--drop name,name] [--textures dir] [--subdivision-drop n] [--keep-detail name,name]'
        )
    options = {'drop': [], 'textures': None, 'subdivision-drop': 0, 'keep-detail': []}
    for flag in ('--drop', '--textures', '--subdivision-drop', '--keep-detail'):
        if flag in argv:
            index = argv.index(flag)
            value = argv[index + 1]
            options[flag[2:]] = value.split(',') if flag in ('--drop', '--keep-detail') else int(value) if flag == '--subdivision-drop' else value
            del argv[index:index + 2]
    return argv[0], argv[1], argv[2] if len(argv) > 2 else None, options


def load(source):
    if source.endswith('.blend'):
        bpy.ops.wm.open_mainfile(filepath=source, load_ui=False, use_scripts=False)
    else:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=source)


def relink(directory):
    files = {name.lower(): os.path.join(directory, name) for name in os.listdir(directory)}
    for image in bpy.data.images:
        stem = os.path.splitext(os.path.basename(image.filepath.replace('\\', '/')))[0].lower()
        match = next((path for name, path in files.items() if os.path.splitext(name)[0].startswith(stem)), None)
        if match:
            image.filepath = match
            image.name = os.path.basename(match)
            image.reload()


def drop(prefixes):
    scene = bpy.context.scene
    for obj in list(scene.objects):
        if obj.type in {'CAMERA', 'LIGHT'} or any(obj.name.startswith(prefix) for prefix in prefixes):
            bpy.data.objects.remove(obj, do_unlink=True)


def simplify(levels, keep):
    for obj in bpy.context.scene.objects:
        if any(obj.name.startswith(name) for name in keep):
            continue
        for modifier in getattr(obj, 'modifiers', []):
            if modifier.type == 'SUBSURF':
                modifier.levels = max(0, modifier.levels - levels)


def bounds(objects):
    low = Vector((float('inf'),) * 3)
    high = Vector((float('-inf'),) * 3)
    for obj in objects:
        for corner in obj.bound_box:
            point = obj.matrix_world @ Vector(corner)
            low = Vector(map(min, low, point))
            high = Vector(map(max, high, point))
    return low, high


def main():
    source, target, report, options = arguments()
    load(source)
    if options['textures']:
        relink(options['textures'])
    drop(options['drop'])
    simplify(options['subdivision-drop'], options['keep-detail'])

    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    roots = [obj for obj in bpy.context.scene.objects if obj.parent is None]
    pivot = bpy.data.objects.new('Car', None)
    bpy.context.scene.collection.objects.link(pivot)
    for obj in roots:
        obj.parent = pivot

    low, high = bounds(meshes)
    size = high - low
    length_axis = max(range(2), key=lambda axis: size[axis])
    scale = LENGTH / size[length_axis]
    pivot.scale = (scale,) * 3
    bpy.context.view_layer.update()

    low, high = bounds(meshes)
    center = (low + high) / 2
    pivot.location = (-center.x, -center.y, -low.z)
    if length_axis == 0:
        pivot.rotation_euler[2] = 1.5707963
    bpy.context.view_layer.update()

    low, high = bounds(meshes)
    bpy.ops.wm.usd_export(
        filepath=target,
        export_materials=True,
        generate_preview_surface=True,
        export_textures_mode='NEW',
        convert_orientation=True,
        export_global_forward_selection='NEGATIVE_Z',
        export_global_up_selection='Y',
        triangulate_meshes=True,
        evaluation_mode='VIEWPORT',
        export_subdivision='TESSELLATE',
    )

    summary = {
        'meshes': len(meshes),
        'triangles': sum(len(obj.data.polygons) for obj in meshes),
        'size': [round(v, 3) for v in (high - low)],
        'names': sorted(obj.name for obj in meshes),
        'materials': sorted({slot.material.name for obj in meshes for slot in obj.material_slots if slot.material}),
    }
    print('MODEL', json.dumps(summary))
    if report:
        with open(report, 'w') as handle:
            json.dump(summary, handle, indent=2)


main()
