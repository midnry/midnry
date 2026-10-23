# Audit — group "tools" (Apply, Planner, Compressor, Glyph, Contrast, Cycle, Medicines)

Method: Playwright (Chromium) against the running dev server at http://127.0.0.1:8080, signed in as the
local QA admin, desktop 1280×900 and phone 390×844 (touch). Every workflow below was driven through
the UI unless marked "seeded". Synthetic data only (Amaka Okafor, Synthetic Studio Ltd, NGN).
Screenshots: /home/user/midnry/screenshots/audit/tools/. Scripts:
docs/audit-2026-10-23/qa/*.mjs.

Note on the environment: during the first Apply run another agent edited and committed
`src/components/use-app-doc.ts` / `src/lib/doc-session.ts` (commit 2a84506, 07:33). Vite hot-reloaded
the hook and React logged "change in the order of Hooks … ApplyTool" + "Should have a queue" once.
That is an HMR artefact of live editing, not an Apply bug; a fresh load afterwards had no page errors.
The dev server was also restarted mid-audit (database reset); Cycle/Medicines/Compressor were rerun
after that.

---

### Apply (/apps/apply) — pass

- Verdict: **Useful but needs improvement** (one real tailoring bug in the export; the rest works).
- Tested workflows (VERIFIED):
  - Fresh account: intro text, empty form. Pressing "Prepare applications" with nothing typed only
    triggers the browser's "Please fill out this field." bubble (fields are `required`); no app message.
  - Roles typed, resume "too short" → "Add your resume first: upload a PDF or paste it."
  - Upload of a PNG → "Upload a PDF or a text file." Upload of a garbage file named .pdf → the raw
    library message **"Invalid PDF structure."** (shown under the Prepare button, far from the file field).
  - Upload of a real 1-page PDF made with pdf-lib (Amaka Okafor resume) → text extracted into the
    resume box within ~2 s, blank lines between sections removed.
  - Three roles (Product Designer / Frontend Engineer / Data Analyst), advert pasted for Frontend
    Engineer → three cards. Frontend Engineer: "Matched against the job advert", Covered (7): accessibility,
    Bachelor's degree, design system, Jest, React, TypeScript, "4+ years of experience" (evidence "The
    dates in your resume add up to about 9 years"); Not found (5): onboarding, APIs, GraphQL, Kubernetes
    (nice to have), Storybook (nice to have). The other two roles: "Matched against the role name" with
    the usual keywords (Figma…, SQL/Python/Excel…).
  - Changes list: "Added a headline for this job", "Moved up 1 place in Experience (Jest)". Revert →
    "Restore" + "· reverted"; Restore puts it back. Edit text → Done editing → "You edited the text by
    hand…" and Revert buttons disabled; Discard edits restores the generated version.
  - Exports: `frontend-engineer-resume.pdf` (read back with unpdf: name, hand edit "Chidi Nwosu", no
    GraphQL added) and `frontend-engineer-resume.txt` (identical to the edited text). "Open on LinkedIn"
    = https://www.linkedin.com/jobs/search/?keywords=Frontend%20Engineer, new tab. "I submitted this"
    tick saved.
  - Reload: roles, resume, "Advert added" badge, cards, hand edit and tick all restored (saved doc 4.5 KB).
  - Limits: 8 roles typed → only 6 advert rows (7th/8th silently dropped, hint only says "Up to six");
    one-letter roles silently dropped; advert box hard-stops at "12,000 / 12,000 characters"; a 29,027-
    character pasted resume is cut to 18,000 on Prepare with no message.
  - Phone 390×844: no sideways scroll (0 px), Original/Tailored tabs work, all buttons ≥ 40 px
    (only the native file input and the 16 px checkbox inside a 44 px label are smaller).
  - No page errors on a fresh load (see environment note above for the one HMR artefact).
- Unverified: real LinkedIn page (external); PDF resumes with columns/scanned images (only a simple
  text PDF was tried).
- Problems found:
  1. **High — the "headline" is inserted inside the Experience section, not under the name.** With the
     PDF-extracted resume (no blank lines) every card put "Frontend Engineer | Accessibility · Design
     System · Jest · React" *after* "Senior Developer, Synthetic Studio Ltd (2021 - Present)", i.e. in
     the middle of the first job, and the PDF/text exports carry it there (apply-desktop-prepared.png,
     tailored pane and PDF text order confirmed). Cause: `headlineAfter()` in src/lib/apply/tailor.ts
     scans the first 6 lines for a phone-like pattern `\+?\d[\d\s()-]{6,}` and the job's year range
     "(2021 - Present)" matches it. Any resume whose first job line lands in the first six lines is hit.
  2. Medium — "I submitted this" stays ticked after "Prepare applications" is pressed again and the
     tailored text is regenerated (apply.mjs: still checked after re-prepare).
  3. Medium — silent truncation: more than six roles, a resume over 18,000 characters, and a
     pasted advert over 12,000 characters are cut without any message (only the counter shows for adverts).
  4. Low — "Invalid PDF structure." is a raw library error; wording should be the app's own.
  5. Low — term extraction noise: "onboarding" and "APIs" listed as missing *skills* from "merchant
     onboarding flow" and "GraphQL APIs"; a degenerate advert ("Requirement line with TypeScript." ×500)
     reports "Covered in your resume (0)" although TypeScript is in the resume.
  6. Low — empty submit gives only the browser's generic bubble.
- Promise check (features): one resume/several roles/advert per role → kept; split into Covered/Not
  found incl. years and repeated phrases → kept; strongest lines first, nothing invented, headline from
  resume words → **partly** (nothing invented, but headline position is wrong, see 1); side by side with
  per-change revert and editable text → kept; PDF + text + LinkedIn link → kept; matching in the browser
  → kept (the PDF *upload* is parsed on the server, which is fine but not "in your browser").
  Guide: all eight steps possible as written.
- Mobile: good; long advert counter, tabs and cards fit; file input is the native control.
- Suggested essential fixes: fix `headlineAfter` (stop treating year ranges as contact lines; place the
  headline right after the contact block); reset or warn about "I submitted this" on re-prepare; show a
  message when roles/resume/advert are cut; own wording for unreadable PDFs.

### Planner (/apps/planner) — pass

- Verdict: **Useful but needs improvement** (works end to end, but the ideas are templates and the
  product phrase is mangled).
- Tested workflows (VERIFIED):
  - Empty submit → browser "Please fill out this field." only. "X" as brand → "Add the brand name.";
    "bags" as description → "Say what the brand does in a few words."
  - Synthetic Studio Ltd / "Handmade leather bags and belts for professionals in Lagos" / Nigeria /
    2026 → **plan appears in 82 ms** (no AI service is called; `planIdeas` is a local template engine,
    so nothing is UNVERIFIED here). Summary "53 weeks · Nigeria · 2026"; the view auto-filters to the
    current month (Oct, 5 cards) with an All/Jan…Dec filter row.
  - All → 53 week cards, each with two Video and two Posts lines; 212 idea lines, all distinct.
    Nigerian holidays appear on 9 weeks (New Year's Day, Independence Day, Democracy Day, Christmas…).
  - "Copy the year" → "Copied", clipboard 31 KB plain text starting "Synthetic Studio Ltd — Nigeria —
    2026 / Week 1 · 29 Dec – 4 Jan / New Year's Day / Video / 1. …".
  - "Download PDF" → `synthetic-studio-ltd-ideas-2026.pdf`, 12 pages, brand, description, every week
    incl. Week 52/53 and holiday names (read back with unpdf).
  - Reload: form refilled, plan kept, button reads "Plan this year again".
  - Global / 2027 / 2,900-character description → 53 cards; saved doc 37 KB.
  - Phone: no sideways scroll, month chips wrap, cards readable (planner-mobile-week.png).
  - No page errors.
- Unverified: nothing material (the guide's "It takes about a minute" does not apply — it is instant).
- Problems found:
  1. **Medium — the product phrase is cut to six words, ending in a dangling preposition.** With the
     description above every "thing" slot reads "handmade leather bags and belts for": e.g. "A
     comparison table: the options of handmade leather bags and belts for you offer", "how Synthetic
     Studio Ltd makes or delivers handmade leather bags and belts for." (planner-desktop-planned.png).
     With a long description it becomes "two options of a very long description of what" (planner-mobile-
     week.png). Cause: `offering()` in src/lib/ideas/plan.ts falls back to the first six words.
  2. Medium — the ideas are generic templates with the brand name and the phrase pasted in; the same
     brand with a different description gets the same 212 sentences. The blurb says "A year of posts for
     one brand"; buyers may expect ideas about *their* products.
  3. Low — in Global mode the chips say just "Independence Day" (Week 10, 1–7 Mar = Ghana) with no
     country, so the "every holiday" view is ambiguous.
  4. Low — guide line "Plan the year. It takes about a minute." is wrong (instant), and there is no
     message explaining the auto-selected month filter after planning.
- Promise check: one brand/location/year → kept; two video + two post ideas per week → kept; holidays
  people keep in that place → kept (fixed + movable list per country, 9 weeks for Nigeria); PDF of the
  year → kept. Guide: steps 1–4 kept except the "about a minute" wording.
- Mobile: fine.
- Suggested essential fixes: take the full noun phrase (or the text up to the first preposition) in
  `offering()`; show the country next to a holiday in Global mode; fix the guide wording.

### Glyph (/apps/glyph) — pass

- Verdict: **Ready** (minor limits to document).
- Tested workflows (VERIFIED):
  - Empty: "Paste JSON, or open a .json file. The tree shows up here." Format on empty → "Paste some
    JSON first."
  - 5-key sample → "Valid JSON · 5 keys"; tree with counts "[ 3 items ]", "{ 4 keys }"; opening
    `items` → `[2]` → clicking `price` shows `$.items[2].price`; Copy path copies exactly that; Copy
    value copies `2500.5` (glyph-desktop-tree.png).
  - Format (2-space indent), Sort keys (top level and nested, A→Z), Minify (one line), Copy (whole
    text), Download `glyph.json` (byte-identical to the box), Open file (`Opened sample.json.`), Clear.
  - Errors with line/column and a caret: `"c": tru` → "Line 4, column 6 / Expected “,” or “]” but found
    “:”."; `{"a": 1,}` → "Line 1, column 9 / Remove the comma before “}”."; `not json` → "Line 1,
    column 1 / Expected a value but found “n”." A broken 2 MB document → "Line 53998, column 18".
  - Reload: last JSON restored ("Your last JSON stays with your account").
  - Large: 3.38 MB minified (20,000 rows) parses in 1.2 s → "Valid JSON · 1 key · large, opens a level
    at a time", "Open all" hidden, rows open with "Show 200 more of 19800" paging, notice "This JSON is
    3.4 MB, too large to keep on your account. It stays on this page; download it to keep a copy."
    1.66 MB formats in 1.5 s and minifies in 1.0 s. A 5.2 MB paste → "That is 5.2 MB. Glyph handles up to
    5 MB at a time." and the previous text stays.
  - Phone: no sideways scroll; tree usable (glyph-mobile-tree.png). No page errors.
- Unverified: nothing material.
- Problems found:
  1. Medium — **Format and Sort keys refuse on a 3.4 MB minified file** because the formatted result
     would be 5.6 MB: "That is 5.6 MB. Glyph handles up to 5 MB at a time." The catalogue promises
     "up to a few megabytes" for the input; the ceiling in practice is ~3 MB for *formatting*.
  2. Low — while a too-large document is on the page the header still says "Saved with your account";
     only the notice below explains it is not saved. After a reload the earlier small JSON comes back.
  3. Low — tree open/close toggles are 28 px tall on the phone (below the 40–44 px target used
     elsewhere).
  4. Low — stacked notices: after the 5 MB refusal the "too large to keep" and "fix the error first"
     texts can all show at once.
- Promise check: collapsible tree with counts → kept; click for path + copy → kept; format/minify/sort
  → kept; copy/download/open .json → kept; large input up to a few MB, tree a level at a time → partly
  (viewing yes; formatting/sorting fails above ~3 MB); line and column with the spot marked → kept;
  last JSON stays with the account → kept (up to ~99 KB; larger stays on the page only, as stated).
  Guide: all five steps kept.
- Mobile: good apart from the small toggles.
- Suggested essential fixes: let Format/Sort run over the limit or say the limit applies to the output;
  bigger toggles on phones.

### Contrast (/apps/contrast) — pass

- Verdict: **Ready** (small tool, does what it says).
- Tested workflows (VERIFIED):
  - Default #1A1916 on #F3EFE6 → 15.32:1. #777777 on #FFFFFF → 4.48:1, AA normal Fail, AA large Pass,
    AAA both Fail (correct per WCAG 2.x). #000000/#FFFFFF → 21.00:1. #2B6CB0 on #F7FAFC → 5.17:1
    (AA pass, AAA normal fail). Picker set to red → hex box "#FF0000", 3.81:1.
  - Short hex without hash ("fff"/"000") accepted → 21.00:1. "#GGGGGG", "red", empty → ratio "—",
    all four checks "—", hint "Use a hex color like #1A1916." The box caps at 7 characters.
  - Preview panel renders the chosen pair with sample text. Reload keeps both colours.
  - Phone: no sideways scroll (contrast-mobile.png). No page errors.
- Unverified: none.
- Problems found: Low — no help towards a passing colour (no "nearest passing shade"); the invalid
  state keeps the last valid preview colours, which is reasonable but not explained. Low — named colours
  and rgb() are rejected (by design: "as hex").
- Promise check: two colours as hex → kept; ratio → kept; WCAG pass/fail → kept (AA/AAA, normal/large).
  Guide: kept.
- Mobile: fine.
- Suggested fixes: none essential.

### Compressor (/apps/compressor) — pass

- Verdict: **Too shallow or unreliable to promote** — the one thing it sells (re-encode to MP4) fails
  on every file with a raw library error.
- Tested workflows (VERIFIED):
  - Empty: "Choose a video / Stays on this device. Nothing is uploaded.", "Use a practice clip", four
    presets (Small 720p·1.5 Mbps, Balanced, Crisp, High), "Compress to MP4" disabled until a file exists.
  - A .txt file and a 5 KB garbage file named .mp4 → "Midnry can’t read that file. Try MP4, MOV, WebM,
    or WAV." (good).
  - "Use a practice clip" → a 2-second 720×1280 VP8/Opus WebM is generated in-page in ~2.5 s, with
    Length/Size/Frame/Codec facts, a player, and an estimate ("About 1.0 MB after audio." for Balanced,
    "About 402 KB" for Small).
  - **"Compress to MP4" → "Working on this device 0% / Stop" for ~25 ms, then the red text "When both
    options.video.width and options.video.height are provided, options.video.fit must also be
    provided."** (compressor-desktop-after-compress.png). Reproduced on desktop and phone, with every
    preset. Cause: `compress()` in src/components/tools/compressor.tsx passes `fitKeep()`'s
    `{width, height}` to `runJob` without `fit`, and mediabunny's `Conversion.init` rejects that. No MP4
    can be produced, so Download/Share were never reachable.
  - Stop button: appears during the (25 ms) run; a real cancel could not be exercised.
  - Phone: no sideways scroll, presets and buttons fit (compressor-mobile.png). No page errors.
- Unverified: the H.264/AAC encode itself and the resulting MP4 (blocked by the bug above). Note that
  this headless Chromium reports `VideoEncoder.isConfigSupported(avc1.*) = false` and `AudioEncoder
  (mp4a.40.2) = false`, so even with the bug fixed the sandbox could not confirm the MP4 path; the
  engine's fallback message in that case would be "This browser can’t encode that format. MP4 is the
  reliable choice." Real Chrome/Edge/Safari builds normally have H.264, so this needs a check on a
  real device after the fix. Drag-and-drop was not exercised (same `take()` path as the file input).
- Problems found:
  1. **High — every encode fails** with the raw mediabunny TypeError quoted above (steps: Use a
     practice clip → Compress to MP4). One-line fix: add `fit: "contain"` to the `video` spec.
  2. Low — the practice clip is branded "Spool / Practice clip" (another product name) and its file is
     `practice-clip.webm`.
  3. Low — library/engine errors are shown verbatim; the app has friendly messages for codec failures
     but not for this class of error.
- Promise check: "A video you already have" → kept (file picker, drag-drop, practice clip); "Quality
  presets that set the bitrate" → kept (UI only; the bitrate never reaches an encoder); "The file is
  re-encoded on this device, not uploaded" → **not kept** (nothing is re-encoded; no network upload was
  observed either). Guide step 3 "Start the encode, then download the MP4" → **not kept**.
- Mobile: layout fine.
- Suggested essential fixes: pass `fit` (and re-test on real Chrome/Safari, including a > 1080p
  source for the resize path); map unexpected engine errors to a plain message; remove "Spool".

### Cycle (/apps/cycle) — free

- Verdict: **Ready** (small, honest, works; a few polish items).
- Tested workflows (VERIFIED):
  - Empty: "Nothing logged yet. Log your last period above…", prediction card "Log when your last
    period started, and your next date will show here.", "Log period" disabled until a first day is set.
  - Validation: future first day → "The start day can't be in the future."; last day before first →
    "The last day can't be before the first day."; overlapping start → "That overlaps the period that
    started Aug 24, 2026."
  - Period 1 (60–56 days ago, with note) → prediction "Monday, September 21, 2026 / 32 days late /
    … Counted with a 28-day cycle, your usual length. Log one more period to use your own average."
  - Period 2 (30–26 days ago) → "Friday, October 23, 2026 / today / Counted with a 30-day cycle, the
    average of the periods you logged." Period 3 (2 days ago, no end) → "Still going", "in 27 days",
    29-day average. Averages checked by hand: correct.
  - On the open card: "Ended on" + "Save last day" → "Oct 21, 2026 – Oct 23, 2026 · 3 days". Add note,
    Edit → Save (text changed), Delete (asks "Delete note?" then deletes), note count updates. A
    3,000-character note is silently cut to 2,000.
  - Delete period → inline "Delete this period and its notes?" with Delete/Cancel; Cancel keeps it,
    Delete removes it and the count drops to "2 periods logged".
  - Reload: periods, end dates and notes come back ("Saved to your account").
  - Settings: "Usual days from one period to the next" clamps 15–60 (typing "abc" → 15, 99 → 60,
    -5 → 15); it is ignored once two periods exist, as the text says.
  - 200 periods (seeded): renders in 1.5 s, "200 periods logged", prediction still right; the page is
    19,590 px tall with no paging or year grouping.
  - Phone: no sideways scroll; date inputs are native; cards readable (cycle-mobile-card.png). No page
    errors.
- Unverified: nothing material.
- Problems found:
  1. Low — after logging several periods in one sitting every card stays expanded (3 of 3 open), so
     the list gets long; only the newest should open.
  2. Low — "Delete period" / "Delete" / "Edit" / "Cancel" buttons are 36 px tall on the phone (below
     the 44 px used elsewhere).
  3. Low — typing letters into the cycle-length box silently becomes 15 (no message); a very long note
     is cut to 2,000 characters without saying so.
  4. Low — 200 periods is a 20,000 px page with no grouping by year or "show more".
  5. Low — the note's "Written" date is the day it was typed, not the period's date, which can confuse
     when back-filling old periods (e.g. a note on the August period reads "Written Oct 23, 2026").
- Promise check: next start date and days away → kept; log first/last day → kept; notes per period,
  saved on the account → kept; edit/delete any note, delete any period → kept; own average after two
  periods → kept (and stated on the card). Guide: all five lines kept; the "not medical advice, not
  birth control" line is on the page.
- Mobile: good.
- Suggested fixes: collapse older cards; 44 px buttons; a quiet message for the clamp/cut cases.

### Medicines (/apps/meds) — free

- Verdict: **Ready**.
- Tested workflows (VERIFIED):
  - Empty: "Add your first medicine below. It will show here with a button to tick it." Empty submit →
    "Write the name of the medicine."
  - Added Amlodipine 5 mg / Morning, Metformin 500 mg / Morning and night, Vitamin D (no time), an
    80-character name with a 60-character time (hard caps; wraps cleanly). "0 of 4 taken today."
  - Tick → "✓ Amlodipine 5 mg · Morning · Taken today at 09:42", "1 of 4 taken today."; tick again →
    untick, "0 of 4". The tick survives a reload. Button height 64–70 px, 20 px name text (large type).
  - Edit → "Change this medicine", Save changes → "Vitamin D3 1000 IU · Lunch". Remove → toast with
    Undo (Undo restores the row). "Export list" → `meds.csv` = "Medicine,When\nAmlodipine 5 mg,Morning…"
    (the list only, no tick history).
  - "The last 30 days": 30 rows, newest first ("Today, Friday 23 October", …), each with "Name at
    HH:MM" or "Nothing ticked"; seeded ticks for 39 past days show on the right days and the 90-day
    pruning note is on screen.
  - 60 medicines (seeded): list renders, tick/untick fine; no paging needed.
  - Phone: no sideways scroll; tick targets 69 px; form stacks (meds-mobile.png). No page errors.
- Unverified: nothing material (the page's own "This phone will not ring you" is explicit; no
  reminders are claimed).
- Problems found:
  1. Low — "Export list" exports only names and times; the 30-day tick history cannot be exported or
     printed for a clinician.
  2. Low — a medicine taken twice a day ("Morning and night") has a single tick per day; the second
     dose cannot be recorded (the "When" field is free text, so this is a design limit, not a bug).
  3. Low — long names/times are capped at 80/60 characters with no message.
- Promise check: name and time of day → kept; a tick for today with the time → kept; the last 30 days
  at a glance → kept; large type → kept (20 px rows, 56–70 px buttons). Guide: kept, including "Press
  it again to undo a mistake."
- Mobile: good.
- Suggested fixes: include the history in the export; optional second tick per day.

---

## Summary

| App | Tier | Verdict | Top problems | Promises not kept |
|---|---|---|---|---|
| Apply | pass | Useful but needs improvement | Headline inserted inside Experience when the resume has no blank lines (year range mistaken for a phone number) and exported that way; "I submitted this" survives re-prepare; silent truncation of roles/resume/advert; raw "Invalid PDF structure." | "headline uses words from your resume" partly (wrong place) |
| Planner | pass | Useful but needs improvement | Product phrase cut to six words ending in "for"/"of what" throughout the ideas; ideas are fixed templates; Global holidays unnamed by country | "It takes about a minute" (instant) |
| Compressor | pass | Too shallow or unreliable to promote | Every encode fails in 25 ms with "When both options.video.width and options.video.height are provided, options.video.fit must also be provided." (missing `fit`); "Spool" branding in the practice clip | "The file is re-encoded on this device" and "download the MP4" — not possible |
| Glyph | pass | Ready | Format/Sort refused above ~3 MB minified (output > 5 MB); 28 px tree toggles on phone; header says "Saved" while a large doc is page-only | "Handles large input: up to a few megabytes" partly |
| Contrast | pass | Ready | none material | none |
| Cycle | free | Ready | All cards stay open; 36 px delete/edit buttons on phone; silent clamps | none |
| Medicines | free | Ready | Export lacks tick history; one tick per day per medicine | none |
