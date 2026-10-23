# The 32 "ready" apps: core task works vs competitive product

Written 23 October 2026 on branch `audit/non-game-apps-20261023`. "Ready" in the main report meant
one thing only: **the app's core task works end to end, as promised, in a browser at laptop and
phone size, with invented data** (local dev server; evidence in the per-app audit files). It did
**not** mean the app is competitive. This file separates the two.

- **Core task works** — verified in the browser on 23 October 2026 (see the audit file named in the
  last column of the main report). "Since fixed" means a problem found then was fixed on this
  branch and re-tested (commit given).
- **Competitive?** — **Yes**: a typical user of the cited alternative would have a concrete reason to
  switch or to use Midnry instead. **Niche**: competitive only for a narrow user or situation, named.
  **No**: the alternative is better for the same job at the same or lower cost; Midnry's only value is
  convenience inside an account the person already uses.
- **Browser or native:** every Midnry app is a web page (no install, works on any phone browser,
  needs a connection to save, no push notifications, no lock-screen access). Alternatives are marked
  **[web]** (fully usable in a browser), **[native]** (phone or desktop app needed) or **[built-in]**
  (part of the phone's own software). Competitor facts come from the official pages cited in
  `competitors-desk-apps.md` and `competitors-kit-apps.md`, rechecked in
  `competitor-claims-recheck.md`; nothing was tested hands-on.

## Desk apps (9)

| App | Intended user | Completed workflow (verified) | Remaining limitations | Competitive? | Concrete reason to choose it over the alternatives |
|---|---|---|---|---|---|
| **Remind** (free; Pass extras) | Anyone organising personal or small-team to-dos, typing in plain words on a phone | Add 26 tasks in plain words; Today/Upcoming; complete for points; task detail (notes, sub-tasks, comments, repeat, labels, priority); projects, sections, filters; Pass Board/Focus/Habits; share a project with a second account, assign, comment; attachments; calendar feed; 400 tasks in 2.1 s; phone | No phone notifications or offline use; an edit that moves a task out of the view closes the panel; Share is irreversible; two things called "Board"; parser quirks | **Niche** | Against Todoist [web + native]: the free plan has no 5-project limit and Pass ($5) unlocks Board, Focus timer and Habits that Todoist splits across Pro ($7 monthly). Against Microsoft To Do [web + native, free]: plain-words dates and repeats ("Pay rent every 25th p1"), projects with sections, streaks. **Why people leave:** both alternatives push reminders to the phone; Remind does not. |
| **Invoice** (free) | Nigerian freelancers and one-person businesses billing in Naira or dollars | 3 invoices with VAT, saved client, sent/paid/overdue, search, numbering prefix, quote→invoice, proposal→quote, delete+undo, reload, 257 invoices, print/PDF on laptop and phone; since fixed (`6e3f615`): how to pay printed, per-client notes, WhatsApp text, phone total, number clash, declined quotes | No online payment link, no recurring invoices, no automatic reminders, no client portal, no native app | **Yes** (for its user) | Wave's invoicing and payments are US/Canada only and Zoho Invoice's gateways include no Nigerian provider (see the recheck file for exact wording); Invoice is free with no invoice cap, prints bank-transfer details (how Nigerian clients actually pay) and copies a WhatsApp message. Zoho Invoice's free plan [web + native] is stronger on features and is the realistic alternative. |
| **Study space** (free; Pass share) | Secondary and university students, especially health and law | Decks with spaced review and saved progress; 150-card deck; quizzes with reasons and saved scores; APA/MLA/Chicago/law references with copy and download; lab write-ups; formulas; share link signed out | No offline study; no deck import/export; long single-page card editor | **Niche** | No single alternative combines flashcards, quizzes, a reference list and lab write-ups: Anki [desktop/Android/web free; iOS $24.99] has the better scheduler and shared decks; Quizlet [web + native] the content library. Choose Study space to keep a course's cards, quizzes and references in one free place on a phone browser. |
| **Cycle** (free) | Someone logging periods privately on a shared or low-storage phone | Log first/last day, prediction from 28 days then own average, notes per period, edit/delete, 200 periods, reload | No reminder before the date, no symptom tags, no offline use | **No** (for most); **Niche** for "no app install" | Clue and Flo [native] predict, remind and tag symptoms; choose Cycle only if installing an app is not an option or a simple browser log tied to an existing account is preferred. |
| **Medicines** (free) | Someone keeping a carer's or an older person's medicine list | Add/edit/remove with undo, tick today and untick, 30-day history, CSV of the list, 60 rows, large tap targets | **No notifications** (the screen says so); one tick per medicine per day; export lacks the tick history | **No** | MyTherapy [native] is free and alerts; Medisafe [native] alerts (paid outside the US, per the recheck file). Choose Medicines only as a printable/readable list shared on any browser; it is not a reminder app. |
| **Scratch** (Pass) | Someone wanting quick notes next to their other Midnry apps | Add, open, edit, copy, delete with undo, search after 5 notes, 40-note cap, reload | 40-note cap with no message; no offline; size message mentions "export" that does not exist | **No** | Google Keep and Simplenote [web + native] are free and do more (offline, reminders, sharing). No reason to pay for it alone. (Pricing left unchanged as asked.) |
| **Split** (Pass) | Friends splitting one restaurant or event bill | Amount, people, tip, uneven kobo split, copy, reload, comma hints | Result just below the fold on phones; one bill at a time, no balances | **No** | Free calculators do a one-off split; Splitwise [web + native, free core] keeps balances between people. (Pricing left unchanged as asked.) |
| **Glyph** (Pass) | Developers inspecting JSON on any machine | Tree with paths, format/minify/sort, open/copy/download, error line and column, 3.4 MB input | Format/sort refused above ~3 MB minified; small toggles on phones | **Niche** | Handles larger files than JSON Crack's stated ~300 KB [web]; editors such as VS Code [desktop] already do this free. A bundle extra, not a reason to pay. |
| **Contrast** (Pass) | Designers checking text/background colours | Hex input, ratio (#777/#fff = 4.48:1), AA/AAA, invalid hex hint, picker, reload | None material | **No** | WebAIM's checker [web] is free, the reference tool, and has more (graphics contrast, permalink, API). (Pricing left unchanged as asked.) |

## Kit apps (23)

All kits are free, open in any browser, and save to the account where they keep a list. For most,
the honest competitor is a spreadsheet or the phone's own tools; their value is that they are already
in the account, need no setup and are written for the task.

| Kit | Intended user | Completed workflow (verified) | Remaining limitations | Competitive? | Concrete reason to choose it |
|---|---|---|---|---|---|
| Units | Students converting length, mass, volume, area, speed, temperature | Correct conversions incl. temperature and swap; copy | Since fixed (`36024bc`): "1,500", units typed in the box, below-absolute-zero refused | **No** | Google Search's converter [web] covers more units; Units works offline once loaded and without search ads. |
| Break-even | Small traders pricing a product | Units to sell, sales needed, profit per unit; rounding up correct | Since fixed (`36024bc`): blank, letters and negative costs named instead of the misleading warning | **Niche** | A spreadsheet does it, but needs the formula; this is three boxes with plain labels. |
| Algo | Computing students learning bubble sort | Steps with correct comparison and swap counts | More than 12 numbers cut silently; one algorithm | **No** | VisuAlgo [web, free] shows 24 algorithms. Algo only as a quick phone demo. |
| Shifts | Nurses and shift workers tracking hours | Day and night shifts, hours per row/week/list, edit/undo, CSV, Add to Remind pre-fill | Start = end counts as 24 h | **Niche** | Hours worked out across midnight with one tap into Remind; a spreadsheet needs a formula for night shifts. |
| Reference | Health students revising adult dose ranges | Search a four-entry list, cautions shown, review note shown | Four entries; no "nothing found"; not reviewed by a pharmacist | **No** | MDCalc and Medscape [web + native] are professional references; keep this de-emphasised (it is). |
| JSON | Anyone checking a JSON snippet | Format, validate, line/column with caret, 300 KB in 110 ms | — | **No** | Many free validators and browser devtools do the same; it is a free taster for Glyph. |
| Reconcile | Bookkeepers matching two lists of amounts | Amounts in both lists paired once, unreadable lines named, totals, 1,000 lines instantly | No export of the result; "1 amounts" | **Niche** | Paste two columns from a bank statement and a cash book and see what is on one side only, without spreadsheet formulas. |
| Creative brief | Freelance creatives starting a job | Fill, save, reload, copy, print | — | **No** | A notes app or document template does the same; convenience only. |
| Stock | Shopkeepers with a short stock list | Add/edit/remove, low badges and count, copy, CSV, 300 rows | Since fixed (`36024bc`): comma decimals, letters, negatives refused; still no link to sales or orders | **Niche** | Free and immediate; Bumpa [web + native, from ₦5,000/month] links stock to sales and a storefront, Kippa [native] is free. Choose Stock for a quick list without an app or subscription. |
| Recipe cost | Caterers and food sellers costing a batch | Batch and per-portion cost with ₦ and thousands | Since fixed (`36024bc`): a letters line is named, not dropped | **Niche** | Paste cost lines as written and get the portion cost; a spreadsheet needs setup. |
| Bookings | One-chair salons, tutors, small clinics | Add/edit/remove, search, copy, CSV, reload | "When" is free text, so no ordering by day and no reminder | **Niche** | Fresha (from $19.95/month) and Booksy ($29.99/month) [web + native] take online bookings and send reminders; Bookings is a free day list for someone who books by phone or WhatsApp. |
| Orders | WhatsApp sellers tracking orders | Add/edit/remove, search, CSV; 300 rows | Status is free text; no filter by status | **Niche** | A plain order book without a storefront subscription; Bumpa does more for a fee. |
| Yield | Farmers and extension workers | Yield per hectare and cost per unit, correct | No harvest unit named | **No** | A calculator does it; convenience only. |
| Farm sales | Farmers keeping a sales book and crop prices | Sales and price-log views, totals, CSV | Price-log date is free text | **Niche** | A crop price log next to the sales book, which general sales apps do not offer by default; Kippa [native] does the sales book free. |
| Visits | Older people and carers listing appointments | Add with date/time, large type, Add to Remind pre-fill | Copy shows ISO dates; 36 px buttons | **No** | A phone calendar [built-in] reminds; Visits is a large-type list a carer can read on any browser. |
| Symptoms | Someone keeping a diary to show a clinician | Add, edit, reload | "Day" is free text, no ordering; no print | **No** | Any notes app does it; convenience only. |
| Scam check | Anyone who received a suspicious message, especially older users | Paste: warning signs listed with meaning and what to do; no verdict | Keyword-based (honestly footnoted); no links to NCC/EFCC channels yet | **Niche** | Google's scam detection [built-in] is not listed for Nigeria (see recheck); this is a Nigeria-worded checklist that works on any phone. |
| Voice | Older people sending a voice message | Record, play, download (with a simulated microphone) | `.webm` file; real microphone and iPhone unverified | **No** | WhatsApp's own voice note [native] is simpler; Voice only helps where the person records for someone outside WhatsApp. |
| Call | Older people learning to make a WhatsApp or Meet call | Steps shown per app | One paragraph per app, not step by step | **No** | Convenience; a family member showing them is better. |
| Savings | Savers estimating compound growth | Correct compound figure | Since fixed (`36024bc`): negative and unrealistic rates refused, high rates warned | **No** | Many free calculators; convenience only. |
| Bills | Households tracking due bills | Add with amount and date, total, Add to Remind pre-fill | No "paid" tick; total counts paid bills; since fixed (`36024bc`): comma decimals | **Niche** | One tap from a bill to a dated task in Remind; a spreadsheet does not remind. |
| Recipes | Home cooks | Search five recipes | Five recipes; "Open a recipe" wording | **No** | Any recipe site has more. |
| Memoir | Older people writing memories | Write, save, reload | One memory per account; one prompt | **No** | A notes app does the same; convenience only. |

## Summary

- **Core task works:** all 32 (verified in the browser; the eight numeric problems found in this group
  are fixed and re-tested in `36024bc`).
- **Competitive for their intended user:** **Invoice** (local payment reality, free, WhatsApp-ready).
- **Niche (a concrete reason exists for a narrow user):** Remind, Study space, Glyph, Break-even,
  Shifts, Reconcile, Stock, Recipe cost, Bookings, Orders, Farm sales, Scam check, Bills (13).
- **Not competitive on their own (convenience only):** Cycle, Medicines, Scratch, Split, Contrast, Units,
  Algo, Reference, JSON, Creative brief, Yield, Visits, Symptoms, Voice, Call, Savings, Recipes, Memoir (18).
- The single largest reason people would leave Remind, Medicines and Cycle is the absence of phone
  notifications; that is a platform decision (web push), not a per-app fix.
