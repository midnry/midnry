# Validation of this batch (23 October 2026)

Branch `audit/non-game-apps-20261023`. Everything below ran in the same environment: the session's
Linux container, Node 22.22.0, the repository's own `node_modules` (`npm ci` from the lockfile),
headless Chromium at `/opt/pw-browsers/chromium`, and the local dev server with its embedded PGLite
database. **These are local results. The deployed site (www.midnry.com) was not run or tested.**

## 1. The 17 failing unit tests, compared with the unchanged baseline

Method: a git worktree of the commit before this work (`df7e52c`) with the same `node_modules`,
then `npm test` there and on this branch, and a diff of the failing test names.

| | Baseline `df7e52c` | This branch |
|---|---|---|
| Tests | 717 | 750 (33 new, none removed) |
| Pass | 700 | 733 |
| Fail | 17 | 17, **the same 17 by name** |

None was introduced by this work, so none needed fixing here. All 17 test the app-builder template
this repository started from, not Midnry:

| # | Test (file) | Cause | User impact |
|---|---|---|---|
| 1–3 | `SKILL.md and AGENTS.md name the marker path…`, `the sections that own the brand-task prohibition…`, `SKILL.md tells the pass to self-check…` (`scripts/brand-check.test.mjs`) | Read `.grok/skills/og/SKILL.md`, a builder-platform folder that `.gitignore` excludes and this repository does not ship (ENOENT). | None: developer tooling for the builder platform. |
| 4 | `every hand-over the og skill prints is one this script accepts` (`scripts/write-atomic.test.mjs`) | Reads `.grok/skills/og/references` (missing, as above). | None. |
| 5 | `the build side resolves the template's shipped app-env` (`scripts/check-auth-invariant.test.mjs`) | Expects the template's sign-in to be off. Midnry ships sign-in on (`VITE_AUTH_ENABLED=true` in `render.yaml`). | None: sign-in on is intended. |
| 6 | `the auth schema ships outside the globbed directory` (`scripts/migration-plan.test.mjs`) | Expects no app migrations; Midnry has 26 in `migrations/`. | None: the migrations are Midnry's database. |
| 7–9 | `the template ships auth off`, `the wrapped command runs with the app env applied`, `the CLI still runs when invoked through a symlinked path` (`scripts/with-app-env.test.mjs`) | Expect `.grok/app-env.json` with sign-in off; the file is not shipped (gitignored) and Midnry sets the value in its host settings. | None. |
| 10–17 | Eight `grok-pwa-plugin` tests (`platform chrome overwrites share-card metas…`, `published grok.me slug is still a title fallback`, `emits og:image for a public host…`, `placeholder og:image appends site.color…`, `document title entities are not double-escaped…`, `injects into documents with no head element`, `streaming injector matches </HEAD>…`, `uses the app name in the injected title tag`) | They expect a page's own title as the share-card title. Midnry's approved share card (`src/lib/og/site.json`, `"title": "Midnry"`, with `public/og.jpg`) sets "Midnry" for every page, which takes precedence. | Small product effect, not a defect: a link to any Midnry page shared in WhatsApp shows the title "Midnry" and the brand card, not the app's own name. Left unchanged (approved branding). |

`docs/NEXT-SESSION.md` already recorded these 17 as pre-existing. Recommendation (not done): mark them
as skipped when `.grok/` is absent, or delete the template tests, so `npm test` can go green.

## 2. Lint, baseline vs this branch

`npx eslint .` on both trees, JSON output compared file by file.

| | Baseline | This branch |
|---|---|---|
| Errors | 2,492 | 2,492 |
| Warnings | 102 | 102 |

Every file this branch changed, checked separately: each has exactly the messages it had at the
baseline, and every new file is clean.

| File | Baseline | This branch |
|---|---|---|
| `scripts/studio.test.mjs` | 1 error (`no-control-regex`, old line) | same |
| `src/lib/studio.ts` | 1 error (`no-control-regex`, old line) | same |
| `src/components/tools/client-work-parts.tsx` | 2 warnings (fast-refresh exports) | same |
| `src/components/tools/kit.tsx` | 1 warning (old `useEffect` dependency in Plot) | same |
| `src/components/tools/ledger.tsx` | 1 warning (fast-refresh export) | same |
| All other changed files, and the new `src/lib/doc-session.ts`, `src/lib/kit-numbers.ts`, `src/lib/kit-calcs.ts`, `scripts/doc-session.test.mjs`, `scripts/kit-numbers.test.mjs`, `scripts/qa/*.mjs` | 0 | 0 |

Most repo-wide errors are in `public/games` and `src/games` (out of scope).

## 3. Numeric input in the kits

`scripts/kit-numbers.test.mjs` (13 tests) and `scripts/qa/kit-numbers.mjs` (browser, laptop and
phone). Cases covered for every kit with a number box (Dose, Statements, Stock, Profit, Menu, Recipe
cost, Catalog, Yield, Farm sales, Savings, Bills) and the custom calculators (Units, Circuit,
Solver, Ratios, Break-even, Tax):

