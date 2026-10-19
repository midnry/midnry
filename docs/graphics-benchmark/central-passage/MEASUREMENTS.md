# Renderer measurements — Central Passage

Baseline: merge commit `5045526` (includes main `e7546ef`). Same fixed seed and camera poses in both runs. All-pass `renderer.info` counts, including refreshed shadows and first-person weapon. Each view records three samples; the table uses their maximum.

**SwiftShader software rendering: no hardware FPS/GPU-ms claim.** Memory is an estimate of unique uploaded managed source textures with mipmaps, excluding render targets, internal PMREM, depth/MSAA and driver allocations. It is not total GPU memory.

## Every matched view

| Device / preset | View | Draw calls before → after | Triangles before → after | Source MiB before → after | Buffer before → after |
| --- | --- | ---: | ---: | ---: | --- |
| laptop / balanced | central-west-day | 348 → 352 | 537,883 → 539,363 | 313.81 → 292.69 | 1280×720 → 1280×720 |
| laptop / balanced | central-east-day | 335 → 338 | 576,384 → 577,796 | 320.47 → 315.17 | 1280×720 → 1280×720 |
| laptop / balanced | central-west-night | 366 → 357 | 538,332 → 539,799 | 320.47 → 315.25 | 1280×720 → 1280×720 |
| laptop / balanced | central-east-night | 354 → 344 | 576,835 → 578,234 | 320.47 → 315.25 | 1280×720 → 1280×720 |
| laptop / balanced | rations-approach | 313 → 313 | 552,887 → 554,191 | 336.36 → 339.03 | 1280×720 → 1280×720 |
| laptop / balanced | cold-storage-junction | 312 → 312 | 390,771 → 392,075 | 336.36 → 339.03 | 1280×720 → 1280×720 |
| laptop / balanced | cold-storage-terminal | 268 → 268 | 335,421 → 336,725 | 351.22 → 353.89 | 1280×720 → 1280×720 |
| laptop / balanced | soldier | 294 → 294 | 520,756 → 522,060 | 351.22 → 353.89 | 1280×720 → 1280×720 |
| laptop / balanced | patrol | 446 → 447 | 772,397 → 773,705 | 356.56 → 361.89 | 1280×720 → 1280×720 |
| phone / balanced | central-west-day | 319 → 323 | 524,951 → 526,431 | 217.58 → 269.96 | 780×1688 → 390×844 |
| phone / balanced | central-east-day | 319 → 323 | 569,162 → 571,894 | 253.60 → 276.63 | 780×1688 → 390×844 |
| phone / balanced | central-west-night | 335 → 332 | 525,396 → 526,935 | 253.60 → 276.63 | 780×1688 → 390×844 |
| phone / balanced | central-east-night | 337 → 328 | 569,611 → 572,330 | 253.60 → 277.04 | 780×1688 → 390×844 |
| ipad / balanced | central-west-day | 348 → 352 | 537,883 → 539,363 | 310.95 → 286.78 | 1154×866 → 1154×866 |
| ipad / balanced | central-west-night | 372 → 357 | 538,404 → 539,799 | 311.36 → 286.78 | 1154×866 → 1154×866 |
| ipad / balanced | patrol | 446 → 447 | 772,397 → 773,705 | 329.78 → 339.67 | 1154×866 → 1154×866 |
| retina / balanced | central-sign-3m | 322 → 327 | 591,757 → 594,557 | 290.80 → 334.69 | 1280×720 → 1280×720 |
| retina / balanced | central-sign-6m | 328 → 333 | 576,093 → 578,893 | 298.69 → 342.58 | 1280×720 → 1280×720 |
| retina / balanced | station-label-3m | 364 → 367 | 495,883 → 497,295 | 317.06 → 356.71 | 1280×720 → 1280×720 |
| retina / balanced | terminal-screen-3m | 363 → 366 | 495,619 → 497,031 | 317.06 → 356.71 | 1280×720 → 1280×720 |
| retina / high | central-sign-3m | 595 → 610 | 926,181 → 934,581 | 290.80 → 296.13 | 1920×1080 → 1920×1080 |
| retina / high | central-sign-6m | 617 → 632 | 910,367 → 918,767 | 298.69 → 304.02 | 1920×1080 → 1920×1080 |
| retina / high | station-label-3m | 713 → 722 | 718,229 → 722,465 | 317.06 → 322.39 | 1920×1080 → 1920×1080 |
| retina / high | terminal-screen-3m | 718 → 727 | 724,095 → 728,331 | 317.06 → 322.39 | 1920×1080 → 1920×1080 |

