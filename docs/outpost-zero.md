# Midnry — Outpost Zero

The game uses eight small static files: `public/games/outpost-zero.html` (Canvas rendering, procedural art, scoped CSS, controls and lobby) and `public/games/outpost-sim.js` (shared match rules), and `public/games/outpost-content.js` (maps, palettes, scenery and weapon definitions), plus `public/games/outpost-academy.js` (tutorial, field guide and graphics materials), and `public/games/outpost-art.js` (scenery, animations, lighting and cosmetic effects), `public/games/outpost-retention.js` (sound, results and locker UI) and `public/games/outpost-progression.js` (device-local cosmetic rewards), plus `public/games/outpost-ui.js` (menu hierarchy, shared settings panel and map/weapon previews). Serve all eight from the same directory over HTTP. Offline play needs no backend or external assets; online rooms use the Midnry API and database. No game framework is required. ES modules require a web server rather than opening a local file directly.

## Midnry integration

The homepage links to `/discover/outpost-zero`, which launches `/games/outpost-zero`. That route embeds the static HTML with a return link to Midnry. Both routes are included in the sitemap. No account or subscription is required.

## Embed elsewhere

For the strongest isolation from your site's existing CSS and scripts, serve all eight files in `/games/`, then embed:

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
| Audio               | `outpost-retention.js: FieldAudio / observe()`     | Procedural Web Audio, gesture-unlocked, with volume/mute and teardown. No audio downloads.                                                                                                                                                                                                                                         |

This is an original comic-styled training prototype: flat cel colors, dark outlines, warm sandstone, teal metal, hazard bands and drawn weapons. It uses no Call of Duty or Borderlands assets. It includes AI pathfinding and server-authoritative online rooms. It includes procedural sound and device-local cosmetic progression. It does not include jumping or weapons picked up/swapped mid-round. Vertical aiming is a shifted raycast horizon, not true 3D geometry.

## Validation

The prototype was checked with Chromium through Playwright. It checks movement, wall collision, DDA distances, hitscan damage and kills, wall-blocked shots, reloads, pause state, multiple instances, teardown and mobile joystick cancellation. Desktop and mobile renders were visually inspected. Touch was checked in browser emulation, not on physical devices.

## Last Signal · Solo

Select **Play Solo** in the Deploy menu. Offline, this is a single-player survival match: you and seven AI rivals spawn in shuffled, separate positions. Rivals fight one another, break crates, collect cores and navigate around cover. Eliminate or outlast every rival to win. Death ends your match; Deploy resets the arena and every power-up. Selecting a mode starts a new match.

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

Select **Play Duo**. Eight combatants form four teams of two. Offline, an AI partner covers your team. Friendly fire is blocked. Each player has two redeployments, each after eight seconds, provided a teammate remains alive. A team wipe cancels pending returns. While waiting, the camera follows a living teammate. Death drops collected cores; returning gives base health, base damage and a fresh magazine. The last living pair wins.

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

## Comic scenery and animation

`ComicArt` adds visual details without changing server rules or collision geometry. Arena decoration includes desert cacti/antennae, test-site gardens/mailboxes, terminal baggage carts/beacons, freight pallets/drums, and estate palms/rubble/deck chairs. These props are decorative and give no additional bullet cover. Painted walls include cables, window reflections, safety labels and container corrugation; directional texture orientation keeps lettering readable. Indoor regions have dark panel ceilings and cool light, while exterior surfaces retain warm sunlight. Backgrounds include clouds, airport towers/aircraft, port cranes and test-site silhouettes.

Character billboards have cached walking poses, loadout-colored equipment, pouches, helmet accents and brief hit flashes. Weapon presentation adds reload hand/magazine motion, melee swings, gunfire casings and muzzle smoke. Hit debris, cover fragments, explosion rings and temporary wall impact marks are driven by observed match state. Particle counts, decals, caches and effect histories are bounded, reset between matches, and freeze with offline simulation time. Online visual effects follow server snapshots; cosmetics never send authoritative damage. Reduced-motion preferences disable added limb, weapon and atmospheric motion and keep impact particles static as they fade.

