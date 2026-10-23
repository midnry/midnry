# Next session: where things stand (2026-10-22)

Read docs/HANDOVER.md first (working rules, deploy procedure, security rule). Then this.

## Branches
- `game-look`: the working branch. Everything on it up to the last deploy is live on midnry.com.
- `wip/handover-20261022` was finished, tested and merged into `game-look` (2026-10-22, not deployed yet).

## Finished in that merge (not deployed yet; cache key v=visibility-20261022)
- A. Outpost Zero sound / pause / right-click / How to Play carousel.
- B. Outpost Zero visibility: frustum + body-sphere actor culling (renderer.js `updateActors`,
  telemetry.js `actorInView` / `clearSightLine`), bots limited by the same fog as the player
  (`SIGHT`, `Arena.spots`), gentler detail (min render scale 0.75 with quick recovery, phone
  density 1.25, character LOD at 10 / 6.5 tiles, sharp sign text).
- Checks run: 307/307 `node --test scripts/outpost-*.test.mjs`, `tsc`, `build:render`,
  `build:outpost-military` (no diff), `scripts/qa/actor-visibility.mjs` at 1280 and 390 (0 hidden of
  ~1,800 in-view rivals), `sign-sharpness.mjs`, `feedback-ux.mjs` 74/74.

## Next, in order (owner-approved)
1. Mini city ("Calder Quay", working name) as a **Last Signal arena first**. Step 1 (grey box, bot rounds)
   DONE 2026-10-22, see HANDOVER "Calder Quay". Next: water and lamps.
   - Plan: docs/mini-city-plan.md + .png; layout data in scripts/outpost-city/layout.mjs.
   - Approved: 30×30 size, real canal water (needs a "water" tile you can see across but not walk
     through), reuse Breakwater room art.
   - Adapt it for combat: spawns, street cover, Red Haze closing on the market square, a harbour
     disaster (storm surge or lightning).
   - Order: plain playable version + bot rounds, then water and lamps, then art and phone checks.
2. Familiar game menus for Outpost Zero: DONE 2026-10-22 (Locker with Loadout, side-screen Settings/Practice,
   results screen, plain settings). See HANDOVER "Menu redesign".
3. The mini city as the Blackout Protocol base: DONE 2026-10-23 (Breakwater hidden: ?base=breakwater).
   See HANDOVER "Calder Quay as the Blackout Protocol base".

## Non-game app audit (2026-10-23, branch `audit/non-game-apps-20261023`, NOT deployed)
- Read `docs/audit-2026-10-23/README.md`: every non-game app tested in the browser (laptop + phone) with
  invented data, competitor comparison from official pages, a priority table, and the fixes made on that
  branch: the two save-recovery risks (Refresh now, leaving mid-save; `src/lib/doc-session.ts` + tests),
  Invoice (How to pay, WhatsApp copy, phone total), Ledger on phones, kit number boxes ("7,5" → 75),
  Writing studio Contract saves, Compressor encodes, Apply headline placement.
- Owner decisions listed there: pricing of Scratch/Split/Contrast, consolidating Claims/Agreement/Clauses,
  Plot, and whether to build phone notifications for Remind.
- DEPLOYED 2026-10-23 11:44 UTC (owner said "deploy"): main = game-look = `2a2240d`, branch `release/2026-10-23`
  (`2a2240d` = `game-look` + the audit branch; code identical to `19e4d39`, verified on a production build
  against PostgreSQL 16). Status, verification record, owner checks and rollback plan:
  `docs/audit-2026-10-23/release-2026-10-23.md`. Proposed next batch (Invoice and Remind):
  `docs/audit-2026-10-23/next-batch-invoice-remind.md`. Parked, unmerged: `wip/batch2-parked-20261023`.

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


## Deployed 2026-10-23 (non-game apps)
main = `2a2240d` (code `19e4d39`): non-game app fixes, recovery and account-isolation fixes. Live checks all passed
(see docs/audit-2026-10-23/release-2026-10-23.md section 7). Seven synthetic test accounts still to close (same section).

## Deployed 2026-10-23
main = game-look at 7ba1c7c (`v=review-fixes-20261023`). Live files verified by hash; a Blackout match (town) and a
Last Signal match (Calder Quay) started on www.midnry.com with no page errors.

Deployed again 2026-10-23: main = e3802f4 (`v=pause-overlays-20261023`): pause over the match, leftover warnings cleared.

Deployed again 2026-10-23: main = 57a6d99 (`v=boot-lobby-20261023`): no old menu flash on load.
