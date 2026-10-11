# Outpost Zero tactical 3D preview assets

This is a browser WebGL preview. It is not an Unreal Engine render or a promise of 8K / 120 FPS performance. The infantry model is a temporary armored character; it still needs a purpose-built modern military replacement for the approved visual direction.

## Physically based photographs and sky

Poly Haven publishes these assets under CC0: https://polyhaven.com/license.
The bundled maps use the 1K diffuse, OpenGL normal, and roughness photographs:

- Ground: https://polyhaven.com/a/aerial_asphalt_01
- Corrugated wall panels: https://polyhaven.com/a/corrugated_iron_03
- Weapon metal: https://polyhaven.com/a/metal_plate
- Gloves: https://polyhaven.com/a/fabric_leather_01
- HDR sky / image-based lighting: https://polyhaven.com/a/kloofendal_48d_partly_cloudy

## Character and animation

`models/soldier.glb` is the Mixamo Soldier/Vanguard model distributed in the Three.js skinning/blending example:
https://github.com/mrdoob/three.js/blob/dev/examples/models/gltf/Soldier.glb
https://threejs.org/examples/webgl_animation_skinning_blending.html

The example credits Mixamo. Character assets are subject to Adobe Mixamo terms, separate from Three.js's code license. Use this model as an embedded game character, not as a downloadable asset product. Source and terms:
https://www.mixamo.com/
https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html

## Renderer

Three.js 0.180.0 and its included addons are MIT licensed:
https://github.com/mrdoob/three.js/blob/r180/LICENSE
The bundled license is in THREE-LICENSE.txt. Weapons, fittings, crates, and projectile geometry are original procedural meshes.
