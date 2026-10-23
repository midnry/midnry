# Audit: kits2 (20 free kit apps from src/lib/kits.ts, rendered by src/components/tools/kit.tsx)

Date: 2026-10-23. Server: http://127.0.0.1:8080 (dev, PGLite). Account: qa-admin@example.test.
Driver: docs/audit-2026-10-23/kits2-audit.mjs
(one Chromium, desktop 1280x900 then mobile 390x844, launched with `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream`).
Logs: kits2-run2.log, kits2-run3.log (bookings/symptom-log/bill-watch re-run after a selector bug in my own script wiped
their rows), remind-follow.mjs output. Screenshots: /home/user/midnry/screenshots/audit/kits2/<slug>-desktop.png,
<slug>-mobile.png (full page) and <slug>-mobile-fold.png (first screen).

Before each tracker/template test I reset that app's document to empty through the server function (`{rows: []}` /
`{values: {}}`) so the empty state could be observed; every other step was driven through the UI. Orders was seeded with
300 extra rows through the server function for the large-list check.

**Page errors / console errors across all 20 apps, desktop and mobile: none** (the only errors in run 1 were from my own
init script, fixed in run 2).

## Findings shared by every tracker (bookings, catalog, orders, farm-sales, visits, symptom-log, bill-watch)

Verified on each: empty state text "Nothing here yet. Your first entry will show up here, saved to your account."; Add is
disabled until something is typed; Add two rows; Edit (the row's form loads into the "Edit entry" form at the top, button
reads "Save changes", row gets a ring); Remove shows a "Removed / Undo" toast, Undo restores the row; reload shows exactly
the kept rows; status text reads "Saved"; "Copy list" writes `<Title>\n\n<field — field — field>` lines to the clipboard;
"Export CSV" downloads `<slug>.csv` with a header row and RFC-style quoting (`"Raw, unrefined"`, `"General Hospital, Room 2"`);
a 3,000-character field wraps with no horizontal overflow on desktop or phone; search box appears once there are more
than 4 entries and shows `No entries match "zzzz-nomatch"`; newest entry is listed first.

Shared problems:
- **(medium) Comma decimals are silently mangled in every number box** (Catalog Price, Farm sales Amount/Price, Bills
  Amount, Yield, Savings). The boxes are `<input type="number">`, so typing `7,5` leaves the browser value `75` and the
  row is saved as 75 with no warning (observed in Catalog, Farm sales and Bills: toasts=[] and the row shows "75"). The
  app's own "Use a dot for decimals" guard (`firstHint`) can never fire because the browser strips the comma before the
  app sees it. Letters are simply swallowed (value stays empty), which is fine.
- (low) Negative amounts are accepted (`-250`) and subtracted from the Total card (Farm sales, Bills).
- (low) "Edit" does not edit in place: it jumps the page to the form at the top (`scrollIntoView`), which contradicts
  Catalog's promise "Change a price in the same row".
- (low) Edit/Remove/"Add to Remind" controls are 36 px tall, 14 px text, even on the "Large type" senior apps (Visits,
  Symptoms, Bills). Inputs are 17 px.
- (low) "Copy list" copies raw stored values (`2026-11-05 — 10:30`) while the screen shows `5 Nov 2026`.
- (low) The "Removed / Undo" toast survives navigation: it is still on screen on the Remind page after "Add to Remind"
  (visits-remind-prefill.png) and stacks up on the Catalog page (catalog-desktop.png).
- (low) The CSV always includes the legacy columns (`When` for Visits, `Due` for Bills) as empty columns.
- No row dates are sortable; lists are insertion order only.

---

### Bookings (/apps/bookings) — free
- Verdict: Ready
- Tested workflows (VERIFIED): all shared tracker steps; rows "Amaka Okafor / Braids / Fri 14:00", "Chidi Eze / Nails /
  Sat 10:00"; edit to "Braids (knotless)"; remove + Undo + remove; reload shows 1 entry with the edited service; copy
  list = `Bookings\n\nAmaka Okafor — Braids (knotless) — Fri 14:00`; CSV = `Name,Service,When\nAmaka Okafor,Braids
  (knotless),Fri 14:00`; 3,000-char name wraps; 5 entries → search "braids" returns 2 rows; on the phone, added "Phone
  User" by tap and removed it (6 entries then 5).
