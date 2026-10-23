# Audit — group "kits1" (22 free kit apps from src/lib/kits.ts, rendered by src/components/tools/kit.tsx)

Date: 2026-10-23. Tester: QA Admin (qa-admin@example.test) against http://127.0.0.1:8080 (dev server, PGLite).
Scripts: `docs/audit-2026-10-23/kits1/{lib,calcs,docs,mobile,retake}.mjs` (Playwright, one browser per script). Raw logs: `…/docs/audit-2026-10-23/kits1/*.json`.
Screenshots: `/home/user/midnry/screenshots/audit/kits1/<slug>-desktop.png` and `<slug>-mobile.png` for all 22 apps, plus `shifts-add-to-remind.png`, `shifts-mobile-after-add.png`, `stock-300-rows-desktop.png`, `menu-mobile-qr.png`, `paye-mobile-150k.png`.

Cross-cutting facts (verified on every app):
- No `pageerror` and no console errors on any of the 22 apps, desktop or mobile, through every workflow below (incl. 300-row Stock, 300 KB JSON, 1000-line Reconcile, 25,000-word Regex sample).
- No horizontal overflow at 390×844 on any app (`scrollWidth == 390` everywhere); input font size 15–17 px; Edit / Remove / Add to Remind buttons are 36 px tall.
- The "Features and how to use" panel is collapsed by default on every app (the desktop screenshots show it open because the script opened it to read it).
- Save status text on kit apps is the single word "Saved" (not "Saved to your account"); it appeared within a few seconds on every save.
- Desktop full-page screenshots of long pages (e.g. `menu-desktop.png`) show the sticky site header rendered mid-page; that is a screenshot artefact, not an app bug.
- **Shared bug in every `type="number"` field (Dose, Profit, Statements, Stock quantity/low, Menu price):** Chromium silently drops a typed comma, so typing `7,5` gives the value `75` and the calculation runs on 75 with no warning. Letters typed into these fields are dropped and the field reads as blank (treated as 0). The `number-input.ts` "Use a dot for decimals" hint can never fire for these fields because the browser never hands the comma to the app. Text-based fields (Ratios, Break-even, Tax, Recipe cost, Reconcile) do show the hint.
- Mobile Edit/Remove/Add-to-Remind appear as text buttons under each row; fine to tap.

---

### Dose (/apps/dose) — free
- Verdict: **Useful but needs improvement** (arithmetic correct; comma/letter input silently wrong, which matters for a dose tool)
- Tested workflows (VERIFIED):
  - 60 kg × 15 mg/kg, 50 mg/mL → "Total 900 mg", "Volume 18 mL" (correct). 12 kg × 10 mg/kg, 24 mg/mL → "120 mg", "5 mL" (correct). 7.5 kg → "75 mg", "3.13 mL" (correct).
  - Negative weight → "Result: Enter positive numbers." mg/mL = 0 or blank → "Enter positive numbers."
  - Copy results copies "Label: value" lines to the clipboard.
  - Empty state shows "Result: Enter positive numbers." before anything is typed.
  - Review note "Not professionally reviewed yet. Check with a pharmacist or doctor before relying on this." and note "This is arithmetic for study. It is not a dose for a patient." are shown.
- Unverified: nothing material.
- Problems found:
  - **HIGH** — Typing `7,5` into Weight gives field value `75` (browser drops the comma in a number input) and the app shows "Total 750 mg / Volume 31.25 mL" with no warning (expected 75 mg / 3.13 mL). A 10× dose error on a medical calculator. Steps: Weight = type "7,5", mg/kg 10, mg/mL 24. Screenshot: `dose-desktop.png` (layout); log `kits1/calcs-all.json`.
  - **MEDIUM** — Typing letters ("abc") into Weight leaves the field blank and the app shows "Total 0 mg / Volume 0 mL" instead of asking for a number (blank is treated as 0).
  - LOW — Empty state already shows "Enter positive numbers." (reads like an error before the user has done anything).
