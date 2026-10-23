# Next batch: Invoice and Remind (proposal, not started)

23 October 2026. This uses the audit's existing findings (`apps-invoice-ledger-split.md`,
`apps-remind.md`), the competitor research (`competitors-desk-apps.md`,
`competitor-claims-recheck.md`) and the web push research (`web-push-assessment.md`). It is a
proposal: no code has been written for it.

It changes no pricing, removes no app and merges nothing. One item (web push) needs a pricing
decision before it can be built; that decision is flagged, not taken.

## Where the two apps stand

Three separate questions, three separate answers:

| | Works correctly | Competitive on features | Preferred by real users |
|---|---|---|---|
| **Invoice** | **Yes.** Verified end to end on a production build (section 2 of `release-2026-10-23.md`). | **For its niche, yes** (Nigerian freelancers paid by bank transfer). Wave no longer sends invoices for users outside the US/Canada, and Zoho Invoice has no Nigerian gateway. Zoho's free plan still has recurring invoices, reminders and native apps that Invoice lacks. | **Unknown.** No user testing or usage data has been looked at. |
| **Remind** | **Yes**, with known edge cases (below). | **Partly.** Its feature set is broad, but it has **no phone notifications**, which every alternative has. Microsoft To Do is free with reminders. | **Unknown.** |

## Invoice: three improvements (goal: prepare, send and follow up with less effort)

### I1. Send in one tap: a PDF file straight into WhatsApp or email

- **Problem.** Today, sending means: Print → choose "Save as PDF" → find the file → open WhatsApp
  → attach it. On a phone that is five or six steps, and the print screen differs between browsers.
  The audit's phone run needed the print emulation to verify the PDF at all.
- **Workflow.** The person presses **Send**.
  - The phone's share sheet opens, holding `Invoice 0002 – Okafor Foods.pdf` and the WhatsApp
    message text (already built by "Copy for WhatsApp").
  - They pick WhatsApp or email and send.
  - The invoice is marked **Sent today** automatically, with an Undo.
  - Where the browser cannot share files, Send downloads the PDF and copies the message instead,
    and says so.
- **Acceptance criteria.**
  - The PDF is generated on the device and matches the on-screen sheet: lines, tax, total, How to
    pay and the number. This is checked by a test reading the PDF text, as the release check does
    now.
  - The file name has the number and the client's first line.
  - The share sheet appears on Android Chrome and iPhone Safari. **Real devices are required**,
    and the device must report that it can share files.
  - The status changes to Sent only after the share sheet reports success. Cancelling changes
    nothing.
  - The fallback works on desktop Chrome and Firefox.
- **Dependencies.**
  - PDF generation in the browser. `pdf-lib` is already a dependency, used by Apply, but the
    invoice layout must be drawn with it.
  - The browser's Web Share API for files, used only when available.
  - No server change, no data change, no cost.

### I2. Follow up: a "Needs follow-up" list and a polite reminder message

- **Problem.** The list shows Overdue badges, but nothing helps the person act on them. Chasing
  payment is the most awkward part of invoicing, and Zoho's free plan does it automatically.
- **Workflow.**
  - The Invoices tab gains **Needs follow-up**: sent invoices that are overdue or due within
    3 days, most overdue first.
  - Each row has **Copy reminder**, a polite message with the number, amount, days overdue and
    How to pay, ready for WhatsApp.
  - Each row also has **Remind me**, which opens Remind with "Follow up invoice 0002 with Okafor
    Foods tomorrow 9am" already typed, using the existing `?add=` link. The person still presses
    Add.
  - Marking the invoice paid removes it from the list.
- **Acceptance criteria.**
  - The list matches the due-date rules already used for the Overdue badge (unit tests over
    "today" boundaries and time zones).
  - The message contains no other client's data.
  - The Remind link pre-fills and is parsed to the right date and time.
  - The list works with 250+ invoices, as in the audit's large-list test.
- **Dependencies.** None beyond existing code. It links the two flagship apps without merging
  them.

### I3. Prepare faster: "Invoice again" and saved line items

- **Problem.** Repeat clients (rent, retainers, monthly services) mean retyping the same lines.
  The audit noted recurring invoices as an essential gap against Zoho.
