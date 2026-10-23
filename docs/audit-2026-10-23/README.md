# Non-game app audit, competitor comparison and fixes (23 October 2026)

Branch `audit/non-game-apps-20261023`, prepared for review. **Nothing was deployed.** Games were
excluded. The approved branding, favicons and every working feature were left as they are. No
real user records were touched: every check ran on a local copy of the site with an embedded
database and invented data.

This page is the summary. The detail sits next to it:

| File | What it holds |
|---|---|
| `apps-remind.md` | Remind, the largest app (48 screenshots, 7 runs) |
| `apps-invoice-ledger-split.md` | Invoice, Ledger, Split |
| `apps-writing-study-scratch.md` | Writing studio, Study space, Scratch |
| `apps-apply-planner-compressor-glyph-contrast-cycle-medicines.md` | The seven other desk apps |
| `kits-1.md`, `kits-2.md` | The 43 small "kit" apps, one section each |
| `competitors-desk-apps.md` | 1–2 established alternatives per desk app, from official pages, with links and dates |
| `competitors-kit-apps.md` | The same for the kits, including the gazetted 2026 PAYE figures |
| `screenshots/` | Before/after pictures referred to below |

## 1. How this was checked, and what "verified" means

- **Where:** the site's own code, run locally (`npm run dev` through `scripts/qa/dev-up.sh`) with the
  embedded PGLite database. Signed in as the local QA admin, which opens every app including the
  Midnry Pass ones, plus a second no-Pass account where sharing needed one.
- **How:** headless Chromium driven by Playwright, at a laptop size (1280×900) and a phone size
  (390×844, touch). Every app was opened and its main task done from start to finish with realistic
  invented data (names like "Amaka Okafor", "Synthetic Studio Ltd", NGN and USD amounts). Editing,
  deleting, saving, reopening after a reload, exporting (CSV, PDF, text, copy), empty states, invalid
  input (letters, negatives, "7,5"), large data (250–630 rows seeded through the app's own save
  function) and error recovery were tried where the app offers them. Every catalogue promise
  (`features` and `guide` in `src/lib/catalog.ts` / `src/lib/kits.ts`) was compared with behaviour.
- **Verified** below means it was done in that browser and observed. **Unverified** means it could
  not be exercised here, for a reason given.
- **Not verified anywhere in this audit:** the deployed site (www.midnry.com) was not tested; the
  AI writer (no API key locally, so the "quick writer" fallback ran instead); email sending (invites,
  summaries, due reminders: the local copy says email is not connected); a real microphone, speech
  voices and iOS; the real print dialog (print CSS and generated PDFs were checked instead); Paystack
  checkout. Passing unit tests and a polished screen were not taken as proof of anything.

## 2. Audit results, app by app

Columns: tested workflows (all verified unless marked), main weaknesses found, closest competitors
(details and sources in the competitor files), essential gaps versus those competitors, priority,
recommended action. Priority: **P1** fix before promoting, **P2** next batch, **P3** later/optional.
Verdict: **Ready** / **Needs work** (useful but needs improvement) / **Too shallow** (too shallow or
unreliable to promote yet). Items marked **fixed** were changed on this branch (section 5).

### Desk apps (13)

