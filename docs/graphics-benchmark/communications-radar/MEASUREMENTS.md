# Communications / Radar — measurements

Baseline: approved commit `afe7f01`. 46 matched before/after poses.
The renderer bundle hashes, camera positions, drawing buffers, DPR and bloom state
are checked for every pair. Counts are the maximum of three forced-shadow-refresh
render samples, including the existing weapon/post passes.

## Fixed laptop views — Balanced

| View | Calls before → after | Triangles before → after |
| --- | ---: | ---: |
| communications-west-day | 231 → 229 | 355,207 → 326,389 |
| communications-south-day | 251 → 247 | 372,085 → 342,979 |
| communications-west-night | 237 → 235 | 355,279 → 326,461 |
| communications-south-night | 251 → 247 | 372,085 → 342,979 |
| command-south-day | 265 → 266 | 429,909 → 432,373 |
| command-south-night | 265 → 266 | 429,909 → 432,373 |
| command-south-entrance | 270 → 271 | 430,053 → 432,517 |
| command-west-approach | 415 → 416 | 586,477 → 587,519 |
| rations-approach | 295 → 295 | 461,147 → 462,171 |
| cold-storage-junction | 299 → 299 | 328,086 → 329,110 |
| cold-storage-terminal | 264 → 264 | 312,436 → 313,460 |
| soldier | 276 → 276 | 429,016 → 430,040 |
| patrol | 415 → 416 | 586,477 → 587,519 |

Patrol is **416 draw calls**, +1 from the approved baseline and 104 below 520.
The room's equipment replacement reduces its west/south view triangles by about
29,000. Static fittings use the existing instancing/material-batching pipeline.

## Context peaks

Peak columns are independent maxima across each context, not necessarily one
frame. These figures include the rest of the base and all sampled views.

| Context | Poses | Buffer (unchanged) | Calls before → after | Triangles before → after | Texture objects before → after | Uploaded source estimate, MiB before → after |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| laptop/balanced | 13 | 1280×720 | 415 → 416 | 586,477 → 587,519 | 102 → 96 | 358.47 → 349.68 |
| phone/balanced | 8 | 390×844 | 376 → 378 | 574,945 → 577,427 | 79 → 77 | 262.83 → 276.90 |
| ipad/balanced | 3 | 1154×866 | 415 → 416 | 586,477 → 587,519 | 98 → 93 | 344.52 → 331.92 |
| retina/balanced | 11 | 1280×720 | 327 → 323 | 419,857 → 422,321 | 104 → 89 | 347.93 → 330.36 |
| retina/high | 11 | 1920×1080 | 759 → 755 | 737,096 → 684,322 | 117 → 120 | 360.56 → 346.60 |

The phone source-texture estimate increases **262.83 → 276.90 MiB (+14.07 MiB)**
in these captures; it is not a memory reduction on every device. Texture upload
sets vary with visibility and lazy upload history. The new room atlas itself is
2048×256 RGBA with mipmaps, approximately **2.67 MiB**; the Command atlas keeps
its original dimensions. Existing photographed maps are reused.

The estimate deduplicates uploaded WebGL source handles and includes mipmaps.
It excludes render targets, internal PMREM, depth/MSAA, compression and driver
allocations. It is **not total GPU memory/VRAM**. `renderer.info.memory.textures`
is also reported as object count, not bytes.

Phone CSS viewport is 390×844 at DPR2; the render buffer remains 390×844.
iPad CSS viewport is 1024×768 at DPR2. No default resolution, adaptive policy,
grade, bloom or preset was changed. Balanced bloom stays off; High retains its
existing effects. Adaptive resolution is disabled only in the measurement fixture.

Chromium uses **SwiftShader software rendering**: no FPS, hardware GPU-ms or
physical phone/iPad smoothness claim follows from these tests.

## Download cost

| Item | Before bytes | After bytes | Delta |
| --- | ---: | ---: | ---: |
| Military bundle, raw | 1,101,410 | 1,108,708 | +7,298 |
| Military bundle, gzip level 9 | 266,985 | 268,301 | +1,316 |
| Added downloaded models/textures/fonts | 0 | 0 | 0 |

The existing military cache manifest remains 39 files / 32,936,013 bytes.
The new module is compiled into the military bundle, not a new public JS module.
Cache key: `graphics-comms-20261019a`. Review PNGs are docs only, not game assets.

## Every matched view

