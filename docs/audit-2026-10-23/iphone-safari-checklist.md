# iPhone Safari checklist for the live release (2a2240d)

Use an iPhone with Safari, signed in to a **test account**, not a customer's account.
Use invented data only. It takes about 15 minutes. Write ✅ or ❌ next to each line, plus the
iOS version (Settings → General → About).

Nothing on this list has been run on a real iPhone yet. The automated checks used phone-sized
Chromium, which is not Safari.

| # | Do this | Expected result |
|---|---|---|
| 1 | Open www.midnry.com, sign in, close Safari fully, then open it again. | You are still signed in. |
| 2 | **Invoice:** add a line (Description, Qty 2, Rate 50,000) and Tax 7.5. Scroll while typing in Rate. | A total bar stays visible at the bottom and shows ₦107,500.00. The keyboard does not cover it. |
| 3 | **Invoice:** All invoices → "Numbering and your details" → fill in "How to pay". Open the invoice again. | The How to pay text shows on the invoice sheet. |
| 4 | **Invoice:** tap "Print or save as PDF". | The iOS print screen opens. The preview shows the lines, the tax, ₦107,500.00 and How to pay, and no menus or buttons. |
| 5 | **Invoice:** tap "Copy for WhatsApp", then paste into a WhatsApp chat with yourself (don't send). | The text starts "Invoice 0001 from …" and has the total and How to pay. |
| 6 | **Dose:** type `7,5` in a number box. | The keyboard has a decimal key. The app says to use a dot for decimals, and no result is shown. |
| 7 | **Dose:** type `7.5`. | A result appears, with a Copy button. |
| 8 | **Emergency card:** turn on Aeroplane Mode, change your name, tap "Your desk". | Safari asks whether to leave, or the app keeps the change to offer back. |
| 9 | Turn Aeroplane Mode off and reopen the Emergency card. | The change is either saved or offered back. It is never silently lost. |
| 10 | **Remind:** type "Call mum tomorrow 6pm". | The preview shows tomorrow at 6:00 pm before you press Add. |
| 11 | Share → Add to Home Screen, then open Midnry from the home screen. | It opens full screen with the Midnry name and icon, already signed in. |
| 12 | **Writing studio:** write one Letter. | It says it was written by AI, and the count of AI writes left goes down by one. |
| 13 | *(Pass account only)* **Ledger:** open it. | This month's total is shown above the form. |
| 14 | *(Pass account only)* **Compressor:** compress a 20–30 second video from Photos. | An MP4 plays, and it is smaller than the original. |

If anything fails, a screenshot and the step number are enough for me to reproduce it.

**Android (Chrome or Samsung Internet): pending.** None of this has been checked on an Android
phone. It stays open until a real Android device is available. Phone-sized Chromium on a laptop
does not count.

**Not on this list:** the next batch (Needs follow-up, Share PDF, Remind repeats). It is not live.
Share PDF in particular needs a real iPhone and Android check once a preview exists.
