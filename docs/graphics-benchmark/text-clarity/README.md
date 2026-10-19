# World-text clarity and Retina rendering

Review branch: `codex/graphics-benchmark`. Baseline: approved `b344507`.
This pass addresses shared world text and rendering resolution. Power Passage
and further room-specific art remain pending review. No merge or deployment.

- [Draw calls, triangles, memory and resolution costs](MEASUREMENTS.md)
- [Before captures/data](before.json) · [After captures/data](after.json)

## Underlying fixes

The old `protocolSign()` painted 768×224 canvases before ensuring its fonts were
available. Its 22px monospaced secondary line was small, and the same artwork
aspect was stretched across different panels. Balanced also capped the actual
3D image at 960 pixels wide, including a 2560×1440 Retina display.

`scripts/outpost-military/world-text.js` now handles shared world typography:

- Await the existing 600/700 Barlow Condensed faces and `document.fonts.ready`
  before building the first world. Waiting is bounded to three seconds. Missing
  fonts use an installed Arial fallback and do not prevent loading the game.
- Paint individual signs at **1536px wide**, twice their previous linear
  resolution. Height follows each actual mesh's width/height ratio, including
  station panels, compact medical labels, the radio-cabinet plate and the clinic.
  A 2× source already exceeds the panel coverage in the tested close-ups and
  avoids allocating a separate 2K bitmap for every label in the base.
- Fit text by changing its font size rather than stretching its glyphs. Secondary
  type is 40% of the fitted title size; omit it on compact plates or when it
  cannot fit. No tiny fake microtext is added.
- Explicit sRGB colour, trilinear mipmaps and maximum supported anisotropy on
  the artwork. The tested renderer supports 16×; the actual device's limit wins.

The corridor atlas grows 1024×512 → 2048×1024, depot wayfinding 1024×256 →
2048×512, and shared equipment artwork 1024² → 2048². They use the same loaded
display font. Station screens have fewer, larger lines and compensate their
square atlas cell for the existing 0.79×0.52m screen. Geometry, UV region identity,
station positions, interaction ranges, collision and stock/state rules remain.
Atlas text is painted in each panel's virtual aspect ratio before packing its
row. This also corrects the old 16:1 atlas row being stretched onto 2.5×0.29m
corridor panels; raising texture resolution alone would preserve that defect.

## Dark-room response and glare

Signs have a restrained texture-driven emissive response of 0.22. Printed
equipment lettering uses 0.10, masked out of the atlas's plain fabric/metal/rubber
substrates. Power loss reduces these to 16% of their normal intensity.

Station screens retain their existing active/completed/power-out emissive
intensities (0.9 / 0.4 / 0.015), task tint and power behaviour. A supported
`MeshPhysicalMaterial` anti-glare response, roughness 0.6 and specular intensity
0.04, prevents the close-range flashlight from reflecting as a white patch over
the lettering. No extra clearcoat, transmission, light or render pass is added.
The neutral grade and approved bloom settings are unchanged.

## Resolution and adaptive headroom

The 3D buffer is now independent of the HUD canvas. HUD scale, aim projection,
control positions and menu structure retain their existing behaviour. Only the
graphics settings' resolution explanation reflects the new policy.

| Preset | Base 3D width | Maximum earned scale |
|---|---:|---:|
| Performance | 720 | 1.0× |
| Balanced | 1280 | 1.5× |
| High | 1920 | 1.5× |

Physical display size (DPR limited to 2), maximum texture dimensions and GPU
pixel limits still cap those values. Desktop remains capped at 2.4 million
pixels. Apple touch starts with its existing one-million-pixel budget and may
earn up to 1.6 million; recovery mode retains its 600,000-pixel limit.

The controller can now rise above 1.0 as well as fall below it. It adds 0.08
after 480 uninterrupted active-gameplay samples below 3.2ms, with no recent slow
frames. Menus and isolated spikes reset that upward hold.
Growing above the base also requires a valid GPU timing or measured cadence
of at least 110Hz; cheap CPU submission alone on a slower display is insufficient.
Existing overload thresholds and the 0.5 floor remain. Turning adaptation off
uses the chosen preset's base size. Saved preset names and boolean preferences
continue to load; no settings rename/migration is required.