- Unverified: nothing material.
- Problems: "When" is free text with placeholder "Fri 14:00" — no date picker, no ordering by time, no reminder (low).
  No "Add to Remind" here although Bills/Visits have it (low).
- Promise check: "Name, service, and time" kept; "The list stays on your account" kept (reload); "You still confirm
  with the client" kept (nothing is sent). Guide steps kept.
- Mobile: no overflow (390/390); single-column form; Edit/Remove 36 px tall. bookings-mobile.png.
- Fixes: a date/time field (or at least sort by When); larger row buttons.

### Catalog (/apps/catalog) — free
- Verdict: Useful but needs improvement
- Tested (VERIFIED): shared steps with "Shea butter 250g / 2500 / Raw, unrefined", "Black soap / 1800"; price edited to
  2700 via the top form; reload keeps it; copy list `Catalog\n\nShea butter 250g — 2700 — Raw, unrefined`; CSV
  `Product or item,Price,Line\nShea butter 250g,2700,"Raw, unrefined"`; letters in Price swallowed; `7,5` saved as
  **75** with no warning; `-250` accepted; 5 entries → search "shea" works, no-match text shown. No total line (by design,
  field is `price` not `amount`).
- Problems: (medium) comma-decimal → 75 (shared); (low) "Change a price in the same row" is not true — Edit scrolls to
  the top form (scrollY 542 → 337, 0 inputs inside the row); (low) no currency symbol anywhere, the copied list reads
  "Shea butter 250g — 2700 — Raw, unrefined", so a customer pasted it cannot tell ₦ from $.
- Promise check: "Product or item, price, and an optional line" kept; "A price list you can copy or export" kept;
  "Change a price in the same row" **not kept**; "Saved with your account" kept. Guide: "Copy the list into your shop…"
  kept; "Change a price in the same row" not kept.
- Mobile: fine, no overflow. catalog-mobile.png.
- Fixes: inline price edit or reword the promise; currency prefix or label; text input with the shared number parser.

### Agreement (/apps/service-terms) — free
- Verdict: Too shallow or unreliable to promote (as an "agreement")
- Tested (VERIFIED): empty state: Copy/Print/Clear all disabled; filled You="Amaka Okafor Design", Client="Synthetic
  Studio Ltd", Work="Design a 12-page brochure…", Fee="₦450,000, half before work starts", Revisions=2, Notice="14 days";
  status "Saved"; reload restores all six values; "Copy as text" and Print both produce exactly:
  `Agreement\n\nYou\nAmaka Okafor Design\n\nClient\nSynthetic Studio Ltd\n\nWork or job\n…\n\nFee\n…\n\nRevisions\n2\n\nNotice\n14 days`
  (print captured from the print iframe, title "Agreement"); a 20,000-character Work box saved ("Saved"); Clear asks
  "Clear every field?" and "Yes, clear" empties the form. Review banner shown: "Not professionally reviewed yet. Check
  with a lawyer before relying on this."
- Problems: (high) **There is no agreement.** The output is a label/value list of the six boxes. Nothing says who agrees
  to what, no clause about revisions beyond the number "2", no notice clause, no signature lines, no date. The blurb "A
  short client or services agreement from the job, the fee, revisions and notice" and the guide "Read every sentence"
  promise prose that does not exist. (low) Fee/Revisions/Notice are free text; nothing is checked.
- Promise check: "Parties, the work or job, fee, revisions, and notice" kept as boxes; "A one-page draft you can copy or
  print" **not kept** (a filled form, not a draft); "Saved with your account" kept; "You add the governing details" kept
  (nothing is generated). Guide steps 1–2 kept, 3 "Read every sentence" not applicable, 4 kept (banner).
