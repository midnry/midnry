# Handover: Outpost Zero (midnry.com)

Read this first in a new session. It records how the owner likes to work, what
shipped recently and what comes next. The owner is non-technical: report in
plain language, describe what players will see, and say plainly what was and
wasn't verified.

## Working rules (agreed with the owner)

- Work on branch `game-look`; commit and push after each change. No pull requests.
- **Deploy only when the owner says "deploy".** Deploy command:
  `git fetch origin main && git merge-base --is-ancestor origin/main HEAD && git push origin HEAD:main`
  Render auto-deploys www.midnry.com. Verify by comparing live files, e.g.
  `curl -s https://www.midnry.com/games/outpost-sim.js | git hash-object --stdin` against
  `git hash-object public/games/outpost-sim.js`, and the cache key:
  `curl -s --compressed https://www.midnry.com/games/outpost-zero | grep -ao "v=[a-z][a-z0-9-]*" | head -1`.
- Bump the iframe cache key `v=…` in `src/routes/games/outpost-zero.tsx` with every release.
  Current live value: `v=signal-arenas-20261019` (`game-look` carries `v=signal-series-20261020`, not yet deployed).
- Commit trailers:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and the session link line.
- Before every push: `node --test scripts/outpost-*.test.mjs` (268 pass),
  `npx tsc --noEmit -p .`, `NITRO_PRESET=render npm run build:render`, and
  `npm run build:outpost-military` after any change in `scripts/outpost-military/`
  (commit the rebuilt `public/games/outpost-military.js`). After adding models:
  `node scripts/build-outpost-cache.mjs`.
- Check before committing that `git status` is clean afterwards: one release once
  shipped half its files because modified files were left unstaged.

### Emeka D (life-sim game) — security rule, still in force

Only a player named "eunice" signed in with one specific email may date Emeka.
**The email must never appear in code, commits, docs or chat.** Only its SHA-256
hash is stored: `e4ecd2762674dd4bb706fe3aa4fd2d8fc49e1124691d66437d26f8194c9106d0`
(check is `isHisOne(s)` in `emeka.ts`).

## Testing in this environment

- Start the dev server: `sh scripts/qa/dev-up.sh` (creates `screenshots/qa/`).
  Don't `pkill -f vite` — it kills the shell. The server dies on session restart; re-run.
- Headless Chromium: `executablePath: "/opt/pw-browsers/chromium"`, args
  `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`.
- Software rendering is ~15× slower than a real device: game time crawls, so use long
  waits and `click(..., { timeout: 60000 })`. Occasional "element intercepts pointer
  events" while a menu animates is a test artefact; confirm with `elementFromPoint`.
- Set `localStorage["midnry-outpost-profile"] = {"matches":5}` to skip rookie mode
  (rookie disables Night shift, modifiers and specialties).
- QA scripts in `scripts/qa/` (run from the repo root after `dev-up.sh`):

| Script | Checks |
|---|---|
| `signal-pace-sim.mjs` | Headless Last Signal round length (no browser). `ROUNDS=25` per arena. |
| `signal-arena-views.mjs [width]` | Photos of each Last Signal arena with 8 fighters in view + draw calls → `screenshots/qa/arenas`. |
| `signal-last-life.mjs [width]` | Screen look at 3 lives, 2 lives, last life + rush, last life low health; FINAL THREE / DUEL call-outs → `screenshots/qa/lastlife`. |
| `mode-menu.mjs [width]` | Home: choose a game, then how to play; plays two series rounds and photographs the standings → `screenshots/qa/menu`. |
| `signal-rounds.mjs [width]` | Plays 3 Last Signal rounds watching for page errors (caught the Charge Core crash). |
| `signal-lives.mjs` | Start shield, losing a life, last life ends the round. |
| `signal-regen.mjs` | Health recovery after 5 s without damage. |
| `signal-sprint-slide.mjs` | Joystick-edge sprint, SLIDE button, laptop Shift/C. |
| `pause-restart-leave.mjs [width] [signal\|protocol]` | Pause menu Restart / Leave match. |
| `death-new-round.mjs` | Die → results → Main menu → new round starts at spawn. |
| `sign-clearance.mjs` | No world sign intersects architecture (bounding boxes). |
| `sign-photos.mjs` | Close-up photo of every sign → `screenshots/qa/clash`. |
| `draw-calls.mjs` | Renderer draw calls at fixed views; Balanced patrol ≈ 481, budget ≤ 520. |
| `blocked-optional-assets.mjs` | Game still loads when optional graphics are blocked. |
| `font-first-paint.mjs`, `objective-arrow.mjs`, `pause-menu.mjs` | Fonts load before first paint; arrow points along the route; pause menu contents. |

