# Next batch: ready for review, NOT released (23 Oct 2026)

These changes are prepared and tested for review. **None is live**, and none is merged into
`main`. The 23 Oct "deploy" covered release `2a2240d` only, so these need a new approval.
Phone notifications, pricing, app removals and mergers are not part of this batch.

## Branches

All start from `game-look` (`e10dbd6`, which is the live code plus docs).

| Branch | Commits | Contents |
|---|---|---|
| `next/invoice-follow-up` | `76a7a11` | Invoice: Needs follow-up |
| `next/remind-repeats-and-editing` | `821d09d`, `844fb45` | Remind: clearer repeats, panel stays open, Share asks first |
| `next/invoice-pdf-share` | `eaaa29b` | Invoice: Share PDF (**separate change**, review on its own) |
| `next/batch-combined-check` | `eee83ff` (merge of the three) + `a908180` (QA script) | For testing only: proves the three merge cleanly and work together. Not for release as-is. |

## What each change does

**Invoice: Needs follow-up** (`76a7a11`)

- What it lists:
  - The Invoices tab shows sent invoices that are overdue or due within 3 days, most overdue
    first, using the same rule as the Overdue badge.
  - Drafts and paid invoices are left out. Searching hides the section.
- **Copy reminder** copies a polite message.
  - Content: the number, amount, due date, days late and How to pay.
  - It uses only that invoice's details. A test checks that another client's name, number,
    amount or address never appears.
- **Remind me** opens Remind with "Follow up invoice 0002 with Okafor Foods tomorrow 9am" typed.
  - Nothing is added until the person presses Add.
  - If Remind would cut up the client's name (e.g. "Tomorrow Ventures", "Lagos #1 Prints"), the
    text uses the invoice number alone.
- **Mark paid** removes the invoice from the list.
- No change to saved data.

**Remind** (`821d09d`, `844fb45`)

- **Repeat preview.** The add box shows the next date and the repeat, e.g. "Next: Tue 27 Oct,
  then every Tue and Fri".
- **Weekly repeats start on a matching day.**
  - A custom weekly repeat moves the date to the first matching day.
  - This also happens when the repeat is set or changed in the task panel.
  - Tasks already saved are not rewritten.
- **A date that has passed this year.** "30/9" typed on 23 Oct stays next year, as before, but now
  says so: "Thu 30 Sep 2027 — next year", and a toast after Add.
  - *Why not a choice?* It keeps birthdays and other yearly dates typed without a year working,
    with no extra step. Typing the year still picks this year.
- **Finishing a repeating task** says "Next one: Fri 30 Oct", with Undo.
- **Title words kept.** "Weekend market shopping this weekend" keeps "Weekend".
- **New phrases:** "month end", "every month end", "Friday by 5" (1–7 means pm).
- **Task panel stays open while editing.** Changing a task's date or project no longer closes the
  panel. It says "Moved to Upcoming" or "Moved to <project>" and offers a way to go there.
- **Share asks first.** It says plainly that the project becomes shared, that this cannot be
  undone, and that members can change and delete its tasks.
- **Clearer delete confirmations.** Deleting a shared project says its tasks are deleted for
  everyone and cannot be recovered. Leaving a project says the tasks stay with the others.
- **Behaviour change to note:** in the calendar link, a monthly repeat on the 31st now means "last
  day of the month", so shorter months are no longer skipped.

**Invoice: Share PDF** (`eaaa29b`, separate)

- **The PDF.** The PDF is made on the device, with no upload. It has the same contents as the
  invoice sheet, and ₦ and accented names render.
  - The file name is "Invoice 0002 – Okafor Foods.pdf".
- **Where sharing works:** the phone's share sheet opens with the PDF and the WhatsApp message.
- **Sharing is not delivery.** The invoice is never marked Sent or "delivered" because the share
  sheet opened or closed.
  - After a share it asks "Shared. Did you send it? [Mark as sent] [Not yet]".
  - Only **Mark as sent** changes the status, and it can be undone.
- **Cancel** changes nothing and says "Not shared."
- **Where sharing is not supported or fails:** it downloads the PDF and copies the message, and
  says so ("PDF downloaded and message copied. Attach the PDF in WhatsApp or email."). The status
  does not change.
