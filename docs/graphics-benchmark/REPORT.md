# Outpost Zero — corridor benchmark review

Branch: `codex/graphics-benchmark`, based on `origin/main` **c44d2bb**.
Three.js **0.180.0** retained. Review branch only; no merge or deployment.

## Scope and visible changes

West Service Corridor, **walkable tiles x=9–10, y=14–23**, next to the cold-chain
IV store at (5.5,15.5). The existing **coolant-test** station at (7.5,23.5) is
the terminal fixture. Solid baffles (10,15) and (9,20) remain intact. The map,
HUD, menus, inputs, tasks, bots, multiplayer and rules are unchanged. Credits
text and the required iframe cache token are the only interface-file changes.

- Photographed concrete colour/normal/roughness panels replace the selected
  faces' generic decoration. Dry floor panels, metal trims, pipe runs, open
  cable trays, cable bundles and ventilation ducts give the corridor a coherent
  service route. Ceiling fittings clear 2.9 m; markings lie within 5 cm of the
  existing floor. Wall panels attach to existing solid tiles.
- A recessed-looking service cabinet and louvred machinery face dress the
  existing solid baffle. Signage and purposeful safety markings use one shared
  atlas and a merged static batch. Other fittings reuse instanced architecture
  batches. These are authored procedural fittings, **not production-model assets**.
- The cold-storage station gains a textured chassis, keyed controls, fasteners,
  instrument shelf and a readable technical screen. Its overlapping stock
  label is separated, and its warm practical is offset to prevent an
  inverse-square hotspot bleaching the sign. Task coordinates and screen
  power/completion ownership are retained.
- Warm local practicals use the existing **4 desktop / 2 touch** light pool
  against the existing cool sky/room fill. No point-light shadow cameras were
  added. Existing PCF roof/object shadows, analytical room bounce and High SSAO
  provide contact/depth cues. Exponential atmosphere is retained; this does
  **not** implement volumetric lighting or baked GI.
- The existing carbine/steel material gains restrained photographic data maps.
  Its industrial diamond-plate colour photograph is not applied to the receiver.
- One soldier asset receives UV-aligned material-response maps: rough cloth,
  carrier/webbing and rubber, a small restricted exposed-metal mask, and separate
  skin roughness. Normal intensity is reduced on skin. Original colour/normal
  atlases, body proportions, eyes, fitted goggles, skeleton, skin weights, LODs
  and animations remain. **No new sculpt, gear refit or motion retarget is claimed.**
  The existing Run gait fallback remains; broken Walk/BackWalk clips are unused.

## Matched real-engine images

All pairs use the same 1280×800 viewport, seeded match, pose and look pitch.
Images are game captures, with the existing HUD unchanged. Open the image for
full size. The supplied concept art guides practical lighting, material response
and service-detail density; it is not a promise of identical assets. The chat
attachment was not available as a local file, so it is not reproduced here.

| View | Original main | Benchmark |
|---|---|---|
| Corridor, Balanced | ![Before corridor](images/before-balanced-rations-approach.png) | ![After corridor](images/after-balanced-rations-approach.png) |
| Terminal, Balanced | ![Before terminal](images/before-balanced-cold-storage-terminal.png) | ![After terminal](images/after-balanced-cold-storage-terminal.png) |
| Soldier, High | ![Before soldier](images/before-high-soldier.png) | ![After soldier](images/after-high-soldier.png) |

Verified visual differences: continuous engineered ceiling services replace
the sparse roof detail; wall surfaces show substrate relief and metal edge
separation; the station has legible content and distinct controls; broad warm
grading/grain no longer hides corridor surfaces. The soldier retains its
recognisable dyed cloth while skin, rubber and hardware respond separately.
This is a material/detail benchmark using the existing models, not a replacement
for higher-quality source geometry.

## Measurements

| Preset | Camera | Calls before → after | Triangles before → after |
|---|---|---:|---:|
| Performance | rations-approach | 127 → 136 | 168,948 → 179,108 |
| Performance | cold-storage-junction | 199 → 208 | 201,264 → 211,424 |
| Performance | cold-storage-terminal | 170 → 181 | 155,032 → 166,368 |
| Performance | soldier | 112 → 121 | 159,558 → 169,718 |
| Balanced | rations-approach | 363 → 359 | 681,196 → 698,775 |
| Balanced | cold-storage-junction | 385 → 381 | 574,596 → 592,175 |
| Balanced | cold-storage-terminal | 305 → 303 | 406,030 → 424,785 |
| Balanced | soldier | 344 → 340 | 658,071 → 675,650 |
| High | rations-approach | 610 → 637 | 985,939 → 1,023,851 |
| High | cold-storage-junction | 776 → 803 | 943,971 → 981,883 |
| High | cold-storage-terminal | 638 → 671 | 682,941 → 724,381 |
| High | soldier | 551 → 578 | 932,988 → 970,900 |

