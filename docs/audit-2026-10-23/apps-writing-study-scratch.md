# Audit: "studio" group — Writing studio, Study space, Scratch

Dev server http://127.0.0.1:8080 (PGLite, synthetic data). Driven with Playwright (Chromium) on desktop 1280x900 and phone 390x844 (isMobile, touch). Accounts: fresh free accounts (`qa-write-audit-*`, `qa-study-audit-*`, `qa-scratch-free-*@example.test`, display names "Ngozi Eze", "Chiamaka Nwosu") and the local QA admin (Pass extras open). Scripts: `docs/audit-2026-10-23/studio/*.mjs`; raw logs: `/home/user/midnry/screenshots/audit/studio/*.log`. Screenshots: `/home/user/midnry/screenshots/audit/studio/`.

Environment note: `ANTHROPIC_API_KEY` is not set, so the studio shows "AI writing is off right now, so Midnry's quick writer writes every mode on your device, with no limit." Every "Write it" below went through the on-device quick writer. The AI path (daily allowance of 5/30, "Written by AI" label, house style applied to AI drafts, Source material read by the AI) is UNVERIFIED.

Site-wide note (seen in all three apps, not app-specific): on a 390px phone, an account whose display name is ~14 characters or more ("Chiamaka Nwosu") makes the header 2px wider than the screen (`div.flex.items-center.gap-1.lg:hidden` right edge = 392px): "Sign out" wraps onto two lines and every page scrolls sideways by 2px. With shorter names ("Ngozi Eze", "QA Admin") there is no overflow. Low severity, header component, worth a fix in one place.

---

### Writing studio (/apps/write) — free, with Pass extras

- **Verdict: Useful but needs improvement** (one high-severity save bug in Contract mode; the rest works well with the quick writer).

- **Tested workflows (VERIFIED):**
  - Free account, first visit: empty state, allowance line, 15 mode buttons grouped Business / Teaching / Study / Professional / Developers, default mode Outreach, "0 of 20 Outreach drafts kept. Midnry Pass keeps up to 500.", "No saved Outreach drafts yet. What you type here is saved as a draft." (write-desktop-empty.png). First load 3.4–4.0 s.
  - Empty "Write it" → red alert "Fill in: Your name, Who you're writing to, What you can do for them." (names the required boxes; good).
  - Lesson mode (a teacher in Lagos: Basic Science / Photosynthesis / JSS 2 / 40 min / Source material pasted): "Write it" → one piece "Lesson plan" with OBJECTIVE, STARTER (5 min), INTRODUCE (7 min), MAIN TASK (20 min), CHECK FOR UNDERSTANDING (8 min), RESOURCES; footer "Written on your device by Midnry's quick writer on 23 Oct, 7:30. Check facts and figures before you use it." Button becomes "Try another wording" and gives different text. "Draft saved" appears. (write-desktop-lesson-written.png)
  - Edit the written text, set a custom title, reload: same draft id reopens, edited text, custom title, every typed box and the Source material all survive.
  - Copy (single piece) → clipboard holds the edited text (910 chars). "Print or save as PDF" → opens a print document titled with the draft title containing the full text (captured the print iframe). "Download .txt" → `photosynthesis-jss2-week-3.txt`, content identical to the text on screen. README mode downloads `.md` (`naira-fx.md`, starts `# naira-fx`).
  - Remarks mode (Amaka / reads aloud with confidence / check spellings / English): three sentences, all naming Amaka, well formed. Second draft (Tunde) via "New draft"; list shows both; reopening Amaka's draft from the list restores boxes and text; "Delete draft" asks "Delete this draft for good?" then "Yes, delete draft"; the next draft opens.
  - Outreach (admin): three versions "Email 1 / 2 / 3", "Copy all" copies all three with headings (1,082 chars). SOAP notes: formatter output S/O/A/P with the "Formatter only" footer, history off by default ("0/1"), "New draft" while history is off → "History is off for SOAP notes, so one note is kept. Clear this note to start the next, or turn the history on above." Explain mode (JS function) → "Overview" + "Line by line"; Bugs mode caught `<=` off-by-one and `=` in a condition with line numbers. Digest with a 3-word passage → "That passage is too short to summarise. Paste at least a few sentences."
  - Free caps, on screen and on the server: seeding Lesson drafts through `saveDraft` stops at 20 (`{"ok":false,"error":"full","cap":20,"count":20}`); the page shows "20 of 20 Lesson drafts kept" and "New draft" shows "You have 20 saved Lesson drafts, the most a free account keeps for one mode. Nothing is deleted for you: delete a draft you no longer need to start another. Midnry Pass keeps up to 500." (write-desktop-free-cap.png). Word button disabled "Word (.docx) · Midnry Pass" + "Word (.docx) download comes with Midnry Pass. Everything else here stays free."; house style panel locked with the same wording.
  - Pass extras (admin): 60 Outreach drafts seeded via the server function in 1.1 s; the page with 60 drafts loads in 1.7 s, list shows all 60 in a 512px scrolling box, "60 of 500 Outreach drafts kept with Midnry Pass.", opening draft #45 took 452 ms (write-desktop-admin-60-drafts.png). House style saved (tone Formal, avoid "deposit, kindly", sign-off) → "House style saved. Every AI draft follows it." / status "Applied to every AI draft"; a Letters draft then shows "Your house style says to avoid: “deposit”. Edit the text before you use it." (write-desktop-admin-letter-style.png). "Download Word (.docx)" → `ada-obi-14-allen-avenue-ikeja.docx`, 5,046 bytes, a real zip with `word/document.xml` whose text is the letter (unzipped and checked; copy kept as `letter-sample.docx`).
  - Phone 390x844 (free, 20 Lesson drafts): no sideways scroll, mode picker is one `<select>` ("Lesson (20)"), drafts are a `<select>` with 20 options, all form controls ≥40px tall (write-phone-lesson.png, write-phone-remarks-top.png).
  - No page errors or console errors in any run (three runs, free + admin, desktop + phone).