- Promise check: "mg from weight and mg/kg" → kept; "mL from a concentration" → kept; "The working shown in plain figures" → **partly** (only the two results are shown; the multiplication/division is not written out).
- Mobile: stacked single column, no overflow (`dose-mobile.png`).
- Suggested fixes: use text inputs with `inputMode="decimal"` and the shared number parser so "7,5" is refused with the hint; show the working line ("60 kg × 15 mg/kg = 900 mg; 900 ÷ 50 = 18 mL").

### Units (/apps/units) — free
- Verdict: **Ready** (minor input inconsistency)
- Tested workflows (VERIFIED):
  - 1 m = 100 cm (default); 5 km = 3.106856 mi; 10 lb = 4.535924 kg; 100 F = 37.777778 C; Swap → 100 C = 212 F. All correct.
  - Measures offered: Length, Mass, Volume, Area, Speed, Temperature (two more than the blurb promises).
  - Letters, blank → "Enter a number to convert." Negative (-2 L) → "-2,000 mL" (accepted). "1e3" → "1e3 L = 1,000,000 mL" (exponent accepted).
  - Copy copies the result number.
- Unverified: none.
- Problems found:
  - LOW — "1,500" (thousands separator) and "7,5" both give "Enter a number to convert." with no hint; every other kit accepts "1,500". Uses `Number()` instead of the shared parser.
- Promise check: "Length, mass, volume, and temperature" → kept (plus area and speed); "The factor is applied as you type" → kept; "No account data is required" → kept.
- Mobile: fine (`units-mobile.png`).
- Suggested fixes: use `typedNumber`/`firstHint` for the value field.

### Circuit (/apps/circuit) — free
- Verdict: **Useful but needs improvement**
- Tested workflows (VERIFIED):
  - V=12, R=4 → "3 A"; I=2, R=10 → "20 V"; V=9, I=0.5 → "18 Ω" (all correct, unit shown).
  - Empty → "Leave exactly one of V, I, or R blank."
- Problems found:
  - MEDIUM — Invalid input is not named: V=9, I="abc" (R blank) and V=9, I="7,5" both show the generic "Leave exactly one of V, I, or R blank." although exactly one is blank; V=9, I=0 (division by zero) shows the same generic line. Users cannot tell what is wrong.
  - LOW — Negatives accepted silently (V=9, I=-3 → "-3 Ω").
- Promise check: "Solves the missing one of V, I, or R" → kept; "The unit is written next to the figure" → kept.
- Mobile: fine (`circuit-mobile.png`).
- Suggested fixes: a specific message for "not a number" and for zero divisor; use the shared parser.

### Ratios (/apps/ratios) — free
- Verdict: **Useful but needs improvement** (one promised feature missing)
- Tested workflows (VERIFIED):
  - CA 500,000 / CL 250,000 / stock 100,000 / debt 300,000 / equity 600,000 → Current 2, Quick 1.6, Debt/equity 0.5 (correct).
  - CA 1,250,000 / CL 1,000,000 / stock 400,000 / debt 2,000,000 / equity 800,000 → 1.25, 0.85, 2.5 (correct; thousands commas accepted).
  - Stock "7,5" → "Check the figures: Use a dot for decimals, e.g. 7.5" (good). Empty → "Enter assets and liabilities."
- Problems found:
  - **MEDIUM** — Feature "A one-line reading of each" is not there: only the three numbers appear, no interpretation ("above 1 means…"). Screenshot `ratios-desktop.png`.
  - LOW — Stock "abc" silently drops the Quick ratio card (no message); negative stock accepted (Quick becomes 1.3); liabilities 0 or negative silently hides Current and Quick with no message.
- Promise check: "Current and quick ratios" → kept; "Debt to equity" → kept; "A one-line reading of each" → **not kept**.
- Mobile: fine.
- Suggested fixes: add the reading line per ratio; name invalid/zero inputs.

