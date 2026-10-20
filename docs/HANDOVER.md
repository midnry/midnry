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
  Current live value: `v=store-loading-20261020` (store in NGN/USD, loading screens deployed 2026-10-20).
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
| `signal-hazards.mjs [width]` | Canister in view, a red canister exploding, each arena's disaster warning and disaster → `screenshots/qa/hazards`. |
| `phone-hud.mjs` | Phone game screen (portrait + landscape) with a disaster warning: HUD boxes, overlaps, % of screen covered → `screenshots/qa/phone`. |
| `signal-haze.mjs [width]` | Red Haze curtain near / far / outside, sandstorm and storm half rolled in → `screenshots/qa/haze`. |
| `music-preview.mjs` | Renders the battle music (stalk / hunt / fight) to `screenshots/qa/music-preview.wav`, prints loudness, checks it starts, builds and stops in a round. |
| `crate-closeup.mjs [tag]` | Phone-size close-ups of a supply crate (shadow acne / z-fighting) → `screenshots/qa/crate`. |
| `shock-and-net.mjs` | Lightning after-shock (arcs on a rival, blue edge on you) and the network meter in a real online room → `screenshots/qa/shock`. |
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

**Paused (owner, 2026-10-20): Claude now owns all graphics.** The notes below are kept for
reference only; do not send Codex new work unless the owner asks.

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
- Codex's queue: Armory (+ stores) (next) → Barracks / Mess Hall → Vehicle Hangar /
  Flight Deck → Generators / Power → Maintenance Tunnels → remaining passages.
  Communications / Radar and the Command sightline note were reviewed and released into
  `game-look` on 2026-10-20 (codex 97e4991; Balanced patrol 482 draw calls; 37 signs clear;
  Codex's own check passes laptop + phone after pointing it at `/opt/pw-browsers/chromium`).
  Codex's branch does not yet include main's Last Signal work: ask it to merge `main` first.
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

## Last stand update (deployed 2026-10-20)

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

## Series and the two-step menu (deployed 2026-10-20)

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

## Canisters, barriers and natural disasters (deployed 2026-10-20)

- Rules: `public/games/outpost-hazards.js` (tests `scripts/outpost-hazards.test.mjs`).
  Canisters / sandbag barriers / foam live in `arena.crates` with a `kind` and ids starting
  `crate-`, so collision, bullets, blasts and line of sight treat them like crates. Layout is
  fixed per arena (seeded from the map id): canisters against walls, barriers in open
  ground, never in corridors, near spawns or the centre; a test checks every tile stays
  reachable. Red = blast 2.2 tiles + breaks cover, green = 7 s gas (hurts everyone), pink =
  foam blocks for 15 s, blue = heal 45. Signal and Pair Ops get them; training doesn't.
- Bots ignore canisters as loot, shoot a red/green one beside a rival, and step off marked
  ground.
- One disaster per Last Signal round, starting 30–55 s in, warned 10 s ahead: sandstorm
  (Dust Outpost: fog, ×0.85 speed, bots spot rivals at ≤3.5 tiles), lightning storm
  (Skyport: marked ground 1.6 s before each strike), earthquake (Wreck Estate: marked ground
  1.4 s before cover collapses). `arena.disaster` is in the snapshot.
- Presentation: `scripts/outpost-military/realism-hazards.js` (models, effects incl. the
  first renderer for `arena.fx`, strike markers, weather fog, quake camera shake);
  banner / sand overlay / lightning flash in `disasterHUD()`; sounds in
  `hazardSounds()` (`outpost-retention.js`); minimap shows canister colours and strikes.
- Simulated: rounds avg 83 s; ~5–6 canisters and 1–2 barriers broken per round; disasters
  cost about one life per round; quakes knock down ~17 wall tiles on Wreck Estate.

### Disaster look and lasting ground damage (follow-up)

- Markers: lightning = blue hologram flat on the ground (spinning grid disc + inward pulse ring; owner: nothing floating);
  earthquake = cracks that spread and glow during the warning (no circles).
- Storm: cloud dome (`toneMapped: false`, or the grade crushes it), rain, distant sheet
  lightning; `HazardDressing.dim()` scales sun / sky light for one frame and restores it
  after rendering (scaling in place would compound with `adapt()` in realism-lighting).
- `arena.terrain` (snapshot): rubble wherever cover collapses (any cause), quake cracks,
  lightning scorch, sandstorm drifts. `footing()` slows movement on rubble ×0.75, cracks
  ×0.8, sand ×0.85; the camera sways walking over them. Drawn as one InstancedMesh per kind.
- Phone HUD (≤700 px wide or ≤500 px tall): survivors only, cores line hidden, disaster
  banner one line under the status in the top-left; Overdrive lifted off the health box.
  `phone-hud.mjs`: no overlaps, ~16 % of the screen covered.

## Fades, visible Red Haze, battle music (deployed 2026-10-20)

- Disaster weather fades: `HazardDressing.fade()` builds over the last 2 s of the warning
  + first 1 s, clears over the last 3 s; fog colour/density blend from the arena's fog,
  the sky dome (clouds for storms, sand colour for sandstorms) and rain use it as opacity,
  light dimming scales with it; the sand screen overlay uses the same curve.
- Red Haze edge: `updateHaze()` draws a 4-sided glowing red curtain on the safe-zone square
  from 3 s before the haze starts, brighter within 4 tiles of the edge.
- Music: `public/games/outpost-music.js` (`BattleMusic`, Web Audio synthesis, 132 BPM,
  D minor; levels stalk / hunt / fight via `battleIntensity()`), played by
  `Retention.battleMusic()` in Last Signal while you are alive and the game runs.
  "Music volume" slider (Player experience), stored in `midnry-outpost-audio.music`.
  Blackout Protocol has no music yet (voice chat / meetings) — owner can ask.
- Inside the Red Haze (owner: "it just looks like a line"): red fog (#9a2a22, 0.075),
  drifting red embers around the camera (`updateEmbers()`), and a pulsing red screen-edge
  aura (`.mf-hazefx`, toggled in `signalIntensity()`).

## Owner's phone test fixes (deployed 2026-10-20)

- Canisters blocked a lane: crate-like objects now have per-kind footprints (`footprint()` in
  `outpost-sim.js`: supply 0.32, canister 0.14, barrier/foam 0.42 tiles); pathing ignores
  canisters; canisters are only placed in lanes ≥ 3 tiles wide.
- Sand drifts looked like floating domes: now a flat soft sand decal + a low half-sunk ridge.
- Crate flicker on iPhone: side ribs were flush with the crate's side faces (z-fighting);
  ribs, side signs and handles moved out (`interactables.js`). Touch devices also get a
  larger sun shadow bias (−0.0006 / normal 0.04) against shadow acne
  (`realism-lighting.js`). Not reproducible in headless Chromium; owner to confirm.
- Lightning after-shock: `SHOCK` in `outpost-hazards.js` (4 s, 6 HP/s ≈ 24 vs 45 strike);
  arcs on others (`updateShock()`), blue flicker edge + "⚡ ELECTRIFIED" + crackle for you.
- Network meter (`public/games/outpost-netmeter.js`): signal-bars badge by the pause button
  in online matches (ping from 2 s heartbeats, jitter, update rate, dropouts in the last
  minute, live vs backup link); panel from the badge or "Network check" in the pause menu;
  offline it explains the match is local and offers the HTTP connection test.
- Simulated rounds now average 95 s.

## Graphics takeover: Dust Outpost showcase (deployed 2026-10-20)

Owner wants "2026 gamer" graphics, HD assets cached in the browser, then a PC/Mac
Steam build (Electron), later iOS/Android. Agreed order: (1) Dust Outpost showcase +
HD pack ← this, (2) first desktop build, (3) Steam features, (4) phone apps.

- `scripts/outpost-military/arena-dust.js` (`DustStyle`): Last Signal "outpost" only
  (not training). Loads after the arena is playable, then rebuilds: kit walls
  (type 1 HESCO, 2 concrete blast blocks, 3 crate stacks) as instanced meshes,
  desert gravel ground, 22 small CC0 props against single wall bases (never in
  lanes, deterministic). Collision unchanged. "High" preset loads `textures/arena/hd/` (2K).
- Asset pipeline (sources in gitignored `assets-src/`):
  `node scripts/assets/fetch-polyhaven.mjs 1k <ids>`; ambientCG 2K JPG by hand;
  `python3 scripts/assets/arena-textures.py`; `python3 scripts/assets/hesco-texture.py 1024|2048 <out>`;
  Blender (`bpy` venv) `python scripts/assets/arena-kit.py public/games/military/models/arena-dust-kit-v1.glb`;
  glTF-Transform `scripts/assets/pack-props.mjs` (copy next to its node_modules, run from repo).
  Then `node scripts/build-outpost-cache.mjs` (manifest now ~54 MB incl. HD set).
- Budget measured (`node scripts/qa/arena-look.mjs <tag> outpost 1280|390`): laptop
  ≤ 251 draw calls / 548k tris worst view, phone ≤ 155 / 286k.
- The kit preloads with the renderer (behind the opening loading screen) since
  `v=dust-preload-20261020`; `node scripts/qa/arena-first-frame.mjs 1280|390` checks the
  first match frame is already dressed. A failed kit load is non-fatal (classic look).
- Next: other arenas + Blackout base in the same style, KTX2 textures, maybe WebGPU.

## Desktop app (step 2)

- `desktop/`: Electron shell (own `package.json`, not part of the website build).
  It opens the live game (`https://www.midnry.com/games/outpost-zero.html?renderer=military&desktop=1`)
  full screen with no browser chrome, so online play and updates match the site and the
  cache worker keeps the HD assets on disk. F11 / Alt+Enter toggles full screen (remembered);
  "Exit Game" becomes "Quit game" (`window.midnryDesktop`, see `desktop/preload.js`) and closes
  the app; no internet → `desktop/offline.html`. `OUTPOST_URL` points it elsewhere for testing.
- Builds: `.github/workflows/desktop.yml` runs on pushes touching `desktop/**` and publishes a
  GitHub **pre-release** `desktop-build-<n>` with Windows (.exe installer + zip), Mac (universal
  .dmg + zip, ad-hoc signed by `desktop/build/after-pack.js`) and Linux (.AppImage).
- Local: `cd desktop && npm install` (if Electron's download fails behind the proxy, unzip
  `electron-v<ver>-linux-x64.zip` from GitHub releases into `node_modules/electron/dist` and write
  `electron` to `node_modules/electron/path.txt`), then
  `xvfb-run -a node scripts/qa/desktop-app.mjs [siteUrl]` (menu + 3D, Exit quits, offline screen).
- Unsigned for now: Windows SmartScreen → "More info → Run anyway"; Mac → right-click → Open
  (or System Settings → Privacy & Security → Open Anyway). Steam/Mac release needs an Apple
  Developer ID ($99/yr, notarization) and ideally a Windows code-signing certificate.
- Next (step 3): Steamworks (owner needs a Steamworks account + $100 app fee): steamworks.js
  achievements/overlay/cloud saves, offline bundling of game files, Steam Deck controls check.

## Sign-in required + player stats (deployed 2026-10-20)

Owner asked (2026-10-20) that Outpost Zero require sign-in so they can track stats, then
allowed **one free match** first.
- `public/games/outpost-account.js`: `requireSignIn()` (called at the end of
  `outpost-zero.html`) asks `POST /api/games/outpost-stats {op:"me"}`. Signed out with no
  free match used (localStorage `midnry-outpost-guest` = {played, pending}): play. After the
  free match (`recordMatch()` gets 401) the match is kept as `pending` and 6 s later "Sign in to
  keep playing" covers the game (Create account / I have an account →
  `/login?next=/games/outpost-zero[?room=…]`, top-level navigation, `<midnry-fps>` inert).
  Once signed in, `pending` is filed and the key removed. `recordMatch()` is called from
  `Retention.finish()` (so training/practice never count). The free-match count is per
  device and only guides players; stats only ever come from signed-in sessions.
- Server: `src/routes/api/games/outpost-stats.ts` (`requireUserId`, never a client id) →
  `src/games/outpost/stats.server.ts` (validated/capped, 300 matches/user/day, dedupe on
  round id). Table `outpost_match` (`migrations/0018_outpost_matches.sql`).
- Owner view: "Outpost Zero" section on `/stats` (admin only, `outpostAdminStats` in
  `src/games/outpost/stats.functions.ts`): players/matches 7/30 d, hours, matches per day,
  modes (win %), website vs desktop app, per-player table.
- Desktop app: login pages (`/login`, `/api/auth/*`) and the provider's pages open in the app
  window; afterwards any site page sends the window back to the game. The user agent drops
  the Electron token so Google accepts it (email/password always works).
- **QA:** `scripts/qa/dev-up.sh` sets `OUTPOST_QA_PLAYER=1` (signed-out test browsers play as
  a stand-in whose matches are not stored; ignored when `RENDER` is set) and
  `ADMIN_EMAIL=qa-admin@example.test` (local only). A dev server started any other way shows
  the sign-in screen to every QA script. The cookie `outpost-qa-signed-out=1` gets the real
  answer: `node scripts/qa/outpost-signin.mjs` (free match → gate laptop+phone → register →
  free match filed + second match → /stats; returning device + room code)
  and `xvfb-run -a node scripts/qa/desktop-app.mjs` (includes in-app sign-in).
- `scripts/check-auth-invariant.test.mjs` / `migration-plan.test.mjs` each have one
  template test that already failed before this change (not related).

## Key art on the loading screen (deployed 2026-10-20)

Owner supplied painted key art (AI-assisted; Steam requires an AI-content disclosure on the
store submission). `public/games/loading/{bp-key,ls-outpost,ls-estate}-{wide,tall}.webp`
(1672×941 / 941×1672). Slides 1–3 of the loading slideshow in `outpost-zero.html`; the
`KEY_ART` set picks the tall cut on `max-aspect-ratio: 4/5` screens, and `.mf-logoart` hides
the screen's own brand line (the art has the logo painted in), lightens the top shade and
shadows the captions. `node scripts/qa/loading-art.mjs` screenshots laptop + phone;
`scripts/check-outpost-loading.mjs` follows the 8-slide order.

## Wreck Estate + Skyport art pass (deployed 2026-10-20)

- `scripts/outpost-military/arena-style.js` replaces `arena-dust.js`: `ARENAS` holds one config per
  Last Signal arena (kit pieces per wall type, box-wall surfaces per wall type, ground, prop
  dressing); `ArenaStyles` is `renderer.arenaStyle` (`of(id)`, `readyFor(id)`, `owns(id,type)`,
  `wallMaterial`, `walls`, `ground`, `dress`). Dust loads behind the opening loading screen;
  Estate and Skyport load in the background right after (`renderer.loadArenaStyle`). Arena
  textures are `sharedSource` (stay on the GPU across rebuilds). Props cast shadows only on High.
- Wreck Estate: hedges (type 2) and stone planters (3) as kit pieces; types 1/4/5 lime render
  (`villa-plaster`, tinted); travertine paving ground. Skyport: air-cargo containers (2) and
  cargo pallets (3); type 1 poured concrete, type 5 terminal cladding; concrete slab apron; cones.
- Kit-owned tiles get no steel panel fittings, door frames or wall signs.
- Sandbag barriers (all arenas) are now one merged emplacement filling the 2.5 m footprint
  (`sandbagEmplacement` in `realism-hazards.js`) instead of spaced, floating-looking bags: squarish
  flattened sacks, per-bag tint and contact shading (vertex colours), woven `sandbag` cloth texture
  (`procedural-textures.py`) via `arenaStyle.sandbagMaterial()`.
- Pipeline: `python3 scripts/assets/arena-textures.py`, `python3 scripts/assets/procedural-textures.py`,
  Blender `scripts/assets/kit-estate.py` / `kit-skyport.py` (shared `kit_common.py`), props with
  `PACK_RATIO=0.05 PACK_ERROR=0.006 node <tools>/pack-props.mjs …`, then `node scripts/build-outpost-cache.mjs`.
- Budget (`node scripts/qa/arena-look.mjs <tag> estate|skyport 1280|390`, views include close-ups
  `hedge`, `uld`, `cargo`): laptop ≤ ~360k tris / ~290 calls, phone ≤ ~300k (a frame that also
  refreshes shadows can read ~2× higher).
- **Remind the owner about Steam** after this release: they need a Steamworks account ($100 app
  fee) and to send the App ID; then achievements, cloud saves, Steam Deck checks.

## Drifting sky + key-art finish (deployed 2026-10-20)

- `scripts/outpost-military/sky-clouds.js` (`renderer.clouds`): a shader cloud layer (upper
  hemisphere, radius 240 inside the 260 m far plane, follows the camera, renderOrder -2 so storm
  skies draw over it) with wind drift, sun-side rims and self-shadow; the sky photograph also
  turns slowly (`scene.backgroundRotation`, environment lighting fixed). Driven by round time;
  still under reduced motion; dim at night; 4 noise octaves on phones. QA:
  `node scripts/qa/sky-clouds.mjs [width]` (off / on / two minutes later).
- Key art: owner's originals are kept in gitignored `assets-src/key-art/*.png`;
  `scripts/assets/key-art-finish.py` (needs OpenCV: a venv with opencv-python-headless) applies a
  print finish (edge-preserving smoothing, ink lines, halftone, grade, paper grain) and writes
  `public/games/loading/*.webp`. It cannot redraw bad hands/guns — that needs an illustrator.

## Modelled first-person weapons (deployed 2026-10-20)

- `scripts/assets/kit-weapons.py` (Blender, shared `kit_common.py`) builds
  `public/games/military/models/weapons-v2.glb`: carbine (body, magazine, bolt, handle, glass),
  pump shotgun (body, pump, breacher) and striker pistol (frame, slide). Node names are
  `<weapon>--<part>`: three.js strips "/" from node names (this also broke multi-part props in the
  arena prop packs until `pack-props.mjs` switched to "--").
- `realism-carbine.js`: `prepareWeaponKit`, `buildModelledCarbine` (falls back to the procedural
  carbine until the GLB loads), `buildModelledShotgun` (Sunburst; Gatebreaker adds the breacher
  muzzle; pump racks with recoil), `buildModelledPistols` (Twinwire; slides kick). Modelled meshes
  are tagged `userData.modelled` so `batchWeapon` leaves their baked occlusion alone and
  `finishWeapon` skips the old procedural detail. Cerakote drops the photo colour map.
- Framing (`updateWeapon` / render): long guns sit at x 0.175, z +0.035, yaw -0.045; reloads tilt
  the gun towards the camera instead of dropping it out of frame; Twinwire is lifted 0.06.
- Not modelled yet: launcher, fusecaster/shardpod, blades/scythe, knuckles (still procedural).
- QA: `node scripts/qa/weapon-look.mjs <tag> [width] [weapons]` (rest + mid-reload shots).

## Store: weapon finishes (deployed 2026-10-20)

Owner: "go with your defaults" (premium cosmetics ₦1,500–3,000 via Paystack, Pass perk).
- Why finishes, not outfits: in Protocol/Signal every soldier wears the plain uniform dyed by
  seat colour (`soldierLook()`), so premium outfits would be invisible; the old XP weapon
  finishes were selectable but never rendered (`paint()` had no callers). Finishes now render on
  your own first-person gun (`applyFinish` in `realism-carbine.js`; not on spectated players).
- Catalog: `public/games/outpost-finishes.js` (+ `.d.ts`), shared by Locker, renderer and server:
  4 XP finishes (free), 5 premium (Tiger ₦1,500, Desert Pixel ₦1,500, Carbon ₦2,000, Damascus
  ₦2,500, Red Haze ₦3,000, glowing), 1 Pass finish (Midnry Signal). `drawFinish()` paints swatches.
- Server: `migrations/0019_outpost_store.sql` (`outpost_purchase`), `src/games/outpost/store.server.ts`
  (`storeState`, `beginPurchase` → Paystack initialize in **NGN** with metadata purpose
  `outpost_item`, `confirmPurchase` → verify; `settle` checks reference/user/item/amount/currency),
  `POST /api/games/outpost-store` {state|buy|confirm}; webhook `charge.success` with purpose
  `outpost_item` → `applyItemCharge` (`src/lib/paystack.server.ts` dispatch). Callback returns to
  `/games/outpost-zero?purchase=<ref>` (route passes it to the game; desktop app keeps it).
- Game: `public/games/outpost-store.js` (ownership cache `midnry-outpost-store`), Locker grid in
  `outpost-retention.js` (`finishGrid`, `finishUsable`, `weaponFinish`). Stats page: Store section.
- **Both currencies** (owner connected NGN and USD on Paystack): each premium finish has
  `price: { NGN, USD }` (₦1,500/2,000/2,500/3,000 · $1.49/1.99/2.49/2.99). The Locker has a
  ₦ Naira / $ Dollars switch (`midnry-outpost-currency`; default by time zone Africa/Lagos → NGN);
  `buy` sends the currency, the row stores it, `settle` checks it. Stats shows revenue per currency.
- QA: `scripts/qa/mock-paystack.mjs` (stand-in Paystack on :8099; `dev-up.sh` points the local
  server at it via `OUTPOST_QA_PAYSTACK_URL`, ignored when `RENDER` is set) and
  `node scripts/qa/outpost-store.mjs` (buy round trip, webhook-only, tampering, phone, admin);
  `node scripts/qa/finish-look.mjs` (every finish on the gun). Store API calls in Playwright must
  run inside a page: the `__Host-` session cookie is Secure.

## Loading screens (owner, 2026-10-20)

- Opening loading screen: one painting only (`bp-key`, wide/tall); the briefings and tips still
  rotate over it (`outpost-zero.html` slideshow; `check-outpost-loading.mjs`).
- Last Signal: every new round opens on the owner's round painting (`SceneTransition.showSignal`
  in `outpost-transition.js`): `loading/ls-round-tall.webp` (phones) and `ls-round-wide.webp`
  (portrait art on the right over a blurred enlargement, `scripts/assets/key-art-wide.py`);
  source `assets-src/key-art/ls-round.png`, finished with `key-art-finish.py … 1.4` (stronger
  smoothing). The older `ls-outpost`/`ls-estate` paintings were removed. Painted screens stay
  at least 1.6 s. Blackout Protocol keeps its base/medevac screens.
  QA: `node scripts/qa/signal-loading.mjs [width] [pick]` (`HOLD=1` keeps it open for a photo).

