# Outpost Zero tactical 3D preview assets

## 2026-10-19 corridor benchmark

No new third-party models or photographs were downloaded for this benchmark.
The concrete wall/floor panels reuse the existing Poly Haven **brushed_concrete_03**
colour, OpenGL normal and roughness photographs (CC0):
https://polyhaven.com/a/brushed_concrete_03 . Terminal and weapon data maps reuse
the existing **metal_plate** OpenGL normal and roughness (CC0):
https://polyhaven.com/a/metal_plate . See REALISM-ASSETS.md for the original files.

New files (512 x 512, 68,362 bytes combined):

- `textures/benchmark-operator-body-orm.png` (64,909 bytes): authored material-region
  roughness and restricted metalness derived from the existing Mixamo SWAT body atlas.
- `textures/benchmark-operator-skin-roughness.png` (3,453 bytes): authored skin
  roughness mask aligned to the existing Mixamo SWAT head UVs.

These derivative material masks retain **Adobe Mixamo terms**, including embedded
game use; they are not CC0. Sources and permission links are in Character and
animation below. `scripts/build-outpost-benchmark-materials.py` records the original
GLB SHA-256 and generates the masks reproducibly. No original model, colour atlas,
normal atlas, skeleton, animation or UV was replaced. The red mask channel is
constant and is not presented as baked ambient occlusion.

Corridor pipes, trays, trims, terminal fittings, safety markings and sign/screen
artwork are original procedural meshes and authored graphics, not scanned or
production-model assets. They are part of the game's source; no external licence
is claimed for them. The existing soldier remains a Mixamo game asset.

This is a browser WebGL game. Actual rendering resolution and frame rate depend on hardware and display refresh. The operator uses the licensed Mixamo Swat sculpt, its original UVs and colour/normal maps, and retargeted Mixamo motion. The earlier Vanguard armor and procedural uniform/head-scan operator are not rendered.

## Shared interactable equipment pass (2026-10-19)

Station chassis/screens, medical cabinets and kit cases, supply-drop boxes,
concealed-charge cases/status plates and emergency-console fittings use original
procedural geometry and original authored trim/status artwork from
`scripts/outpost-military/interactables.js`. These are authored game assets, not
scanned or production-model assets. One runtime 2048 px colour atlas (sRGB) and
256 px roughness/metalness data atlas (linear) are shared by all copies. There
are no new third-party downloads. The subtle metal normal reuses the existing
Poly Haven `metal_plate_02` OpenGL normal photograph (CC0, source in
REALISM-ASSETS.md).

## Physically based photographs and sky

The 2026-10-19 Medical / Supply Depot room kit adds original architectural
fittings, closed cold-chain storage, impact strips and authored wayfinding
artwork (`scripts/outpost-military/room-medical-depot.js`). These are procedural
game assets, not production/scanned models. They reuse the existing licensed
plaster, concrete and metal photographs listed here and in REALISM-ASSETS.md.
The runtime 2048×512 wayfinding atlas adds no third-party download. The updated
radio-cabinet nameplate and larger charge status artwork are also original.
All other rooms retain their existing environment assets.

## World-text clarity pass (2026-10-19)

Room/station/medical signs, the corridor/depot atlases and equipment screen text
are original canvas artwork, rebuilt at 2–3× linear resolution. They reuse the
game's bundled **Barlow Condensed**, by Jeremy Tribby, under the SIL Open Font
License 1.1: https://github.com/jpt/barlow . The exact bundled licence is
[`../fonts/OFL.txt`](../fonts/OFL.txt). No new font, model or texture download was
added. The shared equipment normal/roughness photographs and their licences
remain unchanged; this typography is not presented as a production/scanned asset.

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

## Communications / Radar and Command follow-up (2026-10-19)

`scripts/outpost-military/room-communications-radar.js` adds original authored
equipment-rack geometry, service fittings and a runtime 2048×256 identification
atlas. The Command planning-title relocation reuses its existing atlas. These
are procedural game fittings, not scanned or production-model assets. No new
third-party model, photograph or font is downloaded. The room reuses the
existing Poly Haven CC0 plaster, brushed concrete and metal normal/roughness
maps listed in REALISM-ASSETS.md, and Barlow Condensed (SIL OFL 1.1, above).
The approved Supply Atrium and Command room fittings likewise use original
authored geometry and artwork with these same existing licensed substrates.

## Renderer

The Central Passage pass reuses the existing Poly Haven CC0 concrete and metal
maps documented in REALISM-ASSETS.md. Its impact strips, pipework, cable tray,
shielded practicals, utility panel, floor paint and wayfinding atlas are original
authored procedural fittings, not scanned or downloaded production models.
Sign artwork uses the existing Barlow Condensed font (SIL Open Font License 1.1).
No model, photograph or font download was added for this room.

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

## Dust Outpost (models/arena-dust-kit-v1.glb, models/arena-dust-props-v1.glb, textures/arena/)

All CC0 (public domain), no attribution required; listed for the record.
- Kit pieces (HESCO barriers, concrete blast blocks, crate stacks) are original Blender meshes built by
  `scripts/assets/arena-kit.py`; the HESCO textures are generated by `scripts/assets/hesco-texture.py`
  from ambientCG Fabric061.
- Photo textures from ambientCG (https://ambientcg.com): Ground079S (desert gravel), Ground093C (sand),
  Concrete044D (blast blocks), Planks037A (crate wood) — built by `scripts/assets/arena-textures.py`.
- Props from Poly Haven (https://polyhaven.com/models), simplified and packed by
  `scripts/assets/pack-props.mjs`: old_military_crate, ammo_box, metal_jerrycan, metal_jerrycan_green,
  plastic_jerrycan, Barrel_01, barrel_03, old_tyre, cardboard_box_01, plastic_crate_03.

## Wreck Estate and Skyport (models/arena-estate-*, models/arena-skyport-*, textures/arena/)

All CC0 (public domain), no attribution required; listed for the record.
- Kit pieces are original Blender meshes: hedges and stone planters (`scripts/assets/kit-estate.py`),
  air-cargo containers, cargo pallets and traffic cones (`scripts/assets/kit-skyport.py`). Hedge
  leaves, carton board and brushed aluminium are generated by `scripts/assets/procedural-textures.py`.
- Photo textures from ambientCG (https://ambientcg.com): Tiles143 (estate paving), Tiles139 (planter
  stone), Plaster007 (villa render), Concrete031 (apron), Concrete034 (terminal).
- Props from Poly Haven (https://polyhaven.com/models): planter_box_01, planter_box_02, planter_box_03,
  painted_wooden_bench, ceramic_vase_01, planter_pot_clay, concrete_cat_statue, vintage_suitcase,
  WetFloorSign_01, metal_trash_can, utility_box_01, plastic_crate_02, cardboard_box_01,
  concrete_road_barrier.
