# Text clarity: measured costs

Baseline `b344507`; seed `outpost-text-20261019`; deviceScaleFactor 2. Same camera per pair, three refreshed-shadow samples per capture. Base-preset screenshots keep adaptive resolution off to make comparisons repeatable.

No timings below are hardware GPU timings or FPS. Chromium uses SwiftShader software rendering.

## Full-frame draw calls and triangles

| Device / preset / view | Calls before → after | Triangles before → after | Buffer before → after |
|---|---:|---:|---|
| retina / balanced / room-sign | 266 → 266 | 486,523 → 486,523 | 960×540 → 1280×720 |
| retina / balanced / station-label | 377 → 377 | 569,815 → 569,815 | 960×540 → 1280×720 |
| retina / balanced / terminal-screen | 376 → 376 | 569,043 → 569,043 | 960×540 → 1280×720 |
| retina / balanced / medical-label | 244 → 244 | 466,211 → 466,211 | 960×540 → 1280×720 |
| retina / balanced / room-sign-night | 291 → 291 | 487,046 → 487,046 | 960×540 → 1280×720 |
| retina / balanced / terminal-screen-power-out | 376 → 376 | 569,043 → 569,043 | 960×540 → 1280×720 |
| retina / balanced / benchmark-sign | 283 → 283 | 541,724 → 541,724 | 960×540 → 1280×720 |
| retina / balanced / medical-wayfinding | 344 → 344 | 473,561 → 473,561 | 960×540 → 1280×720 |
| retina / high / room-sign | 406 → 406 | 615,105 → 615,105 | 1280×720 → 1920×1080 |
| retina / high / station-label | 747 → 747 | 852,709 → 852,709 | 1280×720 → 1920×1080 |
| retina / high / terminal-screen | 751 → 751 | 853,171 → 853,171 | 1280×720 → 1920×1080 |
| retina / high / medical-label | 372 → 372 | 588,535 → 588,535 | 1280×720 → 1920×1080 |
| retina / high / room-sign-night | 423 → 423 | 616,417 → 616,417 | 1280×720 → 1920×1080 |
| retina / high / terminal-screen-power-out | 751 → 751 | 853,171 → 853,171 | 1280×720 → 1920×1080 |
| retina / high / benchmark-sign | 511 → 511 | 828,375 → 828,375 | 1280×720 → 1920×1080 |
| retina / high / medical-wayfinding | 684 → 684 | 693,051 → 693,051 | 1280×720 → 1920×1080 |
| ipad / balanced / room-sign | 266 → 266 | 486,523 → 486,523 | 960×720 → 1154×866 |
| ipad / balanced / station-label | 377 → 377 | 569,815 → 569,815 | 960×720 → 1154×866 |
| ipad / balanced / terminal-screen | 376 → 376 | 569,043 → 569,043 | 960×720 → 1154×866 |
| ipad / high / room-sign | 340 → 340 | 550,362 → 550,362 | 1024×768 → 1154×866 |
| ipad / high / station-label | 566 → 566 | 711,694 → 711,694 | 1024×768 → 1154×866 |
| ipad / high / terminal-screen | 570 → 570 | 711,204 → 711,204 | 1024×768 → 1154×866 |
| phone / balanced / room-sign | 262 → 262 | 483,119 → 483,119 | 390×844 → 780×1688 |
| phone / balanced / station-label | 354 → 354 | 562,379 → 562,379 | 390×844 → 780×1688 |
| phone / balanced / terminal-screen | 353 → 353 | 561,607 → 561,607 | 390×844 → 780×1688 |
| phone / high / room-sign | 389 → 389 | 605,161 → 605,161 | 390×844 → 780×1688 |
| phone / high / station-label | 667 → 667 | 825,781 → 825,781 | 390×844 → 780×1688 |
| phone / high / terminal-screen | 669 → 669 | 825,015 → 825,015 | 390×844 → 780×1688 |

Primary room signs, station labels and screens retain their geometry and draw structure. Counts include shadow, mirror, bloom and SSAO passes where enabled. No new static geometry, scene light, mirror or post-processing pass is added by this work.

Every matched view has the same draw-call count as its approved baseline.

## Pixel work and adaptive headroom

