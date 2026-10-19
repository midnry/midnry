# Renderer measurements — Command / Operations

Baseline: `b660e09`, including main’s corridor-mount and Last Signal touch-control changes. Same fixed seed, cameras and day/night state. Three samples of all-pass `renderer.info` per view; maximum shown. Includes shadow refreshes and weapon passes.

**SwiftShader software rendering; no hardware FPS or GPU-ms claim.** Memory is an estimate of unique uploaded managed source textures (RGBA plus mipmaps). Render targets, internal PMREM, depth/MSAA, compression and driver allocations are excluded; this is not total VRAM.

| Device / preset | View | Calls before → after | Triangles before → after | Source MiB before → after | Buffer before → after |
| --- | --- | ---: | ---: | ---: | --- |
| laptop / balanced | command-west-day | 447 → 415 | 775,065 → 586,477 | 333.90 → 320.82 | 1280×720 → 1280×720 |
| laptop / balanced | command-south-day | 292 → 265 | 613,979 → 429,909 | 333.90 → 328.71 | 1280×720 → 1280×720 |
| laptop / balanced | command-west-night | 461 → 429 | 775,579 → 586,991 | 344.98 → 339.79 | 1280×720 → 1280×720 |
| laptop / balanced | command-south-night | 292 → 265 | 613,979 → 429,909 | 344.98 → 339.79 | 1280×720 → 1280×720 |
| laptop / balanced | rations-approach | 313 → 295 | 555,551 → 461,147 | 352.87 → 351.19 | 1280×720 → 1280×720 |
| laptop / balanced | cold-storage-junction | 313 → 299 | 393,441 → 328,086 | 366.10 → 366.10 | 1280×720 → 1280×720 |
| laptop / balanced | cold-storage-terminal | 268 → 264 | 338,085 → 312,436 | 366.10 → 366.10 | 1280×720 → 1280×720 |
| laptop / balanced | soldier | 294 → 276 | 523,420 → 429,016 | 366.10 → 366.10 | 1280×720 → 1280×720 |
| laptop / balanced | patrol | 447 → 415 | 775,065 → 586,477 | 366.10 → 366.10 | 1280×720 → 1280×720 |
| phone / balanced | command-west-day | 402 → 376 | 730,258 → 574,945 | 287.95 → 321.60 | 390×844 → 390×844 |
| phone / balanced | command-south-day | 284 → 264 | 568,404 → 420,069 | 299.34 → 321.60 | 390×844 → 390×844 |
| phone / balanced | command-west-night | 411 → 385 | 730,762 → 575,449 | 299.34 → 321.60 | 390×844 → 390×844 |
| phone / balanced | command-south-night | 284 → 264 | 568,404 → 420,069 | 299.34 → 321.60 | 390×844 → 390×844 |
| ipad / balanced | command-west-day | 447 → 415 | 775,065 → 586,477 | 328.82 → 330.58 | 1154×866 → 1154×866 |
| ipad / balanced | command-west-night | 461 → 429 | 775,579 → 586,991 | 339.90 → 341.67 | 1154×866 → 1154×866 |
| ipad / balanced | patrol | 447 → 415 | 775,065 → 586,477 | 339.90 → 341.67 | 1154×866 → 1154×866 |
| retina / balanced | sign-command-room-2.5m | 254 → 243 | 473,085 → 386,319 | 317.91 → 259.48 | 1280×720 → 1280×720 |
| retina / balanced | intel-upload-label-2.5m | 241 → 230 | 468,491 → 381,639 | 322.34 → 263.91 | 1280×720 → 1280×720 |
| retina / balanced | intel-upload-screen-2.5m | 240 → 229 | 468,427 → 381,575 | 322.34 → 263.91 | 1280×720 → 1280×720 |
| retina / balanced | sensor-reset-label-2.5m | 379 → 362 | 594,220 → 499,832 | 344.83 → 335.38 | 1280×720 → 1280×720 |
| retina / balanced | sensor-reset-screen-2.5m | 378 → 361 | 594,124 → 499,736 | 344.83 → 335.38 | 1280×720 → 1280×720 |
| retina / balanced | surgical-command-label-2.5m | 239 → 228 | 465,079 → 378,227 | 344.83 → 335.38 | 1280×720 → 1280×720 |
| retina / balanced | cabinet-sensors-label-2.5m | 391 → 375 | 607,767 → 513,979 | 344.83 → 338.05 | 1280×720 → 1280×720 |
| retina / balanced | emergency-label-2.5m | 284 → 265 | 568,048 → 419,857 | 348.33 → 341.56 | 1280×720 → 1280×720 |
| retina / balanced | sign-coordination-board | 270 → 249 | 542,754 → 394,449 | 348.33 → 341.56 | 1280×720 → 1280×720 |
| retina / balanced | sign-archive | 292 → 266 | 608,071 → 424,145 | 348.33 → 341.56 | 1280×720 → 1280×720 |
| retina / balanced | sign-atrium-dispatch | 325 → 309 | 517,753 → 423,819 | 359.00 → 349.56 | 1280×720 → 1280×720 |
| retina / balanced | sign-atrium-manifest-4m | 328 → 309 | 508,871 → 414,273 | 359.00 → 349.56 | 1280×720 → 1280×720 |
| retina / high | sign-command-room-2.5m | 371 → 376 | 596,739 → 529,891 | 285.55 → 235.31 | 1920×1080 → 1920×1080 |
| retina / high | intel-upload-label-2.5m | 358 → 363 | 586,959 → 519,831 | 285.55 → 235.31 | 1920×1080 → 1920×1080 |
| retina / high | intel-upload-screen-2.5m | 359 → 364 | 589,217 → 522,089 | 285.55 → 235.31 | 1920×1080 → 1920×1080 |
| retina / high | sensor-reset-label-2.5m | 753 → 740 | 922,592 → 832,856 | 347.00 → 313.23 | 1920×1080 → 1920×1080 |
| retina / high | sensor-reset-screen-2.5m | 755 → 742 | 924,446 → 834,710 | 347.00 → 313.23 | 1920×1080 → 1920×1080 |
| retina / high | surgical-command-label-2.5m | 361 → 367 | 585,875 → 518,867 | 347.00 → 313.23 | 1920×1080 → 1920×1080 |
| retina / high | cabinet-sensors-label-2.5m | 792 → 783 | 958,601 → 870,713 | 349.67 → 313.23 | 1920×1080 → 1920×1080 |
| retina / high | emergency-label-2.5m | 475 → 456 | 849,752 → 598,607 | 352.33 → 313.23 | 1920×1080 → 1920×1080 |
| retina / high | sign-coordination-board | 436 → 414 | 802,981 → 556,237 | 352.33 → 313.23 | 1920×1080 → 1920×1080 |
| retina / high | sign-archive | 506 → 466 | 982,543 → 624,193 | 352.33 → 313.23 | 1920×1080 → 1920×1080 |
| retina / high | sign-atrium-dispatch | 599 → 589 | 730,293 → 641,919 | 357.67 → 313.23 | 1920×1080 → 1920×1080 |
| retina / high | sign-atrium-manifest-4m | 601 → 582 | 687,541 → 597,175 | 357.67 → 313.23 | 1920×1080 → 1920×1080 |