## Shipped this week (all live)

- Fonts preloaded with `font-display: block` (no font swap while loading).
- Floor trail optional (Settings → Gameplay, off by default); the objective arrow now
  turns toward the route (desktop arrow and phone pill arrow).
- Corridor room signs slid half a tile off the door-frame ribs that pierced them.
- Phone controls: sprint = push the joystick to its rim (gold "▲ RUN"); SPRINT button
  removed; SLIDE shown in Last Signal. Blackout Protocol phones can sprint the same way.
- Approved Codex graphics released (signage, shared equipment, corridor, medical depot,
  central passage, supply atrium, command / operations). Released as a squash of
  `codex/graphics-benchmark` without `docs/graphics-benchmark/` (≈300 MB of evidence).
- Fixed Last Signal freeze: Charge Cores used a `latch` material dropped in the release.
- Pause menu: **Restart** (offline) and **Leave match** under Resume (`outpost-menu.js`).
- Last Signal: health recovers 12 %/s after 5 s without damage (`recover()` in
  `outpost-sim.js`), and pacing rules in `SIGNAL` (8 s start shield, 2 lives with
  redeploy far from rivals + 3 s shield, weapon damage × 0.6, bots retreat below 45 %
  health). Rounds went from ~23 s to ~48 s average in simulation.

## Codex (graphics) workflow

- Codex works on `codex/graphics-benchmark` and pushes room by room for review.
  It must not edit HUD, navigation, menus, touch controls or gameplay rules.
- Review checklist per push: fetch; check it merged `main`; rebuild the bundle and
  confirm no diff; tests + tsc; `draw-calls.mjs`; `sign-clearance.mjs` and
  `sign-photos.mjs`; Codex's screenshots (laptop + phone, day + night, sign close-ups
  at 2.5 m); `signal-rounds.mjs` (crates must be broken — that path hid a crash);
  `death-new-round.mjs`; `signal-sprint-slide.mjs`. Return the tree to `game-look`
  and rebuild the bundle afterwards.
- Release approved work by squash-merging the reviewed commit into `game-look`,
  excluding `docs/graphics-benchmark/`, rebuilding the bundle and verifying it matches.
- Codex's queue: Communications / Radar (next) → Armory (+ stores) → Barracks / Mess
  Hall → Vehicle Hangar / Flight Deck → Generators / Power → Maintenance Tunnels →
  remaining passages. Small open note: in Command, the emergency radio stand sits in
  front of the planning-table title from the south side.
- **Last Signal arenas are no longer Codex's job** (owner agreed): the arena
  enlargement and its graphics pass are done by Claude (below). Codex keeps the
  Blackout Protocol base rooms.

## Next task: bigger Last Signal arenas (agreed plan)

Goal: rounds of 2–3 minutes. Simulation showed rule changes alone cap out near 1 minute;
space is the limit (8 fighters on 16×16 / 24×24 / 20×20).

1. **Layouts** — enlarge Dust Outpost to ~28×28, Skyport ~36×36, Wreck Estate ~32×32
   in `public/games/outpost-content.js` (`MAPS`). Add lanes, cover clusters and quiet
   flanks, not empty space. Keep: 8 spawns spread round the edges (~8+ tiles apart),
   more supply crates in proportion to area, haze centre and safe zone on open floor,
   sealed outer walls, every open tile reachable, `redeploy()` finding safe spots.
   Extend the "five distinct arenas" test in `scripts/outpost-expansion.test.mjs`.
   Measure with `signal-pace-sim.mjs` (report avg / median / max and first life lost),
   then play-test laptop + phone and check draw calls with 8 fighters on screen.
2. **Texture compression** — add KTX2/Basis (e.g. glTF-Transform + KTX tools, build-time
   only) so textures stay compressed on phone GPUs; measure load and memory before/after.
3. **Graphics pass per arena** — match Codex's established style (`realism-surfaces.js`,
   `interactables.js`, `world-text.js`). Textures: CC0 photo sets from Poly Haven /
   ambientCG for natural surfaces (downloads work here), and Blender (`pip install bpy`,
   headless) for arena-specific wear, painted markings, panels and decals. Record every
   new asset in `public/games/military/ATTRIBUTION.md`. Optionally have Codex review.

Do one stage per session if usage is tight, and report results to the owner before
deploying.