Run `node scripts/check-outpost-art.mjs [baseURL]` for desktop/mobile scene captures, impact/cover/casing/smoke checks, effect limits, pause/reset behavior, reduced motion and a check that rendering does not change match snapshots.

The Midnry iframe includes a graphics-release query parameter, preserving room invite parameters. Static game files send `Cache-Control: no-cache` so returning browsers revalidate stable filenames when a new release arrives.

## Player experience and cosmetic progression

**Settings** in the main menu contains Easy, Normal and Hard bot difficulty, sound volume, mute and graphics controls. **Locker** opens cosmetic rewards. Difficulty changes bot speed, awareness, reaction time and accuracy; health and weapon damage are unchanged. Online settings are host-only and locked during a round. Normal retains the original bot behavior.

The round debrief shows placement (team placement in Duo), eliminations, actual damage to combatants, survival time, cumulative cores collected and level. Crate damage and friendly fire do not count. **PLAY AGAIN** keeps the same mode, map, loadout and difficulty, then starts a two-second countdown with combat and hazard timers frozen. In online rooms, the host starts the rematch for everyone without returning to the lobby; room code, player IDs, teams and loadouts remain intact. Other players wait for the host. The existing deployment button still returns an ended online match to the lobby for setting changes.

Completed rounds award 40 base XP, up to 60 for eliminations, 40 for damage and 40 for cores, plus 40 for a victory. Boot Camp and losses shorter than 15 seconds earn no XP. Completing three rounds and completing rounds with three distinct loadouts each award a one-time 50 XP bonus. Each 150 XP adds a level. Weapon finishes unlock at 200 (Copper Signal), 600 (Glacier Ink) and 1,200 XP (Nightfall); they change only the first-person weapon palette. No combat upgrade, purchase, streak penalty or daily obligation is attached.

Progress and sound preferences save in browser localStorage, with graceful fallback when storage is unavailable. Progress is per browser/device, is not account-synced or competitive proof, and is removed when browser data is cleared. Recent round IDs prevent duplicate rewards. Do not use local XP for trusted leaderboards. Audio initializes only after a user gesture, is voice-limited, and closes with the component.

Checks: `node scripts/outpost-retention.test.mjs` tests reward and shared-simulation rules; `node scripts/check-outpost-retention.mjs [baseURL]` checks desktop/mobile results, rematches, countdown, audio and locker persistence; `node scripts/check-outpost-rematch.mjs [baseURL]` checks server difficulty authority and a same-team online rematch.

## Simplified menu and accessible settings

The menu defaults to Solo and leads with **Play Solo**, **Play Duo**, and **Play Online**. Mode selection happens before **Start Solo / Start Duo**; Online opens room creation and code entry, with the chosen Solo/Duo format explained in the room panel. Connected rooms retain the host and team permissions. Valid invite links open the room panel automatically.

Map and weapon selections each have a compact original Canvas illustration and a short hint. Optional descriptions and keyboard/touch instructions are collapsible. **Practice**, **Tutorial**, **Field Guide**, **Settings**, and **Locker** remain separate secondary actions. The single native Settings dialog groups bot difficulty, sound and graphics; Escape dismisses it and restores focus. Offline gameplay pauses, while online play continues with an explicit notice. The tutorial is disabled while connected to an online room.

Styles remain scoped to `midnry-fps`; room-panel accessibility IDs are unique per instance. Visible focus outlines, native select labels, touch targets of at least 44 pixels, compact portrait layouts and scrollable landscape panels support keyboard and touch use. The new menu changes no server combat rules. Test `node scripts/check-outpost-ui.mjs [baseURL]` for desktop, 390px and 320px mobile widths, landscape, all 16 previews, grouped settings, keyboard activation, pause/resume and invite entry. Browser emulation does not establish physical-device comfort.