## Menu fixes: mode-switch crash, Play chooses nothing (owner report, 2026-10-20)

- Crash: every Blackout ↔ Last Signal switch in the menu rebuilt the whole hidden 3D arena
  (6–35 s freezes in QA, textures 65 → ~180). The loop in `outpost-zero.html` now skips
  `render()` while the opaque home menu covers the scene (`.mf-modal.mf-home`, not running or
  online); the arena is built when Play starts, behind the round screen (Last Signal) or the
  base screen (`outpost-transition.js` also shows it when the renderer still holds another
  mode's arena: `military.mapKey !== map`). QA: `node scripts/qa/mode-switch.mjs [width] [n]`
  (memory flat: 81 geometries / 63 textures over 20 switches).
- Play: `OutpostMenu.gameChosen` (saved `midnry-outpost-mode`, or any pick). Unchosen: the big
  button reads "CHOOSE A GAME ↓", a capturing click guard scrolls to and pulses the game cards
  instead of starting, nothing is shown selected and step 2 waits (`data-unchosen`). Chosen:
  "PLAY LAST SIGNAL →" / "PLAY BLACKOUT PROTOCOL →" (`playLabel()`, also used by
  `outpost-ui.js`). QA: `node scripts/qa/play-choice.mjs [width]`. Older QA that clicks
  `.mf-start` directly must set `localStorage["midnry-outpost-mode"]` first.