### Statements (/apps/statements) — free
- Verdict: **Useful but needs improvement**
- Tested workflows (VERIFIED):
  - Fresh: Copy as text / Print / Clear all disabled. Period "October 2026", revenue 1,200,000, cost of sales 450,000, other expenses 300,000 → Gross profit 750,000, Net 450,000, Net margin 37.5% (correct). Status "Saved". Reload shows the same values.
  - Loss case rev 900,000 / cogs 1,200,000 / exp 300,000 → -300,000, -600,000, -66.7% (correct).
  - Copy as text: "Statements / Period October 2026 / Revenue 1200000 / … / Gross profit: 750,000 / Net: 450,000 / Net margin: 37.5%". Print opens a print frame with the same text (captured from the iframe).
  - 3,000-character Period saved. Clear asks "Clear every field?" → "Yes, clear" empties fields; stays empty after reload.
- Problems found:
  - **MEDIUM** — Revenue is a number input: typing "7,5" becomes 75 and the statement shows "Gross profit -449,925 / Net margin -999900%" without warning; typing letters blanks the field (treated as 0, Net margin "—"). The `firstHint` code path for "7,5" can never trigger here.
  - LOW — Negative revenue accepted (-50,000 → "Net margin —").
  - LOW — Copied/printed text uses the raw typed figures ("1200000") while the result lines are formatted ("750,000"); the page has no currency.
- Promise check: "Revenue, cost of sales, and expenses" → kept; "Gross profit and net profit" → kept; "Saved with your account" → kept.
- Mobile: fine (`statements-mobile.png`).
- Suggested fixes: text inputs with the shared parser; format the typed figures in the copy/print text.

### Break-even (/apps/breakeven) — free
- Verdict: **Ready** (small wording issues)
- Tested workflows (VERIFIED):
  - Fixed 200,000, price 1,500, unit cost 900 → Units to sell 334, Sales needed 501,000, Profit per unit 600 (correct, rounded up). Fixed "50,000", price 250, cost 100 → 334, 83,500, 150 (correct).
  - Cost above price, or equal → "Price has to be above the cost of one unit." (the promised warning). "7,5" → dot hint. Fixed 0 → 0 units.
- Problems found:
  - LOW — Empty state and "abc" and negative fixed costs all show "Price has to be above the cost of one unit." (misleading when the price field is fine).
- Promise check: all three features → kept.
- Mobile: fine.
- Suggested fixes: a neutral empty-state line; name non-numeric input.

### Algo (/apps/algo) — free
- Verdict: **Ready**
- Tested workflows (VERIFIED):
  - "5 1 4 2" Start → "5 1 4 2 / 0 comparisons, 0 swaps"; Step ×5 → 1 5 4 2 (1,1), 1 4 5 2 (2,2), 1 4 2 5 (3,3), 1 2 4 5 (5,4), "Sorted. 6 comparisons, 4 swaps" with Step disabled. Counts are correct for bubble sort with early exit.
  - Commas accepted ("3, 1, 2"); letters dropped ("a b 3 1" → "3 1"); empty → "" with "Sorted. 0 comparisons".
- Problems found:
  - LOW — 16 numbers are silently cut to the first 12 (no message). "7,5 2" is read as three numbers 7 5 2.
- Promise check: "Your numbers, or a sample list" → kept; "One swap at a time" → kept; "The comparisons and swaps counted" → kept.
- Mobile: fine.
- Suggested fixes: say "first 12 numbers are used".

### Solver (/apps/solver) — free
- Verdict: **Useful but needs improvement**
- Tested workflows (VERIFIED):
  - Speed 100 / 4 → "25 (distance ÷ time)"; density 500/250 → "2 (mass ÷ volume)"; force 10 × 9.8 → "98 (mass × acceleration)"; molarity 0.5/2 → "0.25 mol/L". All correct.
  - Divisor 0, letters, "7,5" → "Enter both numbers." Negative litres → "-0.25 mol/L".
- Problems found:
  - MEDIUM — Switching formula keeps the old numbers (speed 100/4 → switch to density shows "25 (mass ÷ volume)" with Mass/Volume labels but values from Distance/Time).
  - LOW — "Enter both numbers." is shown for divide-by-zero and for invalid input even when both boxes are filled. Force with a blank mass shows "0 (mass × acceleration)". No units for speed, density or force.
