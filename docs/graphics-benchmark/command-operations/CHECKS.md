# Validation — Command / Operations

| Check | Result |
| --- | --- |
| `node --test scripts/outpost-*.test.mjs` | 266 tests passed, 0 failed; final source |
| `npx tsc --noEmit -p .` | Passed |
| `npm run build:outpost-military` | Passed; source bundle rebuilt after merge and after room changes |
| `NITRO_PRESET=render npm run build:render` | Passed, including 126 release-file checks; packaged files match source |
| Command geometry | 232 authoring records, four clear movement routes, collision grid unchanged |
| Command architectural clearance | All 19 sign/screen/label faces clear; smallest conservative gap 21mm |
| Supply Atrium follow-up clearance | All five remaining signs clear; three movement routes clear |
| Optional operator maps blocked | Passed: both requests aborted, two expected warnings, previous materials retained, game loads, 16 stations present, no unexpected console errors |
| Matched screenshots | 40 before/after pairs (80 PNGs); same cameras and buffers, all asset-error arrays empty |
| Balanced budget | Patrol 447 → 415 calls; peak laptop/iPad 429, phone 385; all captured Balanced views ≤520 |
| Visual inspection | Laptop/phone/iPad day and night; all 24 DPR2 Balanced/High primary sign, terminal and atrium close-ups inspected |
| Packaged gameplay, desktop/mobile | Passed: A/D directions, movement routes, four distinguishable uniform dyes, LODs, lighting and reflection restrictions; no console errors |
| Packaged equipment and transport | Passed: 16 base stations, power/completion and medical-stock presentation, charge states, Command/Atrium clearances, then 11 medevac stations and loaded/empty cargo; no console errors |
| Dev and packaged site smoke | Desktop/mobile content and screenshots inspected, no overflow or console errors, no divergence from dev baseline |
| `node scripts/check-outpost-loading.mjs` | Passed desktop/mobile carousel, briefing entry, reduced motion and blocked optional artwork |

The matched fixture uses seed `outpost-corridor-20261019`, records three
complete renderer samples per view and preserves the same before/after camera.
Measurements include the shadow and weapon passes. This is a software-rendered
visual/geometry check, not a hardware FPS measurement.

The Command equipment and room lettering stay legible in the night close-ups;
the dispatch comparison shows the removed central hotspot. New storage has
matte enamel panels, vents and handles, while the original task stations and
emergency controls remain visually distinct. Letter faces do not intersect
trims, utility runs or frames in the checked views. Existing ceiling-panel
seams and the game-wide soldier gait are unchanged by this room pass.

[Test output](test-results.txt) · [Render build output](build-results.txt) ·
[All renderer measurements](MEASUREMENTS.md) · [Blocked-map result](qa-dev.json)

## Reproduction

With the game served locally, capture both phases sequentially:

```sh
node scripts/benchmark-outpost-command.mjs before
node scripts/benchmark-outpost-command.mjs after
```

The fixture reconstructs baseline `b660e09` from Git without checking out or
overwriting project files. Optional filters: `OUTPOST_COMMAND_DEVICE`
(`laptop`, `phone`, `ipad`, `retina`), `OUTPOST_COMMAND_PRESET` (`balanced`,
`high`) and `OUTPOST_COMMAND_RESUME=1`. Capture outputs are kept under
`docs/graphics-benchmark/command-operations/` as well as the workspace screenshot
directory. This sandbox uses its local Chromium proxy/CA preloader via
`node --import`; it is environment configuration, not a game dependency.

Packaged verification and optional-map failure check:

```sh
OUTPOST_GRAPHICS_PASS=command-operations OUTPOST_QA_VARIANT=desktop node scripts/verify-outpost-corridor-built.mjs
OUTPOST_GRAPHICS_PASS=command-operations OUTPOST_QA_VARIANT=blocked node scripts/check-outpost-interactables.mjs http://127.0.0.1:8080 dev
```

The geometry checker includes all original and new Command lettering and
screens. It separately rechecks the five remaining Supply Atrium signs after
the manifest removal and light adjustment. Printed equipment labels are also
targets; integral equipment housings are excluded from the architectural
obstruction set. All other architecture, including room dressing and fittings,
is tested using conservative transformed-triangle bounds.

No phone resolution, input, HUD, navigation or collision-map changes were made
by the room pass. `protected-files.json` contains hashes of all eight protected
files at the merged baseline. Existing approved graphics differences from main
in the HTML/academy files are retained; the newly shipped controls are preserved.

The first Render build completed compilation but its child-process release
check encountered a sandbox `EPERM`. The complete build was rerun with the
necessary execution permission and passed. No release-check bypass or source
workaround was introduced.

## Architectural clearance inventory

Minimum conservative distance to architectural triangles; all values must be at least 20mm. Printed case labels are checked on both sides, even where concealed by the cabinet. Integral equipment housings are excluded; external architecture is included.

| Area | Sign / screen / label | Minimum gap (mm) |
| --- | --- | ---: |
| command | RESCUE COORDINATION | 25.000 |
| command | OPERATIONS ARCHIVE | 21.000 |
| command | Command / Operations | 57.000 |
| command | Prepare the medical handover | 77.000 |
| command | Verify perimeter sensors | 95.000 |
| command | RADIO ASSEMBLY | 1310.000 |
| command | Operations cabinet | 212.000 |
| command | Sensor-bay cabinet | 230.000 |
| command | Terminal screen / intel-upload | 197.000 |
| command | Terminal screen / sensor-reset | 215.000 |
| command | Printed medical case / 10 | 146.000 |
| command | Printed medical case / 11 | 46.000 |
| command | Printed medical case / 12 | 340.000 |
| command | Printed medical case / 13 | 46.000 |
| command | Printed medical case / 14 | 146.000 |
| command | Printed medical case / 15 | 55.999 |
| command | Printed medical case / 16 | 358.000 |
| command | Printed medical case / 17 | 64.000 |
| command | Printed emergency console / 18 | 1536.000 |
| atrium | DISPATCH  /  FLIGHT DECK | 86.998 |
| atrium | STAGING A  /  MEDICAL CARGO | 86.998 |
| atrium | Covered Supply Atrium | 56.998 |
| atrium | MEDEVAC ▸ | 34.998 |
| atrium | ✚ MEDICAL | 34.998 |

Raw geometry, target bounds and nearest-triangle diagnostics: [clearance.json](clearance.json).

## Additional runtime evidence

- [Packaged gameplay](corridor-qa-built.json): [desktop](corridor-built-desktop.png), [phone](corridor-built-mobile.png).
- [Packaged equipment/transport](qa-built.json), [optional-map failure](qa-dev.json), [packaged check output](packaged-checks.txt).
- [Dev site verdict](site-dev.json): [desktop](site-dev.png), [phone](site-dev-mobile.png).
- [Packaged site verdict](site-built.json): [desktop](site-built.png), [phone](site-built-mobile.png).
- [Loading check output](loading-checks.txt): [desktop](loading-desktop.png), [phone](loading-mobile.png). Its `deployment: passed` field means entering the local match briefing; nothing was remotely deployed.
