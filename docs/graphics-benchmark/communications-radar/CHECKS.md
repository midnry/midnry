# Communications / Radar — validation

## Build gates

| Command / check | Result |
| --- | --- |
| `node --test scripts/outpost-*.test.mjs` | 266 passed, zero failed ([log](test-results.txt)) |
| `npx tsc --noEmit -p .` | Passed, exit 0 |
| `npm run build:outpost-military` | Passed; rebuilt bundle committed and hash matches packaged output |
| `NITRO_PRESET=render npm run build:render` | Passed; 126 release files validated ([log](build-results.txt)) |
| `node scripts/check-outpost-loading.mjs` | Desktop/mobile briefing, reduced motion, entry and optional artwork failure passed ([log](loading-results.txt)) |
| Packaged gameplay / movement | Desktop and mobile passed, A left / D right, dyes and LODs preserved ([JSON](corridor-qa-built.json)) |
| Packaged interactables | 16 station mounts/states, medical stock, armed/disabled charge, medevac transition passed ([JSON](qa-built.json)) |
| Block both `/benchmark-operator/` files | Game loads with two expected warnings, previous material settings retained, no uncaught errors ([JSON](qa-dev.json)) |
| Dev vs packaged root smoke | Desktop/mobile render, no console/page errors, no overflow or divergence ([dev](site-dev.json), [built](site-built.json)) |
| Source boundaries | Eight protected files byte-identical to approved baseline ([hashes](protected-files.json)) |

Browser checks use the repository's proxy/CA preloader locally. The root smoke
waits for auth-loading placeholders to settle before comparing text; an earlier
comparison had captured the loading state on one side. No auth or site code was
changed. The packaged server was run locally and stopped; nothing was deployed.

## Architecture clearance

The check transforms actual architecture triangles (including instanced detail)
to world space, then uses triangle bounding boxes to obtain conservative lower
bounds to each lettering rectangle. It includes jambs, headers, pipes, conduits,
lights, trims and walls. Integrated equipment housings are excluded; architecture
is not excluded. Every value below exceeds the required 20 mm.

| Room | Authoring records | Lettering faces | Minimum clearance | Collision / routes |
| --- | ---: | ---: | ---: | --- |
| command | 232 | 19 | 21.00 mm | Unchanged / clear |
| communications | 373 | 12 | 29.73 mm | Unchanged / clear |
| atrium | 160 | 5 | 35.00 mm | Unchanged / clear |

The Communications test includes all four printed medical-case faces, including
the hidden backs. It also checks four room routes through actual movement and
collision, and confines low detail to the original solid tiles or wall faces.

| Room / label or screen | Conservative clearance (mm) |
| --- | ---: |
| command / RESCUE COORDINATION | 25.00 |
| command / OPERATIONS ARCHIVE | 21.00 |
| command / Command / Operations | 57.00 |
| command / Prepare the medical handover | 77.00 |
| command / Verify perimeter sensors | 95.00 |
| command / RADIO ASSEMBLY | 1310.00 |
| command / Operations cabinet | 212.00 |
| command / Sensor-bay cabinet | 230.00 |
| command / Terminal screen / intel-upload | 197.00 |
| command / Terminal screen / sensor-reset | 215.00 |
| command / Printed medical case / 10 | 146.00 |
| command / Printed medical case / 11 | 46.00 |
| command / Printed medical case / 12 | 340.00 |
| command / Printed medical case / 13 | 46.00 |
| command / Printed medical case / 14 | 146.00 |
| command / Printed medical case / 15 | 56.00 |
| command / Printed medical case / 16 | 358.00 |
| command / Printed medical case / 17 | 64.00 |
| command / Printed emergency console / 18 | 1536.00 |
| communications / UPLINK / DISTRIBUTION | 29.73 |
| communications / RADAR / SIGNAL PROCESSING | 29.73 |
| communications / Communications / Radar | 57.00 |
| communications / Restore the radio uplink | 77.00 |
| communications / Calibrate coastal radar | 77.00 |
| communications / Radio-room cabinet | 232.00 |
| communications / Terminal screen / radio-link | 197.00 |
| communications / Terminal screen / radar-calibration | 197.00 |
| communications / Printed medical case / 8 | 146.00 |
| communications / Printed medical case / 9 | 46.00 |
| communications / Printed medical case / 10 | 340.00 |
| communications / Printed medical case / 11 | 46.00 |
| atrium / DISPATCH  /  FLIGHT DECK | 87.00 |
| atrium / STAGING A  /  MEDICAL CARGO | 87.00 |
| atrium / Covered Supply Atrium | 57.00 |
| atrium / MEDEVAC ▸ | 35.00 |
| atrium / ✚ MEDICAL | 35.00 |

The minimum Communications gap is **29.73 mm**. Two clashes found during
implementation were corrected before final capture: the rack rails stopped too
close to the equipment label, and an impact strip approached the medical-case
backplate. All final measurements are in [clearance.json](clearance.json).

## Command sightlines

Emergency console position remains **[19.5, 1.32, 19.5]**. The full relocated
RESCUE / COORDINATION title is sampled with 45 rays from each of four approaches:
south, south entrance, west and east entrance. All **180 rays** are unobstructed
by the console's actual triangles. South day/night, entrance, west and title
close-ups are included in the matched gallery.

## Visual inspection and limits

- The previous generic tarps/cabinets now read as a joined radar/uplink bank.
  Vents, folded ends, latches, service boundaries and ceiling utilities explain
  the room's function without adding objects to walkable routes.
- Primary signs, both station labels/screens, cabinet identification and both
  equipment plates are readable in the 2.5 m DPR2 Balanced/High captures.
  The medical cross remains the long-distance identification for the small kit.
- Night uses warm practicals and the original cool fill. Balanced has no bloom;
  fluorescent cores remain bright inside their visible dark frames. Sign lettering
  is not blown out. No new reflection or global colour-grade effect was added.
- Task terminals retain their active/completed/off states; the plain equipment
  bank is visually distinct from powered task screens. Stock and charge states
  retain their original simulation behavior.
- Some DPR2 High captures show incomplete **HUD glyphs** in this software-browser
  run. World-space sign/screen text remains intact. HUD code is byte-identical
  to the approved baseline and is outside this pass; physical-device behavior
  is not established by these captures.
- Hardware FPS, sustained thermal behavior and total VRAM have not been measured.
  Phone render resolution stays unchanged. See the explicit memory increase
  and estimation limits in [MEASUREMENTS.md](MEASUREMENTS.md).
- Optional-asset failure coverage blocks both optional operator response PNGs.
  Existing core photographic maps retain their pre-existing required-load behavior;
  this pass introduces no new external asset dependency.

## Supplementary runtime evidence

| Check | Desktop | Phone |
| --- | --- | --- |
| Packaged gameplay | [Image](corridor-built-desktop.png) | [Image](corridor-built-mobile.png) |
| Loading | [Image](loading-desktop.png) | [Image](loading-mobile.png) |
| Dev site | [Image](site-dev.png) | [Image](site-dev-mobile.png) |
| Packaged site | [Image](site-built.png) | [Image](site-built-mobile.png) |

[Armed charge](built-desktop-charge-armed.png) ·
[Disabled charge](built-desktop-charge-disabled.png) ·
[Medevac supplies](built-desktop-transport.png) ·
[Optional maps blocked](dev-blocked.png)
