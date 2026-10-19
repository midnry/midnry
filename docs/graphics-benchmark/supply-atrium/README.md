# Covered Supply Atrium — room review

Branch: `codex/graphics-benchmark`. No deployment or merge to main.
Scope: Breakwater **x12–15 / y13–15**, all original doors and walking lanes retained.

## Integration provenance

`origin/main` (`e7546ef`) was already an ancestor of this branch when fetched.
The requested half-tile corridor sign fix was actually on `origin/game-look`,
commit `ea0577f`, one commit ahead of main. Integration commit `ac48b11` applies
that exact renderer source patch, rebuilds the generated bundle and updates the
iframe cache key. It does not merge unrelated work from `game-look` or keep its
text-merged bundle. The room commit uses another fresh cache key.

## Room changes

- Dry concrete floor and walls reuse the approved photographed colour, normal
  and roughness maps. Matte impact strips, base/top trim and panel joints.
- Loading-bay outlines and threshold markings identify the room as a logistics
  staging area. Paint stays flush with the floor. No crates or obstacles are
  added to its non-solid walking tiles.
- Tie-down rails, a wall manifest plate, an overhead duct with joints, utility
  pipes and a cable tray. Original authored fittings, **not production models**.
  Shared static instance/material batches; no extra shadow submissions.
- Two shielded warm practicals use the existing point-light pool. Cool ceiling
  fill, global neutral grade, preset resolution limits and light-pool size stay
  unchanged. Balanced bloom remains off in day and night; High keeps bloom.
- The main room-name plate moves from a doorway to an existing solid wall bay.
  Three new game-font logistics labels use one filtered, mipmapped 2048×512
  atlas. The two night-only direction signs gain sharper Barlow artwork and
  restrained emission, with no painted blur or white core. Their existing
  night-only visibility and independent power behaviour are retained.
- No new gameplay objects. This room has no station, supply cabinet, charge
  socket or emergency console; the existing base-wide interactables retain
  their positions, collision, state behaviour and interaction ranges.

## Sign clearance and captures

All six sign faces are inspected at approximately **2.5m**, at DPR2 on Balanced
and High. See the gallery below and `qa-built.json` for distances to actual
transformed architecture triangles, including the integral sign backings.
The automated checker uses each triangle's AABB as a **conservative lower
bound**, rather than the AABB of an entire spatial batch. Every lower bound
must be at least 0.02m. It also checks wall depth, overhead clearance, paint
height, unchanged collision and three complete routes through the room.

Only colour/shape floor markings are used; there are no floor text labels.
Sign placement clears existing jambs, headers, lamps, conduits and pipes.
All future room passes must repeat this inventory, clearance check and the
2.5m close-ups for every sign, screen and label before pushing.

## Files changed in the room commit

- `scripts/outpost-military/room-supply-atrium.js`: scoped static room fittings and logistics atlas.
- `scripts/outpost-military/realism-environment.js`: shared-batch room integration.
- `scripts/outpost-military/renderer.js`: atrium room-name mount on an existing solid bay.
- `scripts/outpost-military/realism-night.js`: the two atrium direction signs.
- `public/games/outpost-military.js`: regenerated runtime bundle.
- `src/routes/games/outpost-zero.tsx`: fresh `graphics-atrium-20261019b` cache key.
- `scripts/benchmark-outpost-atrium.mjs`: matched views and renderer measurements.
- `scripts/qa-outpost-supply-atrium.mjs`, `scripts/check-outpost-interactables.mjs`: geometry clearance and existing equipment regression.
- `docs/graphics-benchmark/supply-atrium/`: screenshots, raw measurements and review notes.

## Assets and licences

**No new downloaded models, textures, fonts or other assets.** Existing CC0
Poly Haven concrete/metal substrates and the existing OFL Barlow Condensed font
are reused; exact sources/licences remain in
[ATTRIBUTION](../../../public/games/military/ATTRIBUTION.md).
Logistics atlas, signs and fittings are original project artwork. These are
not represented as scanned or production assets. The game asset-cache manifest
is unchanged; review screenshots are not game downloads.

## Validation limits

The sandbox uses Chromium/SwiftShader software rendering. Draw-call/triangle
counts and buffer sizes are meaningful; its frame times are **not physical-device
FPS or hardware GPU timings**. Real iPhone/iPad sustained performance and total
GPU memory still need device testing. The source-texture estimate excludes render
targets, internal PMREM, depth/MSAA, compression and driver allocations.

Stop here for review. **Command / Operations is next**, after approval.



<!-- MATCHED GALLERY -->

## Matched real-engine views