**Balanced passes at all four views.** Peak calls decrease 385 → 381. Triangles increase with the new fittings.

| Preset | Drawing buffer | Texture objects before → after | Managed source textures, MiB before → after | Cold `/games/` bytes before → after |
|---|---|---|---|---:|
| Performance | 720×450 | 51–72 → 54–75 | 137.3–155.7 → 143.3–161.7 | 34,862,971 → 34,941,940 |
| Balanced | 960×600 | 71–92 → 84–106 | 146.8–165.0 → 166.1–184.8 | 34,862,971 → 34,941,940 |
| High | 1280×800 | 78–99 → 99–112 | 146.8–165.0 → 165.2–176.6 | 34,862,971 → 34,941,940 |

Cold-load delta: **78,969 B** including code and the two new maps. Downloads were measured on the same development server; production content encoding may reduce transferred bytes. Memory ranges show residency across the four poses, not a frame-time benchmark. Balanced managed-source residency peaks at **184.8 MiB versus 165.0 MiB** in the original captures; this increase is a material limitation before wider rollout.


Numbers include **all render passes and refreshed shadows**, taking the maximum
of three samples at each pose. High includes the expensive reflection view when
it refreshes. The measurements use Chromium **SwiftShader software rendering**;
its frame times are not representative of devices and are not quoted as FPS.
No 120-FPS or physical-iPad performance claim is made.

`renderer.info.memory.textures` is a texture-object count, not bytes. The managed
texture estimate counts unique uploaded WebGL handles and known source sizes,
including mipmaps. Render targets, unknown driver allocations, internal PMREM,
MSAA/depth attachments and transient resources are excluded; this is not a total
GPU-memory measurement. Residency can vary with shader
warm-up. The raw inventories and per-pose estimates are in before.json/after.json.

The harness initially used visibility `reset()` between existing-world views,
discarding restoration records for hidden layers. This was corrected to a dirty
rebuild; **both original and upgraded bundles were recaptured**. The game
visibility implementation was not changed. The original bundle was taken from
`git show c44d2bb:public/games/outpost-military.js`; both bundle hashes are recorded.

## Rendering settings

| Setting | Benchmark choice |
|---|---|
| Colour pipeline | Existing sRGB output + ACES, colour maps sRGB; normal/roughness/metalness maps linear NoColorSpace |
| Exposure / adaptation | Existing sheltered .96 / outside .91, night 1.08 targets; existing smooth .32-second adaptation retained |
| Concrete | Existing 2K colour / 1K data maps, repeat 1.5×1.5 per panel, roughness .9, normal scale .24 |
| Weapon finish | Existing 1K normal/roughness data, normal scale .055 receiver / .04 steel; coated carbine scalar roughness .9 |
| Soldier | 512² response maps, body normal .45 / skin .3; metal restricted to atlas hardware; material names/dye shader unchanged |
| Shadows | Existing PCF soft, 1024 Balanced / 2048 High, device caps and stable frustum retained; 30-Hz refresh retained |
| Contact shading | High SSAO retained (.45 radius, .001/.045 distance); existing room probe is analytical, not baked GI |
| Benchmark grade | Saturation 1.0, vignette .08, grain .002; highlights 1.025/1.01/.98, shadows .97/1/1.025 |
| Bloom | Performance bypass unchanged; Balanced skips bloom in this corridor; High strength .12 / threshold 1.35 / radius .35 |
| Reflections | PBR environment response on appropriate substrates; existing Reflector stays High-only; no universal wet-floor treatment |
| Resolution / AA | Existing 720/960/1440 preset width limits, adaptive resolution and pixel caps; existing 2×/4× MSAA or FXAA fallback |

The full baseline audit, including file:line evidence, disabled features and
source-model complexity, is in [AUDIT.md](AUDIT.md). Unchanged settings were kept
because they already meet the supported-engine/performance constraints. Preset
names and saved graphics settings did not change; no settings migration is needed.

Implementation evidence (current branch):
`benchmark-corridor.js:62` builds the scoped architectural kit;
`benchmark-corridor.js:261` merges the atlas signs;
`benchmark-corridor.js:269` dresses the existing station;
`realism-characters.js:23,117` configures/loads the response maps;
`realism-weapons.js:37` adds receiver data maps;
`realism-lighting.js:304` reads optional practical overrides;
`renderer.js:3287` scopes the restrained grade/bloom policy.
All these paths are under `scripts/outpost-military/`.

## Assets, download and licences

**68,362 bytes of new texture files**, below the ~3 MB asset allowance:

| New asset | Size | Source / licence |
|---|---:|---|
| benchmark-operator-body-orm.png | 64,909 B | Derived from existing Mixamo SWAT atlas; Adobe Mixamo terms, embedded game use |
| benchmark-operator-skin-roughness.png | 3,453 B | Authored mask aligned to existing Mixamo SWAT UV; same embedded-game terms |

