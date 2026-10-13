# Midnry — Outpost Zero

The game is a scoped HTML/JavaScript component with a locally bundled Three.js WebGL renderer (`outpost-military.js`). Canvas is used only for HUD and tactical diagrams. Serve the `public/games/` modules and `public/games/military/` assets over HTTP. Offline play needs no backend or runtime CDN; online rooms use the Midnry API and database. The retired comic art modules and atlases are no longer imported or rendered by the game.

## Current play options

Blackout Protocol is the only public game mode. Choose **Offline** for a full eight-person mission with smart AI, or **Online** to create/join a room with friends and bots filling unused seats. The public room API rejects retired modes; the retained combat simulation is internal compatibility code and has no play entry point.

The compact HUD keeps the scene visible. **Info** opens the medical manifest, patient vitals, map, role orders and infiltrator tactics. Offline play pauses while this panel is open; online play continues. Relevant nearby actions and urgent warnings remain visible. The host navigation hides during play and returns in the menu. Text selection and touch callouts are suppressed on game chrome; room-code, chat and arming-code inputs remain editable.

`outpost-protocol-focus.js` owns the compact presentation. Validate viewport visibility, Info, connection choices and selection with `node scripts/check-outpost-focus.mjs [local-base]`. `check-outpost-protocol.mjs --online` verifies the medical mission and recipient-private eight-player rooms. Bot regression tests cover autonomous supply collection, transport, delivery and actual autopilot recovery.

## Midnry integration

The homepage links to `/discover/outpost-zero`, which launches `/games/outpost-zero`. That route embeds the static HTML with a return link to Midnry. Both routes are included in the sitemap. No account or subscription is required.

## Embed elsewhere

For the strongest isolation from your site's existing CSS and scripts, serve the game modules in `/games/` and copy `public/games/military/` to `/games/military/`, then embed:

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
- Defeat six rivals, each requiring three hits from the base weapon. Rivals slowly approach when they see you and deal periodic damage within range. Wall cover blocks visibility and shots.
- The carbine has a 24-round magazine, unlimited reserves and a 1.4-second reload. Reloading is manual unless you try firing an empty magazine.
- Redeploy after winning or losing. Offline pausing freezes combat and reload timers. Online menus neutralize your input while the match continues.

## Engine and extension guide

Simulation, collision and online authority remain in `outpost-sim.js` and `outpost-protocol.js`. Edit maps and weapons in `outpost-content.js`, and the default base in `outpost-protocol-map.js`. Edit cinematic world, skeletal characters, first-person weapons and effects in `scripts/outpost-military/renderer.js`, then regenerate `outpost-military.js`. Menus and weapon previews live in `outpost-ui.js`; tutorial and field-guide content live in `outpost-academy.js`. The HTML owns scoped styles, input, renderer initialization and graphics recovery.

## Validation

Desktop and mobile browser checks cover real controls, gameplay, the embedded page, direct/old links, failed 3D initialization, retry, GPU context loss, teardown and retired-artwork request prevention. Screenshots are visually inspected. Touch uses browser emulation; physical devices and sustained 120 Hz output require separate hardware testing.

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

Key extension points: `reset()` (spawn and loot layout), `damage()` (crate drops and eliminations), `collectCores()` (permanent upgrades), `updateZone()` / `applyHaze()` (hazard timing), `updateRival()` / `pathTo()` (AI competition and navigation), `checkResult()` (last-survivor condition), and the military renderer / `drawMap()` (hazard visualization).

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

Simulation remains on a single 2.5D plane, with a separate Three.js 3D presentation. There are no playable upper floors. Vaults cross interior cover and choose a walkable landing spot; they are abilities in the flat simulation, not free jumping. Environment details are decorative and do not add collision or new sightlines. Interior cover can be broken by specified supers; perimeter walls always remain sealed. Offline loadout/map changes begin a fresh round. Online maps are host-selected and loadouts are individual lobby choices, locked when a match starts.

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

Graphics presets use the cinematic renderer described below. Performance lowers internal resolution and effects; Balanced and High add reflections and more detailed shadows. All presets retain PBR materials and 3D models. Graphics changes require confirmation and persist on the device.

Validation: `node scripts/check-outpost-academy.mjs [baseURL]` exercises the complete tutorial on desktop and touch, checks all guide entries, persists presets, verifies practice cleanup and captures screenshots.

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

## Graphics confirmation and exiting

