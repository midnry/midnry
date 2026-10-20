# Communications / Radar — room review

Branch: `codex/graphics-benchmark`. Baseline: approved Command / Operations
commit `afe7f01`. Scope: Breakwater **x20–24 / y3–8**, plus the requested
Command planning-title follow-up. No deployment or merge to main.

## What changed

- The two existing solid radar-equipment tiles `(22,5)` and `(23,5)` now carry
  one joined, opaque equipment bank instead of generic tarp storage and loose
  electrical cabinets. Four service bays on each side have recessed chassis,
  vents, rails, latches and folded side access doors. Nothing occupies a new
  collision tile or changes the usable routes.
- Matte painted metal uses the existing photographed normal and roughness
  maps, without the source metal's large rusty colour patches. Dry concrete,
  restrained plaster, impact strips and trim follow the approved room standard.
- A cooling duct and cable ladder give the room a clear service function.
  Two offset warm practicals complement the existing cool ceiling lights.
  They use the existing pooled lighting and electrical state; no new shadow
  camera, global grade, exposure, bloom or resolution setting is introduced.
- Original radio/radar task terminals, the medical cabinet and all interaction
  positions and states stay unchanged. Their powered screens remain distinct
  from the passive equipment bank. All lettering uses the existing Barlow font,
  mipmaps, maximum anisotropy and restrained power-aware emission.
- Command: the rescue-planning title is now two equally sized lines on the
  left of the diagram, below the raised RADIO ASSEMBLY plate. The emergency
  console has not moved. Main-approach screenshots and triangle-based sightline
  checks verify the separation.

All new fittings and canvas art are **original authored geometry/artwork, not
scanned production assets**. There are no new downloaded models, textures or
fonts. Existing Poly Haven concrete, plaster and metal maps are CC0; Barlow
Condensed is SIL OFL 1.1. Exact sources are in
[ATTRIBUTION](../../../public/games/military/ATTRIBUTION.md) and
[REALISM-ASSETS](../../../public/games/military/REALISM-ASSETS.md); in-game
credits now explicitly include these room fittings. The military asset-cache
manifest needs no additions.

## Evidence and method

See [measurements](MEASUREMENTS.md), [checks](CHECKS.md), [before.json](before.json)
and [after.json](after.json). The gallery below uses real engine captures with
fixed seed `outpost-corridor-20261019`, matched cameras and day/night state.
Laptop: 1280×720. Phone: 390×844, DPR2. iPad: 1024×768, DPR2. Primary room signs,
station labels/screens and cabinet labels have 2.5m DPR2 Balanced/High close-ups.

Clearance measures transformed architecture triangles against each lettering
rectangle, including walls, jambs, headers, utility runs, lighting and trims.
The minimum allowed gap is 20mm. Integrated equipment housings are excluded;
printed medical-case labels, including the hidden case backs, are still checked.
Routes are exercised through the actual movement/collision code.

The QA fixture parks inactive soldiers away from Communications so they cannot
obscure labels. The original fixed-view soldier and patrol poses remain intact.
Adaptive resolution is disabled for matched measurements only. There are no
runtime preset or default phone-resolution changes.

## Reproduce

```sh
node scripts/benchmark-outpost-communications.mjs before
node scripts/benchmark-outpost-communications.mjs after
OUTPOST_GRAPHICS_PASS=communications-radar OUTPOST_QA_VARIANT=blocked node scripts/check-outpost-interactables.mjs http://127.0.0.1:8080 dev
OUTPOST_GRAPHICS_PASS=communications-radar OUTPOST_QA_VARIANT=desktop node scripts/verify-outpost-corridor-built.mjs
```

The capture script reconstructs the approved baseline using `git show`; it
never checks out or overwrites project source. Optional context filters:
`OUTPOST_COMMS_DEVICE` (`laptop`, `phone`, `ipad`, `retina`),
`OUTPOST_COMMS_PRESET` (`balanced`, `high`) and `OUTPOST_COMMS_RESUME=1`.
Screenshots also remain in `/workspace/screenshots/outpost-communications-radar/`.
The sandbox's Chromium proxy/CA preloader is local test configuration, not a
shipped dependency.