The deterministic builder records the original GLB SHA-256 in
[material-source.json](material-source.json). Its red channel is constant and is
**not assigned as baked AO**. There are no new third-party models or photographs.
Existing Poly Haven **brushed_concrete_03** and **metal_plate** photographs are
reused under **CC0**. Signs/screens are original canvas artwork; fittings are
original procedural geometry. Exact links, permissions and credits are recorded
in `public/games/military/ATTRIBUTION.md` and the in-game Asset credits.

The regenerated manifest contains **39 assets / 32,936,013 B**. Added asset bytes
are distinct from the full cold-cache download above. The shared assetVersion
hash changes, so an existing installation may re-fetch reused assets as well;
the update is not claimed to transfer only 68 KB on every device.

The renderer source was rebuilt into the **actual loaded bundle**. The iframe
cache token is `corridor-benchmark-20261019`. No new public/games JavaScript module
was added; the existing bundle/cache modules already have no-cache rules.

## Files changed

- Renderer integration/pipeline: `scripts/outpost-military/renderer.js`,
  `realism-environment.js`, `realism-lighting.js` and new `benchmark-corridor.js`.
- Character and weapon material response: `realism-characters.js`,
  `realism-weapons.js`, `realism-carbine.js`.
- Asset build/cache/release: `scripts/build-outpost-benchmark-materials.py`,
  `scripts/build-outpost-cache.mjs`, two new PNGs, generated
  `public/games/outpost-asset-manifest.js`, generated `outpost-military.js`,
  `public/games/military/ATTRIBUTION.md`, `outpost-asset-cache.js`,
  `src/routes/games/outpost-zero.tsx` (cache token only).
- Reproducible validation: `scripts/benchmark-outpost-corridor.mjs`,
  `scripts/check-outpost-corridor.mjs`, `scripts/verify-outpost-corridor-built.mjs`,
  this report, audit, raw JSON and matched captures. The stale assertions in
  `scripts/check-outpost-loading.mjs` were updated to main's current six
  `lz-*` briefing images/titles; loading-screen code was not changed.

## Validation

| Required check | Result |
|---|---|
| `node --test scripts/outpost-*.test.mjs` | Pass — 37 test files, zero failures |
| `npx tsc --noEmit -p .` | Pass |
| `NITRO_PRESET=render npm run build:render` | Pass; packaged files match source |
| `npm run build:outpost-military` | Pass; loaded bundle hash matches the measured bundle and packaged copy |
| `node scripts/build-outpost-cache.mjs` | Pass; manifest regenerated, lengths/hashes verified |
| `node scripts/check-outpost-loading.mjs` | Pass — desktop, mobile and missing optional artwork |
| Desktop/mobile corridor checks, dev and packaged | Pass — zero console/page errors |
| Site smoke, dev and packaged | Pass — desktop/mobile visible, zero console errors, no production divergence |
| Release preflight | Pass — 126 files, 13 operator source assets, no merge markers or stale packaged files |
| `git diff --check` | Pass |

Both desktop/mobile game and site captures were visually inspected. The clearance
check covers **25 floor, 126 ceiling and 143 wall** records, with zero violations.
The original operator GLB and map files are unchanged. Hardware FPS is unverified.

Browser checks cover desktop and touch, actual A/D control signs, movement
through the corridor, retained solid baffles, floor/wall/ceiling clearances,
four distinct uniform dye values, both original LOD sets, Run fallback,
power-sabotage emission, day/night rendering, indoor/outdoor exposure targets,
asset errors and Balanced reflections disabled. Packaged output is checked for
current bundle/cache headers and visible desktop/mobile site content.

## Limits and the next approval boundary

- Source geometry, source photographic resolution and old generic assets still
  limit realism. This does not reproduce the reference's AAA asset library.
  Soldier gear fit and geometry are retained, not newly remodelled. No new
  walk/back-walk clips were retargeted.
- Newly used material maps/detail increase texture residency and triangles
  despite the lower Balanced draw-call totals. Before broader rollout, measure
  actual GPU time and memory on an iPad and a representative desktop. Do not
  infer hardware FPS from this software renderer.
- Existing High puddles sit below the opaque interior floor surfaces; this
  benchmark does not claim new planar indoor reflections. It relies on selective
  PBR environment response for the terminal/weapon/metal. Local probes and
  physically placed High-only puddles need a separately approved pass.
- Room bounce remains analytical. True baked indirect/contact lighting and
  compressed GPU textures are sensible future work, not implemented GI claims.
- The reference image is visible in the user brief; a local reference file was
  unavailable for a three-column reference/before/after artifact.

**Stop here for review.** After approval, apply the accepted concrete/trim/service
kit one room at a time, with unchanged collision and the same per-view Balanced
budget. Prioritise the medical depot and power passage, then other interiors.
Before increasing asset density across the base, evaluate KTX2/Basis compression
and local reflection/bounce probes. Any soldier/weapon remodelling or replacement
motion requires a separate asset/licence budget and frame-by-frame verification.