Laptop 1280×720 DPR1; phone 390×844 DPR2; iPad 1024×768 DPR2 (Apple-touch profile). Same seeded match and camera per pair; no concept art or image enhancement.

### laptop / atrium-west-day

Before | After
--- | ---
![Before](before-laptop-balanced-atrium-west-day.png) | ![After](after-laptop-balanced-atrium-west-day.png)

### laptop / atrium-east-day

Before | After
--- | ---
![Before](before-laptop-balanced-atrium-east-day.png) | ![After](after-laptop-balanced-atrium-east-day.png)

### laptop / atrium-west-night

Before | After
--- | ---
![Before](before-laptop-balanced-atrium-west-night.png) | ![After](after-laptop-balanced-atrium-west-night.png)

### laptop / atrium-east-night

Before | After
--- | ---
![Before](before-laptop-balanced-atrium-east-night.png) | ![After](after-laptop-balanced-atrium-east-night.png)

### phone / atrium-west-day

Before | After
--- | ---
![Before](before-phone-balanced-atrium-west-day.png) | ![After](after-phone-balanced-atrium-west-day.png)

### phone / atrium-east-day

Before | After
--- | ---
![Before](before-phone-balanced-atrium-east-day.png) | ![After](after-phone-balanced-atrium-east-day.png)

### phone / atrium-west-night

Before | After
--- | ---
![Before](before-phone-balanced-atrium-west-night.png) | ![After](after-phone-balanced-atrium-west-night.png)

### phone / atrium-east-night

Before | After
--- | ---
![Before](before-phone-balanced-atrium-east-night.png) | ![After](after-phone-balanced-atrium-east-night.png)

### ipad / atrium-west-day

Before | After
--- | ---
![Before](before-ipad-balanced-atrium-west-day.png) | ![After](after-ipad-balanced-atrium-west-day.png)

### ipad / atrium-west-night

Before | After
--- | ---
![Before](before-ipad-balanced-atrium-west-night.png) | ![After](after-ipad-balanced-atrium-west-night.png)

## Every atrium sign — DPR2, approximately 2.5m

The same cameras also show the old wall/doorway where a sign has moved or new artwork did not previously exist.

### balanced / sign-room-name-2.5m

Before | After
--- | ---
![Before](before-retina-balanced-sign-room-name-2.5m.png) | ![After](after-retina-balanced-sign-room-name-2.5m.png)

### balanced / sign-medical-night-2.5m

Before | After
--- | ---
![Before](before-retina-balanced-sign-medical-night-2.5m.png) | ![After](after-retina-balanced-sign-medical-night-2.5m.png)

### balanced / sign-medevac-night-2.5m

Before | After
--- | ---
![Before](before-retina-balanced-sign-medevac-night-2.5m.png) | ![After](after-retina-balanced-sign-medevac-night-2.5m.png)

### balanced / sign-staging-2.5m

Before | After
--- | ---
![Before](before-retina-balanced-sign-staging-2.5m.png) | ![After](after-retina-balanced-sign-staging-2.5m.png)

### balanced / sign-manifest-2.5m

Before | After
--- | ---
![Before](before-retina-balanced-sign-manifest-2.5m.png) | ![After](after-retina-balanced-sign-manifest-2.5m.png)

### balanced / sign-dispatch-2.5m

Before | After
--- | ---
![Before](before-retina-balanced-sign-dispatch-2.5m.png) | ![After](after-retina-balanced-sign-dispatch-2.5m.png)

### high / sign-room-name-2.5m

Before | After
--- | ---
![Before](before-retina-high-sign-room-name-2.5m.png) | ![After](after-retina-high-sign-room-name-2.5m.png)

### high / sign-medical-night-2.5m

Before | After
--- | ---
![Before](before-retina-high-sign-medical-night-2.5m.png) | ![After](after-retina-high-sign-medical-night-2.5m.png)

### high / sign-medevac-night-2.5m

Before | After
--- | ---
![Before](before-retina-high-sign-medevac-night-2.5m.png) | ![After](after-retina-high-sign-medevac-night-2.5m.png)

### high / sign-staging-2.5m

Before | After
--- | ---
![Before](before-retina-high-sign-staging-2.5m.png) | ![After](after-retina-high-sign-staging-2.5m.png)

### high / sign-manifest-2.5m

Before | After
--- | ---
![Before](before-retina-high-sign-manifest-2.5m.png) | ![After](after-retina-high-sign-manifest-2.5m.png)

### high / sign-dispatch-2.5m

Before | After
--- | ---
![Before](before-retina-high-sign-dispatch-2.5m.png) | ![After](after-retina-high-sign-dispatch-2.5m.png)

[All counters, memory estimates and byte sizes](MEASUREMENTS.md) · [Checks](CHECKS.md)