## Limitations and next pass

Chromium runs with SwiftShader software rendering here. Renderer counters,
geometry clearances and drawing buffers are measured; timings are **not**
hardware FPS or GPU time. Sustained physical phone/iPad performance remains
unverified. Source-texture estimates exclude render targets, internal PMREM,
MSAA/depth, compression and driver allocations, and are not total VRAM.

Stop for review after this push. Next: **Armory and stores**, then Barracks /
Mess Hall, Vehicle Hangar / Flight Deck, Generators / Power, Maintenance Tunnels
and remaining passages. Last Signal outpost, skyport and estate follow as
separately reviewed passes; none is changed by this room pass.

## Review gallery

**46 matched pairs / 92 unedited engine screenshots.** Open either image for
full resolution. Every pair uses the same camera, render buffer and lighting state.
The room is shown from west and south, day and night, with phone controls retained.

### laptop/balanced

| View | Before | After |
| --- | --- | --- |
| communications-west-day | [![Before communications-west-day](before-laptop-balanced-communications-west-day.png)](before-laptop-balanced-communications-west-day.png) | [![After communications-west-day](after-laptop-balanced-communications-west-day.png)](after-laptop-balanced-communications-west-day.png) |
| communications-south-day | [![Before communications-south-day](before-laptop-balanced-communications-south-day.png)](before-laptop-balanced-communications-south-day.png) | [![After communications-south-day](after-laptop-balanced-communications-south-day.png)](after-laptop-balanced-communications-south-day.png) |
| communications-west-night | [![Before communications-west-night](before-laptop-balanced-communications-west-night.png)](before-laptop-balanced-communications-west-night.png) | [![After communications-west-night](after-laptop-balanced-communications-west-night.png)](after-laptop-balanced-communications-west-night.png) |
| communications-south-night | [![Before communications-south-night](before-laptop-balanced-communications-south-night.png)](before-laptop-balanced-communications-south-night.png) | [![After communications-south-night](after-laptop-balanced-communications-south-night.png)](after-laptop-balanced-communications-south-night.png) |
| command-south-day | [![Before command-south-day](before-laptop-balanced-command-south-day.png)](before-laptop-balanced-command-south-day.png) | [![After command-south-day](after-laptop-balanced-command-south-day.png)](after-laptop-balanced-command-south-day.png) |
| command-south-night | [![Before command-south-night](before-laptop-balanced-command-south-night.png)](before-laptop-balanced-command-south-night.png) | [![After command-south-night](after-laptop-balanced-command-south-night.png)](after-laptop-balanced-command-south-night.png) |
| command-south-entrance | [![Before command-south-entrance](before-laptop-balanced-command-south-entrance.png)](before-laptop-balanced-command-south-entrance.png) | [![After command-south-entrance](after-laptop-balanced-command-south-entrance.png)](after-laptop-balanced-command-south-entrance.png) |
| command-west-approach | [![Before command-west-approach](before-laptop-balanced-command-west-approach.png)](before-laptop-balanced-command-west-approach.png) | [![After command-west-approach](after-laptop-balanced-command-west-approach.png)](after-laptop-balanced-command-west-approach.png) |
| rations-approach | [![Before rations-approach](before-laptop-balanced-rations-approach.png)](before-laptop-balanced-rations-approach.png) | [![After rations-approach](after-laptop-balanced-rations-approach.png)](after-laptop-balanced-rations-approach.png) |
| cold-storage-junction | [![Before cold-storage-junction](before-laptop-balanced-cold-storage-junction.png)](before-laptop-balanced-cold-storage-junction.png) | [![After cold-storage-junction](after-laptop-balanced-cold-storage-junction.png)](after-laptop-balanced-cold-storage-junction.png) |
| cold-storage-terminal | [![Before cold-storage-terminal](before-laptop-balanced-cold-storage-terminal.png)](before-laptop-balanced-cold-storage-terminal.png) | [![After cold-storage-terminal](after-laptop-balanced-cold-storage-terminal.png)](after-laptop-balanced-cold-storage-terminal.png) |
| soldier | [![Before soldier](before-laptop-balanced-soldier.png)](before-laptop-balanced-soldier.png) | [![After soldier](after-laptop-balanced-soldier.png)](after-laptop-balanced-soldier.png) |
| patrol | [![Before patrol](before-laptop-balanced-patrol.png)](before-laptop-balanced-patrol.png) | [![After patrol](after-laptop-balanced-patrol.png)](after-laptop-balanced-patrol.png) |

