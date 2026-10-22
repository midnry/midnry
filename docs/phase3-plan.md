# Phase 3 plan: the remaining apps (proposal for the owner)

Written 22 October 2026, branch `game-look`, at commit `644a97f`. This is a proposal only.
No app code has been changed.

**How this was checked.** Everything below comes from reading the code. Nothing in this plan was
tried in a browser, and no figure has been checked by a doctor, lawyer, pharmacist or tax adviser.
The audit report itself is not saved in the repository, so "verified" here means one of two things:
the claim was in your brief, or the app's own description promises something. In both cases it was
compared with what the code actually does. Line numbers refer to the files as they are at this commit.

---

## Part 1. One-page summary

### Where things stand

Midnry lists 77 apps today: 69 are free and 8 need Midnry Pass. The site works these numbers out
from the catalogue by itself. Phase 1 (reliability) and the first merges are done. About 60 apps
were not covered by that work. Most are small and do what they say, but four kinds of problem
turned up:

1. **Promises the app doesn't keep.** Seven apps say they do something the code doesn't do.
   - Shifts says it shows "hours for each line". It doesn't.
   - Circuit says it handles "series and parallel" resistors. It doesn't.
   - Algo says it counts comparisons. It doesn't.
   - Quiz says it can "draft some from a topic". It can't.
   - The creative Brief says "generate a tighter version". It can't.
   - The law Cite says it uses the court and the volume. There are no boxes for either.
   - Solver says it finds "the missing value", but it only works in one direction.
2. **Things that look like a verdict.** Scam check says "This looks like a scam" when it finds two
   warning words. Claims, the app for checking a rumour before you forward it, runs the same
   scam-word checker, so a pasted news claim can also be told "This looks like a scam".
3. **Specific medical, legal and tax figures that no professional has checked.** These include
   paracetamol and ibuprofen doses, Nigerian PAYE tax bands and reliefs, VAT at 7.5%, contract
   clause defaults (14 days to pay, 14 days' notice, liability capped at three months' fees), and
   clinical quiz answers. The "Help me choose" quiz offers people "checking a dose".
4. **Work that is lost or never kept.**
   - All 15 AI writing apps keep only what you typed. The text they write disappears when you
     leave the page, and there is no history.
   - Reference lists in Citations and Cite vanish when you leave.
   - Flashcard and quiz progress isn't kept.

### What I recommend

- **Fix the wording now (small job).** Remove or fix the seven broken promises. Change Scam check
  from a verdict to a list of warning signs. Stop Claims showing the scam verdict at all. Give the
  two apps both called "Brief" different names. Stop the "Help me choose" quiz offering dose checks.
- **Pause promotion of the medical, legal and tax tools until a qualified person has reviewed them.**
  Section 4 lists the exact figures to send. Keep these tools available; don't feature them.
- **Build a free "Writing studio".** One place for all 15 AI writing modes. It adds saved drafts, a
  box for source material, and copy, print and download. Each person's daily AI allowance is shared
  across the studio, exactly as it is shared across the writing apps today.
- **Build a free "Study space"** for flashcards, practice quizzes, reference lists, lab notes and
  formulas. You'll be able to make your own decks and quizzes, and your progress will be kept.
- **Let Bills, Visits and Shifts send an entry to Remind** with one button. This stays free:
  dated tasks, Today, Upcoming and the morning summary email are already free in Remind.
- **Leave the small calculators and helpers as quick tools.** They work and they're easy to find.

### Decisions I need from you

