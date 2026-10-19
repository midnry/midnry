# Medical depot: measurements

Baseline: approved commit `e2b0f99`. Viewport 1280×800; Balanced drawing buffer 960×600. Fixed seed `outpost-corridor-20261019`, frozen actors, three samples per view with refreshed shadows. Counts include every render pass.

| View | Draw calls before → after | Triangles before → after | Managed source-texture MiB before → after |
|---|---:|---:|---:|
| night-street-lamp | 238 → 250 | 407,577 → 374,232 | 163.6 → 159.4 |
| night-ceiling-lights | 238 → 243 | 433,368 → 398,459 | 168.0 → 159.4 |
| communications-label | 189 → 189 | 274,535 → 274,559 | 174.7 → 165.3 |
| armed-charge | 345 → 341 | 557,239 → 522,049 | 182.5 → 171.4 |
| depot-station | 379 → 379 | 605,019 → 571,333 | 196.9 → 183.7 |
| depot-east | 350 → 343 | 537,999 → 465,063 | 197.8 → 183.7 |
| depot-entry | 274 → 269 | 554,479 → 483,019 | 197.8 → 183.7 |
| depot-night | 372 → 366 | 538,305 → 465,522 | 198.8 → 184.7 |

## Bloom cost and limits

The actual `UnrealBloomPass.render` call is instrumented independently of the whole-scene count. It issues **13 draw calls** when enabled. Balanced enables it only on the Night shift; Performance remains off and High retains its existing settings. Strength 0.12, threshold 1.35, radius 0.35; the neutral grade is unchanged.

The existing bloom pass uses 11 colour render targets. At this Balanced buffer size their estimated raw RGBA half-float colour storage is **4,221,600 bytes (4.03 MiB)**, excluding driver/framebuffer overhead. Targets can remain resident once warmed; disabling bloom saves rendering work, not necessarily immediate residency. All comparison views also probe the opposite bloom state, so texture-object counts include this warmed allocation.

The street-lamp view rises from 238 to 250 calls and the ceiling-light view from 238 to 243; those are net scene costs, separate from the 13-call bloom pass. Medical-depot views are strictly capped at their own approved baselines, including night. Shared opaque night geometry was batched to recover draw calls. There is no claim that all camera positions across the base have identical costs.

## Texture and download accounting

Managed source-texture estimates deduplicate uploaded texture handles and include mipmaps. They exclude render targets, internal PMREM/MSAA and driver memory, and are not total VRAM measurements. Initial menu warm-up and visibility can change residency. In this sequence, the sample peak changes from 198.8 to 184.7 MiB; do not interpret the difference as a guaranteed per-device memory saving. Bloom colour targets are reported separately above.

The new runtime medical wayfinding atlas is 1024×256 RGBA, approximately 1.33 MiB including mipmaps. The communications nameplate replaces a 768×224 map with 512×48, reducing its source allocation by approximately 0.75 MiB. Existing photographed PBR maps are reused. Renderer bundle changes by +8,365 bytes raw, approximately +2,125 bytes with default gzip. The cached download inventory remains 39 assets / 32,936,013 bytes, with no new third-party model or texture download.

All captures use Chromium SwiftShader software rendering. No timings are quoted as hardware FPS. Physical iPad Safari and mobile GPU frame-time checks remain outside this environment.

[Before data](before.json) · [After data](after.json) · [Development regression](qa-dev.json) · [Packaged regression](qa-built.json)