### phone/balanced

| View | Before | After |
| --- | --- | --- |
| communications-west-day | [![Before communications-west-day](before-phone-balanced-communications-west-day.png)](before-phone-balanced-communications-west-day.png) | [![After communications-west-day](after-phone-balanced-communications-west-day.png)](after-phone-balanced-communications-west-day.png) |
| communications-south-day | [![Before communications-south-day](before-phone-balanced-communications-south-day.png)](before-phone-balanced-communications-south-day.png) | [![After communications-south-day](after-phone-balanced-communications-south-day.png)](after-phone-balanced-communications-south-day.png) |
| communications-west-night | [![Before communications-west-night](before-phone-balanced-communications-west-night.png)](before-phone-balanced-communications-west-night.png) | [![After communications-west-night](after-phone-balanced-communications-west-night.png)](after-phone-balanced-communications-west-night.png) |
| communications-south-night | [![Before communications-south-night](before-phone-balanced-communications-south-night.png)](before-phone-balanced-communications-south-night.png) | [![After communications-south-night](after-phone-balanced-communications-south-night.png)](after-phone-balanced-communications-south-night.png) |
| command-south-day | [![Before command-south-day](before-phone-balanced-command-south-day.png)](before-phone-balanced-command-south-day.png) | [![After command-south-day](after-phone-balanced-command-south-day.png)](after-phone-balanced-command-south-day.png) |
| command-south-night | [![Before command-south-night](before-phone-balanced-command-south-night.png)](before-phone-balanced-command-south-night.png) | [![After command-south-night](after-phone-balanced-command-south-night.png)](after-phone-balanced-command-south-night.png) |
| command-south-entrance | [![Before command-south-entrance](before-phone-balanced-command-south-entrance.png)](before-phone-balanced-command-south-entrance.png) | [![After command-south-entrance](after-phone-balanced-command-south-entrance.png)](after-phone-balanced-command-south-entrance.png) |
| command-west-approach | [![Before command-west-approach](before-phone-balanced-command-west-approach.png)](before-phone-balanced-command-west-approach.png) | [![After command-west-approach](after-phone-balanced-command-west-approach.png)](after-phone-balanced-command-west-approach.png) |

### ipad/balanced

| View | Before | After |
| --- | --- | --- |
| communications-west-day | [![Before communications-west-day](before-ipad-balanced-communications-west-day.png)](before-ipad-balanced-communications-west-day.png) | [![After communications-west-day](after-ipad-balanced-communications-west-day.png)](after-ipad-balanced-communications-west-day.png) |
| communications-west-night | [![Before communications-west-night](before-ipad-balanced-communications-west-night.png)](before-ipad-balanced-communications-west-night.png) | [![After communications-west-night](after-ipad-balanced-communications-west-night.png)](after-ipad-balanced-communications-west-night.png) |
| patrol | [![Before patrol](before-ipad-balanced-patrol.png)](before-ipad-balanced-patrol.png) | [![After patrol](after-ipad-balanced-patrol.png)](after-ipad-balanced-patrol.png) |

### retina/balanced

