# Renderer measurements — Covered Supply Atrium

Baseline: `ac48b11`, including the exact requested corridor-mount fix. Same fixed seed, cameras and day/night state. Three samples of all-pass `renderer.info` per view; maximum shown. Includes shadow refreshes and weapon passes.

**SwiftShader software rendering; no hardware FPS or GPU-ms claim.** Memory is an estimate of unique uploaded managed source textures (RGBA plus mipmaps). Render targets, internal PMREM, depth/MSAA, compression and driver allocations are excluded; this is not total VRAM.

| Device / preset | View | Calls before → after | Triangles before → after | Source MiB before → after | Buffer before → after |
| --- | --- | ---: | ---: | ---: | --- |
| laptop / balanced | atrium-west-day | 340 → 340 | 524,797 → 526,257 | 317.85 → 286.40 | 1280×720 → 1280×720 |
| laptop / balanced | atrium-east-day | 340 → 341 | 580,137 → 581,599 | 324.52 → 327.22 | 1280×720 → 1280×720 |
| laptop / balanced | atrium-west-night | 353 → 353 | 525,309 → 526,769 | 325.27 → 332.97 | 1280×720 → 1280×720 |
| laptop / balanced | atrium-east-night | 346 → 347 | 580,575 → 582,037 | 325.60 → 338.30 | 1280×720 → 1280×720 |
| laptop / balanced | rations-approach | 313 → 313 | 554,191 → 555,551 | 341.49 → 338.30 | 1280×720 → 1280×720 |
| laptop / balanced | cold-storage-junction | 312 → 313 | 392,075 → 393,441 | 345.00 → 360.22 | 1280×720 → 1280×720 |
| laptop / balanced | cold-storage-terminal | 268 → 268 | 336,725 → 338,085 | 352.89 → 360.22 | 1280×720 → 1280×720 |
| laptop / balanced | soldier | 294 → 294 | 522,060 → 523,420 | 352.89 → 360.22 | 1280×720 → 1280×720 |
| laptop / balanced | patrol | 447 → 447 | 773,705 → 775,065 | 362.22 → 377.56 | 1280×720 → 1280×720 |
| phone / balanced | atrium-west-day | 315 → 315 | 515,497 → 516,957 | 233.19 → 277.97 | 390×844 → 390×844 |
| phone / balanced | atrium-east-day | 313 → 315 | 560,347 → 561,811 | 266.16 → 310.94 | 390×844 → 390×844 |
| phone / balanced | atrium-west-night | 325 → 319 | 516,003 → 517,391 | 266.49 → 310.94 | 390×844 → 390×844 |
| phone / balanced | atrium-east-night | 317 → 319 | 560,781 → 562,245 | 266.83 → 310.94 | 390×844 → 390×844 |
| ipad / balanced | atrium-west-day | 340 → 340 | 524,797 → 526,257 | 298.50 → 319.23 | 1154×866 → 1154×866 |
| ipad / balanced | atrium-west-night | 353 → 353 | 525,309 → 526,769 | 299.25 → 324.98 | 1154×866 → 1154×866 |
| ipad / balanced | patrol | 447 → 447 | 773,705 → 775,065 | 335.14 → 350.32 | 1154×866 → 1154×866 |
| retina / balanced | sign-room-name-2.5m | 332 → 334 | 533,515 → 534,979 | 334.92 → 267.93 | 1280×720 → 1280×720 |
| retina / balanced | sign-medical-night-2.5m | 313 → 316 | 512,473 → 514,033 | 353.56 → 289.16 | 1280×720 → 1280×720 |
| retina / balanced | sign-medevac-night-2.5m | 327 → 328 | 507,397 → 508,859 | 354.22 → 330.98 | 1280×720 → 1280×720 |
| retina / balanced | sign-staging-2.5m | 325 → 327 | 529,145 → 530,703 | 354.56 → 369.89 | 1280×720 → 1280×720 |
| retina / balanced | sign-manifest-2.5m | 327 → 328 | 507,397 → 508,859 | 354.56 → 369.89 | 1280×720 → 1280×720 |
| retina / balanced | sign-dispatch-2.5m | 325 → 325 | 516,293 → 517,753 | 354.56 → 369.89 | 1280×720 → 1280×720 |
| retina / high | sign-room-name-2.5m | 595 → 600 | 741,491 → 745,881 | 284.90 → 325.93 | 1920×1080 → 1920×1080 |
| retina / high | sign-medical-night-2.5m | 553 → 561 | 695,021 → 699,699 | 291.95 → 337.41 | 1920×1080 → 1920×1080 |
| retina / high | sign-medevac-night-2.5m | 590 → 593 | 682,103 → 686,489 | 306.55 → 353.56 | 1920×1080 → 1920×1080 |
| retina / high | sign-staging-2.5m | 592 → 598 | 730,371 → 735,045 | 330.56 → 353.89 | 1920×1080 → 1920×1080 |
| retina / high | sign-manifest-2.5m | 594 → 597 | 682,111 → 686,497 | 330.56 → 353.89 | 1920×1080 → 1920×1080 |
| retina / high | sign-dispatch-2.5m | 598 → 599 | 725,911 → 730,293 | 330.56 → 353.89 | 1920×1080 → 1920×1080 |

## Context peaks

| Device / preset | Peak calls before → after | Peak source MiB before → after | Texture objects before → after |
| --- | ---: | ---: | ---: |
| laptop / balanced | 447 → 447 | 362.22 → 377.56 | 109 → 110 |
| phone / balanced | 325 → 319 | 266.83 → 310.94 | 73 → 82 |
| ipad / balanced | 447 → 447 | 335.14 → 350.32 | 99 → 102 |
| retina / balanced | 332 → 334 | 354.56 → 369.89 | 106 → 104 |
| retina / high | 598 → 600 | 330.56 → 353.89 | 106 → 110 |

## Downloads and allocations

- Renderer: **1,086,957 → 1,093,004 raw bytes**; **263,426 → 264,557 gzip-9 bytes**.
- Final renderer SHA-256: `464a9ff19c1f474a75df6722a94a8cb5b025c82eb72d72b3e197c5984e7510db`. The packaged renderer has the same checksum.
- New downloaded textures/models/fonts: **0 bytes**. Asset cache unchanged: 39 files / 32,936,013 bytes, version `7251c21d3c42afb4`.
- New runtime logistics atlas: 2048×512 with mipmaps (**5.33 MiB**). Two night signs increase 512×128 → 2048×512 (**+10.00 MiB** combined). Total isolated canvas-texture delta when all are uploaded: **15.33 MiB**. Existing photographic substrates share handles.
- Per-context peaks include lazy uploads/warm-up of existing maps, so observed deltas are not an isolated room-allocation measurement. Source estimates and texture counts vary with the visited views.
- Phone default buffer stays **390×844** at DPR2. Laptop and iPad caps are unchanged. Higher adaptive resolution still has to be earned. No performance claim from software frame timings.
- Screenshots are review artifacts outside the runtime cache.

## Clearance and verification

See `qa-built.json`, `qa-dev.json`, `corridor-qa-built.json` and `CHECKS.md`. All six atrium letter rectangles are checked against transformed architecture triangles and must have a conservative minimum gap of at least 20mm. All close-ups use matched cameras approximately 2.5m from their face, at DPR2 on Balanced and High. The two night-sign cameras are 2.475m from the new faces (2.5m from their nominal mount plane).
