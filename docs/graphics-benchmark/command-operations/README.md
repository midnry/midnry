# Command / Operations — room review

Branch: `codex/graphics-benchmark`. Scope: Breakwater **x3–7 / y3–8**, plus the
two requested Supply Atrium follow-ups. No deployment or merge to main.

## Main integration and protected gameplay

Merge commit `b660e09` integrates `origin/main` at `5d48435`. It contains the
official corridor sign fix (`ea0577f`) and the shipped Last Signal phone
controls: joystick-rim sprint with the gold RUN cue, hidden SPRINT button and
visible SLIDE button. The only renderer source conflict was the adjoining
atrium sign mount; the previously verified position was preserved.

The generated military bundle was rebuilt from source after the merge. The
room pass gets a fresh `graphics-command-20261019b` iframe cache key.
`protected-files.json` records the exact merged versions of the HTML, focus,
academy, protocol UI, navigation, HUD, ground-trail and collision-map files.
This room pass does not edit any of them. The graphics branch's previously
approved resolution changes remain; main's touch-control code is intact.

## What changed

- Existing solid furniture tiles `(5,4)`, `(6,4)` and `(4,7)` now read as an
  operations planning block and closed archive cabinets. Their opaque cover
  height is retained; no furniture is placed in a walkable tile.
- A large printed rescue-planning diagram, readable Barlow titles, recessed
  drawer seams, folded metal access doors, latches and a darker base give the equipment a purpose.
  The paper diagram has no fake task prompt or powered-screen appearance.
- Dry photographed concrete, restrained plaster, impact strips and trims
  reuse existing CC0 surfaces. Cabinet enamel uses the existing metal normal
  and roughness maps with a matte painted response, distinct from the plaster.
  The existing recessed window bays remain.
- Ceiling utilities, a duct and an open cable tray use existing instance
  batches. Warm practicals complement the cool fill through the existing
  light pool. No new shadow camera, exposure change or global grade change.
- Existing task terminals, medical supplies, charge sockets, emergency
  console and their interaction/state behaviour stay in place.
- Atrium: removed the small CARGO MANIFEST plate and its backing. Its atlas
  shrinks from 2048×512 to 2048×256. The dispatch practical moves 1.05m sideways
  and 0.22m upward, with reduced intensity, to remove the lettering hotspot.

All new room fittings and canvas artwork are authored geometry, **not scanned
or production assets**. New downloaded assets: **none**. Existing Poly Haven
CC0 substrates and the OFL Barlow Condensed font are listed in
[ATTRIBUTION](../../../public/games/military/ATTRIBUTION.md) and the existing
in-game credits. No runtime asset-cache additions are required.

## Review evidence

Matched real-engine screenshots use the same fixed seed, camera, resolution
and day/night state, with laptop 1280×720 and phone 390×844 views. iPad views
and DPR2 Balanced/High close-ups supplement them. Every Command sign, screen
and medical/emergency label is inventoried, with approximately 2.5m close-ups.
The removed atrium manifest plate is shown from 4m.

The clearance check examines transformed architecture triangles, not just
authoring positions. Each triangle's bounding box provides a conservative
lower bound on the distance to the letter rectangle. Jambs, headers, walls,
trim, pipes, conduits, lamps and ceilings are included. Integral equipment
housings are excluded from the architecture set; their printed medical and
emergency labels are included as targets, including case backs.

See `MEASUREMENTS.md`, `CHECKS.md` and the accompanying raw JSON for final
counts, memory estimates and verification results.

Balanced patrol falls from **447 to 415 calls** and **775,065 to 586,477
triangles**. Peak captured Balanced calls: **429 laptop/iPad, 385 phone**.
The phone buffer remains 390×844. The additional canvas atlases net **+2.67
MiB**; observed source-texture estimates vary by context and are reported in
full, including the phone peak increasing from 299.34 to 321.60MiB. All 266
Outpost tests, TypeScript, both builds, packaged gameplay and loading checks
pass. The smallest measured Command architectural clearance is **21mm**.

## Files in this room commit

| Files | Purpose |
| --- | --- |
| `scripts/outpost-military/room-command-operations.js` | Command fittings, materials, atlas and light fixtures |
| `scripts/outpost-military/renderer.js`, `realism-environment.js` | Register the room decorator; replace dressing on the original solid furniture tiles |
| `scripts/outpost-military/room-supply-atrium.js` | Remove manifest plate; offset dispatch practical |
| `public/games/outpost-military.js` | Rebuilt renderer bundle |
| `src/routes/games/outpost-zero.tsx` | Fresh cache key only |
| `scripts/benchmark-outpost-command.mjs` | Matched real-engine screenshots and counters |
| `scripts/qa-outpost-command-operations.mjs`, `qa-outpost-supply-atrium.mjs`, `check-outpost-interactables.mjs` | Geometry clearance and existing interaction-state regression checks |
| `docs/graphics-benchmark/command-operations/`, `NEXT-PASSES.md` | Review evidence and queued room/arena sequence |