- Promise check: "Speed, density, force, and molarity" → kept; "The answer from the two values you fill" → kept; "The formula written out" → **partly** (only a bracketed "distance ÷ time", no units, no symbolic formula).
- Mobile: fine.
- Suggested fixes: clear values on formula change; specific messages; units.

### Plot (/apps/plot) — free
- Verdict: **Too shallow or unreliable to promote**
- Tested workflows (VERIFIED):
  - Default pairs draw a blue polyline on a 640×280 canvas (2,198 painted pixels). 500 points draw. Empty → blank canvas.
  - Bad lines "abc, 2", "4 16" (space), "5;25" and "1,5, 3" are silently dropped — the canvas just redraws with fewer points, no message naming the line.
  - A single point draws nothing (no dot).
- Problems found:
  - **HIGH** — Feature "A line on a grid": there is no grid, no axes, no tick labels, no point markers (screenshot `plot-desktop.png`); the line alone cannot be read. Nothing identifies the scale.
  - MEDIUM — Guide "Fix a line if a point is missing" is impossible: the app never says which line failed to parse.
  - LOW — No copy/save of the image; canvas is a fixed 640×280 bitmap stretched to the container.
- Promise check: "Pairs of x and y" → kept; "A line on a grid" → **not kept**; "Nothing is uploaded" → kept (no network calls).
- Mobile: fine, no overflow (`plot-mobile.png`).
- Suggested fixes: axes + gridlines + min/max labels, point markers, a list of unreadable lines by number.

### Shifts (/apps/shifts) — free
- Verdict: **Ready**
- Tested workflows (VERIFIED):
  - Fresh: "Nothing here yet. Your first entry will show up here, saved to your account." Add disabled until a field is filled.
  - Added 20 Oct 07:00–19:00 Ward 3 (12 h), 22 Oct 19:00–07:00 A&E (12 h, crosses midnight), 23 Oct 08:30–14:00 Clinic 2 (5.5 h), 13 Oct 08:00–16:00 Ward 3 (8 h, previous week). Cards: "Hours this week 29.5 h", "Hours in this list 37.5 h" — correct (week Mon 19 – Sun 25 Oct). Each row shows "Hours 12 h" etc. and the date as "20 Oct 2026".
  - A row with only a date/place or only a start time is accepted and simply shows no Hours line; totals unchanged.
  - Edit: row loads into "Edit entry" with the saved date/times; "Save changes" updates the row. Remove → toast "Removed" with Undo (Undo restored the row; removing again worked). "Saved" shown; reload shows the same 5 rows and totals.
  - Copy list: "Shifts\n\n2026-10-20 — 07:00 — 19:00 — Ward 3 …". Export CSV `shifts.csv`: header "Date,Start,End,Where" + 5 data rows (checked content).
  - Add to Remind: href `/apps/tasks?add=Shift+at+Ward+3+on+20+Oct+2026+at+7am+until+7pm`; clicking opens Remind with the add box pre-filled "Shift at Lab (edited) on 24 Oct 2026" and the parsed preview "Tomorrow", nothing added until Add is pressed (`shifts-add-to-remind.png`).
  - Search box appears with >4 rows: "ward" → 2 rows, "zzz" → "No entries match “zzz”."
  - Mobile: added and removed a shift by tapping (`shifts-mobile-after-add.png`).
- Problems found:
  - LOW — Start = End (08:00–08:00) is counted as "24 h" rather than flagged.
  - LOW — Copy list uses ISO dates ("2026-10-20") while the screen shows "20 Oct 2026".
- Promise check: "Date, start, end, and place" → kept; "Hours for each line, this week, and in total" → kept; "The list stays on your account" → kept; guide "A shift that ends after midnight is counted as a night shift" → kept (19:00–07:00 = 12 h); "Each shift has a button to copy it into your to-do list" → kept.
- Mobile: single column, tap targets fine (`shifts-mobile.png`).
- Suggested fixes: warn on start = end; pretty dates in the copied list.