| Context / view | Calls before → after | Triangles before → after | Source estimate MiB before → after |
| --- | ---: | ---: | ---: |
| laptop/balanced/communications-west-day | 231 → 229 | 355,207 → 326,389 | 263.87 → 279.23 |
| laptop/balanced/communications-south-day | 251 → 247 | 372,085 → 342,979 | 285.79 → 279.23 |
| laptop/balanced/communications-west-night | 237 → 235 | 355,279 → 326,461 | 285.79 → 279.23 |
| laptop/balanced/communications-south-night | 251 → 247 | 372,085 → 342,979 | 285.79 → 279.23 |
| laptop/balanced/command-south-day | 265 → 266 | 429,909 → 432,373 | 303.85 → 285.90 |
| laptop/balanced/command-south-night | 265 → 266 | 429,909 → 432,373 | 303.85 → 285.90 |
| laptop/balanced/command-south-entrance | 270 → 271 | 430,053 → 432,517 | 303.85 → 285.90 |
| laptop/balanced/command-west-approach | 415 → 416 | 586,477 → 587,519 | 345.14 → 327.72 |
| laptop/balanced/rations-approach | 295 → 295 | 461,147 → 462,171 | 355.81 → 347.01 |
| laptop/balanced/cold-storage-junction | 299 → 299 | 328,086 → 329,110 | 358.47 → 349.68 |
| laptop/balanced/cold-storage-terminal | 264 → 264 | 312,436 → 313,460 | 358.47 → 349.68 |
| laptop/balanced/soldier | 276 → 276 | 429,016 → 430,040 | 358.47 → 349.68 |
| laptop/balanced/patrol | 415 → 416 | 586,477 → 587,519 | 358.47 → 349.68 |
| phone/balanced/communications-west-day | 228 → 225 | 352,057 → 323,149 | 189.32 → 234.42 |
| phone/balanced/communications-south-day | 234 → 232 | 354,551 → 325,733 | 200.72 → 234.42 |
| phone/balanced/communications-west-night | 234 → 231 | 352,129 → 323,221 | 200.72 → 234.42 |
| phone/balanced/communications-south-night | 234 → 232 | 354,551 → 325,733 | 200.72 → 234.42 |
| phone/balanced/command-south-day | 264 → 265 | 420,069 → 422,533 | 206.05 → 241.09 |
| phone/balanced/command-south-night | 264 → 265 | 420,069 → 422,533 | 206.05 → 241.09 |
| phone/balanced/command-south-entrance | 270 → 271 | 427,077 → 429,541 | 206.05 → 241.09 |
| phone/balanced/command-west-approach | 376 → 378 | 574,945 → 577,427 | 262.83 → 276.90 |
| ipad/balanced/communications-west-day | 233 → 231 | 355,807 → 326,989 | 282.05 → 258.53 |
| ipad/balanced/communications-west-night | 239 → 237 | 355,879 → 327,061 | 282.05 → 258.53 |
| ipad/balanced/patrol | 415 → 416 | 586,477 → 587,519 | 344.52 → 331.92 |
| retina/balanced/sign-communications-room-2.5m | 187 → 190 | 262,861 → 250,411 | 306.95 → 262.59 |
| retina/balanced/radio-link-label-2.5m | 182 → 185 | 258,429 → 245,979 | 306.95 → 262.59 |
| retina/balanced/radio-link-screen-2.5m | 182 → 184 | 258,453 → 245,859 | 306.95 → 262.59 |
| retina/balanced/radar-calibration-label-2.5m | 182 → 184 | 262,577 → 249,983 | 306.95 → 266.05 |
| retina/balanced/radar-calibration-screen-2.5m | 181 → 185 | 262,457 → 250,295 | 306.95 → 266.05 |
| retina/balanced/radio-room-cabinet-2.5m | 180 → 183 | 256,689 → 244,239 | 306.95 → 266.05 |
| retina/balanced/command-emergency-2.5m | 265 → 266 | 419,857 → 422,321 | 321.85 → 291.09 |
| retina/balanced/command-planning-2.5m | 249 → 251 | 394,449 → 397,003 | 321.85 → 291.09 |
| retina/balanced/command-title-2.5m | 244 → 246 | 399,393 → 401,947 | 321.85 → 291.09 |
| retina/balanced/sign-radar-rack-2.5m | 221 → 219 | 345,365 → 316,547 | 328.52 → 297.26 |
| retina/balanced/sign-uplink-rack-2.5m | 327 → 323 | 371,130 → 342,024 | 347.93 → 330.36 |
| retina/high/sign-communications-room-2.5m | 311 → 327 | 400,513 → 397,407 | 289.44 → 305.61 |
| retina/high/radio-link-label-2.5m | 316 → 332 | 395,609 → 392,659 | 289.44 → 305.61 |
| retina/high/radio-link-screen-2.5m | 319 → 333 | 398,069 → 394,675 | 289.44 → 305.61 |
| retina/high/radar-calibration-label-2.5m | 314 → 328 | 409,085 → 405,679 | 292.90 → 305.61 |
| retina/high/radar-calibration-screen-2.5m | 317 → 335 | 410,413 → 408,063 | 292.90 → 305.61 |
| retina/high/radio-room-cabinet-2.5m | 321 → 337 | 401,603 → 398,497 | 292.90 → 305.61 |
| retina/high/command-emergency-2.5m | 456 → 459 | 598,607 → 608,639 | 299.57 → 320.52 |
| retina/high/command-planning-2.5m | 414 → 420 | 556,237 → 566,539 | 299.57 → 320.52 |
| retina/high/command-title-2.5m | 409 → 415 | 556,057 → 566,359 | 299.57 → 320.52 |
| retina/high/sign-radar-rack-2.5m | 408 → 411 | 564,261 → 513,547 | 307.07 → 323.18 |
| retina/high/sign-uplink-rack-2.5m | 759 → 755 | 737,096 → 684,322 | 360.56 → 346.60 |

## Bundle identity

- Before: `d9d1cc2f8b665c329d4f0d246659b2e3a1765437407bb77bd37f6bc30d61a5d9`
- After and packaged output: `b122b4248d00d7a02bfe4bd067581276d313cc5b33fb8fbb869be57d96fdcbfb`

[Raw before samples](before.json) · [Raw after samples](after.json)
