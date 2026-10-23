# Outpost Zero polish pass, step 1 (23 Oct 2026): lobby, match messages, camera and touch settings

Branch `outpost/polish-2026` (`4b5d81d`, `02e6f13`, this doc). **Not deployed**: it needs the owner's
"deploy". Game rules, modes, accounts, progress and online play are unchanged.

## Audit: what was actually wrong (and why)

| Problem players see | Cause found in the code | Status |
|---|---|---|
| Blurry operator in the lobby on phones, jagged edges on iPhone | The lobby drew straight to the canvas at the *match* render size (phones about 1.25 px per point, down to 0.94 with automatic resolution; an iPhone screen has 3). It also skipped the composer, and iPhones have canvas antialiasing switched off, so there was no smoothing at all. | Fixed |
| Cold, grey operator in a sunset lobby | The lobby's reflections came from the arenas' blue daylight sky map. | Fixed: built from the lobby's own sunset sky |
| Flat floor, thin sky, hard horizon | The camera looked down from above head height, so most of the frame was bare floor and the sky was a 4° band. | Fixed: nearly level, chest-height camera (horizon at the hips, as in the concept); wider lens in portrait |
| Empty, placeholder set | The backdrop was a few dark boxes: the hangar was unlit and almost off screen. | Improved: see below |
| Text over the aiming area on phones | Match messages were bare yellow capitals with a drop shadow. | Fixed: one panel style |
| "CORES 0 / DMG 24 / MAX HP 100" always on screen | Shown even with no cores. | Shown only after the first core, in plain words |
| "0 · OVERDRIVE" under the special move | "Q · OVERDRIVE" in a condensed font: the Q read as 0. | Q is a keycap (X on a controller) |
| Camera shake only followed the system Reduce Motion | No in-game setting. | Settings → Accessibility → Camera motion: Full / Reduced / Off |
| Touch buttons not adjustable | No setting. | Settings → Controls → Touch button size and opacity |
| Weapon kick jolted | A linear 0.16 s return. | Snap back, then an ease-out; slight sway on fast turns. Visual only. |
| Loading progress | Checked: it counts real completed steps ("Loading game files 6 / 14"). | Honest, left as is |

## What changed

- **Step 1b, Blender set (23 Oct, later).**
  - `scripts/assets/lobby-set.py` (Blender 5.2, run headless as the `bpy` Python module) models
    the hangar side: corrugated cladding, I-beam columns, a canopy truss framing the top-left of
    the view, a lit bay door, a catwalk with stair, pipes and lamps.
  - It also models an armoured six-wheel truck. Both have baked contact shading and export to
    `models/lobby-set-v1.glb` (0.86 MB, about 4.5k faces), now in the asset cache.
  - Real scanned Poly Haven props (crates, barrels, jerry cans, a compressor, concrete barriers,
    a tyre: the Dust Outpost set, already cached) are dressed around the hangar foot and the
    truck. Two warm work lights make them read.
  - If the model fails to load, the simple stand-ins stay.

- **Lobby rendering.**
  - Resolution: the screen's density up to 2×, within a pixel budget (2.0 MP on Apple devices,
    2.6 MP elsewhere; `lobbyRenderSize`, tested).
  - 4× multisampling on every device that supports it, including iPhones.
  - Subtle bloom on desktop and the High preset, and neutral tone mapping, which keeps the sunset's
    hues.
  - The Performance preset and safe mode keep the old, cheaper path. A match puts its own render
    size back on its first frame.
- **Lobby set.**
  - Floor and architecture: wet concrete slabs, a corrugated hangar lit by warm work lights with a
    roof edge framing the top, a lattice gantry tower with warning lights, an olive vehicle.
  - Light: lamp reflections on the wet ground.
  - Distance: a stepped skyline with rooftop plant, antennas and chimney stacks, darker cloud
    undersides and warmer haze.
  - Pads: heavy dark steel with glowing rims, a contact shadow under each figure, and real shadows
    on phones too.
- **Match HUD.** Message panel, cores chip, keycap (above).
- **Settings.** Camera motion; touch button size (0.8–1.25×). Sizes above standard apply only where
  there is room (tablets): phones cap at the standard size so nothing overlaps. Opacity runs from 40
  to 100%, and a pressed control is always fully visible.

## Before / after (same viewport sizes, headless Chromium)

- `compare-lobby-desktop.jpg`: concept, before, after at 1280×720.
- `compare-lobby-phone.jpg`: 390×844.
- `compare-hud-phone.jpg`: 390×844.
- `compare-hud-desktop.jpg`: 1280×720.

## Checks run (automated, headless Chromium with a software GPU)

| Check | Result |
|---|---|
| Outpost unit tests (`node --test scripts/outpost-*.test.mjs`) | 327/327 (326 before, plus one new lobby-size test) |
| Typecheck, `build:render` | pass; the built game loads the new lobby without errors (laptop, phone 3×) |
| Lobby (`lobby-look.mjs` 1280 and 390): picker, drag to turn, Friends room, Start match | pass, no errors |
| Phone lobby scroll (`lobby-scroll.mjs`): stage stays still | pass (view offset constant) |
| HUD (`hud-look.mjs`) portrait, landscape, desktop, tablet, also at 1.25× and 60% buttons | no overlaps, nothing off screen, no errors |
| Settings (`settings-motion.mjs`) | 8/8: shown, saved, applied |
| Three Last Signal rounds + Play again (`signal-rounds.mjs`) | no page errors |
| Pause, Restart, Leave match (`pause-restart-leave.mjs`) | pass |
| Movement (`sprint-probe.mjs`, measured in game time) | walk, sprint and slide work, as in the unchanged game |
| Match draw calls (`draw-calls.mjs`, Balanced) | worst view 327, budget 520 |
| Lobby cost (`lobby-cost.mjs`) | 38–53 draw calls, about 37k triangles; the phone buffer is now 780×1688 with 4× MSAA (was about 487×1054 with none) |