## Context peaks

| Device / preset | Peak calls before → after | Peak source MiB before → after | Texture objects before → after |
| --- | ---: | ---: | ---: |
| laptop / balanced | 461 → 429 | 366.10 → 366.10 | 106 → 102 |
| phone / balanced | 411 → 385 | 299.34 → 321.60 | 87 → 93 |
| ipad / balanced | 461 → 429 | 339.90 → 341.67 | 100 → 97 |
| retina / balanced | 391 → 375 | 359.00 → 349.56 | 106 → 97 |
| retina / high | 792 → 783 | 357.67 → 313.23 | 119 → 106 |

## Downloads and allocations

- Renderer: **1,093,004 → 1,101,410 raw bytes**; **264,557 → 266,472 gzip-9 bytes**.
- Final renderer SHA-256: `d9d1cc2f8b665c329d4f0d246659b2e3a1765437407bb77bd37f6bc30d61a5d9`. The packaged renderer has the same checksum.
- New downloaded textures/models/fonts: **0 bytes**. Asset cache unchanged: 39 files / 32,936,013 bytes, version `7251c21d3c42afb4`.
- New command atlas: 2048×512 with mipmaps (**5.33 MiB**). Atrium atlas shrinks 2048×512 → 2048×256 (**−2.67 MiB**). Isolated canvas-texture delta: **+2.67 MiB** when both are uploaded. No new photographs; existing substrates share handles.
- Per-context peaks include lazy uploads/warm-up of existing maps, so observed deltas are not an isolated room-allocation measurement. Source estimates and texture counts vary with the visited views.
- Phone default buffer stays **390×844** at DPR2. Laptop and iPad caps are unchanged. Higher adaptive resolution still has to be earned. No performance claim from software frame timings.
- Screenshots are review artifacts outside the runtime cache.

## Clearance and verification

See `qa-built.json`, `qa-dev.json`, `corridor-qa-built.json` and `CHECKS.md`. All Command signs, screens, cabinet labels and embedded medical/emergency plates are checked against transformed architecture triangles, with a minimum conservative gap of 20mm. Primary sign/equipment close-ups use matched cameras approximately 2.5m from their face at DPR2 on Balanced and High. The removed manifest plate is shown from 4m. The five remaining atrium signs are also rechecked.