Changing a graphics preset, contact shadows or material lighting opens **Apply graphics changes?**. The current renderer and saved preferences stay unchanged until **Apply changes** is chosen. **Cancel** or Escape restores the previous controls and keyboard focus. Sound and difficulty retain their existing behavior. Offline gameplay pauses while dialogs are open; online gameplay continues.

**Exit Game** is available in the main/pause menu. The confirmation explains that an unfinished round ends and leaving online forfeits the player; saved cosmetic rewards remain. Cancel or Escape keeps the session open. Confirming closes audio, input subscriptions and animation timers, and sends the existing room-leave request with keepalive. Standalone play returns to `/`; the Midnry iframe sends an exit message to its parent, which validates both origin and iframe source before returning to Midnry. Embedded hosts without that handler receive a finished-session screen and a return link.

`node scripts/check-outpost-qol.mjs [baseURL]` covers graphics apply/cancel/Escape and saved preferences, saved cosmetic preservation, standalone and embedded exit, rejected messages from the wrong window, online forfeit and host transfer.

## 120 FPS rendering target and 30 FPS animation

The renderer follows the display's animation loop with an adaptive 120 FPS work budget. Sustained expensive frames lower internal resolution, and spare capacity restores detail within bounded limits. Settings displays measured FPS and work time. Skeletal character poses sample at 30 FPS independently of the display rendering loop. Offline pause and reduced-motion preferences stop decorative motion; online presentation continues between server snapshots. Menus render their frozen background less often while input and online timers remain responsive.

120 visible FPS requires a 120 Hz or faster display and sufficient CPU/GPU capacity. Browser refresh limits and power saving can reduce visible FPS. This target is not a physical-device performance certification.

## Accessible game chrome

Menus use a 16px-equivalent baseline with 14px supporting text and device-local 100%, 150% and 200% text sizing in Settings. Browser default font enlargement also reflows the menus. Compact screens scroll vertically; selectors and headings wrap, large text switches to one-column play/loadout layouts, and every button/summary/select/text input has at least a 44-by-44 CSS-pixel hit area. Checkboxes use their full labeled row as a touch target. CSS pixels are a web implementation target rather than native iOS points.

Game and host navigation respect safe-area insets. The game can shrink below its previous 420px minimum in landscape, and compact landscape HUD placement avoids the touch joystick. Buttons provide a pressed state, and text sits on opaque menu backgrounds or dark HUD plates. Settings offers a saved higher-contrast UI option; system increased-contrast preferences also receive contrast styling.

Combat controls are inert while the menu is open. Menu Tab navigation wraps, native dialogs retain focus/Escape behavior, confirmation explanations are associated with their dialog, and a restrained status announcement reports menu/match transitions. Paused menus expose a textual health/ammo/elimination/alive-combatant summary. The viewport describes keyboard and touch alternatives; gameplay still requires visual aiming, so these changes do not establish full VoiceOver gameplay support or HIG certification. System reduced motion remains supported.

Run `node scripts/check-outpost-accessibility.mjs [baseURL]` for desktop, 390px/320px portrait and landscape: hit areas, 200% custom and browser text, contrast preference persistence, focus containment, simulated safe insets, pressed state and match status. Inspect the menu, large-text and gameplay screenshots. Existing menu and confirmation/exit checks remain applicable. Physical Safari/VoiceOver and Switch Control testing remain outside this Chromium environment.

## Rounded interface shapes

The game applies a consistent corner hierarchy: 32px menu/dialog surfaces, 16px cards, 12px ordinary controls, and circular fire/reload/menu controls. Full-width inset actions use the container radius minus the panel padding, with an 8px floor; mobile padding changes retain this relationship. Dialog header backgrounds use the inner surface radius. Browsers supporting CSS `corner-shape: squircle` receive continuous corners, with ordinary rounded rectangles as the fallback. All styles stay component-scoped and retain hit areas, focus/pressed feedback and text enlargement.

Apple's [Buttons HIG](https://developer.apple.com/design/human-interface-guidelines/buttons) calls for consistent corner radii and content padding on related buttons; [Sheets HIG](https://developer.apple.com/design/human-interface-guidelines/sheets) describes rounded cardlike modal surfaces. [Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass) explains concentric corner relationships between containers and inset elements. The pixel values above are a web design choice, not a universal Apple specification; this styling does not reproduce native Liquid Glass materials.