- **Unverified:** AI writing (no key): the 5/30 daily allowance, reset time, "Written by AI" label, house style tone/sign-off applied to drafts, Source material being read, the "AI writes left today" wording; actual PDF file (the browser print dialog is the "save as PDF" step; the print document content was checked); opening the .docx in Word (zip structure and text were checked).

- **Problems found:**
  1. **HIGH — Contract mode never saves the written summary; the message blames the user.** Steps (admin or free): Contract → paste a 9-clause tenancy agreement → "Write it". The summary appears (7 pieces: Parties, Money, How it ends, Dates and length, What each side must do, Watch for, Before you sign), then the save line goes `waiting → too-large` and reads **"Too large to save. Shorten the source or the boxes."** The draft is only 647 bytes of JSON. Cause: `cleanDraft` in `src/lib/studio.ts` refuses any draft with more than 6 pieces (`if (raw.pieces.length > 6) return { ok: false, error: "invalid" }`) and the UI maps every non-full/conflict/gone error to "too-large"; the Contract quick writer (`src/lib/writers/readers.ts`) returns 7 pieces. Effects observed: after a reload the draft reopens with the contract text but no summary (server row has `pieces=0`); if "Write it" is pressed right after pasting (before the 700 ms autosave fires) nothing is saved at all — in the first run the Contract draft was missing from the list entirely (admin showed "contract: 0" drafts). Screenshot: write-desktop-admin-contract-save.png. `draftDocx` also truncates to 6 pieces (`.slice(0, 6)`), so a Word file of a contract summary would drop "Before you sign".
  2. **MEDIUM — Draft auto-titles use the first box, which is usually the constant one.** Outreach drafts are titled by *your own name*: 60 Outreach drafts all read "Eunice Bassey · 23 Oct, 7:31 · Quick writer" and cannot be told apart (write-desktop-admin-60-drafts.png); Lesson drafts are titled by the subject ("Basic Science") rather than the topic. Only a hand-typed title fixes it, and nothing prompts for one.
  3. **LOW — Lesson length accepts anything silently.** "Lesson length in minutes" is a plain text box: "abc" and "40,5" → 40-minute plan, "-5" → 15 minutes, "900" → 180 minutes, with no message.
  4. **LOW — Over-long boxes stop saving with no guard.** Boxes have no `maxlength` (limit 15,000); typing 15,001 characters shows "Too large to save. Shorten the source or the boxes." (correct here, write-desktop-too-large.png) but the same wording is reused for problem 1. Source material has `maxlength=20000` and a 20,000-char source saved fine.
  5. **LOW — With AI off, two advertised inputs do nothing.** The Source material box is ignored by the quick writer (the UI says so: "Midnry's quick writer uses only the boxes above"), and the house style tone/sign-off is not applied to quick-writer drafts (only the avoid-word check runs). So in the current deployment state "A Source material box … to work from" and "a saved house style for every draft" are not delivered.
  6. **LOW — .docx repeats the first line.** The Word file's heading is the auto title, which for Letters is the first box ("Ada Obi, 14 Allen Avenue, Ikeja"), so the address appears twice at the top; the file name is the address too.
  7. **LOW — Long draft lists have no search.** 60 drafts are a plain scroll box on desktop and a 60-option `<select>` on phone.