**Not tested.**

- Nothing was tested on a real phone, tablet or controller.
- Frame rate and battery on devices are unmeasured. Timings from the software GPU mean nothing,
  only the counts above are meaningful.
- The extra pixels in the lobby (30 fps cap on phones) are the one new cost to watch on older
  phones. If it struggles, the Performance preset turns it off.

## Remaining limitations, and what would move it furthest next

1. **More real assets for the lobby (partly done in step 1b: a modelled hangar side, a truck and
   scanned props).**
   - The concept's look (a detailed hangar interior, a believable vehicle, props with wear) is
     beyond procedural boxes.
   - Needed: one glTF hangar or bay kit (about 30–60k triangles, 2K PBR textures, KTX2 or meshopt
     compressed, metres, Y-up), one military truck (about 15k triangles), and 4–6 props (crates,
     barrels, light stands).
   - The Blender pipeline in `docs/HANDOVER.md` (`scripts/assets/arena-kit.py`) can integrate them.
2. **Arena skies.**
   - All arenas share one overcast sky photograph, so every map reads the same and slightly washed.
   - Needed: one HDR sky per arena (for example a clear late-afternoon HDRI for Dust Outpost),
     loaded per map.
   - Enemy visibility must be re-checked with each sky.
3. **Character finish.** The default Field Operator reads well but plain next to the concept's
   characters; a costume and material pass belongs with the Locker art.
4. **Touch layout editor.** Size and opacity exist now; dragging buttons to new places is the next
   step (it needs saved positions per orientation and an overlap guard).
5. **Real-device pass.**
   - iPhone Safari and an Android phone, portrait and landscape: lobby sharpness, frame pacing,
     touch reliability with moving, aiming and firing at once.
   - Plus a controller check.

## Step 2 (23 Oct 2026, later): arena skies, the rest of the lobby, Dust Outpost dressing

Branch `outpost/polish-2026` on top of the deployed `4be9e4b`. **Not deployed** until the owner says
"deploy".

### Arena skies (`compare-arena-sky.jpg`)

- **Cause of the washed-out look:** every arena used one photographed sky whose horizon is white
  haze, shown at 58% brightness, with white shader clouds on top, under a high sun. Warming the
  grade alone changed almost nothing (tried first; the shots were nearly identical).
- **What changed:** each Last Signal arena now has its own daytime sky profile (`SKIES` in
  `renderer.js`):
  - the sky itself is drawn per arena (horizon colour, zenith colour, sun glow, cloud cover and
    cloud colours, a haze band at the horizon) over the photograph, which still provides the
    lighting and reflections, so materials look as before;
  - the sun's height per arena (Dust Outpost 30°, Calder Quay 24°, Wreck Estate 40°, Skyport 48°),
    so Dust Outpost has long late-afternoon shadows;
  - sun, sky-light and bounce-light colours, and a subtle grade (warm for Dust Outpost and the
    Quay, cool for Skyport, soft for the Estate).
  - Fog density is unchanged. Night, storms and sandstorms override all of this as before.
    Blackout Protocol's Breakwater and the hospital keep the photographed sky.
- **Visibility:** `actor-visibility.mjs` on Dust Outpost after the change: 0 hidden rivals, laptop and
  phone, hip-fire and sights.

### The rest of the lobby (`compare-lobby-step2.jpg`)

- `scripts/assets/lobby-set.py` now also models the **yard** on the right (two fuel tanks on
  cradles with a walkway, pipes and valves, a bund wall, a comms cabin with a dish mast and a red
  warning light, a chain-link fence, a floodlight mast) and the **skyline** (stepped blocks with
  lit windows, a water tower, two cooling towers, two cranes, chimneys), all with baked contact
  shading. `models/lobby-set-v1.glb` is 1.3 MB, about 7k faces.
- The simple box skyline, gantry and hangar stand-ins hide once the model loads.

### Dust Outpost dressing (`dust-outpost-dressing.jpg`)

- `scripts/assets/dust-set.py` models five vignettes with baked shading
  (`models/arena-dust-set-v1.glb`, 0.25 MB): a floodlight mast with its generator and cable drum,
  a water tank on a stand, a radio mast with guy wires and a field telephone, a tarp lean-to over
  crates, and oil drums under a camo net.
- They join the existing scanned props in the arena's dressing list, placed by the same rule as
  before: only on an open tile that touches exactly one wall, never in a lane. **Routes, cover
  and collision are unchanged** (dressing has never had collision). `prop-closeup.mjs` checks that
  rule on every placed prop and photographs each vignette.
- Dressing entries now carry a weight, so the big vignettes stay rarer than small props.

### Checks

| Check | Result |
|---|---|
| Outpost unit tests | 327/327 |
| Typecheck | clean |
| Dust Outpost views (`arena-look.mjs`), draw calls | spawn 178 (was 152), gate 126 (107), court 104 (85), wide 164 (143), budget 520 |
| Blackout base draw calls (`draw-calls.mjs`) | worst view 326 (was 327), budget 520 |
| Rival visibility (`actor-visibility.mjs`) | 0 hidden, laptop and phone |
| Props on single-wall open tiles (`prop-closeup.mjs`) | PASS, 28 placed |
| Lobby cost | unchanged draw-call count class (one more mesh group) |

Real phones still untested.