| App | Tested workflows | Main weaknesses | Competitors | Essential gaps | Priority | Recommended action |
|---|---|---|---|---|---|---|
| **Remind** (free, Pass extras) — **Ready** | Natural-language add (26 tasks), Today/Upcoming/Inbox/Completed, points/streaks, full task detail, projects/sections, Board/Month layouts with drag, saved filters, search, Pass Board/Focus/Habits, sharing with a second account (invite, join, assign, comment, leave, delete), attachments (2 MB refusal), settings, calendar link (valid iCalendar), two-tab conflict, 400 seeded tasks (2.1 s), 500-task limit, phone. Unverified: emails, browser alerts. | Changing a task's date/project in Today/Inbox removes the row and closes the panel mid-edit, no message; "Share" is irreversible and deleting a shared project deletes its tasks; two different things called "Board"; parser quirks ("this weekend" loses a word, "30/9" jumps a year); phone: first task below the fold. | Todoist (Pro $7/mo monthly, $5/mo yearly), Microsoft To Do (free), TickTick ($49.99/yr) | Push notifications on the phone (every competitor is a native app); offline capture. Sharing/assigning already present. | P2 | Keep as a flagship. Add web-push reminders (service worker + push subscriptions) as the next big feature; fix the mid-edit row removal and the share/delete warnings now. |
| **Invoice** (free) — **Ready** | 3 invoices NGN/USD with 7.5% VAT (₦623,500.00 correct), saved client, sent/paid/overdue with paid-on date and PAID stamp, search by client/number/amount, prefix and start number, quote→invoice, proposal→quote (lines parsed, missing rate flagged), delete+undo, reload, 257-invoice list (1.6 s), print CSS and generated PDFs checked on laptop and phone, all invalid inputs refused with inline text. | Notes and tax of the previous (other client's) invoice copied onto a new one and printed (**fixed**); total ~2,000 px below the form on phones (**fixed**); duplicate numbers accepted silently (**fixed**); declined quote still convertible (**fixed**); proposals undated (**fixed**); no way to tell the client how to pay (**fixed**). | Wave (US/Canada only), Zoho Invoice (free, no Nigerian gateway), Invoice Ninja ($14/mo) | Online payment collection; recurring invoices; automatic reminders; native apps. "How to pay" block now closes the most basic gap. | P1 (done) | Make it a headline product for Nigerian freelancers and small businesses. Next: recurring invoices, a Paystack pay-link per invoice, bank-transfer "mark paid from WhatsApp" flow. |
| **Ledger** (Pass) — **Needs work** | 20 UI entries over two months, budget bar, edit, remove+undo, CSV (631 lines for 630 entries), Budget and Pocket views (tabs and `?view=`), "Bring my entries" (originals byte-identical), 630 seeded entries (1.5 s), invalid inputs, phone. Unverified: the "ledger is full" state (~8,000 entries); a failing server save. | Month total, bars and budget rendered under the whole month's list on phones (**fixed**); date/category silently kept from the last entry (**fixed** with a dated Add button); "Income" as a spending category plus a Money in/out switch (**fixed**); ₦0 accepted (**fixed**); unreadable budget ignored silently (**fixed**); skipped import rows not mentioned; 36 px Edit/Remove (**fixed**). | Wallet by BudgetBakers (free manual tier), Money Manager ($2.49/mo sync), Monefy, Google Sheets | Offline entry on a phone; recurring entries (rent, data); multiple accounts (cash vs bank). | P1 (done) | Keep in the Pass. Next: recurring entries and an "accounts" split; consider a free tier of Ledger if Pass conversion stays low (Budget/Pocket were free before the merge). |
| **Writing studio** (free, Pass extras) — **Needs work** | Lesson, Remarks, Outreach (3 versions), SOAP, Explain, Bugs, Digest, README, Letters written with the quick writer, saved, reopened after reload; copy, print, .txt; 20-per-mode free cap enforced; Pass: 60 drafts load in 1.7 s, house style saved, .docx is a real file. Phone fine. Unverified: the AI path (5/30 a day, house-style tone, Source material read by the AI). | **High:** Contract mode never saved its summary and blamed the user ("Too large to save") (**fixed**); auto-titles use the first box, so 60 Outreach drafts all carry the sender's own name; lesson length accepts anything; no search over long draft lists; .docx repeats the address. | ChatGPT (free; Go $8, Plus $19.99), Google Gemini (free; AI Plus $4.99), Grammarly ($12) | Enough daily writes to finish a job (5/day free is thin); tone/length controls; the AI path itself is unverified here. | P2 | Fix titles (use the topic/recipient box) and lesson-length validation next. Decide the free daily AI allowance against Gemini's $4.99 plan. Verify the AI path on the live site. |
| **Study space** (free, Pass share) — **Ready** | Decks incl. bulk add, Leitner review with "Again" returning in-session, progress saved; 150-card deck (editor 250 ms); quizzes with reasons and saved scores; references APA/MLA/Chicago/law with copy=download; lab write-ups and formulas persist; old links redirect; sharing (free locked, link works signed-out with sign-in prompt, snapshot + update, save a copy, revoke, bad token). | All low: blank starter card counts as a card; quiz copy includes unplayable questions; no year validation; 150-card editor is one long page; "Finish" lands on the editor. | Anki (free except iOS $24.99), Quizlet (Plus $9.99 / $44.99 in-app) | Offline study on a phone; importing decks (WAEC/JAMB cohorts). | P2 | Promote. Add deck import/export (CSV) and a paged card editor. |
| **Apply** (Pass) — **Needs work** | PDF upload (pdf-lib-made resume) extracted, advert matching (covered 7 / not found 5), revert/restore, edit/discard, PDF and text downloads read back, LinkedIn link, "I submitted this", reload, phone tabs. | **High:** headline inserted inside Experience on PDF-extracted resumes (year range taken for a phone number) and exported that way (**fixed**); "I submitted this" survives re-preparing; roles/resume/advert silently cut at their limits; raw "Invalid PDF structure." message. | Jobscan (5 free scans/mo), Teal (free; Teal+ $29/30 days), Rezi (Pro $29/mo) | A visible match score; a cover letter; ATS-safe PDF. | P2 | Keep in the Pass ($5 vs $29 is the pitch). Add a match score and a cover-letter mode (the Writing studio has Letters already). |
| **Cycle** (free) — **Ready** | Logging with first/last day, validation messages, prediction (28-day default, own average after two periods), notes add/edit/delete, period delete with confirm, reload, 200 seeded periods (1.5 s), phone. | Low: all cards stay open; 36 px buttons on phone; silent clamps. | Clue (Plus ~$9.99/mo in-app), Flo (free + premium) | Notifications before the predicted date; symptom tags; anonymous use. | P3 | Keep free. Add a simple "remind me" (needs the push work from Remind) and symptom tags later. |
| **Medicines** (free) — **Ready** | Add/edit/remove+undo, tick/untick with time, 30-day history with seeded ticks, CSV export (list only), reload, 60 rows, large tap targets. | Export lacks tick history; one tick per medicine per day (twice-daily medicines cannot be tracked). | Medisafe (now $4.99/mo outside the US), MyTherapy (free) | Notifications are the whole category; refill count-down; several doses a day. | P2 | Keep free. Support several times a day; notifications depend on the push work. |
| **Scratch** (Pass) — **Ready (thin)** | Add/select/edit/copy/delete-with-undo, reload, search after 5 notes, 40-note cap, free users see the gate. | Add silently disabled at 40 notes; "export or remove some entries" message in an app with no export; phone: whole list above the editor. | Google Keep (free), Simplenote (free) | Offline access and search; the competitors are free with more. | P3 | Consider moving it to free as a bundle sweetener (pricing decision, not done). |
| **Split** (Pass) — **Ready** | Maths incl. uneven kobo split, tip chips, copy, reload, comma hints, phone. | Result just below the fold on phones; generic error text. | Splitwise (free core), free online calculators | A shareable result (WhatsApp text). | P3 | Add "copy for WhatsApp"; consider making it free (pricing decision). |
| **Planner** (Pass) — **Needs work** | Brand/location/year, plan in ~80 ms (no AI involved: it is a local template engine), 53 weeks × 2 video + 2 post ideas, Nigerian holidays on 9 weeks, copy (31 KB), 12-page PDF, reload, phone. | Product phrase cut to six words ending in a dangling preposition in about half the ideas; ideas are generic templates; "takes about a minute" is wrong; "Global" holidays unnamed. | Buffer (free: 3 channels, AI assistant), Later ($18.75/mo) | Ideas that read naturally; a way to act on them (copy to WhatsApp/Instagram). | P2 | Fix the phrase cut and the guide text; feed captions into the Writing studio. |
| **Compressor** (Pass) — was **Too shallow**, now **Needs work** | File pick, practice clip, presets, invalid-file path. **"Compress to MP4" failed on every file** with a raw encoder error (**fixed**: the practice clip now compresses and offers a download in headless Chromium). Unverified: a phone's real H.264 encoder and large files. | A "Spool" brand name on the practice clip. | HandBrake (free desktop), FreeConvert (20 min/day free; $12.99), Clideo ($12) | A size target ("under 16 MB for WhatsApp"); progress on low-end phones. | P1 (done) | Verify on a real Android phone before promoting; add a WhatsApp size preset. |
| **Glyph** (Pass) — **Ready** | Tree, path copy, format/minify/sort, copy/download/open, line+column errors, 3.4 MB input (1.2 s, paged tree), reload. | Format/Sort refused above ~3 MB minified (output would exceed 5 MB); 28 px toggles on phone. | JSON Crack (free, ~300 KB limit), jsonformatter.org (free) | None essential; developers will not pay for a formatter alone. | P3 | Bundle sweetener; document the size limit in the catalogue. |
| **Contrast** (Pass) — **Ready** | Ratios correct (#777/#fff = 4.48:1 fails AA), invalid hex hint, picker sync, reload, phone. | None material. | WebAIM Contrast Checker (free, the standard) | None. | P3 | Consider making it free. |

### Kit apps (43, all free)

Every kit opened with no runtime errors and no sideways scroll on the phone; every tracker saved
and reloaded; large lists (300 rows in Stock and Orders) rendered in under 2 s. The shared
weakness: **number boxes silently turned "7,5" into 75 and letters into nothing**, so on Dose a comma
gave a tenfold dose with no warning (**fixed** for every kit, see section 5). Per-kit detail is in
`kits-1.md` and `kits-2.md`; competitors in `competitors-kit-apps.md`.

| Kit | Tested | Main weakness | Closest alternative | Essential gap | Priority | Action |
|---|---|---|---|---|---|---|
| Dose | arithmetic, invalid input | comma → tenfold dose (**fixed**); "working" not written out | MDCalc, Medscape (free, clinician-only) | cited source and date | P1 (done) | keep "for study" wording; add the working line |
| Units | conversions, invalid | "1,500" refused with no hint | Google unit converter | none | P3 | keep |
| Circuit | V/I/R, invalid | generic message for letters/zero | Wolfram Alpha free | none | P3 | better messages |
| Ratios | 2 cases | promised "one-line reading" missing | Sheets | none | P2 | add the reading or drop the promise |
| Statements | fill, reload, copy | comma (**fixed**); negatives accepted | Sheets | none | P3 | refuse negatives |
| Break-even | 2 cases | warning shown in the empty state | Sheets | none | P3 | polish |
| Algo | steps, counts | >12 numbers truncated silently | VisuAlgo (free) | none | P3 | say the limit |
| Solver | 4 formulas | values carried over on switch; no units | Wolfram Alpha | none | P3 | clear on switch, show units |
| Plot | pairs → line | **no grid, axes or labels** despite "a line on a grid"; bad lines dropped silently | Desmos (free, the class standard) | axes and labels | P2 | add axes/ticks/labels or reword and de-list |
| Shifts | hours, week totals, CSV, Add to Remind | start = end counted as 24 h | Sheets | none | P3 | treat equal times as 0 h |
| Reference | search | no "nothing found" | Medscape | cited sources | P2 | de-emphasise until reviewed (as in the Phase 3 plan) |
| Regex | pattern, flags, errors | matches not marked in the sample (promised) | regex101 (free) | highlighted matches | P2 | mark matches |
| JSON | format, error position | — | browser devtools | none | P3 | keep |
| Tax | ₦1.8M/₦6M/₦24M recorded, rent relief | letters/blank/negative show "₦0"; annual only | Deloitte calculator (no sign of a 2026 update), PwC summaries | match the gazetted bands (they do), monthly input, minimum-wage note | P2 | add monthly input and cite the Act; keep "not reviewed" wording until a tax adviser signs off |
| Reconcile | both lists, bad lines | "1 amounts" | Sheets | none | P3 | keep |
| Clauses | search | promised "Copy a clause" button missing | LawPavilion (lawyer-priced), Rocket Lawyer (not in Nigeria) | non-legal-advice label | P2 | add Copy; keep de-emphasised until reviewed |
| Creative brief | fill, copy, print | — | Keep/Sheets | none | P3 | keep |
| Mood | colours, words | bare 50×27 px swatches, no hex/copy | Coolors | none | P3 | show hex, copy |
| Stock | 300 rows, low flag | blank item / negative qty accepted | Bumpa, Kippa, Sheets | none essential | P3 | validate |
| Profit | 2 cases | promised "note if price below cost" missing; comma (**fixed**) | Sheets | none | P2 | add the note |
| Menu | dishes, QR, copy | blurb promises print, no button; QR not re-shown after reload | WhatsApp Business catalog | none | P2 | add Print; keep the QR |
| Recipe cost | lines, portions | a letters line silently dropped | Sheets | none | P3 | show the hint |
| Bookings | add/edit/delete, reload | "When" is free text, no ordering | Fresha ($19.95/mo), Booksy ($29.99/mo) | date/time field so the day list sorts | P2 | real date/time |
| Catalog | rows, copy | "change a price in the same row" not true; comma (**fixed**) | WhatsApp Business catalog (500 items) | none | P3 | reword or inline edit |
| Agreement | fill, copy, print | output is a label/value list, not an agreement draft | LawPavilion, Rocket Lawyer | a readable draft with a non-legal-advice label | P2 | **too shallow**: render a real draft or reword and de-list |
| Orders | 300 rows, search, CSV | status free text, no filter | Bumpa | status choices | P3 | add paid/sent/delivered |
| Replies | search | no Copy button although promised | WhatsApp quick replies | copy | P2 | add Copy |
| Yield | arithmetic | no unit named; comma (**fixed**) | Sheets | none | P3 | name the unit |
| Farm sales | sales, price log, CSV | price-log date free text; comma (**fixed**) | Kippa, Sheets | none | P3 | date field |
| Visits | add, Add to Remind | copy shows raw ISO date; 36 px buttons | Keep | none | P3 | polish |
| Symptoms | diary | day free text, no ordering | Keep | none | P3 | date field |
| Scam check | scam and news pastes | keyword-based (honestly footnoted) | NCC/CSIRT advisories; Google scam detection (not for Nigeria) | links to NCC/EFCC | P3 | add official links |
| Emergency card | fill, print | no card view; print is a 14 px list | iOS Medical ID / Android Safety (lock screen) | a large printable card | P2 | add a wallet-card print layout |
| Claims | open | four static bullets, nothing to paste or answer | — | a checklist you can tick | P2 | **too shallow**: make it a tickable checklist or merge into Scam check |
| Voice | record/play/download (fake mic) | .webm file; real mic unverified | Voice Memos, Recorder | none | P3 | keep |
| Clearer | PNG contrast verified | silent failure on unsupported files | iPhone Magnifier, Lookout | none | P3 | show a message |
| Call | steps | one paragraph per app | — | none | P3 | keep |
| Savings | arithmetic | negative rate accepted | Sheets | none | P3 | refuse negatives |
| Bills | add, Add to Remind | comma (**fixed**); no paid state; total counts paid bills | Sheets | paid/overdue state | P2 | add paid tick |
| Recipes | search | "Open a recipe" does nothing | — | none | P3 | reword |
| Aloud | large type; speech unverified | silent when no voice | Select to Speak, iPhone Magnifier | none | P3 | message when no voice |
| Memoir | fill, reload | one memory per account, one prompt | Keep | none | P3 | several entries |

### Classification

- **Ready for its intended purpose:** Remind, Invoice, Study space, Cycle, Medicines, Glyph,
  Contrast, Split, Scratch (thin); kits: Units, Break-even, Algo, Shifts, Reference, JSON, Reconcile,
  Creative brief, Stock, Recipe cost, Bookings, Orders, Yield, Farm sales, Visits, Symptoms, Scam
  check, Voice, Call, Savings, Bills, Recipes, Memoir.
- **Useful but needs improvement:** Ledger (fixed on this branch), Writing studio (Contract fixed),
  Apply (headline fixed), Planner, Compressor (encode fixed; verify on a phone); kits: Dose (fixed),
  Circuit, Ratios, Statements, Solver, Regex, Tax, Clauses, Mood, Profit, Menu, Catalog, Replies,
  Emergency card, Clearer, Aloud.
- **Too shallow or unreliable to promote yet:** kits Plot, Agreement, Claims. (Compressor left this
  group with the encoder fix, pending a real-phone check.)

### Which apps should be Midnry's strongest products

1. **Invoice** (free): the only app where Midnry has a clear local advantage. Wave is unavailable to
   Nigerian businesses and Zoho's free plan lists no Nigerian payment gateway; Invoice now prints
   bank details and copies a WhatsApp summary. Promote it to freelancers, tailors, caterers and
   small shops.
2. **Remind** (free, Pass extras): verified end to end, no runtime errors in seven runs, and the Pass
   bundle covers what Todoist charges for. Its decisive gap is phone notifications.
3. **Study space** (free): the combination (flashcards, quizzes, references, lab write-ups, formulas)
   has no single competitor, and it tested clean.
4. **Writing studio** (free): strong task templates (SOAP notes, lesson plans, letters, contracts);
   its value depends on the AI path, which must be verified live.

**Consolidate or reconsider (recommendations only; nothing was removed):** Claims into Scam check;
Agreement and Clauses into one "starting wording" tool kept de-emphasised until a lawyer reviews it;
Scratch, Split and Contrast are free elsewhere with more features and dilute the Pass, so consider
making them free (a pricing decision for the owner); Plot either gets axes or is de-listed; Reference
and Tax stay de-emphasised until a qualified reviewer signs off (Phase 3 plan, still open).

## 3. Competitor comparison (summary; full tables and sources in the two competitor files)

All competitor facts come from vendor or official pages read on 23 October 2026, each cited with
its URL in the detail files. No competitor was tested hands-on. Where a vendor page could not be
fetched the comparison is marked INCOMPLETE there (OpenAI's own limits pages, Quizlet's plan pages,
Canva pricing, Jobscan Premium price, Clue/Flo help-centre prices, Wave's country article, Kippa's
site, Medscape, LawPavilion's store, the Joint Revenue Board PAYE guidelines PDF).

Cross-cutting findings:

- **Price.** Midnry Pass at US$5/month undercuts Todoist Pro ($7 monthly), Teal+ ($29/30 days), Rezi
  ($29), FreeConvert ($12.99), Clideo ($12), Later ($18.75), Invoice Ninja ($14) and Wave Pro ($19),
  but faces free native incumbents in several categories: Microsoft To Do, Google Keep, Simplenote,
  MyTherapy, Anki (desktop/Android), WebAIM, Zoho Invoice free, Buffer free, HandBrake.
- **The biggest category gap is notifications and offline use.** Remind, Medicines and Cycle compete
  with native apps that push reminders; Midnry's browser-only reminders and "this phone will not ring
  you" are the decisive weakness for those three.
- **Local relevance is real and under-used.** Wave excludes Nigeria; Zoho lists no Nigerian gateway;
  Medisafe became paid outside the US on 1 Jan 2026 ($4.99/mo); ChatGPT and Gemini bill in USD; Fresha
  starts at $19.95/mo and Booksy at $29.99/mo for bookings; Rocket Lawyer is not available in
  Nigeria. Paystack billing, Naira-first Invoice and Ledger, local holidays in Planner, the Nigerian
  PAYE kit and a no-upload Compressor are the credible differentiators.
- **Why someone chooses Midnry:** one sign-in, many small tools that open on a cheap Android phone
  without installing anything, Naira and local wording, $5 for the lot billed through Paystack.
  **Why they might leave:** no phone notifications, no offline use, thinner feature depth than the
  category leader in each case, and three Pass apps (Scratch, Split, Contrast) that are free elsewhere.

Key sources: Todoist pricing update <https://www.todoist.com/help/articles/todoist-pro-plan-pricing-update-bxBvHZuJZ>;
Microsoft To Do <https://apps.apple.com/us/app/microsoft-to-do/id1212616790>; Wave pricing
<https://www.waveapps.com/pricing>; Zoho Invoice pricing <https://www.zoho.com/invoice/pricing/>;
Wallet <https://budgetbakers.com/en/products/wallet/>; Money Manager
<https://apps.apple.com/us/app/money-manager-expense-budget/id560481810>; Gemini plans
<https://gemini.google/subscriptions/>; Anki <https://apps.ankiweb.net/>; Quizlet (App Store)
<https://apps.apple.com/us/app/quizlet-ai-powered-flashcards/id546473125>; Jobscan
<https://jobscan.co/video-jobscan-premium>; Teal <https://www.tealhq.com/pricing>; Clue Plus
<https://helloclue.com/clue-plus>; Flo free version
<https://help.flo.health/hc/en-us/articles/4411293934740-What-s-included-in-the-free-version>;
Medisafe paid outside the US
<https://help-center.medisafe.com/en/articles/13052285-medisafe-is-now-a-fully-paid-app-for-users-outside-the-u-s>;
MyTherapy <https://www.mytherapyapp.com/>; Splitwise <https://www.splitwise.com/>; Buffer
<https://buffer.com/pricing>; HandBrake <https://handbrake.fr/>; FreeConvert
<https://www.freeconvert.com/pricing>; Clideo <https://clideo.com/pricing>; JSON Crack
<https://jsoncrack.com/>; WebAIM <https://webaim.org/resources/contrastchecker/>; Bumpa
<https://getbumpa.com/pricing>; Fresha <https://www.fresha.com/pricing>; WhatsApp Business catalog
<https://whatsappbusiness.com/resources/resource-library/whatsapp-business-app-resources-whatsapp-business-catalog/>;
Nigeria Tax Act 2025 (gazetted PDF) <https://nass.gov.ng/documents/download/11249>; PwC Nigeria
individual taxes <https://taxsummaries.pwc.com/nigeria/individual/taxes-on-personal-income>; Deloitte
calculator <https://www.deloitte.com/ng/en/services/tax/perspectives/nigeria-income-tax-calculator-inside-tax.html>;
regex101 <https://regex101.com/>; VisuAlgo <https://visualgo.net/en>; MDCalc
<https://www.mdcalc.com/privacy-policy>; iPhone Medical ID <https://support.apple.com/105072>;
Android emergency info <https://support.google.com/android/answer/9319337>; Rocket Lawyer
<https://www.rocketlawyer.com/pricing>.

**Tax kit check against the gazetted Act (recorded, not judged):** the kit's bands (first ₦800,000 at
0%, next ₦2.2M at 15%, next ₦9M at 18%, next ₦13M at 21%, next ₦25M at 23%, above ₦50M at 25%),
rent relief (20% of annual rent, capped at ₦500,000) and the minimum-wage exemption (₦70,000 a month
per PwC's summary) match the Fourth Schedule and section 30(2)(a)(vi) of the Nigeria Tax Act 2025 as
quoted in `competitors-kit-apps.md`. Pension, NHF and NHIS deductions are not applied (the kit says
so). A tax adviser has still not reviewed it; the on-screen "not professionally reviewed" wording
stays.

## 4. The two recovery risks: verified and fixed

Both reported problems were present in `src/components/use-app-doc.ts` at the start of this work.

1. **"Refresh now" reloaded even when the recovery copy was not stored.** The refresh handler called
   `keepCopy("refresh")` and reloaded in a `finally`, ignoring the store's false result (and
   `keepCopy` returned early with nothing stored while another copy was on offer). Now the copy is
   stored, read back, and only then the page reloads. If this browser will not keep it, the page
   stays open with the document, the panel says so and offers **Copy my version**, **Download my
   version**, **Review**, and an explicit **Refresh anyway (my version will be lost)**. The
   browser's own "leave page?" prompt still fires in that state.
2. **Navigating away while a save was pending could lose the change.** On close, the save loop sent
   what was left but suppressed every later outcome, so a request that then failed, conflicted or
   was refused kept nothing, and after three silent retries the change was gone. Now a "pending"
   copy is kept **before** the tool closes or the page leaves (pagehide/beforeunload), the save loop
   reports the outcome after close, a late success clears only the copy it kept, and a late failure
   keeps the copy with its reason so the next open offers it back. The copy is dropped quietly if
   the save did land after all.

The load/save/recovery orchestration moved out of the React hook into `src/lib/doc-session.ts`
(React-free) so the whole flow runs in Node. `useAppDoc` keeps its return shape; no tool changed.

Tests added:
- `scripts/doc-session.test.mjs` (13 tests): refresh with a stored copy; refresh with a store that
  throws; refresh with a store that cannot read back; navigation during the pause with a late
  conflict; navigation with a save in flight and a late network failure through the exhausted
  retries; late refresh-required; late success clearing the pending copy; a late success leaving a
  newer page's copy alone; pagehide with and without the keepalive save landing; reload recovery
  restoring over a newer revision; successful-save cleanup; **isolation by account and app**
  (another account and another app are never offered the copy, a record under the right key but for
  another owner is ignored, keys are `midnry-recovery:v1:<owner>:<app>`); nothing written before the
  account is known or when the app is locked.
- `scripts/qa/recovery-after-leaving.mjs` (browser, 22 checks, run at laptop and phone size): the
  same four cases on the dev server with its own QA account (Emergency card app).
- `scripts/qa/save-conflict.mjs` (the existing 8-scenario regression) still passes.

## 5. Changes implemented and why they matter

Chosen on user value and severity after the audit: Invoice (the strongest local product, with
four medium findings and the one essential competitive gap), Ledger (a paid app whose main promise
was effectively hidden on phones) and the kit number boxes, starting from Dose (a tenfold-dose
safety bug shared by ten kits). Four further defects were fixed because they broke a core promise of
an app: Writing studio Contract (never saved), Compressor (never encoded), Apply (headline exported
in the wrong place) and the recovery flow (section 4). Everything is reversible commit by commit.

| Commit | Change | Why it matters |
|---|---|---|
| `2a84506` | Recovery: copy before refreshing or leaving; settle after close; `DocSession` + tests | Unsaved work can no longer be lost by Refresh now or by leaving mid-save |
| `15e10c0` | Writing studio: Contract summaries saved (`PIECES_MAX` 8, shared with .docx) | Contract mode now keeps what it wrote; the misleading "too large" message no longer appears for it |
| `6e3f615` | Invoice: **How to pay** block printed on every invoice; per-invoice notes once it is set; **Copy for WhatsApp**; sticky total on phones (invoices and quotes); duplicate-number flag; declined quotes not convertible; proposal dates | Tells Nigerian clients how to pay (the essential gap), stops one client's note printing on another's invoice, and makes the phone flow usable |
| `448f476` | Kits: number boxes are text with a decimal keypad, calculators show "Check the figures"; Ledger: month summary first on phones, Money in no longer a category, ₦0 and bad budget refused, dated Add button, 44 px buttons; Compressor `fit: "contain"`; Apply headline placement | Removes a tenfold dose error, makes Ledger's main promise visible on phones, makes Compressor work at all, keeps Apply's headline out of Experience |
| `dbdead3` | `scripts/qa/audit-fixes.mjs` browser check for all of the above, laptop and phone | Repeatable proof |

Not changed (needs the owner's decision): pricing or tiers of any app, removing or merging apps,
Remind's notifications, the Writing studio's AI allowance, anything in the games.

## 6. Test results (local only; the deployed site was not tested)

All of these ran on the branch at its final commit, on the session machine, against the local
dev server (PGLite). **Local results only: the deployed site was not run or tested.**

| Check | Result |
|---|---|
| `npm test` (unit, 735 tests) | 718 pass, 17 fail. The 17 failures are the same pre-existing builder-platform tests (they need a `.grok/` folder that this repository does not ship; `docs/NEXT-SESSION.md` already lists them to ignore). No new or changed test fails. |
| `npx tsc --noEmit -p .` | Clean. |
| `NITRO_PRESET=render npm run build:render` | Passed; release-file check passed (234 files); `src/routeTree.gen.ts` unchanged. |
| `npx eslint .` | 2,492 errors and 102 warnings repo-wide, all pre-existing (mostly `public/games` and `src/games`); the files this branch touched carry only the same messages they had on `main` (two old control-character regexes and fast-refresh warnings). Nothing new. |
| `node --test scripts/doc-session.test.mjs` | 13/13 pass (new). |
| `node --test scripts/doc-recovery.test.mjs scripts/apps-phase1.test.mjs` | 38/38 pass (existing recovery/save-loop tests against the refactor). |
| `node --test scripts/studio.test.mjs` | 15/15 pass (1 new: seven-piece Contract draft). |
| `node --test scripts/invoice-workflow.test.mjs` | 15/15 pass (3 new: how-to-pay carry-over rule, declined quote and number clash, WhatsApp text). |
| `node --test scripts/apply-tailor.test.mjs` | 18/18 pass (1 new: headline above Experience). |
| `node scripts/qa/recovery-after-leaving.mjs` (browser) | 22/22 pass at 1280×900 and 22/22 at 390×844; screenshots in `screenshots/` (A1, B1, C1). |
| `node scripts/qa/save-conflict.mjs` (browser, existing 8 scenarios) | all passed. |
| `node scripts/qa/audit-fixes.mjs` (browser) | all passed at 1280×900 (31 checks) and at 390×844 (34 checks): Invoice how-to-pay/notes/WhatsApp/number clash/declined quote/phone total; Ledger phone summary/₦0/Money in/dated Add/budget hint; Dose "7,5"; Contract saved and reopened with 7 pieces; Apply headline above Experience in the text download; Compressor practice clip compresses and offers a download (no `fit` error). No page errors. |
| The five audit runs | 320 screenshots under `screenshots/audit/` on the session machine (not committed; a selection is in this folder). No runtime errors on any app in any run. |

**Remaining failures and unverified areas:** the 17 platform-template tests (pre-existing, not
app code); the deployed site; the AI writer path; email delivery; a real phone's H.264 encoder for
Compressor; microphone, speech voices and iOS; the real print dialog; the Ledger "full" state
(~8,000 entries); Invoice saving with 257 invoices present (list and numbering worked, the save
itself was not asserted); no-Pass locked states for Board/Focus/Habits (covered by the existing
`scripts/qa/remind-merge.mjs`, not re-run here).

## 7. Remaining competitive gaps

- **Phone notifications and offline use** (Remind, Medicines, Cycle): the one gap every competitor
  fills. Needs a service worker, push subscriptions stored per account and a sender; the Pass
  reminder emails are not a substitute on a phone.
- **Invoice:** recurring invoices, a Paystack pay-link, automatic reminders, a customer portal.
- **Ledger:** recurring entries, several accounts (cash/bank/mobile money), offline entry.
- **Writing studio:** daily AI volume versus Gemini's $4.99 plan; the AI path is unverified here.
- **Study space:** offline study and deck import/sharing for cohorts.
- **Apply:** a match score, a cover letter, ATS checks.
- **Kits:** Plot without axes (Desmos), Regex without marked matches (regex101), Bookings without a
  real date/time (Fresha), Agreement that is not a draft (LawPavilion), Emergency card not on the
  lock screen (built-ins).
- **Pass value:** Scratch, Split and Contrast are free and better elsewhere.

## 8. Next development batch (in order)

1. **Verify live:** Compressor on a real Android phone; the Writing studio AI path with a key; Study
   share links; Pass checkout. (Owner to try, or a session with the live keys.)
2. **Remind:** keep the task panel open when an edit moves the task out of the view; confirm before
   Share; warn that deleting a shared project deletes its tasks; rename the Pass card board so there
   is one "Board".
3. **Writing studio:** titles from the topic/recipient box; lesson-length validation; search over
   drafts; honest message for an invalid draft (not "too large").
4. **Kits, quick wins:** Regex marks matches; Ratios reading; Profit below-cost note; Menu print;
   Replies and Clauses Copy buttons; Bookings/Visits/Symptoms date fields; Bills paid tick; Shifts
   equal-times = 0 h; Plot axes or de-list; Claims as a tickable checklist; Agreement as a draft.
5. **Tax kit:** monthly input, a line citing the Act and date, and a reviewer sign-off before it is
   featured (Phase 3 plan D2).
6. **Phone notifications** for Remind (then Medicines and Cycle): the largest piece of work and the
   largest competitive gap.
7. **Invoice:** recurring invoices and a Paystack pay-link.
8. **Pricing review** (owner decision): Scratch, Split, Contrast to free; Ledger free tier.