- Mobile: fine. service-terms-mobile.png.
- Fixes: generate a short prose draft from the boxes (parties, scope, fee, revisions, notice, signatures) or rename the
  app "Agreement details".

### Orders (/apps/orders) — free
- Verdict: Ready
- Tested (VERIFIED): shared steps ("Amaka Okafor / Ankara dress (M) / paid", "Synthetic Studio Ltd / 50 branded tote
  bags / sent"; status edited to "delivered"); 3,000-char item wraps; **large list**: seeded 300 extra rows → "301
  entries" rendered in ~1.8 s with all 301 cards in the DOM; search "#150" returned the single matching row in ~0.4 s;
  CSV had 302 lines (header + 301); adding a row to the 301-row list saved ("302 entries", status "Saved"). No errors.
- Problems: (low) Status is free text (placeholder "paid"), so "paid"/"Paid"/"piad" are all different and there is no
  status filter beyond the search box; (low) no pagination, the whole list is rendered (fine at 300, untested beyond).
- Promise check: "Name, item, and status" kept; "Saved with your account" kept; "A list you can scan" kept (search +
  newest first). Guide kept.
- Mobile: no overflow; with 302 rows the page is very long but usable. orders-mobile.png.
- Fixes: status as a select or chips with a filter.

### Replies (/apps/wa-replies) — free
- Verdict: Useful but needs improvement
- Tested (VERIFIED): five cards (Price, Paid, Delay, Not available, Delivery fee) with ₦____ blanks; search "deliver" →
  1 card; no-match → empty list with no message; **no button of any kind on the page** (`main button` count 0).
- Problems: (medium) Feature "Copy a reply" and guide "Copy the text" are **not kept** — there is no Copy button; the
  user must select text by hand, which is awkward on a phone. (low) No "nothing matches" text on an empty search.
- Promise check: "Price, delivery, and a polite no" kept; "Copy a reply" not kept; "Edit the numbers before you send it"
  only possible after pasting elsewhere.
- Mobile: fine. wa-replies-mobile.png.
- Fixes: a Copy button per card (the CopyButton component already exists in kit.tsx); empty-search text.

### Yield (/apps/yield) — free
- Verdict: Ready
- Tested (VERIFIED): empty → "Result: Enter a harvest, land above zero, and a cost."; 2500 / 2.5 ha / 300000 → "Per
  hectare: 1,000", "Cost per unit: 120" (hand: 2500/2.5=1000, 300000/2500=120); 1234.5 / 0.75 / 98765 → 1,646 and 80
  (hand 1646.00, 80.00); harvest 0 → per hectare 0, cost per unit "—"; land 0 or −2 → the prompt message; "Copy results"
  → `Per hectare: 1,646\nCost per unit: 80`.
- Problems: (low) no unit is named for the harvest (bags, kg, tonnes), so "Per hectare: 1,000" is unit-less; (low) comma
  decimal issue (shared).
- Promise check: all three features and the guide kept.
- Mobile: fine. yield-mobile.png.

### Farm sales (/apps/farm-sales) — free (views: Sales, Price log at ?view=prices)
- Verdict: Ready
- Tested (VERIFIED): Sales: shared steps ("Mama Nkechi (market) / Maize / 45000", "Synthetic Studio Ltd / Cassava /
  120000"), amount edited to 47000, Total card shows "47,000"; `7,5` → 75 with no toast; `-250` subtracted (Total
  46,825). Price log: tab click sets the URL to `?view=prices`, blurb "What a crop sold for, and when. Your own prices,
  not a market feed." shown; added "Maize / 32000 / 2026-10-20" and "Cassava / 15000 / 20/10/2026"; reload with
  `?view=prices` opens that tab selected with both rows; CSV `farm-sales-prices.csv` =
  `Crop,Price,Date\nMaize,32000,2026-10-20\nCassava,15000,20/10/2026`; back to Sales shows 1 entry and clears the param;
  the saved document is `{rows, views: {prices}}`.
- Problems: (low) Price log "Date" is a plain text box (no date picker), so dates are saved in whatever format is typed
  (both formats above were accepted side by side); (low) no total/average per crop in the Price log; (medium) comma
  decimal (shared).
- Promise check: "Sales: buyer, crop, and amount, in a running list" kept; "Price log: crop, price, and date" kept;
  "Your own prices, not a market feed" kept; "Saved with your account" kept. Guide kept.
- Mobile: tabs fit, no overflow. farm-sales-mobile.png, farm-sales-prices-desktop.png.

### Visits (/apps/visits) — free
- Verdict: Ready
- Tested (VERIFIED): shared steps with a real date input (2026-11-05 shows as "5 Nov 2026") and time input (10:30);
  edit "Where" to "General Hospital, Room 2"; reload keeps it; legacy "When" box is not offered for new rows; CSV
  `Who,Where,Date,Time,When\nDr Bello,"General Hospital, Room 2",2026-11-05,10:30,`; **Add to Remind**: href
  `/apps/tasks?add=Visit+Dr+Bello+at+General+Hospital%2C+Room+2+on+5+Nov+2026+at+10%3A30am`; following it opens Remind
  with the add box pre-filled "Visit Dr Bello at General Hospital, Room 2 on 5 Nov 2026 at 10:30am" and Remind's preview
  shows the parsed title plus chip "Thu, Nov 5, 10:30am" (visits-remind-prefill.png).
- Unverified: pressing Add in Remind and finding the task in Upcoming (Remind is another group's app).
- Problems: (low) copy list uses raw `2026-11-05 — 10:30`; (low) 36 px buttons on a "Large type" app.
- Promise check: "Who, where, and when" kept; "Large type" partly (18 px body, 14 px row buttons); "Saved with your
  account" kept. Guide "each visit has a button to copy it into your to-do list" kept.
- Mobile: fine (visits-mobile.png); Add to Remind / Edit / Remove in one row.

### Symptoms (/apps/symptom-log) — free
- Verdict: Ready
- Tested (VERIFIED): shared steps with Day="Monday 20 Oct" and a multi-line note; edit Day to "Tuesday 21 October";
  reload keeps it; copy list `Symptoms\n\nTuesday 21 October — Woke with a headache…`; CSV
  `Day,How you felt\nTuesday 21 October,Woke with a headache. Took water and rested. Better by noon.`; a 3,000-character
  note wraps.
- Problems: (low) "Day" is free text, so no ordering by date and no default of today; (low) no Print for "Show the list
  to a clinician" (Copy and CSV only).
- Promise check: "Day and a short note" kept; "Saved with your account" kept; "Large type" partly (as above). Guide kept.
- Mobile: fine. symptom-log-mobile.png.

### Scam check (/apps/scam-check) — free
- Verdict: Ready
- Tested (VERIFIED, exact text): scam paste ("URGENT: Your GTBank account has been suspended due to unusual activity.
  Verify your account within 24 hours at http://gtb-secure-verify.xyz/login … Reply with your BVN and the OTP … Keep this
  between us.") → headline **"Warning signs found: 5"** with cards "Pressure to act fast", "A code, PIN or password",
  "A link", "A threat to your account", "A request for secrecy", each with a meaning and "What to do:" line, footnote
  "This is a checklist, not proof either way. If money or a code is involved, stop and ask someone you trust."
  Harmless news paste (Lagos Blue Line extra trains) → **"No common warning signs found. That does not prove it is
  genuine. If unsure, ask someone you trust."**, 0 cards. "It's me, Mum, new number, send money, don't tell your brother"
  → "Warning signs found: 3" (payment, new-number, secret). A genuine-looking courier message with a tracking link and
  pickup PIN → "Warning signs found: 2" (code, link). 50,000 x's → no signs, no lag. Clearing the box hides the result.
- Problems: none blocking. (low) the checklist is keyword-based: "unusual activity" alone, or any URL, counts, so
  genuine delivery/bank notices score 1–2 — the footnote covers this honestly.
- Promise check: "Pressure, payment, and links" kept; "Each warning sign found, what it means, and what to do" kept; "It
  does not contact the sender" kept. Guide kept.
- Mobile: fine. scam-check-mobile.png.

### Emergency card (/apps/ice-card) — free
- Verdict: Useful but needs improvement
- Tested (VERIFIED): empty: Copy/Print/Clear disabled; filled Grace Adeyemi / Tunde Adeyemi (son) / 0803 000 0000 /
  "Penicillin allergy. Takes amlodipine 5 mg each morning."; reload restores all four; copy and print output
  `Emergency card\n\nYour name\nGrace Adeyemi\n\nCall this person\n…`; 20,000-char notes saved; Clear confirm works.
- Problems: (medium) there is no "card": the screen is the entry form and the printed page is a plain 14 px label/value
  list, so there is nothing large to "show to a helper"; (low) "Their phone" is plain text, not tel, so nothing is
  tappable to call.
- Promise check: "Your name and a phone to call" kept; "Allergies and medicines, if you want them listed" kept; "Large
  type, saved on your account" partly (saved yes; 17–18 px form, printout 14 px). Guide "Show the card to a helper"
  partly.
- Mobile: fine. ice-card-mobile.png.
- Fixes: a large read-only card view (name and phone in display type) and a print layout to match.

### Claims (/apps/rumor-check) — free
- Verdict: Too shallow or unreliable to promote
- Tested (VERIFIED): the page is four static bullet points ("Who said it, and can you open that source yourself?", "Do
  the date and the place match?", "Is a trusted news site or official page saying the same thing?", "If it asks you to
  forward it, wait."). 0 text boxes, 0 inputs, 0 checkboxes, 0 buttons. There is nowhere to paste a message, so the
  scam/news paste test could not be done; no verdict text exists.
- Problems: (high) the guide says "Answer the questions on the screen" and features say "Who said it, and whether you
  can open the source" — there is nothing to answer, tick or paste; the "app" is a paragraph.
- Promise check: "Who said it, and whether you can open the source" partly (a question, no way to record an answer);
  "A checklist, not a fact-check" kept in spirit but not tickable; "Large type" kept (18 px). Guide step 2 not kept.
- Mobile: fine. rumor-check-mobile.png.
- Fixes: tickable checklist with a "safe to forward? no" outcome, or fold it into Scam check.

### Voice (/apps/voice-note) — free
- Verdict: Ready (with the fake microphone)
- Tested (VERIFIED with `--use-fake-device-for-media-stream`): "● Record" button 141x56 px; while recording the button
  reads "■ Stop (0:02)" and "Recording… speak now." is shown; Stop → an `<audio controls>` player with a blob source,
  duration 2.52 s; "Save the recording" link downloads `voice-note.webm` (30,239 bytes); button becomes "● Record again".
- Unverified: the real permission prompt and the "The microphone is blocked…" message; playback audio; iOS Safari
  (mp4/m4a branch); page behaviour if the tab is backgrounded mid-recording.
- Problems: (low) the file is `.webm`, which WhatsApp on some phones will treat as a document, not a voice note; (low)
  no maximum length or size shown.
- Promise check: "A large record button" kept; "Play it back here" kept (player present); "Download the file. It is not
  sent for you." kept. Guide kept.
- Mobile: fine. voice-note-mobile.png.

### Clearer (/apps/clearer) — free
- Verdict: Useful but needs improvement
- Tested (VERIFIED): uploaded an 80x60 PNG (greys 110 / 125 with a 150 bar, made with node); a "Clearer copy" JPEG data
  URL appeared and a "Download" link (`clearer.jpg`); read the output pixels back: 106 / 124 / 156, matching the
  advertised contrast stretch (1.25x around mid-grey: expected 105.5 / 124.25 / 155.5). Uploading a `.txt` file: nothing
  happens and no message.
- Unverified: HEIC/iPhone photos (Chromium cannot decode them; expected to fail silently like the .txt), very large
  photos, download on a phone.
- Problems: (medium) no error for an unsupported file and no progress text although the guide says "Wait for the clearer
  copy"; (low) the fixed 1.25x stretch is mild — a very dark or washed-out photo stays nearly the same; (low) the result
  preview is small (max 384 px tall) with no before/after.
- Promise check: "A photo from this device" kept; "Stronger contrast" kept (measured); "A download. The photo is not
  uploaded." kept (all canvas work, no request). Guide kept except the "wait" cue.
- Mobile: fine (file input 350x38). clearer-mobile.png.

### Call (/apps/call-guide) — free
- Verdict: Ready
- Tested (VERIFIED): three buttons WhatsApp / They sent a link / Google Meet; each shows its paragraph (texts recorded in
  the log); 20 px text; no search box (none promised).
- Problems: (low) "Follow one step at a time" is not what the screen does — each guide is one paragraph of 5–6
  sentences, not one step at a time with Next; (low) 20 px is "larger", not large, for the target reader.
- Promise check: "WhatsApp and Meet" kept; "Large steps" partly; "Nothing is dialled for you" kept.
- Mobile: fine. call-guide-mobile.png.

### Savings (/apps/pension) — free
- Verdict: Ready
- Tested (VERIFIED): empty → "Result: Enter the monthly amount, years, and rate."; 20,000 / 10 years / 8% → "You put
  in: 2,400,000", "The sum: 3,658,920.7"; hand check: ordinary annuity 20000 × ((1+0.08/12)^120 − 1)/(0.08/12) =
  3,658,920.70 — exact match (an annuity-due would be 3,683,313.51, so the note "a classroom sum" is fair); rate 0 →
  2,400,000; years 0 and negative monthly → the prompt message; rate −5 → 1,891,692.35 (accepted); letters → 0 / 0;
  "Copy results" copies both lines.
- Problems: (low) a negative rate is accepted; (low) "3,658,920.7" shows one decimal — money would read better rounded
  to whole naira; (low) blank boxes read as 0 so "You put in: 0 / The sum: 0" appears instead of the prompt when only the
  amount is blank.
- Promise check: all features and guide kept ("Large type": 18 px).
- Mobile: fine. pension-mobile.png.

### Bills (/apps/bill-watch) — free
- Verdict: Ready
- Tested (VERIFIED): shared steps with "Electricity / 12000 / 2026-11-25" and "NEPA bill / 8500.50 / 2026-11-01"; amount
  edited to 12500; Total card "12,500" (later "21,000.5" with two bills); legacy "Due" not offered; `7,5` → 75 silently;
  `-250` subtracted; CSV `Bill,Amount,Due date,Due\nElectricity,12500,2026-11-25,`; **Add to Remind** hrefs decode to
  `Pay Electricity bill (12,500) on 25 Nov 2026`, `Pay NEPA bill (8,500.5) on 1 Nov 2026`, and for a bill with no date
  `Pay Water bill (3,000)`; following the link pre-fills Remind's add box with that text and Remind's preview shows
  "Pay NEPA bill (8,500.5)" with chip "Sun, Nov 1" and the hint "Check the task below, change it if you need to, then
  press Add. Nothing is added until you do." (bill-watch-remind-prefill.png). Pressing Add in Remind cleared the box and
  the URL lost `?add=`; the task was not in the Today view (due Nov 1).
- Unverified: the created task appearing under Upcoming (Remind belongs to another group).
- Problems: (medium) comma decimal (shared); (low) no "paid" tick or overdue marker, so the list cannot be kept current
  without deleting rows; (low) the Total adds every bill ever entered, including paid ones.
- Promise check: "Name, amount, and due date" kept; "Large type" partly; "Saved with your account" kept. Guide "Each bill
  has a button to copy it into your to-do list" kept.
- Mobile: fine. bill-watch-mobile.png.

### Recipes (/apps/recipes) — free
- Verdict: Ready (as a five-item list)
- Tested (VERIFIED): five cards; search "rice" → Jollof rice only; no-match → empty list, no message; no buttons.
- Problems: (low) "Open a recipe" in the guide: nothing opens, every recipe is already fully shown; (low) "Ingredients
  and steps": each recipe is one paragraph, there is no ingredient list or quantities; (low) only five recipes; no copy.
- Promise check: "Search by food" kept; "Ingredients and steps" partly; "Large type" kept (18 px). Guide step 2 not
  applicable, step 3 kept.
- Mobile: fine. recipes-mobile.png.

### Aloud (/apps/read-aloud) — free
- Verdict: Useful but needs improvement (speech itself UNVERIFIED)
- Tested (VERIFIED): default passage "The Lord is my shepherd; I shall not want." in a 24 px box; Speed slider 0.6–1.4
  (0.9x default); "Read aloud" disabled when the box is empty; Stop button present. `speechSynthesis` exists in headless
  Chromium but `getVoices()` is empty, so after clicking "Read aloud" the button went straight back to "Read aloud"
  (`speaking=false`) — no audio could be produced here.
- Unverified: actual speech, the "Reading…" state, and the unsupported-browser message.
- Problems: (medium, by inspection) when the device has no voice the utterance errors silently and the button just
  resets — the user gets no message; (low) the speed slider thumb is a 16 px-tall native range input, hard for the
  intended reader; (low) the default passage is religious text, which not every family will want as the sample.
- Promise check: "Your own text, or a short passage" kept; "A speak button" kept (labelled "Read aloud", guide says
  "Press speak"); "Large type" kept (24 px box).
- Mobile: fine. read-aloud-mobile.png.

### Memoir (/apps/memoir) — free
- Verdict: Ready
- Tested (VERIFIED): empty state buttons disabled; Prompt "The market on Saturday mornings" + memory text saved and
  restored after reload; copy/print output `Memoir\n\nPrompt\n…\n\nThe memory\n…`; 20,000 characters saved; Clear with
  confirmation.
- Problems: (low) "A prompt to start" is a single placeholder ("A place I knew as a child") that disappears on typing —
  there is no list of prompts and no "next prompt"; (low) one memory per account: writing a second one overwrites the
  first (there is no list of memories).
- Promise check: "A prompt to start" partly; "Your writing, saved" kept; "Large type" kept.
- Mobile: fine. memoir-mobile.png.

---

## Summary

| App | Verdict | Top problem |
|---|---|---|
| Bookings | Ready | "When" is free text; no date/time ordering |
| Catalog | Useful but needs improvement | "Change a price in the same row" not true; `7,5` saved as 75 |
| Agreement (service-terms) | Too shallow to promote | Produces a label/value list, not an agreement draft |
| Orders | Ready | Status is free text, no filter |
| Replies (wa-replies) | Useful but needs improvement | No Copy button although "Copy a reply" is promised |
| Yield | Ready | No unit named; comma decimal |
| Farm sales | Ready | Price-log Date is free text; comma decimal |
| Visits | Ready | Copy list shows raw ISO date; small row buttons |
| Symptoms | Ready | Day is free text, no ordering |
| Scam check | Ready | Keyword-based: any link/PIN counts (honestly footnoted) |
| Emergency card | Useful but needs improvement | No card view; print is a 14 px label list |
| Claims (rumor-check) | Too shallow to promote | Four static bullets, nothing to answer or paste |
| Voice | Ready (fake mic) | Real mic/iOS UNVERIFIED; .webm download |
| Clearer | Useful but needs improvement | Silent failure on unsupported files, no progress |
| Call | Ready | One paragraph per app, not step-by-step |
| Savings (pension) | Ready | Negative rate accepted; one-decimal naira |
| Bills | Ready | Comma decimal; no paid/overdue state |
| Recipes | Ready | Five paragraphs; "Open a recipe" does nothing |
| Aloud | Useful but needs improvement | Speech UNVERIFIED; silent when no voice |
| Memoir | Ready | One memory per account, single placeholder prompt |

Cross-cutting: comma decimals silently become whole numbers in every number box (medium); no page or console errors in
any of the 20 apps; no horizontal overflow on 390 px; Add to Remind (Bills, Visits) pre-fills Remind correctly.