- **Workflow.**
  - From any past invoice, **Invoice again** creates the next number for the same client, with
    the same lines and tax. The dates are today and today plus the old payment gap.
  - The new invoice opens for review; nothing is sent automatically.
  - Lines can be **saved as items** ("Monthly bookkeeping – ₦45,000") and picked from a list when
    adding a line.
  - A true "repeat every month" schedule is left for later. It needs a scheduler (see R1) and a
    decision on whether invoices may be created without the person present.
- **Acceptance criteria.**
  - The copy has a new number, today's date and the original gap.
  - Paid status, the paid date and the PAID stamp are not copied.
  - The saved-items list survives reload and is capped at 100 with a message.
  - The document stays within the existing size limit (checked with 250 invoices + 100 items).
- **Dependencies.**
  - Uses the existing Duplicate code.
  - One new optional field in the Invoice document (`items`). Old code would ignore and drop it on
    save, which matters for any rollback; the same note applies as for "How to pay".

*Considered and left out of this batch:* a Paystack payment link on each invoice. The money would
go to Midnry's Paystack account, not the freelancer's. Doing this properly needs each person's own
Paystack account and keys, which is a much larger compliance and support question.

## Remind: three improvements (goal: dependable reminders, clear repeats, easy everyday use)

### R1. Dependable reminders: make today's reminders reliable first, then add phone notifications