| View | Before | After |
| --- | --- | --- |
| sign-communications-room-2.5m | [![Before sign-communications-room-2.5m](before-retina-balanced-sign-communications-room-2.5m.png)](before-retina-balanced-sign-communications-room-2.5m.png) | [![After sign-communications-room-2.5m](after-retina-balanced-sign-communications-room-2.5m.png)](after-retina-balanced-sign-communications-room-2.5m.png) |
| radio-link-label-2.5m | [![Before radio-link-label-2.5m](before-retina-balanced-radio-link-label-2.5m.png)](before-retina-balanced-radio-link-label-2.5m.png) | [![After radio-link-label-2.5m](after-retina-balanced-radio-link-label-2.5m.png)](after-retina-balanced-radio-link-label-2.5m.png) |
| radio-link-screen-2.5m | [![Before radio-link-screen-2.5m](before-retina-balanced-radio-link-screen-2.5m.png)](before-retina-balanced-radio-link-screen-2.5m.png) | [![After radio-link-screen-2.5m](after-retina-balanced-radio-link-screen-2.5m.png)](after-retina-balanced-radio-link-screen-2.5m.png) |
| radar-calibration-label-2.5m | [![Before radar-calibration-label-2.5m](before-retina-balanced-radar-calibration-label-2.5m.png)](before-retina-balanced-radar-calibration-label-2.5m.png) | [![After radar-calibration-label-2.5m](after-retina-balanced-radar-calibration-label-2.5m.png)](after-retina-balanced-radar-calibration-label-2.5m.png) |
| radar-calibration-screen-2.5m | [![Before radar-calibration-screen-2.5m](before-retina-balanced-radar-calibration-screen-2.5m.png)](before-retina-balanced-radar-calibration-screen-2.5m.png) | [![After radar-calibration-screen-2.5m](after-retina-balanced-radar-calibration-screen-2.5m.png)](after-retina-balanced-radar-calibration-screen-2.5m.png) |
| radio-room-cabinet-2.5m | [![Before radio-room-cabinet-2.5m](before-retina-balanced-radio-room-cabinet-2.5m.png)](before-retina-balanced-radio-room-cabinet-2.5m.png) | [![After radio-room-cabinet-2.5m](after-retina-balanced-radio-room-cabinet-2.5m.png)](after-retina-balanced-radio-room-cabinet-2.5m.png) |
| command-emergency-2.5m | [![Before command-emergency-2.5m](before-retina-balanced-command-emergency-2.5m.png)](before-retina-balanced-command-emergency-2.5m.png) | [![After command-emergency-2.5m](after-retina-balanced-command-emergency-2.5m.png)](after-retina-balanced-command-emergency-2.5m.png) |
| command-planning-2.5m | [![Before command-planning-2.5m](before-retina-balanced-command-planning-2.5m.png)](before-retina-balanced-command-planning-2.5m.png) | [![After command-planning-2.5m](after-retina-balanced-command-planning-2.5m.png)](after-retina-balanced-command-planning-2.5m.png) |
| command-title-2.5m | [![Before command-title-2.5m](before-retina-balanced-command-title-2.5m.png)](before-retina-balanced-command-title-2.5m.png) | [![After command-title-2.5m](after-retina-balanced-command-title-2.5m.png)](after-retina-balanced-command-title-2.5m.png) |
| sign-radar-rack-2.5m | [![Before sign-radar-rack-2.5m](before-retina-balanced-sign-radar-rack-2.5m.png)](before-retina-balanced-sign-radar-rack-2.5m.png) | [![After sign-radar-rack-2.5m](after-retina-balanced-sign-radar-rack-2.5m.png)](after-retina-balanced-sign-radar-rack-2.5m.png) |
| sign-uplink-rack-2.5m | [![Before sign-uplink-rack-2.5m](before-retina-balanced-sign-uplink-rack-2.5m.png)](before-retina-balanced-sign-uplink-rack-2.5m.png) | [![After sign-uplink-rack-2.5m](after-retina-balanced-sign-uplink-rack-2.5m.png)](after-retina-balanced-sign-uplink-rack-2.5m.png) |

### retina/high

