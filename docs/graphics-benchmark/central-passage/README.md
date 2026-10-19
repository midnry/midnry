# Central Passage — room review 1

Branch: `codex/graphics-benchmark`. Main merged first: `e7546ef` into `5045526`.
Only Central Passage (tiles **x11–16, y10–11**) receives new room-specific art.
The Covered Supply Atrium and subsequent rooms wait for review.

## What changed

- Reused photographed CC0 concrete, roughness and normal maps for dry walls and
  floors; added matte impact strips, panel seams and metal top/base trims.
- Added overhead supply/return pipes, a cable tray, duct joints and brackets.
  Everything is instanced or merged by existing material. No new shadow-light
  pool, mirror, post-processing pass or downloaded texture/model.
- Added shielded warm practicals alongside the existing cool ceiling lighting,
  an unobtrusive wall utility panel, safety thresholds and transit markings.
- Added game-font wayfinding for recovery stores, the supply atrium and transit.
  Interactable terminals retain their distinct screens, labels and state colours.
  New plates sit below the existing 2.36m headers so the beams cannot obscure
  their lettering. The passage itself contains no task station; the close-ups include the adjacent
  recovery-store terminal, without moving or adding an interaction.
- Shared sign subtitles now use **60%** of the fitted title size. Plates below
  0.5m tall have a single clear line; secondary text that cannot fit is omitted.
  Long titles are measured and fitted completely rather than clipped by a
  minimum font-size floor. Existing mipmaps, maximum available anisotropy and restrained, power-aware
  emission remain. All typography uses the loaded Barlow Condensed or fallback.
- Balanced bloom is off in day and night; High retains its existing bloom.
  Balanced diffuser emission is reduced to preserve colour and fixture definition.
  The neutral grade is unchanged across the base.
- Restored the original default phone render budget in portrait and landscape.
  Higher adaptive resolution must still be earned; iPad pixel caps are unchanged.

## Matched real-engine captures

All room views use the same seeded match, camera, CSS dimensions and day/night
state. Laptop: **1280×720, DPR1**. Phone: **390×844, DPR2**. iPad: **1024×768,
DPR2**, Apple-touch compatibility profile. Text close-ups: **1280×720, DPR2**,
Balanced and High, at 3m and 6m. Images are actual WebGL output, not concept art.
Phone output deliberately has a lower backing buffer after restoring its budget;
CSS framing and screenshot dimensions are unchanged. Screenshots retain the
shipped HUD; this pass does not restyle it.

### Laptop / central-west-day

Before | After
--- | ---
![Before](before-laptop-balanced-central-west-day.png) | ![After](after-laptop-balanced-central-west-day.png)

### Laptop / central-east-day

Before | After
--- | ---
![Before](before-laptop-balanced-central-east-day.png) | ![After](after-laptop-balanced-central-east-day.png)

### Laptop / central-west-night

Before | After
--- | ---
![Before](before-laptop-balanced-central-west-night.png) | ![After](after-laptop-balanced-central-west-night.png)

### Laptop / central-east-night

Before | After
--- | ---
![Before](before-laptop-balanced-central-east-night.png) | ![After](after-laptop-balanced-central-east-night.png)

### Phone / central-west-day

Before | After
--- | ---
![Before](before-phone-balanced-central-west-day.png) | ![After](after-phone-balanced-central-west-day.png)

### Phone / central-east-day

Before | After
--- | ---
![Before](before-phone-balanced-central-east-day.png) | ![After](after-phone-balanced-central-east-day.png)

### Phone / central-west-night

Before | After
--- | ---
![Before](before-phone-balanced-central-west-night.png) | ![After](after-phone-balanced-central-west-night.png)

### Phone / central-east-night

Before | After
--- | ---
![Before](before-phone-balanced-central-east-night.png) | ![After](after-phone-balanced-central-east-night.png)

## Sign and equipment close-ups — DPR2

### Balanced / central-sign-3m

Before | After
--- | ---
![Before](before-retina-balanced-central-sign-3m.png) | ![After](after-retina-balanced-central-sign-3m.png)