- **Promise check (catalogue `features` / `guide`):**
  - "15 modes: Outreach, Ads, Captions, Listing, Letters, Lesson, Remarks, Outline, Digest, Explain, Bugs, Case brief, Contract, SOAP notes and README" → **kept** (all 15 present and switchable; Lesson, Remarks, Outreach, SOAP, Explain, Bugs, Digest, Contract, README, Letters exercised).
  - "A Source material box for notes, an advert or a passage to work from" → **partly**: the box exists and is saved, but only the AI reads it (UNVERIFIED); the quick writer ignores it.
  - "Your drafts are saved: what you typed and what was written, up to 20 per mode" → **partly**: kept for every mode tested except **Contract**, whose written summary is never saved (problem 1). The 20-per-mode cap is kept and clearly explained.
  - "Edit the text, then copy it, print it or save it as a PDF, or download it as a text file" → **kept** (edit persists; copy, print document, .txt/.md download all hold the edited text).
  - "AI writing when it is available, 5 a day free or 30 with Midnry Pass … Midnry's quick writer always works, with no limit" → quick writer with no limit **kept**; AI allowance **UNVERIFIED** (not configured here; the UI says so honestly).
  - "With Midnry Pass: up to 500 drafts per mode, Word (.docx) download, and a saved house style for every draft" → 500 cap and .docx **kept**; house style **partly** (saved and the avoid-word check runs on every draft; tone/sign-off only reach AI drafts, which the panel itself says: "Every AI draft follows it").
  - Guide "Pick a mode…", "Fill the boxes. Paste notes… into Source material if it helps" → kept / partly (as above). "Press Write it. Pick the version you like, or try another wording." → **kept** (3 versions in Outreach/Ads/Captions/Remarks; one version + "Try another wording" elsewhere). "Edit the text, then copy, print or download it. The draft is saved under Drafts." → kept except Contract. "Press New draft for the next one. Open any saved draft from the list to carry on." → **kept**.

- **Mobile:** Good. One `<select>` for modes and one for drafts, no sideways scroll at 390px with 20 drafts, controls ≥40px, Pass lock text readable. The header wrap with long names is the site-wide issue above.