**Stage 1 status (deployed 2026-10-19):** arenas are now
28×28 / 36×36 / 32×32. Each keeps its old layout whole at the heart, shifted 6 tiles in
(`ringed()` in `outpost-content.js`); the old outer wall is a compound wall with 2 gates
per side, and a pinwheel ring adds a flank hut, cover and crates per side. Renderer
landmark coordinates (terminal/villa roofs, fuselage, wreck, apron markings, windows)
moved by +6. Training/academy keeps the classic 16×16 yard (`trainingLevel`).
Measured (25 rounds per arena): avg 48 s → 64 s (median 64, max 108; Dust 59, Skyport 69,
Wreck 64); first life lost ~12 s. Draw calls with 8 fighters in view: 83–228 (was 67–102),
under the 520 budget. Finding: almost all lives are lost in bot-vs-bot fights, not the
haze — space alone won't reach 2–3 min. Simulated options (not applied, owner to decide):
bots roam near their own area instead of hunting map-wide until 1 rival is left → ~79 s;
plus a later/slower haze (starts 30 s, closes over 180 s) → ~97 s; bots never hunt + that
haze → ~111 s.
**Owner declined all bot-behaviour changes.** Non-bot rule tests (15 rounds per arena,
average round): lives 3 → 79 s; haze starting 30 s / closing over 180 s → 75 s; damage
× 0.45 → 67 s; 15 s start shield → 68 s; faster health recovery → no change; lives 3 +
that haze → 96 s; lives 4 → 93 s; lives 4 + haze 40 s / 200 s → 116 s; lives 4 + haze
45 s / 225 s → 119 s; lives 5 + haze 40 s / 200 s → 128 s. Haze alone starting at 60 s
makes rounds very uneven (78 s median, 191 s max). Nothing applied yet; owner to choose.

## Where things live

- Game page: `public/games/outpost-zero.html` (engine, input, HUD glue).
- Last Signal / Field rules: `public/games/outpost-sim.js` (`Arena`, `SIGNAL`, bots in `updateRival`).
- Blackout Protocol rules: `public/games/outpost-protocol.js`; maps `outpost-protocol-map.js`.
- Arenas: `public/games/outpost-content.js` (`MAPS`).
- Renderer: `scripts/outpost-military/*.js` → bundled to `public/games/outpost-military.js`.
- Menus: `outpost-menu.js` (home / pause), `outpost-ui.js` (settings, confirm dialog).
- Navigation and trail: `outpost-navigation.js`, `scripts/outpost-military/ground-trail.js`.
- Online rooms: `src/games/outpost/rooms.server.ts` (uses the same rules files).

## Last stand update (on `game-look`, awaiting owner's "deploy")

- Last Signal has 3 lives (`SIGNAL.lives`). Last life: 6 s adrenaline rush on redeploy
  (×1.4 speed, reloads ×0.6), then hits ×1.15 and health recovery after 3 s instead of 5
  (all in `outpost-sim.js`, applies to bots and online too).
- Screen by lives (`.mf-lifefx` + `signalIntensity()` in `outpost-zero.html`): 3 = clear,
  2 = dark edges, last = red heartbeat edges (faster and closer below 30 % health) and a
  gold edge glow during the rush. Heartbeat sound + rush sound in `lastStand()`
  (`outpost-retention.js`). "FINAL THREE" / "FINAL DUEL" call-outs. Don't put an opacity
  transition on `.mf-lifefx`: it never completed in testing and left the overlay hidden.
- Bots: `dodge()` slides sideways from incoming fire (chance per hit: easy 20 %, normal
  45 %, hard 70 %; 2.4 s cooldown); `coverFrom()` sends hurt bots to a nearby tile no
  nearby rival can see. Bots slide on ~1 in 6 hits overall.
- Simulated rounds: avg 84 s (median 83, max 111), was 64 s.
- Owner asked about a multi-round match (first to 3 round wins = 1st, rest ranked by wins
  then kills). Not built yet; see the reply in that session.

## Series and the two-step menu (on `game-look`, awaiting owner's "deploy")

- `public/games/outpost-series.js` (DOM-free, tested in `scripts/outpost-series.test.mjs`):
  Last Signal ways to play: Single round, Series (first to 3 round wins, max 5 rounds),
  Marathon (first to 3 wins, no limit). Arenas rotate Dust → Skyport → Wreck from a random
  start. Rank: wins, then placement points (10/7/5/4/3/2/1/0), then kills. When the player
  is knocked out, `Series.record()` plays the rest of the round unseen to find the winner.
- Game wiring: `reset()` picks the series arena; `endMatch()` records; the debrief shows the
  standings table and NEXT ROUND / NEW SERIES (`outpost-retention.js`). Leave match drops
  the series; Restart replays the same round. Offline only (online rooms are Blackout only).
- Home menu (`outpost-menu.js`): step 1 "Choose a game" (Blackout Protocol / Last Signal),
  step 2 "Choose how to play" shows only that game's options (Lifeline Run, Quick, Night,
  Daily case — or Single, Series, Marathon). Phones get a step-3 Play button under them.
  Each game remembers its own last option.
