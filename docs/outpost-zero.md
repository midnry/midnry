# Midnry — Outpost Zero

`public/games/outpost-zero.html` is the complete prototype. It contains all CSS, JavaScript, map data, procedural art and controls. No dependencies, network requests, external fonts, assets or build steps are needed. Open it in a browser, or upload it to your Midnry static assets directory.

## Midnry integration

The homepage links to `/discover/outpost-zero`, which launches `/games/outpost-zero`. That route embeds the static HTML with a return link to Midnry. Both routes are included in the sitemap. No account or subscription is required.

## Embed elsewhere

For the strongest isolation from your site's existing CSS and scripts, serve the file as `/games/outpost-zero.html`, then embed:

```html
<iframe
  src="/games/outpost-zero.html"
  title="Midnry — Outpost Zero"
  style="display:block;width:100%;height:80dvh;min-height:420px;border:0"
  allow="fullscreen"
></iframe>
```

A regular iframe supports pointer lock. If your platform adds a `sandbox` attribute, it must include `allow-scripts allow-pointer-lock`; include `allow-same-origin` only if appropriate for your trusted hosting setup. Avoid sandboxing requirements when your site does not need them. Pointer lock needs a user gesture. Arrow keys can turn if your browser or hosting platform blocks it.

For inline integration, copy the `<style>` and `<script>` blocks once into your page, and insert:

```html
<midnry-fps style="height:80dvh;min-height:420px"></midnry-fps>
```

Do not copy the standalone file's `<body>` style to your host page. Every stylesheet selector starts with `midnry-fps`, and JavaScript is wrapped in a private closure. The sole registered name is the `midnry-fps` custom element. Instance state and input are separate; removing an instance cancels its animation, disconnects its observer and unregisters its listeners. Host styles that target all buttons/canvases may still affect an inline embed; use the iframe for full CSS isolation.

## Controls and rules

- Desktop: WASD to move; mouse to aim; hold left click or Space to fire; R to reload; Shift to sprint; Escape, P or the pause button to pause. Arrow keys move forward/backward and turn.
- Mobile: left joystick to move; drag the canvas on the right to aim; hold FIRE to shoot; R to reload. Landscape gives a wider view of the arena.
- Defeat six drones, each requiring three hits from the base weapon. Drones slowly approach when they see you and deal periodic damage within range. Wall cover blocks visibility and shots.
- The carbine has a 24-round magazine, unlimited reserves and a 1.4-second reload. Reloading is manual unless you try firing an empty magazine.
- Redeploy after winning or losing. Pausing freezes combat and reload timers.

## Engine and extension guide

The prototype already implements the requested first steps for shooting, enemies and a weapon. Extend these named pieces:

| Feature | Where to edit | How it works / what to add |
| --- | --- | --- |
| Arena | `LEVEL` | Equal-length rows of tile IDs. `0` is walkable, `1` is sandstone, `2` teal steel, `3` hazard walls. Keep the perimeter closed. |
| Raycasting | `cast()` and `drawWorld()` | Grid DDA finds each wall. Camera-plane rays produce perpendicular distances, avoiding fisheye. A depth buffer clips enemy sprites against walls. |
| Movement | `update()`, `canMove()`, `move()` | Delta-time movement, diagonal normalization, player-radius collision and sliding along walls. Edit walking/sprint speeds here. |
| Shooting | `shoot()` | A hitscan ray picks the nearest enemy within its hit radius, before the first wall. A simple vertical tolerance follows the shifted horizon. Edit cooldown, magazine size and damage here. For headshots, add a distinct height range; for projectiles, update projectile positions and test the segment against walls each frame. |
| Enemies | `reset()`, `update()` | Spawn coordinates, health, line of sight, approach speed and attack timing. Add pathfinding around pillars for more advanced behavior; currently blocked drones stay behind cover. |
| Enemy art | `droneSprite()`, `drawEnemies()` | Original procedural comic robot billboard; visible pixel strips are depth-tested. Replace the generated canvas with your own sprite sheet and select animation frames before drawing each strip. |
| First-person weapon | `drawWeapon()` | Layered outlined polygons with walk bob, recoil, reload dip and muzzle flash. Replace with a sprite animation or add an aim-down-sights interpolation. |
| HUD / menus | `connectedCallback()`, `updateHUD()` | Component-scoped markup. Add score, weapon switches, options or mission variants here. |
| Touch / keyboard | `bindInputs()` | Scoped keyboard input, pointer capture for touch and pointer lock for desktop. Tune mouse and drag sensitivity here. |
| Audio | `shoot()`, `reload()`, enemy damage in `update()` | Add Web Audio or embedded audio assets, initializing audio only after Deploy is clicked. |

This is an original comic-styled training prototype: flat cel colors, dark outlines, warm sandstone, teal metal, hazard bands and drawn weapons. It uses no Call of Duty or Borderlands assets. It does not yet include multiplayer, audio, jumping, advanced pathfinding, persistence or a full weapon inventory. Vertical aiming is a shifted raycast horizon, not true 3D geometry.

## Validation

The prototype was checked with Chromium through Playwright. It checks movement, wall collision, DDA distances, hitscan damage and kills, wall-blocked shots, reloads, pause state, multiple instances, teardown and mobile joystick cancellation. Desktop and mobile renders were visually inspected. Touch was checked in browser emulation, not on physical devices.


## Last Signal · Solo

Select **LAST SIGNAL · SOLO** in the Deploy menu. This is an offline, single-player survival match: you and seven AI rivals spawn in shuffled, separate positions. Rivals fight one another, break crates, collect cores and navigate around cover. Eliminate or outlast every rival to win. Death ends your match; Deploy resets the arena and every power-up. Selecting a mode starts a new match.

| Original concept | Outpost Zero name | Rules |
| --- | --- | --- |
| Last-player-standing mode | Last Signal | Eight combatants, one survivor |
| Breakable loot boxes | Supply Crates | 80 health, block movement and shots, drop one Charge Core |
| Permanent match boosts | Charge Cores | Each adds 25 maximum/current health and 8 weapon damage until the match ends |
| Closing hazard | Red Haze | Starts after 12 seconds, closes over 150 seconds, final safe square stays centered on clear floor |
| Safe zone | Safe zone | Mint outline on the map; red shading marks the hazardous region |

The VX–7 starts at 40 damage; rival bots start at 16. Core boosts apply to both player and bots. Gas damage applies to everyone outside the safe rectangle and increases with elapsed match time and uninterrupted exposure. Returning inside clears the exposure bonus. Pausing freezes all match timers.

Key extension points: `reset()` (spawn and loot layout), `damage()` (crate drops and eliminations), `collectCores()` (permanent upgrades), `updateZone()` / `applyHaze()` (hazard timing), `updateRival()` / `pathTo()` (AI competition and navigation), `checkResult()` (last-survivor condition), and `drawHaze()` / `drawMap()` (hazard visualization).

This iteration supports Solo with AI. Online multiplayer and the optional two-person **Pair Ops** variant with limited teammate-dependent redeployments are not implemented.

The focused browser rule checks are in `scripts/check-outpost-zero.mjs`. Run with `node scripts/check-outpost-zero.mjs` after installing Playwright's Chromium, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an existing Chromium binary. It verifies both desktop and mobile emulation, including power stacking, crate occlusion, bot competition, increasing gas damage, win/loss, replay and the original Field Ops contract.
