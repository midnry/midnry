# Next session: where things stand (2026-10-22)

Read docs/HANDOVER.md first (working rules, deploy procedure, security rule). Then this.

## Branches
- `game-look`: the working branch. Everything on it up to the last deploy is live on midnry.com.
- `wip/handover-20261022`: a snapshot of unfinished work on top of `game-look` (see below).
  It is NOT tested as a whole. Continue from it, finish, test, then merge into `game-look`.

## Unfinished work in the snapshot

### A. Outpost Zero sound / pause / right-click / How to play: DONE and tested
Files:
- public/games/outpost-retention.js (audio unlock, louder mix, Protocol ambience)
- public/games/outpost-menu.js (pause card with a big Resume)
- public/games/outpost-quickstart.js (new 6-card How to Play carousel)
- parts of public/games/outpost-zero.html
- src/routes/games/outpost-zero.tsx (v=feedback-20261022)
- scripts/qa/lobby-helpers.mjs, lobby-look.mjs, feedback-ux.mjs

Still to do:
- scripts/qa/outpost-signin.mjs and outpost-store.mjs click `.mf-start` directly. Set localStorage
  `midnry-outpost-quickstart` to `{"signal":true,"protocol":true}` before Play.

### B. Outpost Zero visibility / LOD: IN PROGRESS, not finished
Player feedback:
- other players/bots vanish unless directly in front of you;
- the detail reduction (LOD/draw distance/render scale) is too aggressive, so nearby text is blurry;
- the player kept dying because bots see you but you can't see them.

Work so far:
- edits in scripts/outpost-military/* and the rebuilt public/games/outpost-military.js;
- a new test scripts/outpost-visibility.test.mjs that imports `SIGHT` from outpost-sim.js (may not exist yet);
- scripts/outpost-performance.test.mjs imports `MIN_BUDGET_SCALE`.

Goals:
1. Actors whose bounding sphere is in the view frustum are always drawn (renderer.js `updateActors`).
2. Bots never see further or through more than the player can.
3. Less aggressive LOD: higher minimum render scale, longer LOD distances, anisotropy, sharp signs/text.

Checks: `npm run build:outpost-military`, `node --test scripts/outpost-*.test.mjs`, browser QA, and
screenshots in screenshots/qa/visibility/.

Commit A and B together: both touch outpost-zero.html.

## Next, in order (owner-approved)
1. Mini city ("Calder Quay", working name) as a **Last Signal arena first**.
   - Plan: docs/mini-city-plan.md + .png; layout data in scripts/outpost-city/layout.mjs.
   - Approved: 30×30 size, real canal water (needs a "water" tile you can see across but not walk
     through), reuse Breakwater room art.
   - Adapt it for combat: spawns, street cover, Red Haze closing on the market square, a harbour
     disaster (storm surge or lightning).
   - Order: plain playable version + bot rounds, then water and lamps, then art and phone checks.
2. Familiar game menus for Outpost Zero (big Play, clear tabs, loadout, familiar pause), after the fixes above.
3. The mini city as the Blackout Protocol base, replacing Breakwater, which stays as a hidden option
   until play-tests are done.

## Other open items
- Medical, tax and legal tools need a qualified reviewer (docs/phase3-plan.md lists exactly what).
- Owner to try live: a real AI draft in the Writing studio; Study space share links; Pass checkout.

## Owner rules (short)
- The owner is non-technical: plain language and screenshots.
- Commit and push to the working branch after each change. Deploy ONLY when the owner says "deploy":
  `git fetch origin main && git merge-base --is-ancestor origin/main HEAD && git push origin HEAD:main`
  then verify live.
- Before pushing game changes:
  - `node --test scripts/outpost-*.test.mjs`
  - `npx tsc --noEmit -p .`
  - `NITRO_PRESET=render npm run build:render`, then `git checkout -- src/routeTree.gen.ts`
    (keep it only if routes were added)
  - `npm run build:outpost-military` after renderer changes
  - bump `v=` in src/routes/games/outpost-zero.tsx
- Dev server: `sh scripts/qa/dev-up.sh`. On a 504 "Outdated Optimize Dep": stop vite (find its pid
  with `ps -eo pid,args | grep "[v]ite dev"`; never pkill -f a pattern that matches your shell),
  `rm -rf node_modules/.vite`, then start it again.
- 17 test failures are pre-existing builder-platform tests (missing `.grok/` folder); ignore them.
