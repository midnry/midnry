# Outpost Zero tactical 3D preview assets

This is a browser WebGL game. Actual rendering resolution and frame rate depend on hardware and display refresh. The operator uses the licensed Mixamo Swat sculpt, its original UVs and colour/normal maps, and retargeted Mixamo motion. The earlier Vanguard armor and procedural uniform/head-scan operator are not rendered.

## Physically based photographs and sky

Poly Haven publishes these assets under CC0: https://polyhaven.com/license.
The bundled maps use the 1K diffuse, OpenGL normal, and roughness photographs:

- Ground: https://polyhaven.com/a/aerial_asphalt_01
- Corrugated wall panels: https://polyhaven.com/a/corrugated_iron_03
- Weapon metal: https://polyhaven.com/a/metal_plate
- Gloves: https://polyhaven.com/a/fabric_leather_01
- HDR sky / image-based lighting (late-afternoon, golden haze): https://polyhaven.com/a/evening_road_01_puresky

## Character and animation

The realism overhaul adds substrate-specific maps listed in [REALISM-ASSETS.md](REALISM-ASSETS.md).

`models/soldier.glb` is the Mixamo Soldier/Vanguard model distributed in the Three.js skinning/blending example:
https://github.com/mrdoob/three.js/blob/dev/examples/models/gltf/Soldier.glb
https://threejs.org/examples/webgl_animation_skinning_blending.html

The example credits Mixamo. Character assets are subject to Adobe Mixamo terms, separate from Three.js's code license. Use this model as an embedded game character, not as a downloadable asset product. Source and terms:
https://www.mixamo.com/
https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html

`models/operator-v1.glb` is generated offline by `scripts/build-outpost-operator.mjs`. Adobe Mixamo's **Swat** character source is mirrored in the [Mixamo-Animations-Characters dataset](https://huggingface.co/datasets/tanish434/Mixamo-Animations-Characters/blob/main/character_refined_glb/Swat.glb), which identifies its licence as `adobe-mixamo-terms`. Rifle aiming idle, forward/backward walk, run, crouch, reload, hit reaction, death, strangling, stealth assassination, grapple and stab motions come from the [deevid Mixamo asset mirror](https://github.com/MisterYI/deevid-mixamo-assets/tree/13066bbd431c855fdc154d1e32d7a37c0b8ee013/anim), pinned to commit `13066bbd431c855fdc154d1e32d7a37c0b8ee013`.

These character and animation resources remain subject to Adobe Mixamo terms. Adobe's [Mixamo FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html) permits royalty-free use in video games. They are incorporated into this game, not offered as a standalone character/animation product. Exact source URLs, byte lengths and SHA-256 checksums are recorded in `scripts/assets/outpost-operator/sources.json`. The build verifies them before export and never downloads resources at build time.

Modifications: rest-pose-aware retargeting to the Swat skeleton at 30 Hz, removal of horizontal root motion to retain collision-authoritative gameplay, corrected material metalness/roughness, embedded original surface maps, runtime upper-body blending and foot/grip IK. First-person gloves/forearms are cropped from the same skinned sculpt and use its captured hand motion. Weapon geometry and the paired private takedown staging remain original game code. The current exported operator is about 6.6 MiB, with 12 motion clips.

The retained **legacy** head source is **Infinite, 3D Head Scan by Lee Perry-Smith**, based on work at **www.triplegangers.com**, licensed **Creative Commons Attribution 3.0 Unported**. Source: https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf/LeePerrySmith . Original permission text: [HEAD-SCAN-LICENSE.txt](HEAD-SCAN-LICENSE.txt). Its earlier adaptation cropped the shoulder bust, rescaled/reoriented the head and derived roughness from the specular map. `models/head-source.glb` and the legacy face textures retain this provenance but are not loaded by the current game. CC BY 3.0: https://creativecommons.org/licenses/by/3.0/ . The face scan is not an endorsement by its creator.

## Renderer

Three.js 0.180.0 and its included addons are MIT licensed:
https://github.com/mrdoob/three.js/blob/r180/LICENSE
The bundled license is in THREE-LICENSE.txt. Weapons, fittings, crates, and projectile geometry are original procedural meshes.

## Scanned props (models/props-v1.glb)

CC0 models from Poly Haven, textures reduced to 512 px and meshes simplified for the web:
old_military_crate, metal_jerrycan_green, barrel_03, Barrel_02, medical_box, plastic_crate_02,
steel_frame_shelves_01, ammo_box and utility_box_01 — https://polyhaven.com/models

## Medevac helicopter (models/medevac-v1.glb)

"Rescue Helicopter (low poly)" by blueskinrulez (https://sketchfab.com/blueskinrulez), shared on
OpenGameArt by brylie: https://opengameart.org/node/82169. Licensed CC-BY 4.0
(https://creativecommons.org/licenses/by/4.0/). Changes: packed as a single GLB, animation removed,
repainted in-game (olive drab, medical markings) and the rotor spun by the renderer.
