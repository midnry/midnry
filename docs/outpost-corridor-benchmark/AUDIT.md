# Outpost Zero: baseline rendering audit

Baseline: origin/main `c44d2bb`, Three.js 0.180.0. Scope: West Service Corridor,
walkable tiles x=9–10, y=14–23; adjacent existing cold-storage terminal
`coolant-test` at (7.5,23.5). No collision tiles, rules, bots, network code or UI
are part of this change. Measurements use the shipped renderer bundle, a fixed
`outpost-corridor-20261019` seed and the four cameras in
`scripts/benchmark-outpost-corridor.mjs`. Raw results are in before.json.

## Working

- `renderer.js:108–132`: WebGL2, sRGB output, ACES Filmic tone mapping and pixel
  ratio 1. Geometry is real 3D, with a separate first-person weapon scene.
- `renderer.js:160,211,528–536,3340–3347`: perspective world camera (.06–260m),
  a separate weapon camera (.01–10m), FOV synchronized to the existing aim
  projection, and a 1.65m standing eye height with existing stance transitions.
  Those controls/proportions do not need replacement for this corridor pass.
- `realism-surfaces.js:38–46`: diffuse photographs are sRGB; normal/roughness
  maps are NoColorSpace, mipmapped and anisotropic (up to 8). Their source maps
  are shared and UV clones cached (`realism-surfaces.js:76–90`).
- `renderer.js:443–463`: an HDR equirectangular environment is assigned to both
  world and weapon scenes. Three.js internally generates PMREM for standard PBR
  materials; an explicit PMREMGenerator is not required here. Devices without
  renderable half-float skip the HDR and retain direct lights.
- `realism-lighting.js:15–21,126–145`: a LightProbe approximates diffuse room
  bounce using room area/wall colour. This is an analytic approximation, not
  lightmap baking or global illumination. Exposure and lighting blend across
  roof boundaries. Sabotage does not dim the outdoor sky.
- `renderer.js:1018–1045`: room floors use photographic concrete colour, normal
  and roughness maps; ceilings use plaster. Scanned props have packed metallic/
  roughness maps. This is more substantial than a screen-space filter.
- `static-batches.js:39–125`, `realism-environment.js:98–119`: static fixtures
  batch by material and spatial region, or use instancing. World visibility
  uses tile visibility while retaining structural shadow casters.
- `renderer.js:2090–2121`: the dye shader changes blue cloth only on materials
  matching /uniform|fabric/. Vest, skin and gear keep their source identities.
- `realism-characters.js:402–414`: Run is intentionally used for moving gaits;
  the broken Walk/BackWalk clips must remain unused. LODs and the bone/weapon
  grip system already exist and are retained.

## Disabled by preset or device

- `outpost-academy.js:4–32`: Performance/Balanced/High widths are 720/960/1440,
  with adaptive resolution. `outpost-zero.html:3943–3962` applies these limits
  before renderer resize. `compatibility.js:14–25` further caps pixels at 2.4M
  desktop, 1M Apple touch, 0.6M safe mode. No unbounded devicePixelRatio scaling.
- `renderer.js:475–517`: Performance bypasses the composer. Balanced uses up to
  2x offscreen MSAA; High up to 4x. FXAA is a fallback when MSAA is unavailable.
  SSAO runs only on High with shadows and a capable non-Apple device.
- `realism-lighting.js:194–220`: PCF soft shadow maps use a stabilized 52m
  frustum, 1024px Balanced and 2048px High, limited by the device. They refresh
  at up to 30Hz (`renderer.js:3450–3461`).
- `renderer.js:510–517,1868–1885`: mirror puddles are High-only; they render a
  second scene view. Balanced must keep them disabled.

## Underused or needing refinement

- `renderer.js:226–282,3248–3279`: composer order is scene → optional SSAO →
  weapon overlay → bloom → FXAA fallback → grade → OutputPass. Tone mapping
  and output transfer happen at the final output. Balanced currently pays for
  bloom's multiple full-screen passes. Day grading adds warm highlights,
  saturation 1.06, vignette .26 and grain .022; these can obscure actual surface
  detail. The benchmark should be assessed with restrained grading.
- `realism-characters.js:18–26`: the active rigged soldier uses roughness .93
  almost everywhere on its body and metalness 0. Its original colour/normal
  atlas contains useful gear detail, but has no roughness or metalness maps.
  A single rough surface response flattens cloth, buckles, rubber and carrier.
  Normal textures are 512px; colour is 1024px. Skin is a separate material.
- `realism-weapons.js:31–49`, `realism-carbine.js:13–17`: receiver, polymer and
  exposed steel have separate scalar values, but the receiver lacks a fine
  normal/roughness substrate. The existing weaponMetal photograph is reusable;
  its industrial colour texture should not be pasted over precision hardware.
- `renderer.js:1057–1074`, `realism-lighting.js:240–315`: fixture geometry remains
  visible, but real light sources are pooled (4 desktop/2 touch). Any practical
  light upgrade should reuse this pool rather than add shadowed point lights.
- Existing terminal geometry is shallow/simple (`renderer.js:1117–1159`), and
  the corridor lacks continuous engineered pipe/tray/duct runs. New detail can
  replace existing decoration and use shared instanced materials.
- PBR roughness is already present on concrete. It needs better material scale,
  restrained normals and selective substrate response, not universal wetness.
- `renderer.js:1042,1879`: the original High reflector is at y=.014m, below
  opaque room floor panels at y=.026m. Its visibility flag does not prove a
  visible indoor mirror. Preserve its High-only gate, but do not claim new
  planar indoor reflections without a separately positioned, bounded puddle.

## Assets, caching and measurements

`assets-before.json` records GLB sizes, material maps and embedded image sizes.
The current operator is 7,036,524 bytes and 28,618 triangles across both LODs;
props are 1,915,392 bytes / 13,566 triangles; the medevac is 358,644 bytes /
8,661 triangles. These are source totals, not visible per-frame triangle counts.
Existing photographic sets are 1K, with 2K concrete/plaster colour maps; props
use 512px images. Attribution is in military/ATTRIBUTION.md and REALISM-ASSETS.md.

`build-outpost-military.mjs` bundles the source to the file the game actually
loads. `build-outpost-cache.mjs` hashes model/texture files into ASSET_CACHE;
`outpost-asset-cache.js` and the cache worker optionally retain them locally.
The iframe v= token and vite.config.ts no-cache routes prevent stale code.

The software-rendered sandbox is suitable for matched images and draw/triangle
counts. Its frame times are not representative of desktop/mobile hardware and
will not be quoted as FPS. `renderer.info.memory.textures` is an object count,
not bytes. The benchmark separately estimates uploaded managed source textures, excluding
render targets; driver/PMREM/MSAA allocations make actual GPU memory higher. Those estimates are explicitly labelled in the results.
