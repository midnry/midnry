# Money group audit — Invoice, Ledger, Split

Auditor: product QA (read-only on code). Server: http://127.0.0.1:8080 (dev, PGLite), account qa-admin@example.test,
browser locale en-NG / Africa/Lagos (so the currency guess is NGN). Desktop 1280x900, phone 390x844 (and 360x740 for Invoice).
Screenshots: /home/user/midnry/screenshots/audit/money/ (raw logs: invoice-desktop-log3.txt, invoice-mobile-log.txt,
ledger-log.txt, split-log.txt, followup-log.txt in the same folder; scripts in the scratchpad folder money/).
No page errors or console errors were recorded in any run (all three apps, desktop and mobile).

---

### Invoice (/apps/invoice) — tier free

- **Verdict: Ready** (a handful of medium/low issues below; nothing blocks the main task).

- **Tested workflows (VERIFIED)**
  - Fresh account: /apps/invoice opens straight onto a blank invoice `0001` (no list, no import notice). The page shows
    "No total yet. Add at least one line item." and "Print or save as PDF" is disabled until a line exists. `invoice-01-fresh-desktop.png`
  - Invoice 1 (NGN): From = Synthetic Studio Ltd (4 lines), Bill to = Amaka Okafor / Okafor Foods, 3 lines
    (350,000 x1; 25,000 x2; 180,000 x1), tax 7.5, due 2026-11-15, payment note. Sheet shows Subtotal ₦580,000.00,
    Tax 7.5% ₦43,500.00, **Total ₦623,500.00** (correct). "Save “Amaka Okafor” as a client" added the client. `invoice-02-invoice1-filled-desktop.png`
  - Print: with print media emulated the form, tabs and site header are hidden and only the sheet is shown at full width
    (`invoice-03-invoice1-print-media.png`). `page.pdf()` produced a 1-page A4 PDF (`invoice-04-invoice1.pdf`, rendered as
    `invoice-04-pdf-render-1.png`); the extracted text contains the number, both parties, all three lines, subtotal, tax, total,
    the note and "Amounts in Naira (NGN)", and none of the editor text ("Line items", "New invoice", "Numbering"...). On the
    phone the same PDF route works (`invoice-m02-print-mobile.png`, `invoice-m03-mobile.pdf`).
  - "New invoice" → `0002`, From remembered. Saved-client dropdown fills Bill to (name, email, address). Invoice 2 in USD with
    qty 1.5 x 1,200 + 1 x 10 + 2 x 50 = **$1,910.00**. Status select → Sent (badge "Sent"). `invoice-07-invoice2-sent.png`
  - Invoice 3 (NGN, issued 2026-09-01, due 2026-09-30, Sent) shows the badge **Overdue** and "Due 2026-09-30" in red.
  - Invoices list: "3 invoices · 3 unpaid · 1 overdue"; badges Sent / Draft / Overdue; "Mark paid" from the row → "Paid" and
    "paid 2026-10-23"; summary becomes "3 invoices · 2 unpaid". Opening it shows the stamp "PAID 2026-10-23"; the "Paid on"
    date can be changed (saved as 2026-10-20); switching Paid → Sent removes the stamp and the invoice goes back to Overdue. `invoice-08-list-desktop.png`
  - Search (all PASS): "amaka", "okafor", "0002", "623,500", "623500", "1910", "₦107,500", "Onitsha", "pharma"; "nobody" → "No invoice matches “nobody”."
  - Numbering: "Numbering and your details" → prefix `SSL-` and "Start numbering at" 100 → hint "The next invoice will be
    SSL-0100."; the next invoice was `SSL-0100`, then `SSL-0101`. The quote prefix (`Q-`) has its own field. `invoice-09-numbering-settings.png`
  - Quote Q-0001 (NGN, 2 lines, 7.5%, valid until 2026-11-30, note) → **₦129,000.00**; status Accepted; "Convert to invoice" →
    invoice `SSL-0102` with lines, tax, client and notes copied, total identical, "Made from quote Q-0001." link, and a
    notice "Invoice made from the quote. Lines, client and tax were copied; the quote is kept and linked." The quote row then
    shows "Invoiced" and a button "Invoice SSL-0102". `invoice-10-quote-desktop.png`
  - Proposal "Website refresh for Nwosu Pharmacy" (client, need, work lines `Design: 3 pages - 150000 / Hosting set-up - 20000 /
    Product list page: 2 x 40000 / Training session`, price, next step) → "Make a quote from this" → Q-0002 with the four
    lines parsed as 1 x 150000, 1 x 20000, 2 x 40000 and "Training session" 1 x (blank rate, flagged "Line 4: Enter a rate.",
    Convert disabled until filled). After filling 30000 + 7.5% the quote is ₦301,000.00 and converted to invoice SSL-0103 with
    the same total. `invoice-11-proposal-desktop.png`, `invoice-12-quote-from-proposal.png`
  - Clients tab: add via form (Emeka Traders), "New invoice" from a client row pre-fills Bill to; "Remove client" shows
    "Client Amaka Okafor removed. Invoices and quotes keep their details." with Undo (worked). `invoice-13-clients.png`
  - Delete + Undo: list delete asks "Yes, delete", shows "Invoice 0002 deleted. Undo Dismiss"; Undo restored it intact.
    Proposal delete + undo also worked.
  - Reload: tabs read "Invoices (7) / Quotes (2) / Proposals (1) / Clients (2)", the last-opened invoice reopens, all data present. `invoice-14-list-after-reload.png`
  - Large data: seeded 250 extra invoices (257 total, 143 KB document). List rendered in 1.6 s with 257 rows, summary
    "257 invoices · 172 unpaid · 166 overdue", search "Zainab" filtered to 41 rows in 0.27 s, no "close to the saving limit"
    warning (14 % of the limit), next number computed correctly (SSL-0450). `invoice-15-list-256.png`
  - Invalid input (exact on-screen text): qty "1,5" → "Line 1: Use a dot for decimals, e.g. 1.5"; rate "-200" → "Line 1: Rate can’t
    be negative."; rate "abc" → "Line 1: Rate must be a number, like 2 or 1.5."; tax "7,5" → "Use a dot for decimals, e.g. 7.5";
    tax "-5" → "Tax can’t be negative."; tax "150" → "Tax can’t be more than 100%."; description without qty/rate → "Line 3: Enter a
    rate." In every case the sheet says "No total yet. Fix the highlighted field to print..." and Print is disabled.
    "1,200" is accepted as one thousand two hundred. A fully empty extra line is ignored. Description capped at 120 chars. `invoice-05-invalid-qty-comma.png`
  - Mobile 390x844 and 360x740: no horizontal overflow on editor, list, quotes, proposal editor, numbering panel or print
    view; a full invoice (Zainab Bello, 3 x 12,500) typed on the phone saved and totalled ₦37,500.00. `invoice-m01-editor-mobile.png`,
    `invoice-m04-list-mobile.png`, `invoice-m05-quotes-mobile.png`, `invoice-m06-proposal-mobile.png`, `invoice-m07-new-invoice-mobile.png`