- **Suggested essential fixes:** (1) Raise the piece cap (or merge the Contract reader's pieces) so Contract drafts save, and show a distinct message for "invalid" instead of "Too large to save"; (2) auto-title from the most distinguishing box (recipient for Outreach/Letters, topic for Lesson, learner for Remarks) or prompt for a title; (3) make the minutes box numeric with a range note; (4) put `maxLength` on boxes; (5) add a filter box to the drafts list past ~20 drafts.

---

### Study space (/apps/study) — free, with a Pass share extra

- **Verdict: Ready** (works end to end; a handful of low-severity polish items).

- **Tested workflows (VERIFIED):**
  - Fresh free account (nursing student "Chiamaka Nwosu"): four tabs Cards / Practice / References / Notes; empty states ("No decks yet. Make one for whatever you are learning…", "No quizzes yet…", "Your list is empty…", "No write-ups yet."); sample Anatomy deck and Cases / Drill quizzes each carry "Not professionally reviewed yet. Check with a doctor/lawyer before relying on this." plus their own caution (study-desktop-empty.png). First load 3.5 s.
  - Cards: "New deck" → "Pharmacology basics", two cards typed, bulk box "Add several cards at once" with dash / colon / tab separators → "Add 3 cards" (a line with no back is skipped, blank card row dropped), 5 cards saved ("Saved to your account"), "Copy as text" and "Print" give the whole deck (study-desktop-deck-editor.png). Review: "5 cards left · 0 knew it · 0 again", flip by button or by tapping the card, "I knew it" / "Again"; the "Again" card returns at the end of the queue ("1 card left · 4 knew it · 1 again", study-desktop-review.png); end screen "Done for now. 5 knew it · 1 again. Next review 24 Oct 2026. Your progress is saved."; after reload the list reads "5 cards · next review 24 Oct 2026 · 5 known" and the saved document holds box/due per card; reviewing again the same day says "Nothing to review today. Next review 24 Oct 2026."
  - Delete deck (asks "Delete this deck and its progress?"), "Copy and edit" on the sample deck → "Anatomy (my copy)" keeping its review note. Card text capped at 4,000 chars by `maxlength`, deck name at 120.
  - Large data: a 150-card deck seeded into the document; page reload 1.9–2.2 s; the editor renders 150 card rows in ~250 ms, no sideways scroll, editing card 150 and saving 290 ms; Review shows "150 cards left", after 5 answers "145 cards left · 5 knew it"; Copy as text 13,101 chars (study-desktop-150-cards-editor.png).
  - Practice: "Make a quiz" → "Vital signs", two complete questions (status "Write the question." → "Add at least two choices." → "Ready"), one unfinished question left, notes box; Start disabled until a question is ready; player leaves the unfinished question out ("Question 1 of 2"); wrong pick shows "Not quite." + the reason, right pick "Correct."; score "1 of 2 — Keep going. Review the answers below, then try again. Saved to your scores." with the missed question and its reason (study-desktop-quiz-score.png); "Try again" → "2 of 2", "Your best: 2 of 2."; editor shows "Last score 2 of 2 · best 2 of 2 · 2 attempts saved" with dated chips; list shows "last score 2 of 2 · best 2 of 2" after reload. Sample Drill quiz played (3 of 4) and saved. "Include answers when copying or printing" toggle changes the copied text. Blank quiz: Start disabled; delete works.
  - References: APA, MLA, Chicago (notes style) and Law report (Nigerian style) each produce a correct-looking line in the preview, e.g. "Okonkwo, C. N. (2023). Hand hygiene compliance in Enugu teaching hospitals. West African Journal of Nursing, 34(2), 112-120. https://doi.org/…", "Okafor v Synthetic Studio Ltd (2022) 12 NWLR (Pt. 1840) 233, CA"; "Add to my list" disabled when Author/Title (or Parties) are empty; duplicate → button disabled + "Already in your list."; boxes clear after adding; list is A to Z under "References" and "Table of cases"; "Copy the whole list" = "Download .txt" (`references.txt`, content checked); Remove asks "Remove it?"; everything persists after reload (study-desktop-references.png).
  - Notes: "New write-up" → Experiment / Aim / Method / Results / Conclusion, saves as you type, "Copy as text" and "Print" give the full write-up, list shows "Changed 23 Oct 2026"; Formula sheet: search "ohm" filters to 1, own formula "Drip rate" added, "Nothing matches “zzzz”." for no match; write-up and formula persist after reload (study-desktop-notes.png). Old links `/apps/anatomy`, `/apps/formula-sheet`, `/apps/legal-cite` redirect to `?view=cards|formulas|law`.
  - Sharing: free account sees "Making a share link needs Midnry Pass. Everything else in the Study space is free, and opening a link someone sends you is free too." and no button (study-desktop-free-share-locked.png). Admin: "Make a share link" → `/study/shared/<32-char token>` with "Copy link", "Update the shared copy", "Turn off link", and a "Your share links" list for decks and quizzes (study-desktop-admin-share.png). Signed out: "Sign in to open this study set" with Sign in / Create a free account, no content shown, Sign in carries `next=` back to the link (study-shared-signed-out.png). Free user opens the link: "A deck of 2 cards. Read-only: save a copy to study it and change it." — it is a snapshot (a card the owner added later did not show until "Update the shared copy", after which it did); "Save a copy to my Study space" → "Saved a copy." → "Open my Study space" → the copy is listed with "Saved from a share link" (study-shared-deck-free.png). Shared quiz opens with its review note (study-shared-quiz-free.png). Bad token → "This link doesn't open — It may have been turned off by the person who shared it, or the address isn't complete." Revoked link → same page, no content.
  - Phone 390x844: all four tabs, the 150-card editor, the review screen and the quiz player render well with ≥40px controls (study-phone-*.png). (The 2px overflow measured is the site-wide header issue with this account's long name; a fresh account measured 390 vs 390.)
  - No page or console errors in five runs.

- **Unverified:** Saving the same share link twice (whether a second copy is added); LIMITS (200 decks / 1,000 references) at the cap; spaced intervals beyond day 1 (schedule only observed as "next review 24 Oct").

- **Problems found (all low):**
  1. **LOW — A blank card counts as a card.** New deck with only the empty starter card: stats say "1 card · 0 known · 1 to review today", the list says "1 card", and Review is enabled; pressing it shows "Nothing to review today." (blank cards are filtered only at review time).
  2. **LOW — Copy/Print of a quiz includes unfinished questions.** A question with one choice is marked "Add at least two choices." and left out of the player, but "Copy as text" prints it as "3. Unfinished question with one choice / A. Only choice / Answer: A. Only choice".
  3. **LOW — No validation on reference fields.** Year "twenty" produces "Nobody (twenty). Year as letters. Source."; placeholder words "Author / Title / Source" are inserted for empty optional boxes (visible in the preview, and in a saved line if only Author+Title are filled: "… Source.").
  4. **LOW — "Finish" after a review of your own deck lands on the deck editor, not the deck list;** "Back" during a sample-deck review goes to the list. Slightly inconsistent.
  5. **LOW — The 150-card editor is one very long page** (every card is two textareas, ~20,000px on a phone) with no paging or jump; usable but heavy to scroll.
  6. **LOW — Mixed grammar in the sample heading:** the section is titled "Sample study questions" on the Cards tab although it holds a deck, and its blurb says "A short sample deck to try."

- **Promise check:**
  - "Your own flashcard decks. Mark each card I knew it or Again, and missed cards come back sooner" → **kept** (Again card returns in the same session; progress and next-due date saved).
  - "Your own quizzes with choices and a reason, and every score saved" → **kept** (reason shown after each answer; last/best/attempt count saved and shown after reload).
  - "Sample study sets to start from: an anatomy deck, and practice questions for medicine and law" → **kept** (Anatomy 8 cards; Cases and Drill 4 questions each, with review notes).
  - "One reference list for APA, MLA, Chicago and Nigerian law reports, saved A to Z, to copy or download" → **kept**.
  - "Several lab write-ups (aim, method, results, conclusion), and a formula sheet you can add to" → **kept**.
  - "With Midnry Pass: share a deck or quiz with a class or study group through a link" → **kept** (and opening is free, as the lock text says).
  - Guide lines 1–5 → **kept** (each tab works as described; "Press Review. Flip each card and say whether you knew it. Your progress is saved." matches exactly).

- **Mobile:** Good: tabs wrap to two rows, cards/quizzes stack, flashcard is a full-width tap target, quiz choices are full-width buttons, references form stacks (study-phone-references.png). Only the site-wide header wrap with a long name.

- **Suggested essential fixes:** ignore blank cards in counts/Review enablement; leave unplayable questions out of copy/print (or mark them); light validation on Year; after Finish return to where Review was started.

---

### Scratch (/apps/scratch) — Pass

- **Verdict: Ready** for what it promises ("A plain notepad"), with low-severity polish; note it is very thin for a paid tier.

- **Tested workflows (VERIFIED):**
  - Free account on `/apps/scratch` → gate page: Features / How to use boxes, "Scratch is included with midnry pass. Your account already opens all 48 free apps; the Pass adds Scratch and the other Pass tools for $5 (US dollars) a month…", buttons "Start Midnry Pass" / "Back to your apps" (scratch-desktop-free-gate.png).
  - Admin (Pass): empty state is one "Untitled" note, body placeholder "Write something. It stays with this account.", "0 words", Delete note and Copy disabled (scratch-desktop-empty.png). Load 1.6 s.
  - Type a title in "New note" → Add → note opens; body typed → "20 words", list shows title + first line, "Saved to your account". Add with an empty title creates "Untitled" (allowed). Second note; selecting notes in the list switches the editor; title and body edits save on their own (scratch-desktop-notes.png).
  - Copy → clipboard "Shopping for the clinic\n\nGloves, 2 boxes…" (title + body). Delete note → toast "Note deleted / Undo"; Undo restores it; a real delete persists after reload. Reload keeps all notes and the active one.
  - With more than 5 notes a "Search notes" box appears; "enugu" filters to "Note 3 Enugu"; no match → "No notes match."
  - 40 notes seeded via the document: list renders all 40, "Add" is disabled (cap 40). 120,000-character body → "Too large to save. Nothing was deleted: export or remove some entries." (both in the header status and a toast), "24000 words"; shortening the note saves again and the short version is what reloads (scratch-desktop-too-large.png).
  - Phone 390x844: no sideways scroll, controls ≥40px (scratch-phone-top.png, scratch-phone-full.png).
  - No page or console errors.

- **Unverified:** nothing material; the app has no export, print or sharing to test.

- **Problems found:**
  1. **LOW — Misleading size message.** "Too large to save. Nothing was deleted: export or remove some entries." — Scratch has no export and no "entries"; a notepad user needs "shorten this note or delete a note". The body has no `maxlength`, so a long paste silently stops saving until you notice the red status.
  2. **LOW — Add is disabled at 40 notes with no explanation** (no "40 notes is the most" message); the limit is not in the catalogue either.
  3. **LOW (phone) — the whole note list sits above the editor.** With 40 notes the textarea starts ~2,745px down the page; after tapping a note you must scroll past the entire list to read or type. With a handful of notes this is fine.
  4. **LOW — Brand casing:** the gate page says "included with midnry pass" (lowercase) while everything else says "Midnry Pass".
  5. **LOW — Search box only appears after 5 notes**, which is reasonable but unannounced.

- **Promise check:**
  - "Several notes on one account" → **kept** (up to 40).
  - "A title and a body for each note" → **kept**.
  - "Notes stay when you leave" → **kept** (reload and re-sign-in keep them; the size limit is the one exception, and it is shown).
  - Guide "Type a title and add the note." / "Select a note in the list to open it." / "Edit the title or the body. It saves on its own." → **kept**.

- **Mobile:** Fine for a few notes; list-above-editor layout becomes awkward with many notes (problem 3).

- **Suggested essential fixes:** notepad-specific too-large wording and a character limit on the body; a one-line "40 notes is the most" message; on phone, put the editor first or collapse the list after choosing a note.

---

## Summary

| App | Tier | Verdict | Top problem | Promises not kept |
|---|---|---|---|---|
| Writing studio (/apps/write) | free (+Pass extras) | Useful but needs improvement | HIGH: Contract mode's written summary is never saved; UI says "Too large to save. Shorten the source or the boxes." (7 pieces vs a 6-piece server cap) | "drafts are saved: what you typed and what was written" (Contract); Source material and house style tone/sign-off only act on AI drafts, and AI is off (UNVERIFIED) |
| Study space (/apps/study) | free (+Pass share) | Ready | LOW: blank card counts as a card / Review enabled; quiz copy includes unplayable questions | none |
| Scratch (/apps/scratch) | Pass | Ready (thin) | LOW: generic "export or remove some entries" size message; phone list-above-editor with many notes | none |

Site-wide: mobile header overflows by 2px and wraps "Sign out" for display names of ~14+ characters.