- It is disabled, with the reason shown, when the invoice has an error (same rule as Print).
- The PDF code loads only when needed, so the invoice page does not get heavier.
- **Design change from the original proposal:** the proposal marked the invoice Sent
  automatically after a share. That was dropped, following your rule.

## Test results

| Check | Where | Result |
|---|---|---|
| Typecheck | combined branch | clean |
| Full unit suite (`npm test`) | `e10dbd6` vs combined | 751 → 775 tests. The **same 17 legacy failures** before and after (auth-template, app-env and og-skill tests). No new failures; 24 new tests pass. |
| Unit: Invoice follow-up / workflow / PDF / Apply PDF / Remind merge | combined | 50/50 |
| Unit: Remind parser and repeats (incl. a 40-phrase table) | combined | 13/13 |
| Lint on the 18 changed files | combined vs `e10dbd6` | Unchanged: the one existing error in `resume-pdf.ts`. No new problems. |
| Production build (`build:render`) | combined | passes |
| Browser: follow-up (dev server) | `76a7a11` | 16/16 laptop, 17/17 phone-sized |
| Browser: Remind batch (dev server) | `844fb45` | 72/72, both sizes |
| Browser: Remind batch (**production build**) | combined | 72/72, both sizes |
| Browser: Share PDF, four outcomes (dev server) | `eaaa29b` | 118/118, both sizes |
| Browser: Invoice changes (**production build**, `next-batch-build.mjs`) | combined | 10/10 laptop, 10/10 phone-sized |
| Browser: existing release checks (**production build**) | combined | 10/10 laptop, 11/11 phone-sized |
| Page errors | all browser runs | none |

**Environments:**

- **Dev runs:** Vite dev server, local in-memory database.
- **Production-build runs:** `npm start` on the combined build, local PostgreSQL 16, all 25
  migrations applied.
- **Browser:** headless Chromium at 1280×900 and a 390×844 touch viewport. That is phone-sized
  Chromium, **not a real phone**.
- **Data:** synthetic `@example.test` accounts only. No live data was touched.

**Simulated, not verified:**

- **The share sheet.** Headless Chromium has none, so `navigator.share` was replaced in four
  ways: success, cancel, NotAllowedError and unsupported. Everything around it is real: the PDF
  bytes (read back and checked), the download, the copied text and the saved status.
- **Real phones.** Before release, check Share PDF on iPhone Safari (and on Android once a device
  is available):
  - the share sheet opens with the PDF;
  - WhatsApp and email receive the file (some apps drop the text when a file is attached);
  - Cancel changes nothing.

**Not covered:**

- Board and Month layouts with a task panel open were not driven in a browser.
- Changing a repeating task's date by hand does not snap the date. This is by design.
- The list's day headers keep their old date style ("Sat, Oct 31").

## Suggested release order (when you decide)

1. **Follow-up and Remind together.** Both have no data change, and both pass on a production
   build.
2. **Share PDF on its own**, after a real-phone check on a preview.

Each needs your explicit go-ahead. Rollback for any of them is reverting its merge, with no data
to undo.

## How to rerun

```sh
npm test
node --test scripts/invoice-follow-up.test.mjs scripts/invoice-workflow.test.mjs scripts/invoice-pdf.test.mjs
node --experimental-strip-types --test src/lib/remind/remind.test.ts
sh scripts/qa/dev-up.sh   # dev server on :8080
node scripts/qa/invoice-follow-up.mjs; node scripts/qa/invoice-follow-up.mjs screenshots/qa/invoice-follow-up mobile
QA_BASE=http://127.0.0.1:8080 node scripts/qa/remind-batch.mjs
QA_BASE=http://127.0.0.1:8080 node scripts/qa/invoice-pdf-share.mjs
# production build: VITE_AUTH_ENABLED=true NITRO_PRESET=render npm run build:render, then npm start with DATABASE_URL, then
QA_TARGET=build QA_BASE=http://127.0.0.1:8081 node scripts/qa/next-batch-build.mjs [outdir] [mobile]
```
