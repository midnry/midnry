# Measurements — shared interactables

Approved baseline `f2f8d8c`; all counts include shadow and post-processing passes.

## Balanced: fixed-camera budget

| View | Calls before → after | Triangles before → after | Managed source MiB before → after |
|---|---:|---:|---:|
| rations-approach | 359 → 320 | 698,775 → 588,689 | 152.8 → 174.3 |
| cold-storage-junction | 381 → 319 | 592,175 → 426,537 | 165.0 → 176.1 |
| cold-storage-terminal | 303 → 270 | 424,785 → 333,457 | 171.0 → 177.8 |
| soldier | 340 → 301 | 675,650 → 556,558 | 171.0 → 177.8 |
| command-room | 350 → 285 | 722,245 → 609,096 | 181.7 → 188.5 |
| armory-terminal | 374 → 320 | 595,266 → 504,979 | 181.7 → 188.5 |
| communications-terminal | 225 → 189 | 324,850 → 274,535 | 185.7 → 192.5 |
| emergency-console | 359 → 293 | 729,345 → 608,552 | 185.7 → 192.5 |

## Presets: sample ranges

| Preset | Cameras | Calls | Triangles | Texture objects | Managed source MiB | Game resource bodies MiB |
|---|---:|---:|---:|---:|---:|---:|
| balanced | 8 | 189–320 | 274,535–609,096 | 83–98 | 174.3–192.5 | 33.33 |
| performance | 2 | 115–166 | 126,972–132,642 | 69–73 | 156.1–164.1 | 33.33 |
| high | 2 | 527–608 | 554,261–777,656 | 108–109 | 183.2–183.2 | 33.33 |

Balanced uses all eight views; Performance and High sample the terminal and soldier views only. These are sampled residency ranges, not whole-base VRAM limits or rankings of preset memory use. Internal render targets, PMREM, MSAA and driver memory are excluded. Initial menu upload timing and disposal can also affect resident source textures.

Texture memory includes the shared runtime atlases. Their deterministic gross allocation is 5.67 MiB including mipmaps. The original terminal-only atlas is no longer created. Resource-body totals come from browser resource timings, deduplicated by URL; they are not a compressed internet transfer measurement. Renderer bundle delta: +6,152 bytes raw, approximately +2,118 bytes with default gzip. No new model or texture downloads.

## Rendering settings

The 1280×800 browser viewport uses the existing preset render scales:
Performance 720×450, Balanced 960×600 and High 1280×800. Adaptive resolution is
disabled for measurement. High retains 2048 px sun shadows, SSAO and the
selective Reflector; Balanced uses 1024 px sun shadows with SSAO/Reflector/bloom
disabled. Performance retains its existing reduced lighting/shadow policy.

## Balanced: active object stress fixture

The same synthetic drop, breakable crate and armed charge are injected in each version; the crate and drop intentionally share a tile for a busy-view rendering check. This does not change the game maps or normal object placement. The existing flare particles are unchanged.

| View | Calls before → after | Triangles before → after | Managed source MiB before → after |
|---|---:|---:|---:|
| supply-drop | 443 → 368 | 652,167 → 515,632 | 163.5 → 168.1 |
| armed-charge | 443 → 359 | 692,914 → 560,039 | 185.3 → 170.7 |

Stress screenshots: [approved](images/before-balanced-supply-drop.png) · [this pass](images/after-balanced-supply-drop.png). Existing flare smoke remains a visual limitation for a future effects pass.

## Terminal ceiling hotspot

The matched ceiling crop is x=480–800, y=35–155 in the terminal screenshots. This is a display-pixel comparison, not a physical luminance measurement.

| Version | Mean RGB intensity (0–255) | Peak channel |
|---|---:|---:|
| before | 187.1 | 244 |
| after | 65.4 | 97 |

All captures use Chromium SwiftShader software rendering. No hardware FPS is claimed.

[Full JSON before](before.json) · [after](after.json) · [stress before](before-workload.json) · [stress after](after-workload.json)