### Reference (/apps/dose-ref) — free
- Verdict: **Ready** (as a four-entry study list)
- Tested workflows (VERIFIED): four entries (Paracetamol, Ibuprofen, ORS, Adrenaline) with cautions; review note and "Reference notes for study…" note shown. Search "para" → 1 entry; "zzzz" → empty list with no message.
- Problems found: LOW — no "nothing matches" message when a search finds nothing; the list is only four items ("short" is honest).
- Promise check: "Search a short adult list" → kept; "The usual caution next to the name" → kept; "Not a substitute for a formulary" → kept (stated twice).
- Mobile: fine.

### Regex (/apps/regex) — free
- Verdict: **Useful but needs improvement**
- Tested workflows (VERIFIED):
  - Default `\d+` / g / "Order 14 and 3." → "14, 3". `[a-z]+` gi → "Order, and". Bad pattern `[` → "Invalid regular expression: /[/: Unterminated character class". Bad flag "gx" → "Invalid flags supplied to RegExp constructor 'gx'". No match → "No match." 25,000-word sample handled.
- Problems found:
  - **MEDIUM** — Feature "Matches marked in the sample" is not kept: the sample is a plain textarea; matches are only listed as text under it (`regex-desktop.png`).
  - MEDIUM — Without the g flag, capture groups are listed as if they were matches: `(\d)(\d)` → "14, 1, 4".
  - LOW — Empty pattern shows ", , , , , , , , , , , , , , " (one empty match per position).
- Promise check: "A JavaScript pattern and flags" → kept; "Matches marked in the sample" → **not kept**; "The error if the pattern is bad" → kept.
- Mobile: fine.
- Suggested fixes: highlight matches in a rendered copy of the sample; use matchAll and show groups separately; ignore an empty pattern.

### JSON (/apps/json-fmt) — free
- Verdict: **Ready**
- Tested workflows (VERIFIED):
  - Format valid JSON → pretty-printed in the box, "Valid JSON. Formatted." Check → "Valid JSON." Copy copies the box.
  - Trailing comma → "Line 2, column 16 / Remove the comma before “]”." with the line and a caret under column 16 (correct position). Empty → "Line 1, column 1 / There is nothing to read yet." "abc" → "Expected a value but found “a”."
  - Format on invalid JSON leaves the text untouched. 300 KB document formatted in ~110 ms.
  - Glyph link → /apps/glyph (not followed).
- Problems found: LOW — the inline "Glyph" link is 39×19 px on mobile (text link; acceptable).
- Promise check: all three features and the guide → kept.
- Mobile: fine (`json-fmt-mobile.png`).

### Tax (/apps/paye) — free
- Verdict: **Useful but needs improvement** (figures recorded; not judging legal correctness)
- Disclaimers shown on the page, verbatim: blurb "A 2026 Nigeria PAYE estimate, and VAT at 7.5%. Confirm it before you file."; review note "Not professionally reviewed yet. Check with an accountant before relying on this."; note "Estimate using the Nigeria Tax Act bands from 1 January 2026, and VAT at 7.5%. Confirm with a tax office. Reliefs other than optional rent relief are not applied."; guide "Read the estimate. It is not a filing."
- Fields: "Annual pay (₦)", "Annual rent, optional (₦)", "Amount for VAT (₦)" (defaults 3,000,000 / 0 / 100,000 → PAYE ₦330,000, VAT ₦7,500). **The app only takes and shows annual figures**; there is no monthly box, so a monthly salary has to be multiplied by 12 by the user and the result divided by 12.
- Figures recorded (rent 0, VAT amount 100,000 → VAT ₦7,500 in every case):
  | Monthly gross | Entered annual | PAYE estimate shown (annual) | ÷12 (not shown by app) | With rent 1,200,000 | With rent 4,000,000 |
  |---|---|---|---|---|---|
  | ₦150,000 | 1,800,000 | ₦150,000 | 12,500 | ₦114,000 | ₦75,000 |
  | ₦500,000 | 6,000,000 | ₦870,000 | 72,500 | ₦826,800 | ₦780,000 |
  | ₦2,000,000 | 24,000,000 | ₦4,470,000 | 372,500 | ₦4,419,600 | ₦4,365,000 |
  Hand check of the app's own bands (0% to 800k, 15% to 3.0M, 18% to 12M, 21% to 25M, 23% to 50M, 25% above; rent relief 20% capped ₦500,000; pay ≤ ₦840,000 → 0): 1.8M → 1,000,000×15% = 150,000 ✓; 6M → 330,000 + 3,000,000×18% = 870,000 ✓; 24M → 330,000 + 1,620,000 + 12,000,000×21% = 4,470,000 ✓. Threshold: 840,000 → ₦0; 840,001 → ₦6,000 (40,001 × 15%). VAT 2,500,000 → ₦187,500 ✓.