| View | Before | After |
| --- | --- | --- |
| sign-communications-room-2.5m | [![Before sign-communications-room-2.5m](before-retina-high-sign-communications-room-2.5m.png)](before-retina-high-sign-communications-room-2.5m.png) | [![After sign-communications-room-2.5m](after-retina-high-sign-communications-room-2.5m.png)](after-retina-high-sign-communications-room-2.5m.png) |
| radio-link-label-2.5m | [![Before radio-link-label-2.5m](before-retina-high-radio-link-label-2.5m.png)](before-retina-high-radio-link-label-2.5m.png) | [![After radio-link-label-2.5m](after-retina-high-radio-link-label-2.5m.png)](after-retina-high-radio-link-label-2.5m.png) |
| radio-link-screen-2.5m | [![Before radio-link-screen-2.5m](before-retina-high-radio-link-screen-2.5m.png)](before-retina-high-radio-link-screen-2.5m.png) | [![After radio-link-screen-2.5m](after-retina-high-radio-link-screen-2.5m.png)](after-retina-high-radio-link-screen-2.5m.png) |
| radar-calibration-label-2.5m | [![Before radar-calibration-label-2.5m](before-retina-high-radar-calibration-label-2.5m.png)](before-retina-high-radar-calibration-label-2.5m.png) | [![After radar-calibration-label-2.5m](after-retina-high-radar-calibration-label-2.5m.png)](after-retina-high-radar-calibration-label-2.5m.png) |
| radar-calibration-screen-2.5m | [![Before radar-calibration-screen-2.5m](before-retina-high-radar-calibration-screen-2.5m.png)](before-retina-high-radar-calibration-screen-2.5m.png) | [![After radar-calibration-screen-2.5m](after-retina-high-radar-calibration-screen-2.5m.png)](after-retina-high-radar-calibration-screen-2.5m.png) |
| radio-room-cabinet-2.5m | [![Before radio-room-cabinet-2.5m](before-retina-high-radio-room-cabinet-2.5m.png)](before-retina-high-radio-room-cabinet-2.5m.png) | [![After radio-room-cabinet-2.5m](after-retina-high-radio-room-cabinet-2.5m.png)](after-retina-high-radio-room-cabinet-2.5m.png) |
| command-emergency-2.5m | [![Before command-emergency-2.5m](before-retina-high-command-emergency-2.5m.png)](before-retina-high-command-emergency-2.5m.png) | [![After command-emergency-2.5m](after-retina-high-command-emergency-2.5m.png)](after-retina-high-command-emergency-2.5m.png) |
| command-planning-2.5m | [![Before command-planning-2.5m](before-retina-high-command-planning-2.5m.png)](before-retina-high-command-planning-2.5m.png) | [![After command-planning-2.5m](after-retina-high-command-planning-2.5m.png)](after-retina-high-command-planning-2.5m.png) |
| command-title-2.5m | [![Before command-title-2.5m](before-retina-high-command-title-2.5m.png)](before-retina-high-command-title-2.5m.png) | [![After command-title-2.5m](after-retina-high-command-title-2.5m.png)](after-retina-high-command-title-2.5m.png) |
| sign-radar-rack-2.5m | [![Before sign-radar-rack-2.5m](before-retina-high-sign-radar-rack-2.5m.png)](before-retina-high-sign-radar-rack-2.5m.png) | [![After sign-radar-rack-2.5m](after-retina-high-sign-radar-rack-2.5m.png)](after-retina-high-sign-radar-rack-2.5m.png) |
| sign-uplink-rack-2.5m | [![Before sign-uplink-rack-2.5m](before-retina-high-sign-uplink-rack-2.5m.png)](before-retina-high-sign-uplink-rack-2.5m.png) | [![After sign-uplink-rack-2.5m](after-retina-high-sign-uplink-rack-2.5m.png)](after-retina-high-sign-uplink-rack-2.5m.png) |

## Changed files

- Renderer integration: `scripts/outpost-military/renderer.js`,
  `realism-environment.js`, new `room-communications-radar.js`.
- Command follow-up: `scripts/outpost-military/room-command-operations.js`.
- Release artifacts: rebuilt `public/games/outpost-military.js` and the cache
  value in `src/routes/games/outpost-zero.tsx`.
- Credits: `public/games/military/ATTRIBUTION.md` and
  `public/games/outpost-asset-cache.js`.
- QA: `scripts/benchmark-outpost-communications.mjs`,
  `scripts/qa-outpost-communications-radar.mjs`,
  `scripts/check-outpost-interactables.mjs`.
- Review evidence: this folder and `docs/graphics-benchmark/NEXT-PASSES.md`.

No gameplay, collision map, bot, HUD, navigation, joystick or touch-control file
was edited. Remaining rooms and Last Signal arenas await separate review passes.