The headroom data uses explicitly **synthetic** 2ms CPU/GPU inputs, followed by
12ms GPU pressure, to verify both directions of the real controller and buffer
resize path. It does not claim this software renderer has that hardware speed.

## Matched engine close-ups

All captures use deviceScaleFactor **2**, the same fixed seed and camera per
pair, and 2.5m horizontal range (approximately 2.5–2.9m camera-to-panel range).
Images are native screenshot crops of the actual game canvas. They are not
enlarged source artwork or generated mock-ups. The original HUD remains present
outside the cropped region. Open a pair at full size to judge glyph edges.

### Retina, 1280×720 CSS / 2560×1440 display

| View | Before | After |
|---|---|---|
| Balanced room sign | ![Before](images/before-retina-balanced-room-sign.png) | ![After](images/after-retina-balanced-room-sign.png) |
| Balanced station label | ![Before](images/before-retina-balanced-station-label.png) | ![After](images/after-retina-balanced-station-label.png) |
| Balanced terminal | ![Before](images/before-retina-balanced-terminal-screen.png) | ![After](images/after-retina-balanced-terminal-screen.png) |
| High room sign | ![Before](images/before-retina-high-room-sign.png) | ![After](images/after-retina-high-room-sign.png) |
| High station label | ![Before](images/before-retina-high-station-label.png) | ![After](images/after-retina-high-station-label.png) |
| High terminal | ![Before](images/before-retina-high-terminal-screen.png) | ![After](images/after-retina-high-terminal-screen.png) |
| Balanced night sign | ![Before](images/before-retina-balanced-room-sign-night.png) | ![After](images/after-retina-balanced-room-sign-night.png) |
| Balanced power-out terminal / flashlight | ![Before](images/before-retina-balanced-terminal-screen-power-out.png) | ![After](images/after-retina-balanced-terminal-screen-power-out.png) |
| Balanced medical label | ![Before](images/before-retina-balanced-medical-label.png) | ![After](images/after-retina-balanced-medical-label.png) |
| Balanced corridor atlas | ![Before](images/before-retina-balanced-benchmark-sign.png) | ![After](images/after-retina-balanced-benchmark-sign.png) |
| Balanced depot atlas | ![Before](images/before-retina-balanced-medical-wayfinding.png) | ![After](images/after-retina-balanced-medical-wayfinding.png) |

### iPad profile, 1024×768 CSS / 2048×1536 display

| View | Before | After |
|---|---|---|
| Balanced room sign | ![Before](images/before-ipad-balanced-room-sign.png) | ![After](images/after-ipad-balanced-room-sign.png) |
| Balanced station label | ![Before](images/before-ipad-balanced-station-label.png) | ![After](images/after-ipad-balanced-station-label.png) |
| Balanced terminal | ![Before](images/before-ipad-balanced-terminal-screen.png) | ![After](images/after-ipad-balanced-terminal-screen.png) |
| High room sign | ![Before](images/before-ipad-high-room-sign.png) | ![After](images/after-ipad-high-room-sign.png) |
| High station label | ![Before](images/before-ipad-high-station-label.png) | ![After](images/after-ipad-high-station-label.png) |
| High terminal | ![Before](images/before-ipad-high-terminal-screen.png) | ![After](images/after-ipad-high-terminal-screen.png) |

### Phone, 390×844 CSS / 780×1688 display

| View | Before | After |
|---|---|---|
| Balanced room sign | ![Before](images/before-phone-balanced-room-sign.png) | ![After](images/after-phone-balanced-room-sign.png) |
| Balanced station label | ![Before](images/before-phone-balanced-station-label.png) | ![After](images/after-phone-balanced-station-label.png) |
| Balanced terminal | ![Before](images/before-phone-balanced-terminal-screen.png) | ![After](images/after-phone-balanced-terminal-screen.png) |
| High room sign | ![Before](images/before-phone-high-room-sign.png) | ![After](images/after-phone-high-room-sign.png) |
| High station label | ![Before](images/before-phone-high-station-label.png) | ![After](images/after-phone-high-station-label.png) |
| High terminal | ![Before](images/before-phone-high-terminal-screen.png) | ![After](images/after-phone-high-terminal-screen.png) |