## Limits and next pass

Chromium uses SwiftShader in this sandbox. Renderer counters and buffer sizes
are measured, but frame times are **not hardware FPS or GPU-ms**. Sustained
iPhone/iPad performance still needs physical-device validation. Texture memory
estimates cover managed uploaded source images with mipmaps, excluding render
targets, internal PMREM, MSAA/depth and driver allocations.

Stop here for review. **Communications / Radar is next** after approval.
The Last Signal arena work follows the remaining Blackout Protocol rooms;
see [the remaining pass sequence](../NEXT-PASSES.md).


<!-- MATCHED GALLERY -->

## Matched real-engine views

Laptop 1280×720 DPR1; phone 390×844 DPR2; iPad 1024×768 DPR2 (Apple-touch profile). Same seeded match and camera per pair; no concept art or image enhancement.

### laptop / command-west-day

Before | After
--- | ---
![Before](before-laptop-balanced-command-west-day.png) | ![After](after-laptop-balanced-command-west-day.png)

### laptop / command-south-day

Before | After
--- | ---
![Before](before-laptop-balanced-command-south-day.png) | ![After](after-laptop-balanced-command-south-day.png)

### laptop / command-west-night

Before | After
--- | ---
![Before](before-laptop-balanced-command-west-night.png) | ![After](after-laptop-balanced-command-west-night.png)

### laptop / command-south-night

Before | After
--- | ---
![Before](before-laptop-balanced-command-south-night.png) | ![After](after-laptop-balanced-command-south-night.png)

### phone / command-west-day

Before | After
--- | ---
![Before](before-phone-balanced-command-west-day.png) | ![After](after-phone-balanced-command-west-day.png)

### phone / command-south-day

Before | After
--- | ---
![Before](before-phone-balanced-command-south-day.png) | ![After](after-phone-balanced-command-south-day.png)

### phone / command-west-night

Before | After
--- | ---
![Before](before-phone-balanced-command-west-night.png) | ![After](after-phone-balanced-command-west-night.png)

### phone / command-south-night

Before | After
--- | ---
![Before](before-phone-balanced-command-south-night.png) | ![After](after-phone-balanced-command-south-night.png)

### ipad / command-west-day

Before | After
--- | ---
![Before](before-ipad-balanced-command-west-day.png) | ![After](after-ipad-balanced-command-west-day.png)

### ipad / command-west-night

Before | After
--- | ---
![Before](before-ipad-balanced-command-west-night.png) | ![After](after-ipad-balanced-command-west-night.png)

## Command signs, screens and atrium follow-ups — DPR2, approximately 2.5m

The same cameras show the old storage where new artwork did not previously exist; the atrium manifest comparison shows its removal from 4m.

### balanced / sign-command-room-2.5m

Before | After
--- | ---
![Before](before-retina-balanced-sign-command-room-2.5m.png) | ![After](after-retina-balanced-sign-command-room-2.5m.png)

### balanced / intel-upload-label-2.5m

Before | After
--- | ---
![Before](before-retina-balanced-intel-upload-label-2.5m.png) | ![After](after-retina-balanced-intel-upload-label-2.5m.png)

### balanced / intel-upload-screen-2.5m

Before | After
--- | ---
![Before](before-retina-balanced-intel-upload-screen-2.5m.png) | ![After](after-retina-balanced-intel-upload-screen-2.5m.png)

### balanced / sensor-reset-label-2.5m

Before | After
--- | ---
![Before](before-retina-balanced-sensor-reset-label-2.5m.png) | ![After](after-retina-balanced-sensor-reset-label-2.5m.png)

### balanced / sensor-reset-screen-2.5m

Before | After
--- | ---
![Before](before-retina-balanced-sensor-reset-screen-2.5m.png) | ![After](after-retina-balanced-sensor-reset-screen-2.5m.png)

### balanced / surgical-command-label-2.5m

Before | After
--- | ---
![Before](before-retina-balanced-surgical-command-label-2.5m.png) | ![After](after-retina-balanced-surgical-command-label-2.5m.png)

### balanced / cabinet-sensors-label-2.5m

Before | After
--- | ---
![Before](before-retina-balanced-cabinet-sensors-label-2.5m.png) | ![After](after-retina-balanced-cabinet-sensors-label-2.5m.png)