## Context peaks

| Device / preset | Peak calls before → after | Peak source MiB before → after | Texture objects before → after |
| --- | ---: | ---: | ---: |
| laptop / balanced | 446 → 447 | 356.56 → 361.89 | 118 → 108 |
| phone / balanced | 337 → 332 | 253.60 → 277.04 | 84 → 79 |
| ipad / balanced | 446 → 447 | 329.78 → 339.67 | 112 → 103 |
| retina / balanced | 364 → 367 | 317.06 → 356.71 | 86 → 101 |
| retina / high | 718 → 727 | 317.06 → 322.39 | 104 → 105 |

## Download / allocation changes

- Renderer bundle: **1,081,364 → 1,086,721 bytes** raw; **261,962 → 263,320 bytes gzip-9**.
- Added downloaded models, photographic textures or fonts: **0 bytes**. Cached asset manifest stays **39 files / 32,936,013 bytes**, version `7251c21d3c42afb4`.
- New runtime sign atlas: 2048×512 RGBA with mipmaps, **5.33 MiB** when uploaded. Concrete, normal, roughness and metal maps reuse existing texture handles/instance materials.
- Texture-object counts also include renderer allocations and lazy post-processing targets. Counts vary with visited views; source-memory estimates exclude those targets. Balanced bloom is now off in both day and night.
- Default phone backing buffer: **780×1688 → 390×844** in these DPR2 captures, one quarter the pixels, restoring the original budget. Laptop and iPad default buffers are unchanged from the merged baseline. No measured device FPS claim.
- Observed source-memory peaks include warm-up views and lazy uploads of existing maps; they are not an isolated allocation delta for this room. In particular, phone and Retina/Balanced peaks rose by more than the atlas allocation, as reported in the table. A physical-device memory capture remains necessary.
- Screenshots/docs are review artifacts and are not included in the game asset cache.

## Validation

- `node --test scripts/outpost-*.test.mjs`: **37 test files passed, 0 failed**.
- `npx tsc --noEmit -p .`: passed.
- `NITRO_PRESET=render npm run build:render`: passed; packaged renderer/assets checked against source.
- `npm run build:outpost-military`: passed; regenerated bundle committed.
- Blocked both `benchmark-operator` PNGs: game loaded, 16 stations present, no uncaught errors. See `qa-dev.json`.
- Packaged gameplay and shared-interactable checks: see `corridor-qa-built.json` and `qa-built.json` (controls, traversal, four dyes, both LODs, light/power states, charges, flight equipment).
- New room clearance check: **164 records**, no wall/floor/headroom errors, four unblocked transit/door routes, collision unchanged.
- DPR2 sign checks: every retained subtitle is at least 55% of title size (painted at 60%); compact plates use one line. Game font, maximum anisotropy, mipmaps and power-aware emission verified.
- Site smoke on development and packaged output: desktop and phone visible, no horizontal overflow or uncaught errors; branding/auth checks retained. Verdicts included.
- Navigation, HUD and ground-trail source match `origin/main`; see `protected-files.json`.

## Test harness note

Full-page functional-QA screenshots stalled with CSS animation finishing in the software browser. Functional QA now drains WebGL work and exports the actual WebGL frame immediately after rendering; the 48 primary matched room/HUD screenshots still use Playwright. These changes are test-only. The packaged checks were repeated on the final build.

## Reproduce

The before bundle is exactly the one in merge commit `5045526`; its SHA-256 is recorded in `before.json`. Archive its `public/games/outpost-military.js`, `outpost-academy.js`, and `outpost-zero.html` into `/tmp/outpost-central-baseline/`, then run `node scripts/benchmark-outpost-central.mjs before` and `after` against the local dev build. `OUTPOST_CENTRAL_RESUME=1` resumes completed contexts only when the renderer checksum matches. The sandbox uses its local Chromium proxy/CA preloader; a normal local browser does not need that wrapper.