| # | Decision | My recommendation | Changes free or Pass? |
|---|----------|-------------------|-----------------------|
| D1 | Approve the wording fixes in Part 3, step 1 (warning signs instead of a scam verdict, removing promises the apps don't keep, renaming the two "Brief" apps) | Yes | No |
| D2 | Will you arrange a qualified person (pharmacist or doctor, Nigerian tax adviser, Nigerian lawyer) to review the items in section 4? Until then, should those tools be left out of "Help me choose" and any featured spots? | Yes to both | No |
| D3 | Merge the 15 writing apps into one free **Writing studio**. The old links keep working. | Yes | No: all 15 are free, so the studio stays free |
| D4 | **FOR APPROVAL: new Pass extras in the Writing studio.** Longer draft history, Word download and a saved "house style". Free keeps everything it has today, plus a new free history (for example 50 drafts). | Your choice. These are additions, and nothing free is removed. | **Yes: adds Pass features** |
| D5 | Merge 8 study apps (Anatomy, Cases, Drill, Quiz, Lab, Citations, Cite, Formulas) into one free **Study space** | Yes | No: all are free |
| D6 | **FOR APPROVAL: new Pass extra in the Study space.** Share a deck or quiz with a class or study group, like Remind's shared projects, which are Pass. | Your choice | **Yes: adds a Pass feature** |
| D7 | Accept that the headline free-app count will fall from 69 to about 48 after D3 and D5. Nothing is taken away; it is fewer, larger apps. | Yes. It matches how earlier merges were handled. | Changes the number shown, not what is free |
| D8 | Add "Add to Remind" buttons to Bills, Visits and Shifts, free | Yes | No. Exact-time reminder emails are already a Pass feature in Remind and would stay that way. |
| D9 | Should Scratch (a Pass notepad) stay separate from the Writing studio? Under your rule, merging it would make the whole studio Pass. | Keep it separate | Avoids an accidental change |
| D10 | The AI allowance ends each day at 1 am Nigeria time (midnight GMT), but the app says it "resets tomorrow". Should the wording be fixed, or should the reset move to midnight Nigeria time? | Change the wording (smaller job) | No |

---

## Part 2. Details

### 2.1 What each remaining app should become

The possible outcomes are: **Keep** (a quick tool that works, so leave it), **Improve** (keep it
but fix or add something), **Bundle** (move it into the Writing studio or the Study space),
**Reposition** (change how it's described or where it's listed) and **De-emphasise** (keep it, but
don't promote it until it has been reviewed). Unless it says otherwise, each app's settings live in
`src/lib/kits.ts` and its screen in `src/components/tools/kit.tsx`.

#### Writing modes (all free; AI-backed when the site has an AI key)

| App (slug) | Outcome | Reason from the code |
|---|---|---|
| Outreach (`cold-email`) | Bundle: Writing studio | AI writer (`AI_SPECS` in `src/lib/ai-write.server.ts`). It keeps only what you typed, not the three emails it wrote. |
| Ads (`ad-copy`) | Bundle: Writing studio | Same pattern. Its three variants are lost when you leave. |
| Captions (`captions`) | Bundle: Writing studio | Same pattern. |
| Listing (`listing`) | Bundle: Writing studio | Same pattern. It isn't on your list, but it is one of the 15 AI writers. |
| Letters (`letters`) | Bundle: Writing studio | Same pattern. A letter you might want to find again later is a good fit for drafts history. |
| Lesson (`lesson`) | Bundle: Writing studio (also linked from Study space for teachers) | Same pattern. |
| Remarks (`remarks`) | Bundle: Writing studio | Same pattern. Teachers write many of these, so a history helps. Pupils' names would be saved (see 2.2). |
| README (`readme`) | Bundle: Writing studio | Same pattern. |
| Digest (`digest`) | Bundle: Writing studio (linked from Study space) | A "reader" mode: it summarises text you paste (up to 14,000 characters go to the AI). The source box already exists. |
| Explain (`explainer`) | Bundle: Writing studio (linked from Study space) | A reader mode. Its offline fallback is in `src/lib/writers/readers.ts`. |
| Outline (`outliner`) | Bundle: Writing studio (linked from Study space) | A writer mode. It writes an essay outline, not the essay. |
| Bugs (`bug-scan`) | Bundle: Writing studio (linked from Study space) | A reader mode. It takes code plus an optional error message. |
| Brief, law (`case-brief`) | Bundle: Writing studio, renamed **Case brief** | Two apps are both called "Brief" (`case-brief` and `creative-brief`). The AI is told to invent nothing. |
| Contract (`contract-scan`) | Bundle: Writing studio. **De-emphasise** until reviewed. | AI "plain summary". Its rules say it must not judge fairness, and it ends with a line saying it is not legal advice. See section 4. |
| Notes / SOAP (`soap-note`) | Bundle: Writing studio, with history **off by default** for this mode | The app warns "Do not put a real patient's identifying details in here". It already keeps your typed inputs; a history would keep more. |

#### Study tools

| App (slug) | Outcome | Reason from the code |
|---|---|---|
| Anatomy (`anatomy`) | Bundle: Study space (becomes a starter deck) | A fixed deck of 8 cards. Which cards you know is held only while the page is open (`Cards` in `kit.tsx`, around line 518). |
| Cases (`clinic-quiz`) | Bundle: Study space (starter quiz). **De-emphasise** until reviewed. | 4 fixed clinical questions with set answers (`kits.ts` lines 103–117). Answers aren't saved. |
| Drill (`law-drill`) | Bundle: Study space (starter quiz). **De-emphasise** until reviewed. | 4 fixed law questions (`kits.ts` lines 176–190). |
| Quiz (`quiz-maker`) | Bundle: Study space (becomes "make a quiz") | It is only a topic plus one big text box. Its description says "or draft some from a topic", which isn't built. It also lists the same feature twice. |
| Lab (`lab-notes`) | Bundle: Study space (several saved lab write-ups) | A one-page template, so starting a second experiment overwrites the first. |
| Citations (`citations`) | Bundle: Study space (one "References" tool) | APA, MLA and Chicago lines work, but the reference list is lost when you leave (`Cite`, `kit.tsx` line 853, uses page-only state). |
| Cite (`legal-cite`) | Bundle: Study space ("References", law style) | It promises "court" and "volume", but there are no boxes for them. With the example report "[2024] 5 NWLR" and year 2024 you get "Ade v Bello [2024] 5 NWLR (2024)", with the year twice. The list isn't saved. |
| Formulas (`formula-sheet`) | Bundle: Study space | 8 fixed formulas. Fine as a starter sheet; you'll be able to add your own. |
| Algo (`algo`) | Improve, keep as a quick tool | Bubble sort only, up to 12 numbers. It steps from swap to swap and doesn't count comparisons, though it says it does (`kit.tsx` line 1151). |
| Plot (`plot`) | Improve, keep as a quick tool | It draws a line but no axis numbers or labels (`kit.tsx` around line 1185). Nothing is saved. |
| Solver (`solver`) | Improve, or reword | It only works forwards (speed from distance and time, and so on), not "the missing value". It shows units only for molarity (`kit.tsx` line 1223). |
| Circuit (`circuit`) | Improve, or reword | It solves V, I or R correctly. The promised "series and parallel for two resistors" isn't there (`kit.tsx` line 1033). |
| Units (`units`) | Keep | Works, and also covers area and speed. Small note: "cup" is the metric 250 mL while "gal" is the US gallon. Say so on screen. |
| Ratios, Break-even, Statements | Keep as quick tools; Study space links to them | The sums are simple and correct. Statements is a saved one-page template. |

#### Medical, legal, tax and safety tools

| App (slug) | Outcome | Reason from the code |
|---|---|---|
| Dose (`dose`) | **De-emphasise**; keep for study with stronger wording | A weight × mg/kg calculation with no upper limit or sanity check. Example numbers are 60 kg, 15 mg/kg, 50 mg/mL. The "Help me choose" quiz offers "checking a dose" (`src/components/match-quiz.tsx` lines 49 and 60). |
| Reference (`dose-ref`) | **De-emphasise** until reviewed | It gives specific adult doses (section 4). |
| Tax (`paye`) | **De-emphasise** until reviewed; improve | Fixed 2026 bands, a hidden ₦840,000 rule, rent relief only (`kit.tsx` lines 1327–1364). See section 4. |
| Contract (`contract-scan`) | Bundle (Writing studio), de-emphasise | See above. |
| Clauses (`clauses`) | Reposition as "starting wording", de-emphasise until reviewed | 5 fixed clauses with specific defaults (section 4). |
| Symptoms (`symptom-log`) | Keep | A plain diary with a "seek care" note. It gives no advice. |
| Emergency card (`ice-card`) | Improve | A saved template. To show it you must be signed in and online. Add a "print a wallet card" layout. Allergies are optional, which is good. |
| Scam check (`scam-check`) | **Improve wording now** | Two or more of 8 keyword patterns gives "This looks like a scam" (`kit.tsx` lines 1541–1590). Common words such as "pin", "password" or "urgent" set it off. Show "warning signs found" instead. |
| Claims (`rumor-check`) | **Improve now** | It reuses the scam checker (`kit.tsx` line 79), so a pasted news claim can be told "This looks like a scam". Show only its four questions. |
| Cycle (`cycle`) | Keep | Uses 28 days, or your own average once two periods are logged. It already says it is "not medical advice and not birth control". |

#### Records

| App (slug) | Outcome | Reason from the code |
|---|---|---|
| Bills (`bill-watch`) | Improve, and connect to Remind | Saved list with a total. "Due" is free text ("1st"), so nothing can remind you. |
| Visits (`visits`) | Improve, and connect to Remind | "When" is free text, and the list shows newest added first, not soonest. |
| Shifts (`shifts`) | Improve, and connect to Remind | It says "hours for each line" but works out no hours (the shared tracker in `kit.tsx` lines 334–510 only adds up `amount`). |
| Bookings (`bookings`) | Keep; optional Remind button later | Free-text "when". Works as a list. |
| Orders (`orders`) | Keep | Free-text status. Offering "paid / sent / delivered" choices would help. |
| Stock (`stock`) | Keep | Low-stock flag and count work (`isLow`, `kit.tsx` line 511). |
| Statements (`statements`) | Keep | See the study tools table. |
| Memoir, Mood (`memoir`, `mood`) | Keep | Saved, simple, and do what they say. |
| Creative Brief (`creative-brief`) | Reword, rename **Creative brief** | Its guide says "Generate a tighter version", but it's a template with no generate button. |

#### Small utilities

| App | Outcome | Reason from the code |
|---|---|---|
| Regex, JSON (free), Profit, Recipe cost, Yield, Savings, Replies, Recipes, Voice, Clearer, Call, Aloud | Keep | Each is small, works in the browser and says what it is. Savings says "not a forecast". |
| Scratch, Split, Contrast, Compressor, Planner (Pass) | Keep; no change proposed | These are Pass today. Moving any of them into a free workspace would change pricing, so I haven't proposed it. See D9 for Scratch. |

#### Stale wording found along the way (small)

- Section blurbs in `src/lib/sections.ts` still say "Emails, ads, and proposals" for Marketing, but
  Proposals moved to Invoice. Accountants say "Tax, reconciliation, and budgets", but Budget is now
  inside Ledger, which is Pass.
- The Remind catalogue entry doesn't mention that **reminder emails at the task's time need Pass**.
  The code enforces that in `src/lib/remind.functions.ts` (`setEmailPrefs`). The free morning
  summary is correct. Fix this so the Pass list is complete.

---

### 2.2 Writing studio

**What it is.** One free app called "Writing studio". On the left is a list of your drafts; on the
right, the editor for the selected draft. A mode picker groups the 15 modes:

- Business: Outreach, Ads, Captions, Listing, Letters
- Teaching: Lesson, Remarks
- Study: Outline, Digest, Explain, Bugs, Case brief
- Professional: Contract, SOAP notes
- Developers: README

**Each draft keeps:**
- the mode and a title (taken from the first field automatically, and editable)
- the boxes you filled
- an optional **Source material** box (notes, an advert, a passage) to paste from
- the text that was written, which today is thrown away
- whether the AI wrote it or Midnry's quick writer did, and when.

You can edit the written text, then use **Copy**, **Print / save as PDF** or **Download .txt**
(Markdown for README). These are all free, as Copy and Print are today.

**How the AI daily limits apply.** These are the rules as they stand, from
`src/lib/ai-write.functions.ts`:

- One counter per account per day: **5 AI writes a day free, 30 with Pass**, and unlimited for
  admins. The numbers can be changed on the server (`AI_DAILY_FREE`, `AI_DAILY_PASS`) without new
  code.
- The counter is shared across all 15 writing modes. The studio doesn't change that; it simply
  makes it visible ("3 of 5 AI writes left today" at the top). That needs one small new read-only
  call, because today the number is only reported after a write.
- A write is counted only when the AI succeeds. "Try another wording" counts as one write.
- When the AI limit is used up, or the site has no AI key, every mode still works through
  Midnry's quick writer, which runs on the device with no limit. This stays exactly as it is.
- The day is the GMT date, so the allowance resets at 1 am Nigeria time (see D10).
- What is sent to the AI is capped: up to 20 boxes of 15,000 characters each, and 14,000
  characters for the long reader modes. The new Source material box should go to the AI under the
  same 14,000-character cap. That is a small server change to `details()` in `ai-write.server.ts`.
- The privacy page already says that the writing apps send typed text to Anthropic
  (`src/routes/privacy.tsx` around line 131). Change "writing apps" to "Writing studio" when it
  ships.

**Pricing under your rule.** All 15 modes are free today, so the merged studio is **free**. Nothing
moves behind the Pass. Possible Pass extras, all **additions that need your approval (D4)**:

| Extra | Free | With Pass | Notes |
|---|---|---|---|
| AI writes a day | 5 (unchanged) | 30 (unchanged) | Already exists; only the wording around it changes |
| Draft history | **New:** about 50 drafts | Several hundred | Free gains a history it never had. At the limit we ask the person to delete drafts, as Ledger does since Phase 1; nothing is ever dropped silently. |
| Word (.docx) download | Not included (Copy, Print/PDF and .txt stay free) | Included | New feature, not taken from free |
| Saved "house style" (your name, business, sign-off, tone) filled into every mode | Not included | Included | New feature |

**Moving existing work across (migration).**

- **Today:** each writing app keeps one small saved document under its own name (for example
  `cold-email`) holding only `{ values }`, the boxes you filled. The text it wrote was never saved,
  so there is nothing of that kind to move. I'll say this plainly in the release note.
- **First open of the studio:** it reads those 15 old documents and turns each non-empty one into a
  draft titled "<Mode> (brought in)". It marks each as brought in so this happens only once. This is
  the same "copy in, keep the original" method Invoice used for Quote and Proposal
  (`src/lib/client-work.ts`, `src/components/tools/kit-import.tsx`).
- **The originals are never changed or deleted.** Add the 15 old names to `src/lib/merged-docs.ts`
  with tier `free`, so they stay readable. Never remove those entries while data may exist.
- **Old links:** add the 15 old names to `src/lib/app-aliases.ts`, so that `/apps/cold-email` opens
  the studio in Outreach mode (`?view=outreach`).
- **The AI keeps working without change:** the studio sends the old name (for example `cold-email`)
  as the mode, so the AI rules in `ai-write.server.ts` and the daily counter don't change.
- **Storage:** today an app document is capped at 100,000 characters (`src/lib/doc-limits.ts`), and
  one draft with long source text can be 15,000–30,000 characters. The studio needs its own limit,
  as Invoice and Ledger have (1,000,000 characters, about 50 long drafts or many short ones). A Pass
  history of several hundred drafts would need a different way of storing drafts (one record per
  draft instead of one document). That makes the history extra a **medium-to-large** job.
- **Search and the catalogue:** the 15 entries become one. Make sure searching "captions" or
  "cover letter" still finds the studio. Wider search is being worked on separately, so coordinate.
- **Sensitive modes:**
  - In SOAP notes mode, history is off by default and the "no identifying details" warning stays.
  - Remarks will now keep pupils' first names in your history, so mention this on screen.
  - Each draft gets a delete button.
  - Data retention and account deletion already cover app documents.

---

### 2.3 Study space

**What it is.** One free app with four tabs:

1. **Cards.** Your own flashcard decks. Anatomy becomes a starter deck you can copy and edit. Which
   cards you know is saved, with a simple "show the ones I missed again".
2. **Practice.** Your own quizzes with four choices and a reason, plus starter sets from Cases
   (medicine) and Drill (law). Scores are saved per attempt. The Quiz maker becomes "make a quiz".
   A teacher can still copy or print a quiz, as today.
3. **References.** One tool for APA, MLA, Chicago and law reports. Reference lists are **saved**,
   sorted A to Z, and copyable. For law, add the missing court and volume boxes and fix the
   repeated year.
4. **Notes.** Several saved lab write-ups (aim, method, results, conclusion), plus the formula sheet
   with "add your own formula".

Alongside the tabs, a short **Tools** list links to the calculators, which stay quick tools: Units,
Circuit, Solver, Plot, Algo, Ratios, Break-even and Statements. There are also shortcuts that open
the Writing studio in Explain, Bugs, Outline, Digest or Case brief mode, carrying the subject over.

**AI.** None of the 8 study apps uses the AI today, so the Study space adds no AI cost by default.
A possible later feature is "make cards from my notes". If built, it should use the **same daily
AI allowance** as the studio (5 free, 30 Pass). That keeps it free under your rule, and costs stay
capped.

**Pricing under your rule.** All 8 are free, so the Study space is **free**. A possible Pass
extra, **needing your approval (D6)**: share a deck or quiz with a class or study group. This
matches Remind, where shared projects are the Pass feature. Making and saving your own decks,
quizzes and references stays free.

**Moving existing work across (migration).** Only three of the 8 save anything today:

- **Lab** (`lab-notes`): its one page becomes the first lab write-up.
- **Quiz** (`quiz-maker`): its topic and text box become a draft quiz. The text is kept as written,
  with no attempt to split it into questions automatically.
- **Statements** isn't moving, so nothing changes there.

Anatomy, Cases, Drill, Formulas, Citations and Cite save nothing per person today, so there is
nothing to move. The same rules as the studio apply: copy in once, keep the originals, add the old
names to `merged-docs.ts` (tier free) and `app-aliases.ts`.

**Medical and legal starter content** (the Anatomy, Cases and Drill sets) should be **reviewed
(section 4) before the Study space is promoted**. Until then, label the starter sets "sample study
questions".

---

### 2.4 Medical, legal, tax and safety: content for professional review

None of these items has been reviewed by a qualified professional. **Don't describe any of them as
checked, approved or accurate until that happens.** Send the reviewer the exact text below. All
references are to `src/lib/kits.ts` unless another file is named.

#### Medical: for a pharmacist or doctor (and a clinical educator for the quizzes)

| Where | Exact content to review |
|---|---|
| Reference, line 360 | "Paracetamol, adult: Often 0.5–1 g every 4–6 hours, maximum 4 g in 24 hours. Lower the dose if liver disease or low weight. Confirm." |
| Reference, line 361 | "Ibuprofen, adult: Often 200–400 mg every 4–6 hours with food, maximum 1.2 g a day over the counter. Avoid in some asthma, ulcers, and late pregnancy. Confirm." |
| Reference, line 362 | "ORS: … Give after each loose stool, in sips. Seek care for blood, high fever, or no urine." No amount is given. Is that the right choice? |
| Reference, line 363 | "Adrenaline, anaphylaxis: … Intramuscular dose depends on age and a protocol. Do not calculate it from memory in a crisis. Follow the local protocol." |
| Reference, line 351 onward | The blurb "A few adult ranges for study" and the note "Not a dose for a named patient. Check a current formulary." Is "study" framing enough for figures this specific? |
| Dose, lines 64–80 | A plain mg = kg × mg/kg and mL = mg ÷ (mg per mL) calculation. There is no maximum, no check for unlikely weights, and no child or adult distinction. Example numbers: 60 kg, 15 mg/kg, 50 mg/mL. The guide says "Confirm it with a prescriber." |
| Cases, lines 112–115 | The four questions and their marked answers: chest pain treated as a possible heart attack; fever with a stiff neck means urgent assessment for meningitis; the "five rights" are patient, drug, dose, route and time; spreading redness and heat after two days suggests possible infection. |
| Anatomy, lines 92–99 | 8 cards, for example "Femur: The longest bone in the body", "Liver: Makes bile, stores glycogen, and processes many drugs". These are low risk, but a clinical educator should still check them. |
| SOAP notes AI rules, `src/lib/ai-write.server.ts` (`soap-note`) | It may not add symptoms, findings, diagnoses, drugs, doses or advice. It ends with "Formatting aid only. Review before it goes in the record." |
| "Help me choose", `src/components/match-quiz.tsx` lines 49 and 60 | Labels "doses, anatomy, cases" and "Patient notes, shifts, or checking a dose". |

**Recommended wording now** (no review needed to make things more careful):

- Dose: "Practice the arithmetic of a weight-based dose. Not for a real patient."
- Reference: "Sample study notes. Not checked by a pharmacist. Use a current formulary."
- In "Help me choose", replace "checking a dose" with "dosage arithmetic for study", and take
  Reference out of the care-work suggestion until it is reviewed.

#### Tax: for a Nigerian tax adviser

All of the following is in `Tax()`, `src/components/tools/kit.tsx` lines 1327–1364, plus the text
at `kits.ts` lines 409–418.

| Exact rule in the code | Question for the reviewer |
|---|---|
| Bands on chargeable income: first ₦800,000 at 0%, next ₦2,200,000 at 15%, next ₦9,000,000 at 18%, next ₦13,000,000 at 21%, next ₦25,000,000 at 23%, anything above at 25% | Are these the bands in force under the Nigeria Tax Act from 1 January 2026, as the app's note says? |
| If **gross** annual pay is ₦840,000 (₦70,000 × 12) or less, PAYE is ₦0 | Is there a minimum-wage exemption like this, and is it based on gross pay? Just above ₦840,000 the tax jumps from ₦0 to about ₦6,000, because the 0% band is ₦800,000. |
| Rent relief: 20% of annual rent, capped at ₦500,000, taken off income | Is that the right rate, cap and basis? |
| No other reliefs or deductions: pension, NHF, NHIS and life insurance are not taken off | The note says "Reliefs other than optional rent relief are not applied". For many employees this will make the estimate higher than the real figure. Should those deductions be added? |
| VAT: 7.5% added on top of the amount typed | Is 7.5% right for 2026? The screen doesn't say whether the amount should include or exclude VAT. |
| Blurb "A 2026 Nigeria PAYE estimate … Confirm it before you file." | Is that wording acceptable? |

**Recommended wording now:** "An estimate using the 2026 bands as we understand them. Not reviewed
by a tax adviser. Pension and other deductions are not included, so your real PAYE may be lower.
Add a sentence about the ₦840,000 rule and say "VAT added on top".

#### Legal: for a Nigerian lawyer (and a law lecturer for Drill)

| Where | Exact content to review |
|---|---|
| Clauses, line 447 | Payment within **14 days** of a correct invoice; interest "at the rate the parties write here" |
| Clauses, line 448 | Scope: extra work needs a written change |
| Clauses, line 449 | Confidentiality, "except where the law requires disclosure" |
| Clauses, line 450 | Termination by **14 days'** written notice; payment for work done survives |
| Clauses, line 451 | Liability: death and fraud are not excluded; other liability is capped at **fees paid in the previous three months** |
| Drill, lines 185–188 | A price tag is "usually an invitation to treat"; consideration is "something of value each side gives"; "Invented pins are misconduct"; the definitions of ratio decidendi and obiter |
| Contract AI rules, `ai-write.server.ts` (`contract-scan`) | It must not judge fairness or legality, lists "clauses to read carefully", and ends with "A plain summary, not legal advice. For anything important, ask a lawyer." |
| Case brief AI rules (`case-brief`) | It must not add facts, holdings or citations from memory. |
| Cite (law), `kit.tsx` `Cite`, line 853 | The format "Parties [Report] (Year)". Nigerian reports are usually cited as "(2024) 5 NWLR (Pt. …) page". The year is repeated, and the promised court and volume boxes are missing. |
| Agreement (already merged, `service-terms`) | Its default notice ("14 days") and revisions ("2") should go to the same reviewer. |

**Recommended wording now:**

- Clauses: "Starting wording to adapt. Not reviewed by a lawyer."
- Cite: remove "court" and "volume" from the description until the boxes exist.

#### Safety: no professional needed, but fix now

| Where | Problem | Recommended change |
|---|---|---|
| Scam check, `kit.tsx` lines 1574–1579 | Two keyword matches give "This looks like a scam. Do not reply, pay, or open links." | Headline: "**2 warning signs found**", then the list of signs, then "This is a checklist, not proof either way. If money or a code is involved, stop and ask someone you trust." Keep the "No common warning signs found. That does not prove it is safe" line. Don't use red "scam" styling. |
| Scam check pattern list, lines 1544–1552 | A plain "pin" or "password" in a harmless message counts as a sign | Fine for a checklist once it no longer gives a verdict |
| Claims, `kit.tsx` line 79 | Uses the scam checker, so a rumour can get the scam verdict | Show only the four questions. Don't show a scam level. |
| Emergency card | You have to be signed in and online to show it | Add "print a wallet card". Say on screen that it's only as up to date as you keep it. |

---

### 2.5 Records and Remind (Bills, Visits, Shifts)

**Recommendation: yes, connect them, as a one-way "Add to Remind" button, kept free.**

**How it would work.**

- Each row gets an **Add to Remind** button. It opens Remind with the task already typed in, in
  Remind's own plain-words style. The person checks it and presses Add. Remind's existing parser
  (`src/lib/remind/parse.ts`) understands the dates and repeats.
  - Bills: "Pay electricity ₦12,000 every 15th"
  - Visits: "Dr Bello at General Hospital Fri 10am"
  - Shifts: "Shift at Ward 3 2026-10-24 7am"
- Remind can't be pre-filled from a link yet, so we'd add a small `?add=` option to Remind. Nothing
  is written into Remind behind the person's back. This avoids two apps editing the same saved
  document at once.
- To make the dates work, give Bills a "day of month" choice instead of free text, and give Visits
  and Shifts real date and time boxes. Old free-text entries stay as they are and can be edited.
- Shifts: add the missing hours per line and a weekly total, as the app already promises.
- Visits: sort by date, soonest first.

**Why it stays free.** Everything this needs is already free in Remind: dated and repeating tasks,
Today and Upcoming, browser alerts while Remind is open, and the **free morning summary email**
(`src/lib/remind/email.server.ts`). Emails at the exact time of a task are **already a Pass
feature** (`requirePass` in `src/lib/remind.functions.ts`). That doesn't change, and no new Pass
gate is added.

**Limits to be honest about.** It is a copy. If you change the bill later, the Remind task doesn't
change. A later version could remember the link and offer "update the reminder too". Medicines
(Phase 1) and Bookings could use the same button later.

---

## Part 3. Recommended order of work

| Step | What | Size | Needs your decision |
|---|---|---|---|
| 1 | **Honesty fixes.** Scam check shows warning signs, not a verdict. Claims shows questions only. Remove or fix the seven broken promises (Shifts hours, Circuit series/parallel, Algo comparisons, Quiz drafting, Creative brief "generate", law Cite court/volume, Solver "missing value"). Rename "Case brief" and "Creative brief". Correct the stale section blurbs. List exact-time Remind emails among the Pass features. Fix the AI reset wording. | Small | D1, D10 |
| 2 | **Careful wording for health, tax and legal.** Use the "not reviewed" wording in section 2.4. Stop "Help me choose" offering dose checks, and take Reference, Tax and Clauses out of featured suggestions. | Small | D2 |
| 3 | **Professional review.** Send section 2.4 to a pharmacist or doctor, a tax adviser and a lawyer, then apply their corrections. Only after that should the "not reviewed" wording change, and only to what they actually approved. | Medium (mostly waiting on reviewers) | D2: who to ask |
| 4 | **Records improvements.** Real dates and times in Bills, Visits and Shifts, hours in Shifts, soonest-first in Visits, and save the reference lists in Citations and Cite. | Small to medium | No |
| 5 | **Add to Remind** for Bills, Visits and Shifts, plus Remind's `?add=` pre-fill | Medium | D8 |
| 6 | **Writing studio, free core.** Drafts list, saved output, Source material box, copy, print and .txt, AI allowance shown, copy-in of old documents, redirects and search names | Large | D3, D7, D9 |
| 7 | **Writing studio Pass extras**, only if approved: longer history (new storage), Word download, house style | Medium to large | **D4: changes the Pass** |
| 8 | **Study space, free core.** Your own decks and quizzes with saved progress, saved references, several lab notes, own formulas, copy-in, redirects | Large | D5, D7 |
| 9 | **Study space Pass extra**, only if approved: share a deck or quiz with a group | Medium | **D6: changes the Pass** |
| 10 | Small quick-tool improvements: Plot axes, Algo comparisons, Circuit series/parallel, Solver both ways, Emergency card print layout, Orders status choices | Small each | No |

Steps 1 and 2 can ship together, quickly, and they lower risk straight away. Step 3 can run in
parallel with steps 4 to 6. Steps 6 and 8 each follow the merge method already proven on Invoice and
Remind, which is to copy in, keep the originals and redirect the old links. Each should get its own
automated tests and browser check before release, as Phase 1 and the merges did.

### Items that change what is free or on the Pass (need your approval)

- **D4:** Writing studio Pass extras (longer history, Word download, house style). Nothing free is
  removed, and free also gains a history.
- **D6:** Study space Pass extra (sharing a deck or quiz with a group). Nothing free is removed.
- **D7:** Not a price change, but the "N free apps" headline drops from 69 to about 48 because 23
  apps become 2.
- **D9:** Keep Scratch (Pass) out of the free Writing studio. Merging it would make the studio Pass
  under your rule.

No step in this plan moves any currently free feature behind the Pass.