- Problems found:
  - **MEDIUM** — Letters, blank or a negative annual pay all show "PAYE estimate ₦0" with no error (looks like a real zero-tax result). Negative VAT amount shows "₦-75". "7,5" does show the dot hint.
  - MEDIUM — Threshold jump: ₦840,000 → ₦0 but ₦840,001 → ₦6,000 (the code zeroes tax only when income ≤ 70,000 × 12, then applies the bands in full). Recorded, not judged.
  - LOW — No monthly input or monthly result although most users know a monthly salary.
- Promise check: "PAYE bands from the 2026 schedule" → kept (as coded); "Optional rent relief, 20% capped at ₦500,000" → kept (verified at 1.2M and 4M rent); "VAT at 7.5% on an amount you type" → kept.
- Mobile: fine (`paye-mobile-150k.png`).
- Suggested fixes: refuse letters/negatives with a message; add a monthly toggle.

### Reconcile (/apps/reconcile) — free
- Verdict: **Ready**
- Tested workflows (VERIFIED):
  - Left "12,500 / 3,000 / 780.50 / abc / 7,5 / 500 / 500" vs right "12,500 / 780.50 / 1,000 / 500 / ₦2,000": "5 amounts · total 17,280.5" vs "5 amounts · total 16,780.5"; red box "2 lines in your records could not be read and are not counted: Line 4: “abc” is not an amount. Line 5: “7,5” uses a comma as the decimal point. Use a dot for decimals, e.g. 7.5."; headline "The totals differ by 500."; "Amounts that appear in both lists (3) = 12,500, 780.5, 500"; "Only in your records (2) = 3,000 (line 2), 500 (line 7)" (duplicate paired once — correct); "Only on the statement (2) = 1,000 (line 3), 2,000 (line 5)"; "Lines that could not be read 2". All correct; ₦ prefix accepted.
  - Clean case → green "Every amount appears in both lists, and the totals agree. This compares amounts only, not dates or payees." Negative amounts accepted. 1000 vs 1000 lines computed instantly.
- Problems found: LOW — "1 amounts · total 100" (plural). No copy/export of the result.
- Promise check: all three features and guide → kept.
- Mobile: two textareas stack; fine (`reconcile-mobile.png`).

### Clauses (/apps/clauses) — free
- Verdict: **Useful but needs improvement** (promised copy button missing)
- Tested workflows (VERIFIED): five clauses (Payment, Scope, Confidentiality, Termination, Liability); search "payment" → 2 (Payment, Termination), "notice" → 1, "zzzz" → empty with no message. Review and "Starting points, not a finished contract and not legal advice." notes shown.
- Problems found:
  - **MEDIUM** — Feature "Copy a clause" / guide "Copy the clause.": there is no copy button on any clause (`clauses-desktop.png`); the user must select text by hand.
  - LOW — No "nothing matches" message.
- Promise check: "Search a short library" → kept; "Copy a clause" → **not kept**; "You edit names, dates, and law" → kept in spirit (the clauses are not editable in the app; you edit them elsewhere).
- Mobile: fine.