## Tactical 3D graphics

Every game entry point uses the cinematic WebGL renderer, including the embedded page, the bare static URL and old bookmarks with `renderer=classic`. No query parameter enables comic rendering. Loading, failed initialization and graphics-context loss show a neutral loading/recovery screen with Retry and Exit actions; they never draw the comic world, characters or weapons. Deployment is disabled until 3D is ready. All graphics presets retain the realistic materials and models; Performance reduces rendering cost without selecting another art style. Weapon thumbnails in menus and the field guide also use this renderer exclusively.
Startup also retries a low-power WebGL 2 context and uses bounded Apple-touch GPU budgets; recovery retains cinematic graphics.

The tactical presentation uses surface-specific PBR photographs: outdoor asphalt, indoor concrete, plaster, brick, woven cloth, and metal. Coated walls and weapons use dielectric paint rather than uniformly metallic shading; gun receivers no longer use the diamond-tread plate texture. Local mipmapped normal/roughness maps and anisotropic filtering preserve appropriately scaled detail. New asset provenance is in `public/games/military/REALISM-ASSETS.md`.

Lighting follows the HDR sky direction with one sun and sky fill, avoiding an unrelated blue rim light. The shadow frustum follows the player and snaps to texels: High uses a 2048-pixel local sun atlas and 1024-pixel reflection target; Balanced/Performance use a 1024-pixel sun atlas, and Balanced uses 512-pixel reflections. Only fixtures within the occupied room illuminate its interior; weapons follow those same sources and power failures. High adds restrained screen-space contact shadows. Ground-water reflections use an angle-dependent Fresnel response and limited wet patches. Performance omits planar reflections and contact-shadow postprocessing; all shadow/lighting preferences remain respected. Exposure and tone mapping supply the look without a saturation, split-tone or vignette filter. Existing adaptive internal resolution remains in effect.

Skeletal character poses update at 30 FPS independently of the display render loop. Soldiers are normalized to a natural 1.82-metre standing height, with a 1.65-metre eye camera. Material response preserves the authored character atlas instead of flattening it with a grey filter, and locomotion follows actual movement. 120 FPS and 8K output are not guaranteed or validated on physical devices. The current infantry sculpt is still an interim armored character; a purpose-built contemporary military character remains a future art upgrade. See `public/games/military/ATTRIBUTION.md` for asset provenance and licenses.

Edit `scripts/outpost-military/renderer.js` and run `npm run build:outpost-military` to regenerate the self-contained public module. Production build scripts also regenerate it automatically. Static files have no runtime CDN dependency.

Validation: `node scripts/check-outpost-military.mjs [base-url]` checks desktop/mobile rendering, all five maps and eleven loadouts, material cache bounds, camera alignment, cover destruction, weapon-specific projectile meshes, damaging fields, 30 FPS pose sampling, and quality settings. `node scripts/check-outpost-military-embed.mjs [base-url]` checks the integrated iframe, direct and legacy links, initialization failure, context-loss recovery, teardown and the absence of comic asset requests.

## Blackout Protocol — Lifeline Run (default)

Eight matching uniforms conceal six operators and two infiltrators. Bots fill unused seats; offline role preference helps learn each role and online roles are server-assigned. The mission has two parts:

1. **Gather and load at Breakwater Base.** Collect four Trauma kits, two Surgical packs, three IV fluids and four Recovery supplements. Carry one item at a time, then load it at the hangar's medevac pad. Lost operators return any carried item to its source, so the mission cannot be blocked by inaccessible cargo. Any living operator can finish the shared manifest. Hold at the pad after all 13 items are loaded to board the aircraft.
2. **Transport and deliver.** Lifeline Medevac has a connected cockpit, cabin, cargo bay and avionics room. Its normal route takes 120 seconds; operators can use autopilot or pilot manually. On arrival, repair damaged cargo if necessary and hold at the cargo console to hand off aid to the field clinic. Delivering aid while at least one patient remains alive wins the rescue; the result shows how many survived.

Four wounded soldiers deteriorate throughout the mission, including radio assemblies. The crew loses if every operator dies or departs, every wounded soldier dies, or the aircraft crashes. Completing former base assignments, detaining all infiltrators and reaching the former reinforcement deadline do not skip the rescue. Lost operators can watch but cannot gather cargo, pilot, vote, report or speak on the living radio.