These runs feed the real controller **synthetic** 2ms CPU/GPU work for 4,000 samples, then 12ms GPU work for 180 samples. They verify control and actual render-target resizing, not device speed. Draw calls and triangles are measured from the resulting real frames.

| Device / preset | Base buffer | Earned ceiling | After pressure | Calls base / earned / pressure | Potential colour-target MiB base → earned |
|---|---|---|---|---:|---:|
| retina / balanced | 1280×720 | 1920×1080 | 1408×792 | 344 / 344 / 344 | 43.6 → 95.6 |
| retina / high | 1920×1080 | 2065×1161 | 2065×1161 | 684 / 684 / 684 | 101.6 → 116.2 |
| ipad / balanced | 1154×866 | 1460×1095 | 1270×952 | 376 / 376 / 376 | 24.2 → 37.6 |
| ipad / high | 1154×866 | 1460×1095 | 1270×952 | 570 / 570 / 570 | 30.2 → 43.6 |
| phone / balanced | 780×1688 | 780×1688 | 780×1688 | 353 / 353 / 353 | 61.4 → 61.4 |
| phone / high | 780×1688 | 780×1688 | 780×1688 | 669 / 669 / 669 | 67.4 → 67.4 |

At a physical-display or pixel cap, a few downward scale steps can leave the buffer at that cap; continued pressure lowers it further. The longer unit stress tests verify reduction below the base and the 0.5 floor. Turning adaptation off restores the base cap.

Potential raw colour-target storage sums the composer, bloom, SSAO and reflector descriptors that exist. GPU allocation is lazy: an unused pass may never upload its targets, while a previously used pass may retain them. These estimates exclude depth/stencil, MSAA attachments, PMREM, the default framebuffer and driver overhead; they are not actual residency or total VRAM.

| Device / preset | Base raster pixels versus previous base | Earned pixels versus previous base |
|---|---:|---:|
| retina / balanced | 1.78× | 4.00× |
| retina / high | 2.25× | 2.60× |
| ipad / balanced | 1.45× | 2.31× |
| ipad / high | 1.27× | 2.03× |
| phone / balanced | 4.00× | 4.00× |
| phone / high | 4.00× | 4.00× |

More pixels mean more raster, lighting, antialiasing and post-processing work, and maximum anisotropy can add texture-fetch bandwidth. These ratios do not imply a matching whole-frame GPU-time ratio. Hardware timer-query measurements and sustained frame pacing must be collected on real devices before claiming a performance result.

## Source-texture memory

Unique uploaded managed source handles are deduplicated and mipmaps included. This is an RGBA-based estimate, not a total VRAM measurement. Residency depends on warm-up and previous visibility. The larger sign canvases cause a real memory increase.

| Device / preset | Sampled source-texture peak MiB before → after | Increase MiB |
|---|---:|---:|
| retina / balanced | 182.9 → 343.0 | 160.2 |
| retina / high | 183.5 → 356.3 | 172.7 |
| ipad / balanced | 183.4 → 342.6 | 159.2 |
| ipad / high | 187.8 → 347.1 | 159.3 |
| phone / balanced | 159.3 → 314.7 | 155.4 |
| phone / high | 165.8 → 314.7 | 148.9 |

Two times linear resolution costs about four times the texel storage at equal aspect. Individual labels use 1536px sources, rather than 2K per sign, to contain that cost. The higher-resolution atlases remain shared across every copy. Physical iPad/iPhone memory and thermal testing is still required; reduced draw calls do not remove this memory cost.

## Download and bundle accounting

No new third-party model, photograph or font file. The graphical cache inventory stays 39 assets / 32,936,013 bytes. Existing Barlow Condensed files can be requested earlier because font readiness is now explicit.

| Public file | Raw bytes before → after | Gzip level 9 bytes before → after |
|---|---:|---:|
| outpost-military.js | 1,077,866 → 1,081,350 | 260,524 → 261,952 |
| outpost-academy.js | 25,687 → 26,754 | 8,738 → 9,092 |
| outpost-zero.html | 163,178 → 163,427 | 33,238 → 33,338 |
| outpost-asset-cache.js | 5,066 → 5,178 | 1,959 → 2,027 |

Captured renderer SHA-256: `c558bccb46725d133dc9372dcb538734bb6333605e2ce893e8b5417db18168dd`. It matches the final built source bundle.

[Before data](before.json) · [After data](after.json) · [Visual review](README.md)