### balanced / emergency-label-2.5m

Before | After
--- | ---
![Before](before-retina-balanced-emergency-label-2.5m.png) | ![After](after-retina-balanced-emergency-label-2.5m.png)

### balanced / sign-coordination-board

Before | After
--- | ---
![Before](before-retina-balanced-sign-coordination-board.png) | ![After](after-retina-balanced-sign-coordination-board.png)

### balanced / sign-archive

Before | After
--- | ---
![Before](before-retina-balanced-sign-archive.png) | ![After](after-retina-balanced-sign-archive.png)

### balanced / sign-atrium-dispatch

Before | After
--- | ---
![Before](before-retina-balanced-sign-atrium-dispatch.png) | ![After](after-retina-balanced-sign-atrium-dispatch.png)

### balanced / sign-atrium-manifest-4m

Before | After
--- | ---
![Before](before-retina-balanced-sign-atrium-manifest-4m.png) | ![After](after-retina-balanced-sign-atrium-manifest-4m.png)

### high / sign-command-room-2.5m

Before | After
--- | ---
![Before](before-retina-high-sign-command-room-2.5m.png) | ![After](after-retina-high-sign-command-room-2.5m.png)

### high / intel-upload-label-2.5m

Before | After
--- | ---
![Before](before-retina-high-intel-upload-label-2.5m.png) | ![After](after-retina-high-intel-upload-label-2.5m.png)

### high / intel-upload-screen-2.5m

Before | After
--- | ---
![Before](before-retina-high-intel-upload-screen-2.5m.png) | ![After](after-retina-high-intel-upload-screen-2.5m.png)

### high / sensor-reset-label-2.5m

Before | After
--- | ---
![Before](before-retina-high-sensor-reset-label-2.5m.png) | ![After](after-retina-high-sensor-reset-label-2.5m.png)

### high / sensor-reset-screen-2.5m

Before | After
--- | ---
![Before](before-retina-high-sensor-reset-screen-2.5m.png) | ![After](after-retina-high-sensor-reset-screen-2.5m.png)

### high / surgical-command-label-2.5m

Before | After
--- | ---
![Before](before-retina-high-surgical-command-label-2.5m.png) | ![After](after-retina-high-surgical-command-label-2.5m.png)

### high / cabinet-sensors-label-2.5m

Before | After
--- | ---
![Before](before-retina-high-cabinet-sensors-label-2.5m.png) | ![After](after-retina-high-cabinet-sensors-label-2.5m.png)

### high / emergency-label-2.5m

Before | After
--- | ---
![Before](before-retina-high-emergency-label-2.5m.png) | ![After](after-retina-high-emergency-label-2.5m.png)

### high / sign-coordination-board

Before | After
--- | ---
![Before](before-retina-high-sign-coordination-board.png) | ![After](after-retina-high-sign-coordination-board.png)

### high / sign-archive

Before | After
--- | ---
![Before](before-retina-high-sign-archive.png) | ![After](after-retina-high-sign-archive.png)

### high / sign-atrium-dispatch

Before | After
--- | ---
![Before](before-retina-high-sign-atrium-dispatch.png) | ![After](after-retina-high-sign-atrium-dispatch.png)

### high / sign-atrium-manifest-4m

Before | After
--- | ---
![Before](before-retina-high-sign-atrium-manifest-4m.png) | ![After](after-retina-high-sign-atrium-manifest-4m.png)

[All counters, memory estimates and byte sizes](MEASUREMENTS.md) · [Checks](CHECKS.md)

## Original fixed benchmark views

### laptop / rations-approach

Before | After
--- | ---
![Before](before-laptop-balanced-rations-approach.png) | ![After](after-laptop-balanced-rations-approach.png)

### laptop / cold-storage-junction

Before | After
--- | ---
![Before](before-laptop-balanced-cold-storage-junction.png) | ![After](after-laptop-balanced-cold-storage-junction.png)

### laptop / cold-storage-terminal

Before | After
--- | ---
![Before](before-laptop-balanced-cold-storage-terminal.png) | ![After](after-laptop-balanced-cold-storage-terminal.png)

### laptop / soldier

Before | After
--- | ---
![Before](before-laptop-balanced-soldier.png) | ![After](after-laptop-balanced-soldier.png)

### laptop / patrol

Before | After
--- | ---
![Before](before-laptop-balanced-patrol.png) | ![After](after-laptop-balanced-patrol.png)

### ipad / patrol

Before | After
--- | ---
![Before](before-ipad-balanced-patrol.png) | ![After](after-ipad-balanced-patrol.png)