Infiltrators can eliminate isolated operators, cut power, jam communications, use maintenance ducts at base and fake supply work. Three difficult-to-arm base charges remain an optional sabotage: a successful detonation destroys the staging operation and its crew. Base charges are cleared when the aircraft departs. In flight, infiltrators can damage medical cargo or disable autopilot through a six-second stationary interaction at avionics. Damaged cargo requires a six-second repair before delivery.

Disabling autopilot gives the crew 18 seconds to recover flight control. A living operator must reach the helm, take the seat, and use W/S to adjust altitude and A/D to correct heading. Stay within the marked safe bands for three seconds to stabilize. Only the seated operator, after stabilization, can restore autopilot. Releasing the helm or losing the pilot while flying manually reopens the recovery emergency. There is no timer-based automatic recovery. Touch controls provide the same four flight inputs. Mouse or right-side dragging still looks around.

Body reports and the emergency console start radio discussion and voting. Meetings block movement and interactions; patients keep deteriorating. An aircraft in manual flight must restore autopilot before a new assembly can start. Ties/Skip detain nobody. Discussion is bounded plain text; voice transport is not included. Online menus never pause the shared mission.

`outpost-protocol.js` owns the DOM-free authoritative mission, victory conditions and legal AI. `outpost-protocol-map.js` defines the base, aircraft and supply catalog. `outpost-protocol-ui.js` owns briefings, medical HUD, contextual holds, flight controls and meetings. The renderer reads public mission state for cargo, instruments, terrain, landing apron and the four-stretcher destination clinic. Snapshot projection whitelists mission fields; only the authenticated recipient receives their own cargo, role and channel. Clients submit bounded intentions, never cargo counts, patient health, route progress or control flags. Existing database room storage needs no migration.

Validation: `outpost-protocol.test.mjs` covers real collection/loading/boarding/flight/delivery, cargo recovery, wounded/crew/crash losses, stabilization and illegal restore, meetings, legal bots, JSON restoration and privacy. Map and server suites validate connected fixtures, mission-map restrictions and sanitized flight inputs. `check-outpost-protocol.mjs` drives real keyboard/touch holds and pilot axes; `--online` adds disposable eight-player local API/privacy checks.

## Loading-screen compatibility check

Every game open and graphics retry performs local checks for required browser APIs, an actual WebGL 2 shader/pixel test, detailed game files and a brief rendered scene sample. Unsupported browsers/devices are blocked before deployment with an explanation and Retry/Exit actions. Missing downloads are distinguished from browser capability failures. The game never falls back to comic graphics or simpler replacement characters.

The scene sample records render cost and observed display cadence, recommends a graphics preset, and clearly explains that a brief test cannot guarantee sustained FPS. Saved graphics preferences are preserved. **Device check** in the menu opens the full report; accepting a recommendation uses the existing graphics confirmation dialog. Hardware data is not sent to a server or stored as a fingerprint. JavaScript/module startup failures also leave an actionable loading screen.

Validation: `outpost-compatibility.test.mjs` checks capability failures and honest recommendations; `check-outpost-compatibility.mjs` checks desktop/mobile GPU rejection, retry, the measured report, preserved preferences and missing browser APIs without startup crashes. Cinematic lifecycle checks cover missing files, GPU context loss, retry and teardown.

## Loading and startup

A loading screen appears before module downloads, reports completion of the all required tactical assets, and keeps controls inert until the first 3D frame has rendered. Loading has a 45-second timeout; failed core module downloads show a retry link. Legacy classic links select the same cinematic renderer. `node scripts/check-outpost-loading.mjs [base-url]` checks desktop/mobile loading, default tactical graphics, low-power context retry, first deployment, context-loss cleanup, asset failure and the cinematic-only recovery. Set `CHROMIUM_PATH` to use a local Chromium installation.


## Sprint, slide and death presentation

Hold Shift to sprint on a keyboard. On touchscreens, toggle SPRINT and push the joystick forward. Press C or Ctrl (or touch SLIDE) while sprinting forward for a 0.65-second momentum slide; slides have a 1.6-second cooldown. The shared simulation and server input validation own movement, wall collision and snapshots. Sliding lowers the tactical camera and the visible character posture; sprinting uses the run animation. Existing weapon damage and collision rules apply throughout.