### Creative brief (/apps/creative-brief) — free
- Verdict: **Ready**
- Tested workflows (VERIFIED): fields Client, Audience, Message, Deliverable, Deadline; filled with "Synthetic Studio Ltd" etc.; "Saved"; reload keeps every value; Copy as text copies "Creative brief / Client / Synthetic Studio Ltd / Audience / …"; Print frame contains the same text; a 10,000-character Audience saved and reloaded in full; Clear asks first (same control as Statements).
- Problems found: none material.
- Promise check: "Audience, message, deliverable, and deadline" → kept; "Saved with your account" → kept; "Copy or print it when it is ready" → kept.
- Mobile: fine.

### Mood (/apps/mood) — free
- Verdict: **Useful but needs improvement**
- Tested workflows (VERIFIED): six native colour inputs (defaults #1d4ed8 …); changed chip 1 to #c2410c and chip 6 to #0f766e, typed words; "Saved"; reload shows the same colours and words.
- Problems found:
  - MEDIUM — The chips are bare 50×27 px browser colour swatches with no hex label, no copy, no export (`mood-desktop.png`, `mood-mobile.png`); a mood board you cannot share or read a value from.
  - LOW — No empty-state guidance beyond the placeholder.
- Promise check: "Six colour chips" → kept (literally); "Words for the direction" → kept; "Saved with your account" → kept.
- Mobile: chips wrap to two rows; 27 px tall (small but they open the native picker).
- Suggested fixes: show hex next to each chip, copy palette, bigger chips.

### Stock (/apps/stock) — free
- Verdict: **Ready**
- Tested workflows (VERIFIED):
  - Added Indomie carton 12/5, Peak milk tin 3/6, Sugar 1kg 5/5, Rice 50kg 0/2 → "Low" badge on Peak, Sugar (at the mark) and Rice, banner "3 items are running low." Edit Rice to 20 → badge gone. Remove works with Undo. "Saved"; reload shows the same rows.
  - Copy list ("Stock\n\nIndomie carton — 12 — 5 …") and `stock.csv` ("Item,Quantity,Low at" + rows) checked.
  - Seeded 300 rows via `saveDoc` (doc shape `{ rows: [{ item, qty, low }] }`): page loads in ~2 s, "300 entries", "76 items are running low.", search box filters ("Garri #2" → 14), adding a 301st row saved in ~1 s, server document has 301 rows, remove at 301 saved. No errors (`stock-300-rows-desktop.png`, `stock-mobile.png`).
- Problems found:
  - LOW — Negative quantity (-5) accepted and flagged Low; "7,5" becomes 75 (number input); a row with a blank Item but a quantity can be added (Add enables when any field has text).
  - LOW — 300 rows render as one 33,000 px list with no paging; still usable via search.
- Promise check: "Item, quantity, and a low mark" → kept; "A flag when quantity is at or under the mark" → kept (at = flagged); "Saved with your account" → kept.
- Mobile: fine.
- Suggested fixes: require an item name; refuse negatives.

### Profit (/apps/margin) — free
- Verdict: **Useful but needs improvement** (promised note missing)
- Tested workflows (VERIFIED): cost 800, price 1,200 → Profit 400, Margin 33.33% (correct). Cost 1,500, price 1,000 → Profit -500, Margin -50%. Price 0/blank → Margin "—". Empty → "Enter both numbers."
- Problems found:
  - **MEDIUM** — Feature "A note if the price is below cost": no note appears, only the negative numbers (`margin-desktop.png`).
  - MEDIUM — Price "7,5" becomes 75 (number input) → "Profit -1,425, Margin -1,900%" silently; letters blank the field (treated as 0).
  - LOW — Negative price accepted (-200 → "Margin 850%").
- Promise check: "Cost and selling price" → kept; "Profit and margin percent" → kept; "A note if the price is below cost" → **not kept**.
- Mobile: fine.

### Menu (/apps/menu) — free
- Verdict: **Useful but needs improvement**
- Tested workflows (VERIFIED):
  - Added Jollof rice 2500 "with chicken", Pepper soup 3200, Chapman 1500 "500ml"; "Saved"; edit price → 1800; remove last; reload keeps rows. Copy list ("Menu\n\nJollof rice — 2500 — with chicken …") and `menu.csv` ("Dish,Price,Note" + rows) checked.
  - QR: "menu" and "https://" → "Paste a full link that starts with https://". Valid link → 640 px PNG data image with alt "QR code for https://example.com/synthetic-studio/menu.pdf"; "Save the image" downloads `menu-qr.png` (12.5 KB). The link is saved; after reload the link is back in the box but the code image must be made again.
- Problems found:
  - MEDIUM — Blurb "Copy it or print it." — there is no Print button in Menu (only Copy list / Export CSV).
  - LOW — Prices are plain numbers with no currency and no total; "2,5" typed into Price becomes 25.
  - LOW — QR image not re-shown after reload although the link is remembered.
- Promise check: "Dish, price, and a note" → kept; "A list you can copy" → kept; "Saved with your account" → kept; "A QR code for a menu link you already have (any https link), saved as an image" → kept; "The link is not checked or hosted for you" → kept (stated on screen); blurb "print it" → **not kept**.
- Mobile: QR section stacks, Make code full width (`menu-mobile-qr.png`).

### Recipe cost (/apps/recipe-cost) — free
- Verdict: **Ready** (one silent drop)
- Tested workflows (VERIFIED): "500 / 200 / 1,250 / 75.5", 4 portions → Batch 2,025.5, Each 506.38 (correct). "₦3,000 / 450 / 120", 12 → 3,570 and 297.5 (correct). "7,5" line → "Check the costs: Use a dot for decimals, e.g. 7.5". Portions 0, negative or blank → "Add costs and a portion count."
- Problems found:
  - MEDIUM — A letters line ("abc") is silently dropped from the total (500+abc+200 → "Batch 700") with no message, unlike "7,5". Negative lines are included (-100).
- Promise check: "Lines of cost" → kept; "Portions" → kept; "Cost of one portion" → kept.
- Mobile: fine.

---

## Summary

| App (slug) | Verdict | Top problem |
|---|---|---|
| Dose (dose) | Needs improvement | "7,5" typed into Weight becomes 75 → 10× dose shown with no warning; letters → "0 mg" |
| Units (units) | Ready | "1,500" refused with no hint (inconsistent with other kits) |
| Circuit (circuit) | Needs improvement | Letters/"7,5"/zero divisor all give the generic "Leave exactly one … blank" line |
| Ratios (ratios) | Needs improvement | Promised "one-line reading of each" ratio does not exist |
| Statements (statements) | Needs improvement | Number inputs turn "7,5" into 75 (margin -999900%); negatives accepted |
| Break-even (breakeven) | Ready | Empty/invalid state shows the "price above cost" warning |
| Algo (algo) | Ready | Lists over 12 numbers silently truncated |
| Solver (solver) | Needs improvement | Values carried over when switching formula; no units |
| Plot (plot) | Too shallow | No grid, axes or labels despite "A line on a grid"; bad lines dropped silently |
| Shifts (shifts) | Ready | Start = End counted as 24 h |
| Reference (dose-ref) | Ready | No "nothing found" message |
| Regex (regex) | Needs improvement | Matches are not marked in the sample; groups listed as matches without g |
| JSON (json-fmt) | Ready | — (minor: small Glyph link) |
| Tax (paye) | Needs improvement | Letters/blank/negative pay show "₦0" as a result; annual-only |
| Reconcile (reconcile) | Ready | "1 amounts" plural |
| Clauses (clauses) | Needs improvement | Promised "Copy a clause" button missing |
| Creative brief (creative-brief) | Ready | — |
| Mood (mood) | Needs improvement | Bare 50×27 px colour swatches, no hex/copy/export |
| Stock (stock) | Ready | Blank item name / negative quantity accepted |
| Profit (margin) | Needs improvement | Promised "note if price is below cost" missing; "7,5" → 75 |
| Menu (menu) | Needs improvement | Blurb promises print; no Print button; QR not re-shown after reload |
| Recipe cost (recipe-cost) | Ready | A letters line is silently dropped from the total |