The data files also retain the additional High night, medical, atlas and
power-out close-ups using the same filename scheme.

## Validation and changed files

Required checks passed: `node --test scripts/outpost-*.test.mjs` (37 test files),
`npx tsc --noEmit -p .`, `npm run build:outpost-military`,
`NITRO_PRESET=render npm run build:render`, and
`node scripts/check-outpost-loading.mjs`. The final Render release preflight
matched all 126 required files, 13 operator build sources and 18 photographic
textures. The existing cache inventory remains 39 assets / 32,936,013 bytes.

Packaged browser checks passed for desktop, touch, blocked operator response maps
and **both blocked display-font files**. All 48 generated sign materials pass
the aspect/secondary-size/filtering checks; all 188 room fitting bounds, two
walking routes and tile-removal/rebuild behaviour still pass. Station power and
completion states, charge defuse/redaction, medical stock, aircraft departure,
both operator LODs, four player dyes and movement controls remain verified.
The source and packaged site smoke tests show no console/page errors, horizontal
overflow or baseline divergence on desktop/mobile.

Evidence: [packaged gameplay](corridor-qa-built.json),
[packaged interactable/text checks](qa-built.json),
[development font-failure check](qa-dev.json), [site development](site-dev.json),
[site packaged](site-built.json). Synthetic controller tests cover upward
headroom, GPU-driven reduction, recovery limits and unsupported-timer cadence.

| File | Change |
|---|---|
| `scripts/outpost-military/world-text.js` | Bounded font readiness, fitted artwork, mipmaps/anisotropy and restrained text emission |
| `scripts/outpost-military/renderer.js` | Shared sign factory, correct panel aspects, electrical text response and independent 3D sizing |
| `scripts/outpost-military/interactables.js` | Larger atlas type, correct screen glyph proportions, anti-glare screen response and medical labels |
| `scripts/outpost-military/benchmark-corridor.js`, `room-medical-depot.js` | Higher-resolution shared atlas typography |
| `scripts/outpost-military/compatibility.js` | Physical-display-aware 3D dimensions and earned Apple pixel budget |
| `public/games/outpost-academy.js`, `outpost-zero.html` | Preset render caps and two-direction adaptive headroom; preserve HUD projection |
| `scripts/outpost-performance.test.mjs`, `outpost-compatibility.test.mjs` | Meaningful controller and Retina/recovery-limit regressions |
| `scripts/benchmark-outpost-text.mjs`, `qa-outpost-world-text.mjs`, `check-outpost-interactables.mjs` | Matched DPR-2 captures, texture/target accounting and optional-font browser tests |
| `public/games/outpost-military.js` | Rebuilt renderer bundle |
| `src/routes/games/outpost-zero.tsx` | Cache token `graphics-text-clarity-20261019` |
| `public/games/military/ATTRIBUTION.md`, `outpost-asset-cache.js` | Updated artwork provenance and existing font licence credit |

There is no new standalone public JavaScript module; the typography helper is
bundled. Both changed public modules already have no-cache rules. No new texture
or model file needs adding to the cache manifest.

## Provenance and review boundary

No new third-party asset or font file is added. World text is original
authored canvas artwork, not scanned/production assets. Barlow Condensed reuses
the bundled Barlow Project font files under **SIL Open Font License 1.1**, with
the exact licence in `public/games/fonts/OFL.txt`; source:
https://github.com/jpt/barlow . Credits are recorded in
`public/games/military/ATTRIBUTION.md` and the in-game asset credits. Existing
Poly Haven, Mixamo and aircraft licences remain unchanged.

Browser tests use Chromium with SwiftShader; iPad/phone profiles exercise DPR,
touch and the Apple budget, not actual Safari or a mobile GPU. Source-texture
and colour-target byte estimates are not total VRAM. Hardware GPU time, thermal
behaviour and sustained 120Hz operation require physical-device testing. Added
pixels and larger textures have a real cost even when draw calls do not change.

Stop for text/resolution review before Power Passage or other new room art.