On death, the player camera drops and rolls with a fade to SIGNAL LOST for 1.2 seconds before the round debrief. Reduced-motion users get a 0.35-second fade without camera movement. A living Duo partner is spectated after the death sequence; an ended team gets its debrief. Surviving victories show the debrief immediately. Visible tactical rivals collapse briefly instead of disappearing immediately. Replay and online round starts clear death and sprint state.

Validation: `node --test scripts/outpost-movement.test.mjs` verifies movement, cooldown, momentum, collisions and snapshot restoration. `node scripts/check-outpost-movement.mjs [base-url]` verifies keyboard/touch controls, death-before-results, camera collapse, replay reset, reduced-motion death and Duo spectating.

### Loading showcase

The startup screen cycles through stills captured from the tactical renderer: Dust Outpost, Skyport, Freight Rush, VX–7 Carbine, Flare Launcher and the operator. Matching field tips sit above real asset progress. Slides advance every 4.5 seconds; arrows and a pause button work before game modules finish downloading. Reduced motion starts paused. Optional image failures retain the previous still and never fail game loading; the carousel stops as soon as the playable menu is ready. The six compressed WebP assets total under 250 KB and are loaded on demand.

Validate with `node scripts/check-outpost-loading.mjs [base-url]`.

### Arsenal inspection and uniforms

The Field Guide displays 960 × 600 stills of all 11 tactical weapon models. Select an image for an enlarged inspection view; the same geometry builds first-person rigs and AI equipment. Preview framing fits the whole weapon, uses the environment lighting and writes sRGB pixels so metal detail stays readable.

Ten free uniforms are available in the deployment menu and Ranger Locker: Field Ranger, Desert Nomad, Urban Patrol, Rescue Medic, Night Recon, Field Engineer, Alpine Scout, Blue Sentinel, Shadow Runner and Hazard Response. Each has its own palette and gear silhouette (cap, scarf, goggles, medical pack, hood/visor, harness/tools, insulated collar, heavy plates, cape, or respirator/tanks). The selected uniform is saved on this device. Uniforms have no effect on health, hitboxes or damage.

Bots draw unique weapons and uniforms from shuffled full pools in combat modes; Blackout Protocol uses matching uniforms to conceal roles. Practice sentries use actual weapon firing/reload rules with relaxed movement and attack intervals. Tactical AI visibly carry their assigned weapons, attached to their animated hands. Equipment and uniform meshes are batched by material and cleaned up on actor changes, map changes and shutdown.

Online create/join/loadout requests validate outfit IDs. Public lobby members and authoritative entity snapshots carry the outfit; lobby selection and rematches preserve it. Outfit changes during an online match are rejected. Older room snapshots default safely to Field Ranger.

Validation: `node --test scripts/outpost-equipment.test.mjs scripts/outpost-room-equipment.test.mjs` covers full bot pools, neutral outfit stats, snapshots/respawns, practice weapon use and the actual room handler with a substituted SQL transport. `node scripts/check-outpost-equipment.mjs [base-url]` checks all 11 inspections, all 10 selections, saved preferences, visible AI equipment, resource ownership and cinematic recovery on mobile and desktop.

### Camera and aiming

Settings → Camera & aim exposes a 75–120° FOV slider (100° default, horizontal at 16:9), mouse sensitivity from 0.1–10 (2 default), a vertical multiplier, independent touch sensitivity, invert look, raw mouse input, and reset. Preferences apply immediately and persist on the device. Wider displays retain vertical FOV; portrait adapts with a vertical cap. The weapon camera has its own fixed projection to avoid stretching the hands or gun.

Mouse input uses 0.022° per count multiplied by sensitivity, equally on both axes at 1× vertical. Angular look is independent of render resolution, adaptive quality, FOV, and frame rate. No game smoothing or acceleration is added. Raw pointer lock is requested when enabled and falls back to regular pointer lock only if the browser reports it unsupported. Pitch is limited to ±75° and its tangent is shared with offline and online hit testing.

### Reference-inspired tactical skins

The ten existing outfit IDs remain available to players and AI. Their visuals use woodland and digital camouflage, enclosed helmets or hoods, modular carriers, masks, pads, packs and distinct purple/teal accent patterns. The medic remains a tenth rescue-themed outfit. Six rigid gear groups follow the authored skeleton during idle, walking, running and death; first-person sleeves use the same skin palettes and cloth patterns. Locker portraits are rendered from the actual game models via `scripts/capture-outpost-skins.mjs`. Cosmetic choices do not change combat values.
