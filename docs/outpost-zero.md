# Midnry — Outpost Zero

The game uses four small static files: `public/games/outpost-zero.html` (Canvas rendering, procedural art, scoped CSS, controls and lobby) and `public/games/outpost-sim.js` (shared match rules), and `public/games/outpost-content.js` (maps, palettes, scenery and weapon definitions), plus `public/games/outpost-academy.js` (tutorial, field guide and graphics materials). Serve all four from the same directory over HTTP. Offline play needs no backend or external assets; online rooms use the Midnry API and database. No game framework is required. ES modules require a web server rather than opening a local file directly.

## Midnry integration

The homepage links to `/discover/outpost-zero`, which launches `/games/outpost-zero`. That route embeds the static HTML with a return link to Midnry. Both routes are included in the sitemap. No account or subscription is required.

## Embed elsewhere

For the strongest isolation from your site's existing CSS and scripts, serve all four files in `/games/`, then embed:

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

- Desktop: WASD to move; mouse to aim; hold left click or Space to fire; R to reload; Shift to sprint; Escape, P or the pause button to pause; Q to activate a charged ability. Arrow keys move forward/backward and turn.
- Mobile: left joystick to move; drag the canvas on the right to aim; hold FIRE to shoot; R to reload; tap the charged ability button to use a super. Landscape gives a wider view of the arena.
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

This is an original comic-styled training prototype: flat cel colors, dark outlines, warm sandstone, teal metal, hazard bands and drawn weapons. It uses no Call of Duty or Borderlands assets. It includes AI pathfinding and server-authoritative online rooms. It does not include audio, jumping, saved progression or weapons picked up/swapped mid-round. Vertical aiming is a shifted raycast horizon, not true 3D geometry.

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

## Arena and loadout expansion

The original Dust Outpost is joined by four original arenas. These use layout ideas from the requested references without reusing their geometry or artwork. All have sealed boundaries, connected walkable lanes, legal spawn points and an unobstructed final safe square.

| Arena        | Size    | Layout                                                                                                     |
| ------------ | ------- | ---------------------------------------------------------------------------------------------------------- |
| Test Block   | 16 × 16 | Facing teal/coral test houses with window trim, a central street, back-garden lanes and mannequin props    |
| Skyport      | 24 × 24 | Boarding terminal, aircraft cabin, baggage cover and an outdoor apron; blue glass and white fuselage walls |
| Freight Rush | 12 × 12 | Four container blocks, a cross-shaped center and short rotations                                           |
| Wreck Estate | 20 × 20 | Three lanes around a downed rotorcraft, villa rooms and a turquoise pool court                             |

Geometry stays in the flat 2.5D raycaster. There are no playable upper floors. Vaults cross interior cover and choose a walkable landing spot; they are abilities in the flat simulation, not free jumping. Scenery billboards and painted pool/street zones are decorative. Interior cover can be broken by specified supers; perimeter walls always remain sealed. Offline loadout/map changes begin a fresh round. Online maps are host-selected and loadouts are individual lobby choices, locked when a match starts.

| Loadout        | Main attack                                                                   | Charged ability                                                          |
| -------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| VX–7 Carbine   | Accurate automatic hitscan                                                    | Overdrive: five stronger burst shots                                     |
| Sunburst       | Five spread pellets with distance falloff                                     | Shockwave: wide heavy blast, knockback and nearby cover break            |
| Twinwire       | Three accurate pistol shots per trigger                                       | Crossfire: nine sweeping shots                                           |
| Gatebreaker    | Seven heavy close-range pellets                                               | Breach Run: forward rush that breaks cover and shoves rivals             |
| Shardpod       | Thrown pod bursts into eight radial shards                                    | Bramble Field: five-second damaging and slowing zone                     |
| Mirage         | Four spinning blades with distance falloff                                    | Ghost Step: five-second cloak; attack, damage or nearby rivals break it  |
| Viperfan       | Three poison darts; poison ticks for three seconds and reduces healing to 35% | Venom Vault: cover-crossing leap with poison fans at takeoff and landing |
| Pulse Knuckles | Close punches heal 30% of damage dealt to rivals                              | Impact Leap: landing splash and three-second speed boost                 |
| Rift Scythe    | Short dash with a melee swing                                                 | Echo Rush: longer dash and healing spectral shots                        |
| Flare Launcher | Impact rocket with wall-occluded splash                                       | Skyfall: five marked timed blasts around the aimed position              |
| Fusecaster     | Two arcing fuses can cross walls before exploding                             | Big Bang: heavy arcing barrel breaks nearby cover and knocks rivals back |