| Input | Behaviour now |
|---|---|
| `7,5`, `1,50`, `1.500,00` | Refused: "Use a dot for decimals, e.g. 7.5" (no result) |
| `1,500`, `12,345,678.9`, `₦1,500` (money boxes) | Read as the number |
| `60kg`, `15 mg/kg`, `1.5 ha`, `8%` (the box's own unit) | Read |
| `132 lb`, `3 acres`, `50 mg/5mL`, a unit in a box without one | Refused, naming the unit |
| `₦60` in a non-money box | Refused |
| `abc`, `1e3`, `0x10`, `Infinity` | Refused: "must be a number" |
| `0` where it is a divisor or a size (weight, strength, portions, land, years, time, resistance) | Refused: "must be more than 0" |
| `-5` | Refused unless the quantity can be negative (voltage, current, acceleration) |
| Blank | Asked for ("Fill in …"), never read as 0 |
| Unrealistic (Dose over 350 kg, 1,000 mg/kg or 1,000 mg/mL; savings over 80 years or 100%) | Refused: "not realistic. Check the figure." |
| Unusual but possible (Dose over 100 mg/kg; savings over 30% a year) | Result shown **with** a warning line |
| Tracker save with any of the bad values | Not saved; message under the form |

Dose also checks the right answers (60 kg × 15 mg/kg at 50 mg/mL = 900 mg, 18 mL; 7.5 kg × 10 at
24 = 75 mg, 3.13 mL) and that no result line appears for any refused case. Tax checks the four test
vectors against the gazetted bands (₦1.8M → ₦150,000; ₦6M → ₦870,000; ₦24M → ₦4,470,000;
₦60M → ₦12,930,000), the minimum-wage exemption, rent relief and its cap, and that letters, blanks,
negatives and comma decimals never show ₦0. Ledger, Invoice and Split use the stricter money reader
(`checkCents`, `src/lib/invoice-math.ts`) and were covered by the audit and their existing tests.

## 4. Recovery workflows

Unit: `scripts/doc-session.test.mjs` (15 tests). Browser: `scripts/qa/recovery-after-leaving.mjs`
(37 checks at 1280×900 and 37 at 390×844, own QA accounts) and the existing
`scripts/qa/save-conflict.mjs` (8 scenarios).

| Workflow | Unit | Browser |
|---|---|---|
| "Refresh now" with storage that works: copy stored, read back, page reloads, copy offered after reload | yes | yes |
| "Refresh now" when storage throws or cannot read back: no reload, document intact, Copy / Download / Refresh anyway | yes | yes (A) |
| Leaving inside the app during the save pause, offline: copy kept, offered on reopening, restored, saved, cleared | yes | yes (B) |
| Leaving with a save in flight that later **conflicts**: copy kept as conflict, nothing overwritten, review both, keep mine saves it, copy cleared | yes | yes (C) |
| Leaving with a save in flight that later **fails on the network**: copy kept, retries after close, offered, restored, cleared | yes | yes (E) |
| Leaving with a save in flight that later **succeeds**: pending copy cleared, nothing offered | yes | yes (D) |
| A late success clears only its own copy, not a newer page's | yes | — |
| Closing or reloading the tab mid-save (pagehide): copy kept; dropped quietly if the keepalive save landed | yes | partly (beforeunload prompt checked in `apps-phase1.mjs`) |
| **Storage blocked and leaving inside the app with an unsaved change: asked first**; staying keeps it; once saved, no question | yes | yes (F) — new fix `02261d4` |
| **Account isolation**: a second account in the same browser is not offered the first account's copy; another app is not; the first account gets it back after signing in again | yes | yes (G) |
| Nothing stored before the account is known or when the app is locked | yes | — |

Copies are keyed `midnry-recovery:v1:<account id>:<app>` in this browser's IndexedDB (sessionStorage
as fallback), checked on read against the owner and app inside the record, and dropped after 14 days.
Signing out does not delete them; they are only ever shown to the same account.

## 5. Reproducible commands

From the repository root, on a clone of `audit/non-game-apps-20261023`:

```sh
npm ci
npm test                                   # 750 tests: 733 pass, 17 template failures (section 1)
npx tsc --noEmit -p .                      # clean
npx eslint .                               # 2,492 errors / 102 warnings, same as baseline (section 2)
NITRO_PRESET=render npm run build:render   # production build and release-file check

# focused suites
node --test scripts/doc-session.test.mjs scripts/doc-recovery.test.mjs scripts/apps-phase1.test.mjs
node --test scripts/kit-numbers.test.mjs scripts/number-input.test.mjs scripts/phase3-fixes.test.mjs
node --test scripts/invoice-workflow.test.mjs scripts/studio.test.mjs scripts/apply-tailor.test.mjs

# browser checks (local dev server with the QA settings; Chromium at /opt/pw-browsers/chromium)
sh scripts/qa/dev-up.sh
node scripts/qa/recovery-after-leaving.mjs screenshots/qa/recovery          # laptop
node scripts/qa/recovery-after-leaving.mjs screenshots/qa/recovery mobile   # phone
node scripts/qa/kit-numbers.mjs screenshots/qa/kit-numbers
node scripts/qa/kit-numbers.mjs screenshots/qa/kit-numbers mobile
node scripts/qa/audit-fixes.mjs screenshots/qa/audit-fixes
node scripts/qa/audit-fixes.mjs screenshots/qa/audit-fixes mobile
node scripts/qa/save-conflict.mjs screenshots/qa/reliability

# baseline comparison (section 1)
git worktree add --detach ../midnry-baseline df7e52c && ln -s "$PWD/node_modules" ../midnry-baseline/node_modules
(cd ../midnry-baseline && npm test) 2>&1 | grep '^not ok'
```

Last run of each on this branch (code at `02261d4`): unit 750 / 733 pass / the same 17 template failures;
typecheck clean; build passed; all browser checks above passed at both sizes with no page errors.