- **Unverified**
  - Adding an invoice while 257 are present: the list rendered and the new number was assigned, but the save was not
    confirmed (my check used the wrong expected count); likely fine, not proven.
  - The real browser print dialog (only `window.print` being called and the print CSS / page.pdf output were checked).
  - The old-Quote/old-Proposal import path (no legacy documents on this account; covered by scripts/qa/invoice-workflow.mjs).

- **Problems found**
  1. **Medium — notes and tax bleed from one client's invoice into the next.** A new invoice copies the *notes and tax rate of
     the latest invoice*. After converting the Nwosu Pharmacy quote (whose notes came from the proposal's "Next step"), the next
     invoice for Emeka Traders — made from the Clients tab — came out with the note "Reply to confirm and we start Monday." and
     7.5 % tax, and that text is on the printed PDF (`invoice-m03-mobile.pdf`, `invoice-m01-editor-mobile.png`). A new quote also
     inherited the same note. Likewise invoice 0002 (USD, after an NGN invoice) started at 7.5 % tax silently. The carry-over is
     deliberate (payment details) but it also carries client-specific text; "Issued" is the only thing the user is told resets.
  2. **Medium (mobile) — the total is far below the form.** On a phone the editing form is ~1,465 px tall and the sheet with
     the total starts at ~2,076 px; the user cannot see the total while typing lines (`invoice-m01-editor-mobile.png`).
  3. **Low — duplicate numbers are accepted silently.** Typing `0001` as the number of SSL-0105 shows no warning and Print stays
     enabled; two invoices then share a number (the counter still moves on correctly).
  4. **Low — a declined quote can still be converted.** With "Quote status: Declined" the "Convert to invoice" button stays
     enabled.
  5. **Low — proposals with the same title are indistinguishable.** The Proposals list shows only title and client, no date; two
     "Website refresh for Nwosu Pharmacy" rows looked identical (`followup` run). Proposal/quote "Delete" and "Yes, delete"
     buttons in the lists also lack an accessible name with the item (invoice rows have one).
  6. **Low — search does not cover line descriptions** ("landing page" → "No invoice matches"). The placeholder says "client,
     number or amount", so this is consistent, just worth knowing.
  7. **Low — sticky header shows mid-page in full-page screenshots** (`invoice-05…png`): a capture artefact, not a product bug,
     but the header is `position: sticky` over the form on desktop.

- **Promise check (catalogue features / guide)**
  - "Line items, quantities and tax, added up in the currency you choose" → **kept** (NGN and USD, 7.5 % VAT, rounding note).
  - "Every invoice kept, numbered in order with a prefix you can change, and searchable by client, number or amount" → **kept**.
  - "Draft, sent and paid with the date paid; unpaid invoices past their due date show as overdue" → **kept**.
  - "Quotes with line items that turn into an invoice without retyping" → **kept**.
  - "Simple proposals for a job that become a quote" → **kept** (lines parsed from "The work", missing rates flagged).
  - "Saved clients you pick instead of typing them again" → **kept**.
  - "A clean page to print or save as a PDF, on a phone or a computer" → **kept** (print CSS + PDF checked on both).
  - Guide lines 1–6 → all **kept**; "Check the total, then print it" is harder on a phone (problem 2).

- **Mobile:** no overflow at 390 and 360; tap targets are 44 px except the site header's "Sign out" (53x22) and "Skip to
  content"; the four tabs wrap to two rows; the preview sheet puts qty x rate under the description (fine). Main issue: total
  far below the form (problem 2).

- **Suggested essential fixes**
  - Do not carry notes (or at least not quote/proposal-derived notes) and tax onto a new invoice for a *different* client, or
    show "Copied from your last invoice" with a clear-control; keep the From block only.
  - On phones, show a sticky "Total ₦…" line (or move the totals above the form).
  - Warn on a duplicate invoice number; disable Convert on a declined quote; show a date on proposal rows.

---

### Ledger (/apps/ledger) — tier pass

- **Verdict: Useful but needs improvement** (all promised features work; the phone layout hides the bar/budget and the
  add form has a date trap).

- **Tested workflows (VERIFIED)**
  - Fresh: form (What, Amount, Category, Date, Money in or out, "Add expense"), month nav "October 2026", "Nothing logged yet.
    Add your first expense above.", aside "Spent this month ₦0.00", "Categories show up once this month has an expense.",
    budget field, currency. Export CSV is hidden until there is an entry. `ledger-01-fresh-desktop.png`
  - Added 20 entries through the UI across October and September 2026 (salary x2, market, danfo, Ikeja Electric, MTN, pharmacy,
    Shoprite 22,750.50, rent, freelance logo job, cinema, airtime, suya, Uber, generator fuel, DSTV, charger, gift, hospital).
    All 21 (with a "Fuel ₦1,500.50" from the invalid-input pass) saved; "Saved to your account" shown. October aside:
    "Spent this month ₦249,751.00 · Money in: ₦530,000.00" with per-category bars (Home ₦150,000 the longest); September:
    "Spent in September 2026 ₦119,200.00 · Money in ₦450,000.00". Income rows show "+₦80,000.00" in green with "Money in · date".
    "Next month" is disabled on the current month. `ledger-03-october-desktop.png`
  - Monthly budget 250000 → "₦249.00 left of ₦250,000.00" (correct); 200,000 → "₦49,751.00 over your ₦200,000.00 budget" in red. `ledger-04-budget-bar.png`
  - Edit: "Edit" fills the form (amount shown as 3500.00, button "Save changes"), changed to 4500 and saved. Remove shows a toast
    "Entry removed · Undo"; Undo restored it.
  - CSV: `ledger.csv`, header `Date,What,Category,Amount,In or out`, 21 rows, decimals kept (`22750.50`), commas quoted
    (`"Market: rice, oil, tomatoes"`), In/Out column correct (`ledger-export-20.csv`).
  - Reload: same entries, month back on October, budget field kept.
  - Budget view (tab and `?view=budget`): "Income ₦530,000.00 / Costs ₦250,751.00 / Left ₦279,249.00", budget bar, quick-add
    "+ Money in" (saved as category Income, flow in) and "− Money out" (category Other), income and cost columns with Remove,
    Export CSV. `ledger-05-budget-view-desktop.png`
  - Pocket view (`?view=pocket`): large "Money in / Money out / Left" tiles, big quick-add, "Latest" 8 entries with +/−. `ledger-06-pocket-view-desktop.png`
  - "Bring my entries": seeded old Budget rows (Salary 300,000 Income; Rent ₦120000 Cost; "7,5" Cost; a nameless 500) and Pocket
    rows. Banner: "You have 4 entries saved in Budget, which is now a view inside Ledger. Bringing them in copies the 3 not yet
    copied into Ledger, dated today. The Budget originals are kept as they are." Button copied Salary (in), Rent, "Budget line"
    (500) dated today, category Other; then "Copied 3 entries from Budget into Ledger. Your Budget entries are still saved,
    unchanged." The old Budget document was byte-identical afterwards; Pocket likewise; after a reload the banner is gone and
    nothing is copied twice. `ledger-07-import-banner.png`, `ledger-08-after-import.png`
  - Large data: seeded 600 more entries (Apr–Oct 2026, 1 in 15 income) → 630 entries. Page loaded in 1.5 s, October list 144 rows,
    aside and budget bar correct, month switch 0.1 s, "After bulk" entry added and saved, **CSV 631 lines for 630 entries**, no
    "nearly full" warning (document far under the limit). Pocket view fine. `ledger-09-bulk-october.png`
  - Invalid input (exact text): empty submit → "Add a short description."; label but no amount → "Enter an amount like 12.50.";
    "12,50" → "Use a dot for decimals, e.g. 12.50"; "1,5000" → "Use a dot for decimals, e.g. 7.5. Commas can only separate
    thousands, like 1,500."; "-500", "abc", "1e5", "12.345", "100000001", "500 naira" → "Enter an amount like 12.50."; blank
    date → "Pick a date."; "1 500" and "₦1,500.50" accepted; label capped at 80 chars. Quick-add "abc" → "Enter an amount like
    500 or 12.50." `ledger-02-invalid-amount.png`
  - Mobile: no horizontal overflow on Ledger, Budget and Pocket; an entry added from the phone saved. `ledger-m01-ledger-mobile.png`,
    `ledger-m02-budget-mobile.png`, `ledger-m03-pocket-mobile.png`

- **Unverified:** the "ledger is full" state (~8,000 entries) — not seeded; behaviour with the server save failing.

- **Problems found**
  1. **Medium (mobile) — the "bar of where the month went", the monthly total and the budget field sit below the entire month's
     list.** At 390 px the aside starts at y≈10,250 of an 11,850 px page with 144 October rows, and below ~15 rows even with
     20 entries; a phone user never sees "Spent this month" or the bars without scrolling past every entry (`ledger-m01-ledger-mobile.png`).
  2. **Medium — Date and Category stay on the last value after adding.** After logging "Hospital test" dated 2026-09-25, the form
     still shows 09/25/2026 and "Health" while the list has jumped to September; the next quick entry is silently back-dated
     (`ledger-03-october-desktop.png`). What/Amount are cleared, Date/Category are not.
  3. **Medium-low — "Income" is a Category *and* there is a "Money in or out" selector.** Picking category Income with "Money out"
     saves an expense labelled "Income · 2026-10-23" that is counted in "Spent this month" and gets its own "Income" bar in
     "where the month went" (`followup-log.txt`). Quick-adds use category Income + flow in, so the two mean different things.
  4. **Low — zero amounts are accepted:** "0" adds a ₦0.00 entry with no message.
  5. **Low — the budget field ignores bad input silently:** "abc", "-5000", "0" show no hint and no bar ("1,5" does show "Use a
     dot for decimals, e.g. 1.5").
  6. **Low — skipped import rows are not mentioned.** With 4 old Budget rows, one unreadable ("7,5"), the banner says "copies the
     3 not yet copied" (implying one was already copied) and the result says "Copied 3 entries"; nothing says one was skipped.
     Imported income gets category "Other" rather than "Income".
  7. **Low — Edit/Remove buttons are 36 px tall** on the phone (42x36 / 70x36); everything else is ≥44 px.
  8. **Low — negative amounts get the generic message** "Enter an amount like 12.50." (Invoice says "can’t be negative").

- **Promise check**
  - "An expense line with a category, or money in" → **kept** (but see problem 3).
  - "A bar of where the month went, and a monthly budget" → **kept** on desktop; **partly** on phones (problem 1).
  - "Budget view: income against costs for the month, and what is left" → **kept**.
  - "Pocket view: money in, money out, and what is left, in large type" → **kept**.
  - "Bring in your entries from Budget and Pocket in one click; the originals are kept" → **kept** (one click per source).
  - "The log stays with your account, and exports as CSV" → **kept** (reload + 631-line CSV).
  - Guide: "Use the bar to see which category took the most" → **kept** (desktop; hidden far down on phones).

- **Mobile:** no overflow; form fields full width and 44 px; tabs fine; Pocket's large tiles read well. The month summary/bars
  live below the list (problem 1); Edit/Remove slightly small.

- **Suggested essential fixes**
  - On narrow screens put the month total + bars (collapsible) above the list, or at least above the form.
  - Reset Date to today (and category to the default) after an add, or show the date beside the Add button.
  - Remove "Income" from the expense categories (derive it from "Money in") and refuse ₦0.
  - Report skipped rows in the import banner; show a hint for an unreadable budget.

---

### Split (/apps/split) — tier pass

- **Verdict: Ready.**

- **Tested workflows (VERIFIED)**
  - Fresh: amount empty, People 2, Tip 18, result "Each person —  Enter an amount, a headcount, and a tip.", "Copy the split"
    disabled. Hints "Before tip." and "Between 1 and 100." under the fields. `split-01-fresh-desktop.png`
  - 84.20 / 2 / 18 % → ₦49.68 each, Tip ₦15.16, Total ₦99.36. 84.20 / 3 / 10 % → "2 people pay ₦30.87. 1 person pays ₦30.88.",
    Tip ₦8.42, Total ₦92.62 (correct, odd kobo assigned). Quick-tip chips set the field (15 %, aria-pressed) and "No tip" → Total
    ₦84.20. 25,000 / 7 / 12.5 % → "2 people pay ₦4,017.85. 5 people pay ₦4,017.86." `split-02-filled-desktop.png`
  - Currency USD; "Copy the split" → toast "Copied the split." and clipboard text "3 people pay $70.52. 1 person pays $70.53."
  - Reload: amount 250.75, people 4, tip 12.5, currency USD all restored ("The last split stays with your account" kept).
  - Limits: 100,000,000 accepted; 100,000,001 → no result; "1,250,000" with 100 people → $14,062.50 each.
  - Invalid input: "84,20" → "Use a dot for decimals, e.g. 84.20"; "1.500,00" → "Use a dot for decimals and commas for thousands,
    e.g. 1,500.00"; "12,5" tip → "Use a dot for decimals, e.g. 12.5"; "-50", "abc", people 0 / 101 / 2.5 / abc, tip -5 / 150 /
    abc → result "—" with the generic "Enter an amount, a headcount, and a tip." Nothing crashed. `split-03-invalid-people.png`
  - Mobile: no overflow; fields and chips tappable. `split-m01-mobile.png`

- **Unverified:** nothing material.

- **Problems found**
  1. **Medium-low (mobile) — the per-person figure is below the fold.** At 390x844 the result card starts at y≈851, so the
     figure the blurb calls "the point" needs a scroll after every change (`split-m01b-mobile-viewport.png`).
  2. **Low — out-of-range or non-numeric people/tip/negative amount only show the generic sentence** rather than naming the
     field ("People must be between 1 and 100", "Amount can’t be negative"); the static hints under the fields partly cover this.

- **Promise check:** "Bill amount, number of people, and tip" → **kept**; "A per-person figure" → **kept** (with uneven-split
  wording); "The last split stays with your account" → **kept**. Guide 1–3 → **kept**.

- **Mobile:** fine apart from the result card position.

- **Suggested essential fixes:** show the per-person figure first (or sticky) on phones; name the field in the error.

---

## Summary

| App | Tier | Verdict | Promises | Top problems |
|---|---|---|---|---|
| Invoice (/apps/invoice) | free | Ready | 7/7 features, 6/6 guide lines kept | Notes + tax copied from the previous (other client's) invoice and printed; total far below the form on phones; duplicate numbers and declined-quote conversion allowed silently |
| Ledger (/apps/ledger) | pass | Useful but needs improvement | 6/6 kept (bar "partly" on phones) | Month bars/total/budget hidden below the list on phones; Date/Category stick to the last entry (silent back-dating); "Income" category vs Money in/out confusion; ₦0 accepted; skipped import rows not reported |
| Split (/apps/split) | pass | Ready | 3/3 kept | Result below the fold on phones; generic error text |

Runtime: zero page errors / console errors across all runs; first loads 1.9–2.0 s; 257 invoices and 630 ledger entries
render and export fine.