All magazines reload in 1.4 seconds with unlimited reserves. A player’s power rating begins at 40; each core adds 8, scaling the selected weapon and super. Bots start at 16 and use the same weapon rules in survival. Supers charge from actual damage (60% against combatants, 20% against crates) up to 100; activation spends charge, though damage during the ability can start charging the next one. Death clears abilities/statuses and charge. Friendly fire never charges or heals you. Poison suppresses both lifesteal and pickup healing. Invisible foes are hidden from the viewport and minimap outside the proximity reveal range; partners remain visible.

Damage snapshots carry a monotonic sequence, cumulative HP loss and source angle. The renderer uses these for a red edge vignette, floating HP loss, directional threat arrow, short screen shake, critical-health color and hit confirmations. Reduced-motion users keep the visual warnings without the shake. Effects use match time, so offline pausing freezes projectiles, poison, bursts, fields and ability timers.

Extension points: `outpost-content.js` defines `MAPS`, `WEAPONS`, shells, floor paint and scenery; `outpost-sim.js` implements `shoot`, `super`, `updateEffects`, `blast`, `dash`, `leap`, `damage` and serialization. `outpost-zero.html` implements `updateKit`, `observeCombat`, `drawAlternateWeapon`, `propSprite` and `drawCombatEffects`. Room operations `settings` and `loadout` validate choices; the server ignores client-supplied charge, damage and weapons during play. Existing rooms default to the carbine/Outpost during a rolling deployment.

Additional validation: `node scripts/outpost-expansion.test.mjs` checks map connectivity, all loadouts, magazine sizes, falloff, bursts, poison, lifesteal, projectile occlusion, arcing attacks, cover destruction, cloaking, slows and charge. `node scripts/check-outpost-expansion.mjs [baseURL]` renders every new map on desktop/mobile, exercises all eleven keyboard/touch ability controls and checks visible damage warnings. The online check also verifies host-only maps, individual loadouts, map replication and lobby locking.

## Boot Camp, field guide and graphics

The deployment menu has **Boot Camp**, **Field Guide** and **Graphics** buttons. Boot Camp is an isolated offline practice arena with seven steps: move, defeat a stationary target, reload, break a crate, collect its core, activate Overdrive, then learn survival/team rules. Steps advance from actual actions, with skip and exit buttons. P releases desktop pointer lock to use those buttons. Returning to normal play creates a fresh arena; practice charge and AI changes never enter multiplayer. Joining a room exits practice.

The field manual generates overhead layouts for all five maps and base stats/ability descriptions for all eleven weapons directly from the shared catalog. The native modal supports keyboard focus containment and Escape. Online matches continue behind menus.

Graphics presets: Performance (720px / 128-texel materials), Balanced (960px / 256 texels), High (1440px / 512 texels), capped by viewport width. Higher presets use denser floor sampling and higher-resolution character/loot art. Cached procedural wall textures include mortar, bolts, hatching and scratches; mip levels reduce distant aliasing. A reusable projected floor pixel buffer avoids per-pixel Canvas drawing calls. Scenery distance, depth-tested contact shadows and stepped material highlights preserve the ink outlines. Shadows and lighting can be toggled independently; preferences persist in device-local storage when available. These are Canvas equivalents, not GPU anisotropic filtering, polygon LOD, screen-space shadow maps or shader programs. Choose Performance on slower devices; no fixed frame rate is guaranteed.

Validation: `node scripts/check-outpost-academy.mjs [baseURL]` exercises the complete tutorial on desktop and touch, checks all guide entries, persists presets, verifies practice cleanup and captures screenshots.