### Balanced / central-sign-6m

Before | After
--- | ---
![Before](before-retina-balanced-central-sign-6m.png) | ![After](after-retina-balanced-central-sign-6m.png)

### Balanced / station-label-3m

Before | After
--- | ---
![Before](before-retina-balanced-station-label-3m.png) | ![After](after-retina-balanced-station-label-3m.png)

### Balanced / terminal-screen-3m

Before | After
--- | ---
![Before](before-retina-balanced-terminal-screen-3m.png) | ![After](after-retina-balanced-terminal-screen-3m.png)

### High / central-sign-3m

Before | After
--- | ---
![Before](before-retina-high-central-sign-3m.png) | ![After](after-retina-high-central-sign-3m.png)

### High / central-sign-6m

Before | After
--- | ---
![Before](before-retina-high-central-sign-6m.png) | ![After](after-retina-high-central-sign-6m.png)

### High / station-label-3m

Before | After
--- | ---
![Before](before-retina-high-station-label-3m.png) | ![After](after-retina-high-station-label-3m.png)

### High / terminal-screen-3m

Before | After
--- | ---
![Before](before-retina-high-terminal-screen-3m.png) | ![After](after-retina-high-terminal-screen-3m.png)

## Validation and limits

See [measurements](MEASUREMENTS.md), [before.json](before.json) and
[after.json](after.json) for exact poses, all-pass renderer.info counters, buffers,
source-texture memory estimates and renderer bundle checksums.

The sandbox uses **SwiftShader software rendering**. Its frame times do not
represent phone/iPad/laptop GPU performance; no hardware FPS or GPU-ms claim is
made. Device validation checks rendering, traversal and budgets in emulated
viewports; physical-device frame pacing still needs a device run.

New room fittings and artwork are original authored procedural work, not
production scans/models. Existing photographic substrates are Poly Haven **CC0**;
Barlow Condensed is **SIL OFL 1.1**. Exact prior source links/licences remain in
[ATTRIBUTION.md](../../../public/games/military/ATTRIBUTION.md) and
[REALISM-ASSETS.md](../../../public/games/military/REALISM-ASSETS.md).
Asset credits now name Central Passage. No external asset download was added.

The new atlas also has an [additional close-up](central-wayfinding-closeup.png).
[Protected file checksums](protected-files.json) document the shipped navigation
and HUD sources.

## Implementation files

| File | Purpose |
| --- | --- |
| `scripts/outpost-military/room-central-passage.js` | One-room fittings, instanced material reuse, atlas and clearance records. |
| `scripts/outpost-military/realism-environment.js` | Hook the room into existing static batches. |
| `scripts/outpost-military/benchmark-corridor.js` | Expose existing concrete/caution materials for reuse. |
| `scripts/outpost-military/world-text.js` | Larger subtitles, single-line plates and measured complete-title fitting. |
| `scripts/outpost-military/renderer.js` | High-only bloom and restrained Balanced lamp emission. |
| `scripts/outpost-military/compatibility.js` | Restore default phone pixel budgets in both orientations. |
| `public/games/outpost-military.js` | Regenerated runtime bundle. |
| `public/games/military/ATTRIBUTION.md`, `outpost-asset-cache.js` | Credit the original room fittings and reused licensed sources. |
| `scripts/benchmark-outpost-central.mjs`, `qa-outpost-central-passage.mjs` | Matched captures, renderer counters and actual-engine room checks. |
| Existing corridor/interactable/text/compatibility QA helpers | Run final typography, power-state, mobile and packaged regressions. |

The merge commit also updates the iframe cache token to
`graphics-central-passage-20261019` and preserves main's font preloads, optional
trail and objective arrow. The protected source files are recorded separately.

## Next, after review

Covered Supply Atrium → Command / Operations → Communications / Radar → Armory
and stores → Barracks / Mess → Flight Deck / hangar → East Service Corridor and
remaining passages. Each receives its own commit, matched evidence and budget
check, then is pushed for review before the following room. No deployment or
merge into main is part of this work.
