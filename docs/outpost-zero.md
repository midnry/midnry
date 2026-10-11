# Midnry — Outpost Zero

The game uses two small static files: `public/games/outpost-zero.html` (Canvas rendering, procedural art, scoped CSS, controls and lobby) and `public/games/outpost-sim.js` (shared match rules). Serve both from the same directory over HTTP. Offline play needs no backend or external assets; online rooms use the Midnry API and database. No game framework is required. ES modules require a web server rather than opening a local file directly.

## Midnry integration

The homepage links to `/discover/outpost-zero`, which launches `/games/outpost-zero`. That route embeds the static HTML with a return link to Midnry. Both routes are included in the sitemap. No account or subscription is required.

## Embed elsewhere

For the strongest isolation from your site's existing CSS and scripts, serve both files in `/games/`, then embed:

```html
<iframe
  src="/games/outpost-zero.html"
  title="Midnry — Outpost Zero"
  style="display:block;width:100%;height:80dvh;min-height:420px;border:0"
  allow="fullscreen"
></iframe>
```

A regular iframe supports pointer lock. If your platform adds a `sandbox` attribute, it must include `allow-scripts allow-pointer-lock`; include `allow-same-origin` only if appropriate for your trusted hosting setup. Avoid sandboxing requirements when your site does not need them. Pointer lock needs a user gesture. Arrow keys can turn if your browser or hosting platform blocks it.

For inline integration, copy the `<style>` and module `<script>` blocks once (adjust the simulation import to its hosted URL) into your page, and insert:

```html
<midnry-fps style="height:80dvh;min-height:420px"></midnry-fps>
```

Do not copy the standalone file's `<body>` style to your host page. Every stylesheet selector starts with `midnry-fps`, and JavaScript is wrapped in a private closure. The sole registered name is the `midnry-fps` custom element. Instance state and input are separate; removing an instance cancels its animation, disconnects its observer and unregisters its listeners. Host styles that target all buttons/canvases may still affect an inline embed; use the iframe for full CSS isolation.

## Controls and rules

- Desktop: WASD to move; mouse to aim; hold left click or Space to fire; R to reload; Shift to sprint; Escape, P or the pause button to pause. Arrow keys move forward/backward and turn.
- Mobile: left joystick to move; drag the canvas on the right to aim; hold FIRE to shoot; R to reload. Landscape gives a wider view of the arena.
- Defeat six drones, each requiring three hits from the base weapon. Drones slowly approach when they see you and deal periodic damage within range. Wall cover blocks visibility and shots.
- The carbine has a 24-round magazine, unlimited reserves and a 1.4-second reload. Reloading is manual unless you try firing an empty magazine.
- Redeploy after winning or losing. Offline pausing freezes combat and reload timers. Online menus neutralize your input while the match continues.

## Engine and extension guide

The prototype already implements the requested first steps for shooting, enemies and a weapon. Extend these named pieces:

| Feature             | Where to edit                                      | How it works / what to add                                                                                                                                                                                                                                                                                                         |
| ------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arena               | `outpost-sim.js: LEVEL`                            | Equal-length rows of tile IDs. `0` is walkable, `1` is sandstone, `2` teal steel, `3` hazard walls. Keep the perimeter closed.                                                                                                                                                                                                     |
| Raycasting          | `cast()` and `drawWorld()`                         | Grid DDA finds each wall. Camera-plane rays produce perpendicular distances, avoiding fisheye. A depth buffer clips enemy sprites against walls.                                                                                                                                                                                   |
| Movement            | `update()`, `canMove()`, `move()`                  | Delta-time movement, diagonal normalization, player-radius collision and sliding along walls. Edit walking/sprint speeds here.                                                                                                                                                                                                     |
| Shooting            | `shoot()`                                          | A hitscan ray picks the nearest enemy within its hit radius, before the first wall. A simple vertical tolerance follows the shifted horizon. Edit cooldown, magazine size and damage here. For headshots, add a distinct height range; for projectiles, update projectile positions and test the segment against walls each frame. |
| Enemies             | `Arena.constructor()`, `updateRival()`, `pathTo()` | Spawn coordinates, health, line of sight, grid pathfinding and attack timing.                                                                                                                                                                                                                                                      |
| Enemy art           | `droneSprite()`, `drawEnemies()`                   | Original procedural comic robot billboard; visible pixel strips are depth-tested. Replace the generated canvas with your own sprite sheet and select animation frames before drawing each strip.                                                                                                                                   |
| First-person weapon | `drawWeapon()`                                     | Layered outlined polygons with walk bob, recoil, reload dip and muzzle flash. Replace with a sprite animation or add an aim-down-sights interpolation.                                                                                                                                                                             |
| HUD / menus         | `connectedCallback()`, `updateHUD()`               | Component-scoped markup. Add score, weapon switches, options or mission variants here.                                                                                                                                                                                                                                             |
| Touch / keyboard    | `bindInputs()`                                     | Scoped keyboard input, pointer capture for touch and pointer lock for desktop. Tune mouse and drag sensitivity here.                                                                                                                                                                                                               |
| Audio               | `shoot()`, `reload()`, enemy damage in `update()`  | Add Web Audio or embedded audio assets, initializing audio only after Deploy is clicked.                                                                                                                                                                                                                                           |

