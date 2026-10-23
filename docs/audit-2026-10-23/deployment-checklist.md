# Deployment verification checklist (for when this branch is released)

Nothing here has been done on the live site. This branch is **not deployed**. Use this list after
the usual release step (see `docs/HANDOVER.md`: merge into the working branch, then push to `main`;
Render rebuilds www.midnry.com). Tick each line on the live site, not on a local copy.

Legend: **[D]** can be done on a laptop browser · **[P]** needs a real phone (Android Chrome and
iPhone Safari) · **[C]** needs real credentials or a live service · **[A]** needs two accounts.
Use invented data, a test account, and delete what you create afterwards.

## 0. Before and right after the release

- [ ] [D] `git fetch origin main && git merge-base --is-ancestor origin/main HEAD` passes before pushing.
- [ ] [D] Render build finishes; the site loads; `/apps` lists the same number of apps as before (48 free, the rest Pass; this branch changes no tier).
- [ ] [D] Live files match the branch: `curl -s https://www.midnry.com/apps/invoice -o /dev/null -w "%{http_code}"` is 200; open DevTools → Sources and confirm the bundle contains "How to pay" (Invoice) and "Fill in" (kits).
- [ ] [D] Browser console on `/`, `/apps`, `/apps/invoice`, `/apps/ledger`, `/apps/dose`: no red errors.

## 1. Saving and reopening (every changed app)

For each app: make a change, see "Saved", reload, change is there; open the same app in a second tab, change it there, come back: the "changed in another tab" panel appears and nothing is overwritten.

- [ ] [D][P] **Invoice**: new invoice with two lines and 7.5% tax; "How to pay" filled under Numbering and your details; reload; the sheet shows How to pay.
- [ ] [D][P] **Ledger** (Pass account): add an expense and an income; set a budget; reload; on a phone the month total and budget sit above the form.
- [ ] [D] **Writing studio**: Contract mode, paste a few clauses, Write it, see "Draft saved", reload: all seven parts are still there.
- [ ] [D] **Apply** (Pass): paste a resume with no blank lines (as copied from a PDF), prepare: the headline sits above "Experience" in the text and PDF downloads.
- [ ] [D][P] **Kits with lists** (Menu, Stock, Bills, Farm sales, Catalog): add a row with "₦2,500", reload; try "2,5": refused with a message, nothing added.

## 2. Recovery (the two fixed risks)

- [ ] [D] **Offline then back**: open Ledger, turn the network off in DevTools (Network → Offline), add an entry: "Not saved, retrying…". Close the tab. Turn the network on, reopen Ledger: "You have unsaved changes" is offered; Keep my version saves it; reload: nothing is offered.
- [ ] [D] **Leave mid-save**: with the network set to "Slow 3G", type in the Emergency card and click "Your desk" at once; reopen: either the change is saved and nothing is offered, or it is offered back. It is never lost.
- [ ] [D] **Refresh now**: hard to trigger on purpose (it needs a tab opened before a release). After this release, a tab left open from before it may show "Midnry was updated": press Refresh now and confirm the change is offered back after the reload.
- [ ] [D] **Storage blocked**: in a private/incognito window with site data blocked (Chrome: Settings → Privacy → Third-party cookies and site data → block all for the site), type in an app and click a link at once: the "can't keep a copy" question appears.
- [ ] [D][A] **Two accounts, one browser**: leave an unsaved change offline as account 1 (as above), sign out, sign in as account 2, open the same app: nothing is offered. Sign back in as account 1: it is offered.

## 3. Exports and output

- [ ] [D][P] Invoice: Print or save as PDF; the PDF shows lines, total, How to pay and no editing boxes. On Android Chrome and iPhone Safari, the share/print sheet produces a PDF.
- [ ] [D][P] Invoice: Copy for WhatsApp, paste into WhatsApp: number, client, total, due date, bank details.
- [ ] [D] Ledger: Export CSV opens in a spreadsheet with all rows, decimals and In/out.
- [ ] [D] Writing studio: Word (.docx) download of a Contract draft (Pass) opens in Word/Google Docs with all seven parts.
- [ ] [D] Apply: PDF and text downloads; accented names (e.g. "Chidinma Ọkafọ") come out correctly.
- [ ] [D] Kits: Shifts and Orders CSV; Menu QR code image downloads and scans to the pasted link.

## 4. Phones and browsers  [P]

On a mid-range Android phone (Chrome) and an iPhone (Safari), each at normal text size and at the largest text size:

- [ ] No sideways scrolling on `/apps/invoice`, `/apps/ledger`, `/apps/dose`, `/apps/tasks`, `/apps/write`.
- [ ] Invoice: the sticky Total line stays visible while typing a line; "See the invoice" jumps to the sheet.
- [ ] Kits: number boxes open the decimal keypad; "7,5" (Android keyboards in some languages type a comma) shows the dot message.
- [ ] **Compressor** (Pass): compress a 20–30 second phone video; a playable MP4 downloads and is smaller. *Never verified on a real phone: headless Chromium here used a software encoder.*
- [ ] **Voice**: record 5 seconds with the real microphone, play it back, download it; check whether WhatsApp accepts the file as audio.
- [ ] **Aloud**: the voice reads the text (never verified: no voices in the test browser).
- [ ] Remind: the "Add to Remind" link from Bills and Visits pre-fills the box on a phone.

## 5. External services  [C]

- [ ] **AI writing** (Writing studio): with the live AI key, write in three modes; the label says the AI wrote it; the free account's count goes down by one each time; at 5 it stops with a clear message. *Never verified: no key in the test environment.*
- [ ] **Email** (Remind): invite a second account to a shared project; the invite email arrives; the morning summary arrives; a Pass account's due reminder arrives at the task's time. *Never verified: email is not connected locally.*
- [ ] **Paystack** (Midnry Pass): start, pay with a Paystack test card in test mode (or a real card on a test account), access opens; cancel; access stays to the period end. *Never verified in this audit.*
- [ ] **Study space share link** (Pass): share a deck; open the link signed out on a phone; Save a copy after signing in.
- [ ] **Database**: after the release, Render's Postgres shows no failed migrations in the deploy log (this branch adds no migrations).

## 6. Not verified anywhere yet (needs a real device or credentials)

| Area | Why not | Who/what is needed |
|---|---|---|
| The live site as a whole | Branch not deployed (by instruction) | Owner's go-ahead to deploy, then sections 0–5 |
| AI writer path and allowance | No API key in the test environment | Live site or a key in a test environment |
| Emails (invites, summaries, due reminders) | Email not connected locally | Live site |
| Paystack checkout and renewal | No payment credentials used | Paystack test mode on the live site |
| Compressor on a phone's hardware encoder | Headless Chromium only | Real Android phone and iPhone |
| Microphone (Voice), speech voices (Aloud), iPhone Safari generally | Not available in the test browser | Real phones |
| Real print dialogs | Print CSS and generated PDFs checked instead | A person printing from Chrome and Safari |
| Ledger "full" (~8,000 entries), Invoice save with 250+ invoices | Not seeded that far / not asserted | A test account with seeded data |
| Push notifications | Midnry has none (gap, not a test) | A product decision |
