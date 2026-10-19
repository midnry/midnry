# Validation — Covered Supply Atrium

Source and packaged renderer SHA-256:
`464a9ff19c1f474a75df6722a94a8cb5b025c82eb72d72b3e197c5984e7510db`.

| Check | Result |
| --- | --- |
| `node --test scripts/outpost-*.test.mjs` | 37 test files passed, 0 failed |
| `npx tsc --noEmit -p .` | Passed |
| `NITRO_PRESET=render npm run build:render` | Passed, including packaged-asset verification |
| `npm run build:outpost-military` | Passed; generated bundle matches packaged output |
| Packaged desktop/mobile gameplay | Passed: movement, collision, uniform dyes, LODs and lighting |
| Packaged interactables and transport | Passed: station states, armed/disabled charges, medevac transition and atrium geometry |
| Dev and packaged site smoke | Passed on desktop/mobile; no console errors, overflow or baseline divergence |
| `node scripts/check-outpost-loading.mjs` | Passed: desktop/mobile briefing, reduced motion and optional artwork failure |
| `git diff --check` | Passed |

Browser results and clearance measurements are recorded in the accompanying
JSON evidence. The screenshot fixture freezes the same seeded match and camera
for each pair and records three complete renderer samples per view. Gameplay
and UI code are not modified by the fixture.

The initial concurrent build/capture run exhausted the sandbox's memory and
stopped its local preview server. Interrupted captures were resumed against the
same renderer checksum; subsequent browser jobs run sequentially. That local
infrastructure interruption is not used as a game-performance measurement.

## Atrium geometry and sign clearance

162 detail records passed; three complete walking routes passed; collision grid unchanged. Six signs, all with finite geometry measurements and at least 20mm clearance. Distances below are conservative triangle-AABB lower bounds, including integral backings.

| Sign | Minimum gap |
| --- | ---: |
| DISPATCH  /  FLIGHT DECK | 86.998 mm |
| CARGO MANIFEST | 38.500 mm |
| STAGING A  /  MEDICAL CARGO | 86.998 mm |
| Covered Supply Atrium | 56.998 mm |
| MEDEVAC ▸ | 34.998 mm |
| ✚ MEDICAL | 34.998 mm |

Blocked both optional benchmark-operator PNGs: **passed**, 16 stations loaded and no uncaught errors. World text filtering, game-font loading, subtitle sizing and power state checks passed. See `qa-dev.json`.

## Visual review

All 56 matched screenshots were captured from the same cameras and seed. The
six sign close-ups were inspected on Balanced and High at DPR2, approximately
2.5m from each face: readable lettering, restrained night highlights and no
architecture overlap. Laptop, phone and iPad day/night views were inspected;
the phone buffer remains 390×844. Packaged desktop/mobile game and site
screenshots were also inspected. These are software-rendered checks, not a
claim of sustained performance on physical phones or tablets.

The original navigation, HUD, ground trail and collision map are byte-identical
to `origin/main`; see `protected-files.json`. No assets were downloaded and no
gameplay files were changed.

Raw check summaries: `test-results.txt`, `packaged-checks.txt` and
`loading-checks.txt`. The loading test's `deployment` field describes entering
the match; no remote deployment was performed.

## Reproduction

The committed benchmark fixture accepts `before` or `after` as its phase. See
the environment switches at the top of `scripts/benchmark-outpost-atrium.mjs`
to select the device/preset and resume captures. The baseline source is
`ac48b11`; compare it with the room commit using the same seeded views.

Packaged browser verification:

```sh
OUTPOST_GRAPHICS_PASS=supply-atrium OUTPOST_QA_VARIANT=desktop node scripts/verify-outpost-corridor-built.mjs
```

Optional-map failure verification against the running preview:

```sh
OUTPOST_GRAPHICS_PASS=supply-atrium OUTPOST_QA_VARIANT=blocked node scripts/check-outpost-interactables.mjs http://127.0.0.1:8080 dev
```

This sandbox uses a local Chromium proxy/CA launcher via `node --import` for
browser checks. The helper is environment configuration, not a game dependency.