- **Problem.** Remind has no phone notifications, the decisive gap against Todoist, Microsoft To
  Do and TickTick.
  - Today a task's time produces **an email, for Pass accounts only**.
  - It depends on an outside scheduler calling `/api/remind/tick`. Nothing in the repository
    records whether that scheduler is configured in production.
  - The free Render database expires 30 days after creation (Render's documentation).
- **Assessment** (`web-push-assessment.md`, official sources):
  - **Support.**
    - Android Chrome, Samsung Internet and Firefox for Android receive web push even when the
      browser is closed.
    - **iPhone only after "Add to Home Screen"** on iOS 16.4 or later. Midnry's manifest already
      allows this and names the app "Midnry".
    - **Opera Mini and in-app browsers cannot receive push at all**, so email must stay as the
      fallback.
  - **Permission.**
    - It may only be asked after a tap. If the person blocks it, the site cannot ask again.
    - Chrome now gives quieter prompts and may revoke permission for little-used sites.
  - **Delivery.**
    - Best effort. Android battery saving can delay normal messages, so reminders must be sent as
      high urgency with a short lifetime.
    - Payloads must be small (under about 2 KB).
    - iPhone never tells the site when a subscription changes, so the app must re-register each
      time it opens.
  - **Operating cost.**
    - Sending pushes is free: Google's service is "No-cost", and Apple needs no developer
      membership. Mozilla's pricing is unverified.
    - The cost is the clock.
      - **$0:** an outside free scheduler (cron-job.org) calling the existing tick. It is
        fragile, and is possibly what runs today.
      - **About $1–7 a month:** a Render Cron Job.
      - **$7 a month:** an always-on server.
      - **Plus $6 a month** for a database that doesn't expire. That is needed regardless of push.
    - Recommended: **about $7–13 a month**.
  - **Maintenance.** The common `web-push` library had its last release in January 2024. The
    protocol (VAPID, RFC 8292) is small enough to implement with Node's built-in crypto if
    needed.
- **Workflow.**
  - On a task with a time, the person taps **Remind me on this phone**. Only then does the browser
    ask permission.
  - On an iPhone in Safari, the button explains Add to Home Screen instead of asking.
  - At the task's time the phone shows "Pay rent – 9:00". Tapping it opens the task, with **Done**
    and **Snooze 1 hour** buttons.
  - **Settings → This phone** shows On, Off or Blocked, and has **Send a test notification**.
  - Signing out removes the phone's subscription.
- **Acceptance criteria.**
  - On a real Android phone with Chrome closed, 19 of 20 test reminders arrive within 2 minutes
    of the time. None arrives twice: the existing "claim" table that stops duplicate emails is
    reused.
  - On an iPhone home-screen app the same test passes, at least 9 of 10.
  - A blocked permission is shown, with how to unblock it.
  - Opera Mini users see that this phone cannot get notifications and are offered email.
  - The subscription belongs to the signed-in account and is removed at sign-out.
  - It never sends to another account's device. This is tested the same way as this release's
    account-switch check.
- **Dependencies and decisions (yours).**
  1. **Who gets phone reminders?** Today exact-time email reminders are a Pass feature. Push could
     be free, Pass-only, or free for a few tasks a day. This is a **pricing decision** and is not
     taken here.
  2. **The clock:** confirm whether cron-job.org (or anything) calls the tick today, and choose
     between $0 fragile and about $1–7 reliable.
  3. **The database plan:** confirm it is not the expiring free one.
  4. Then build: VAPID keys as environment variables, a `push_subscriptions` table (one
     migration), a service worker (none exists for the site today), the Settings panel, and
     sending inside the existing tick.

### R2. Clear repeat-task behaviour

- **Problem.** The audit found three ways a repeat or date silently does something unexpected:
  - A custom weekly repeat keeps a due date that is not one of its days ("Sunday ↻ Every Tuesday
    and Friday").
  - A past date such as "30/9" jumps to next year without saying so.
  - "Weekend market shopping this weekend" loses its first word.
- **Workflow.**
  - While typing, the add box shows a plain preview: **"Next: Tue 27 Oct, then every Tue and
    Fri"**.
  - The due date always lands on the first matching day.
  - A date in the past asks: "30 Sep has passed. Use 30 Sep 2027 or today?"
  - Finishing a repeating task says **"Next one: Fri 30 Oct"** with Undo.
  - Words that are part of the title are never taken as dates unless they read as a date
    expression.
- **Acceptance criteria.**
  - A table of at least 30 real phrases, each with the expected title, date, time and repeat, as
    unit tests (Nigerian phrasing included: "every 25th", "month end", "Friday by 5").
  - No silent year jump.
  - The repeat preview and the task row always agree.
  - Completing a repeat shows the next date.
- **Dependencies.** The parser and the repeat code only (`src/lib/remind/`). No data change.
  Existing tasks are untouched; only new edits re-snap.

### R3. Easy everyday use on a phone

- **Problem** (from the audit):
  - Editing a task's date or project in Today or Inbox removes the row and closes the panel
    mid-edit, with no message.
  - On a phone, the hero and guide push the first task below the fold.
  - "Share" turns a personal project into a shared one with no confirmation and no way back.
  - Two different things are called "Board".
- **Workflow.**
  - The detail panel stays open after an edit that moves the task. A note says where it went
    ("Moved to Upcoming"), with a link.
  - For returning users, the intro and guide fold away so today's tasks are the first thing on
    screen.
  - Share asks first and says what it does.
  - The Pass card board is renamed **Card board**; its links and saved data are unchanged.
- **Acceptance criteria.**
  - On 390×844 (and on a real Android phone), the first task is visible without scrolling for an
    account that has used Remind before.
  - Editing in Today never closes the panel.
  - Share cannot happen without confirming.
  - One word, "Board", means one thing.
- **Dependencies.** UI only. The catalogue wording changes for the rename, which needs your
  approval as product text but not as a pricing change.

## Keeping the experience focused

The strongest apps are **already the easiest to find**:

- The home page's "Three apps to begin with" leads with Remind and Invoice.
- The hero demo shows Remind, Invoice and Ledger.
- The goal cards start with "Organise my day" and "Send an invoice".

Smaller utilities stay reachable through search, "Browse by who it's for" and the full list. The
approved branding is unchanged.

**One suggestion, for your decision:** the third home pick is **Cycle**. The review found it works
but has no reminders, so it is not competitive (`ready-apps-competitiveness.md`). Showing
**Study space** there instead would point new visitors to a stronger app. Either way, it is a
one-line change in `src/components/home-start.tsx`, and nothing is removed.

## Recommended first batch (small)

| # | Item | Why first | Size |
|---|---|---|---|
| 1 | **I1 Send in one tap** | Removes the most steps from the core Invoice job; no server, data or cost | Medium |
| 2 | **I2 Needs follow-up** | Turns Overdue badges into action, and connects Invoice to Remind with existing links | Small |
| 3 | **R2 Clear repeats** | Fixes silent surprises in the most-used Remind feature; tests make it safe | Small–medium |
| 4 | **R3 panel stays open + Share confirmation** (the two medium audit findings) | Everyday friction; UI only | Small |

**Not in the first batch, pending your decisions:**

- **R1 phone notifications:** who gets them (pricing), the clock and the database plan.
- **I3 Invoice again:** it adds a data field. It is better after this release has settled, and
  needs the same rollback note.
- **The rest of R3:** the fold-away intro and the Board rename.

Each item ships with unit tests and a browser check at laptop and phone size. Each is verified on
a production build, as in this release, and on real phones where the item depends on them (I1,
R1).