This is an original comic-styled training prototype: flat cel colors, dark outlines, warm sandstone, teal metal, hazard bands and drawn weapons. It uses no Call of Duty or Borderlands assets. It includes AI pathfinding and server-authoritative online rooms. It does not include audio, jumping, saved progression or a full weapon inventory. Vertical aiming is a shifted raycast horizon, not true 3D geometry.

## Validation

The prototype was checked with Chromium through Playwright. It checks movement, wall collision, DDA distances, hitscan damage and kills, wall-blocked shots, reloads, pause state, multiple instances, teardown and mobile joystick cancellation. Desktop and mobile renders were visually inspected. Touch was checked in browser emulation, not on physical devices.

## Last Signal · Solo

Select **LAST SIGNAL · SOLO** in the Deploy menu. Offline, this is a single-player survival match: you and seven AI rivals spawn in shuffled, separate positions. Rivals fight one another, break crates, collect cores and navigate around cover. Eliminate or outlast every rival to win. Death ends your match; Deploy resets the arena and every power-up. Selecting a mode starts a new match.

| Original concept          | Outpost Zero name | Rules                                                                                             |
| ------------------------- | ----------------- | ------------------------------------------------------------------------------------------------- |
| Last-player-standing mode | Last Signal       | Eight combatants, one survivor                                                                    |
| Breakable loot boxes      | Supply Crates     | 80 health, block movement and shots, drop one Charge Core                                         |
| Permanent match boosts    | Charge Cores      | Each adds 25 maximum/current health and 8 weapon damage until the match ends                      |
| Closing hazard            | Red Haze          | Starts after 12 seconds, closes over 150 seconds, final safe square stays centered on clear floor |
| Safe zone                 | Safe zone         | Mint outline on the map; red shading marks the hazardous region                                   |

The VX–7 starts at 40 damage; rival bots start at 16. Core boosts apply to both player and bots. Gas damage applies to everyone outside the safe rectangle and increases with elapsed match time and uninterrupted exposure. Returning inside clears the exposure bonus. Pausing freezes all match timers.

Key extension points: `reset()` (spawn and loot layout), `damage()` (crate drops and eliminations), `collectCores()` (permanent upgrades), `updateZone()` / `applyHaze()` (hazard timing), `updateRival()` / `pathTo()` (AI competition and navigation), `checkResult()` (last-survivor condition), and `drawHaze()` / `drawMap()` (hazard visualization).

## Pair Ops · Duo

Select **PAIR OPS · DUO**. Eight combatants form four teams of two. Offline, an AI partner covers your team. Friendly fire is blocked. Each player has two redeployments, each after eight seconds, provided a teammate remains alive. A team wipe cancels pending returns. While waiting, the camera follows a living teammate. Death drops collected cores; returning gives base health, base damage and a fresh magazine. The last living pair wins.

## Online rooms

Choose Solo or Duo, open **PLAY ONLINE / ROOM CODE**, then **CREATE ROOM**. Copy the invite link or share the six-character code. Friends open the link and tap **JOIN**. Duo players can choose a pair in the lobby; each pair has two seats. The host starts the match and bots fill empty seats, up to eight combatants. No account is required. Field Ops remains offline.

Online games continue while menus are open. Leaving forfeits your combatant and transfers hosting. Silent inputs stop after 700 ms; after 20 seconds a disconnected player forfeits. A finished match can be returned to the lobby by the host. Reloading a page loses its temporary room session; rejoin before the match starts or create another room. Rooms expire after 20 minutes of inactivity.

`src/routes/api/games/outpost.ts` handles same-origin POST requests. `src/games/outpost/rooms.server.ts` authorizes random guest session tokens, sanitizes inputs, advances the shared simulation and stores versioned snapshots in `outpost_room` (migration `0016`). Clients send controls, never trusted positions, health or damage. Optimistic database updates prevent overlapping polls from overwriting one another. Session tokens are held in memory; only their hashes are stored. Responses contain no session hashes or other players’ tokens.

This is casual multiplayer using roughly 10 HTTPS polls per second per active client, with snapshot interpolation. Latency depends on hosting and player distance; this is not a competitive low-latency socket service. Simulation advances on room requests, with bounded catch-up. Creation has a per-process limit of 12 rooms per minute per client address and a database cap of 1,000 rooms; these are basic safeguards, not distributed rate limiting. Online integration on another site requires deploying the API, shared simulation and migration against Postgres, and serving the iframe from that API origin. Static-only hosting supports AI play.

Validation: `node --test scripts/outpost-sim.test.mjs` checks team damage, redeployment limits, upgrades, forfeits and victory. `node scripts/check-outpost-online.mjs [baseURL]` tests concurrent eight-player joins, permission failures, untrusted state rejection, separate desktop/mobile clients, firing replication, online menus and host transfer.

The focused browser rule checks are in `scripts/check-outpost-zero.mjs`. Run with `node scripts/check-outpost-zero.mjs` after installing Playwright's Chromium, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an existing Chromium binary. It verifies both desktop and mobile emulation, including power stacking, crate occlusion, bot competition, increasing gas damage, win/loss, replay and the original Field Ops contract.
