# Audit: group "remind" — Remind (/apps/tasks)

Auditor notes: driven with Playwright against http://127.0.0.1:8080 as the local QA admin (has Pass) plus two fresh
no-Pass accounts ("Amaka Okafor", invited guests). Scripts: scratchpad `remind/p1.mjs` … `p7.mjs`, logs `remind/*.log|*.out`.
Screenshots: `/home/user/midnry/screenshots/audit/remind/`. The dev server was restarted mid-audit (database reset);
the baseline 25 tasks were re-added through the UI and all later checks re-run. No page errors or console errors
were recorded in any run (desktop or phone).

### Remind (/apps/tasks) — tier: free, with Midnry Pass extras

- **Verdict: Ready** (solid end to end; three medium UX problems below are worth fixing soon, none block promotion).

#### Tested workflows (VERIFIED)

- **Fresh state**: empty document shows "Nothing due today. Add a task above, or enjoy the free time."; Add is disabled
  with an empty box and when only date words are typed ("tomorrow 6pm" → preview "Add a few words for the task | Tomorrow, 6pm";
  Enter adds nothing). `01-empty-today.png`.
- **Natural-language add (26 realistic tasks)** — every recognised piece is shown as a chip before you press Add, and
  the saved document matched the chips. Samples (today = Fri 23 Oct 2026):
  - "call mum tomorrow 6pm @home" → "call mum", Tomorrow 6pm, @home (label created).
  - "Pay rent every 25th p1" → Sunday, "Every month on the 25th", P1 (recur `monthday:25`).
  - "Submit report friday p2 #Work" → "New project: Work" chip; project Work created on Add.
  - "Gym every mon and thu 7am" → Monday 7am, Every Monday and Thursday. "Team standup every weekday 9am" → Every weekday.
  - "Water the plants every 3 days", "Backup laptop every 2 weeks", "Pay NEPA bill monthly p3" → correct repeats.
  - "Renew passport 12/11" → Thu, Nov 12 (day/month). "Dentist 3 Nov at 10:30" → Nov 3 10:30am. "Book flight to Lagos in 2 weeks" → Nov 6.
  - "Call Amaka Okafor tonight" → Today 8pm. "Yoga sat morning" → Tomorrow 9am. "Finish tax return next month p1 @finance" → Nov 1.
  - "Reply to landlord email !2 #Home" → P2, new project Home. "Renew car insurance 2026-12-01 p2" → Dec 1.
  - Unrecognised words stay in the title ("p5 call bank", "every 0 days stretch", "Meet on 31/02", "Lunch at 13pm" all become
    plain titles, no crash). 400-character input is cut at 300. `02-today-after-adds.png`.
- **Today / Upcoming / Inbox / Completed**: Today groups "Overdue" then days; Upcoming shows the next 13 days grouped by day
  ("Today", "Tomorrow", "Sunday", "Sun, Nov 1"…); counts in the menu match. Adding a dated task from Today shows a toast
  "Added for Monday." `03-upcoming.png`, `04-inbox.png`, `05-completed.png`.
- **Finishing tasks and points**: tick → toast "+1 points" (P4), "+3 points" (P2), "+4 points" (P1); menu reads
  "Productivity · 15 pts"; reaching the daily goal gave "+6 points" (1 + 5 bonus) and "Done today 5/5 · Goal met 🎉",
  "Daily streak 1 day". Untick in Completed ("Mark not done") removes the point and the day count. Completing a repeating task
  does not finish it but moves it on ("Next: Tomorrow" / "Next: Monday"); the document shows the new due date and done=false.
- **Task detail** (`06-task-detail.png`, `07-task-detail-filled.png`, `07b-detail-after-edits.png`): renamed the task, wrote a
  two-line description, set date, time 14:30, repeat preset "Every 2 weeks", custom repeat "every tue and fri" → select shows
  "Every Tuesday and Friday"; priority P1; toggled existing label @finance and typed a new label "calls"; added two sub-tasks,
  ticked one (+4 points), removed one; two comments (one 500+ chars, shown as "You · Oct 23, 2026, 7:32 AM"), deleted one;
  moved the task to project Work; cleared the date → time and repeat were cleared too; "Delete task" → "Yes, delete with 3
  sub-tasks" / "Keep it"; deleting removed the task and its sub-tasks from the saved document.
- **Projects and sections**: "+ New project" in the menu opens the new project; "+ Section" box adds "Design", "Build"; a
  task's Section select moves it under a section; "Remove section" un-sections its tasks; "Delete project" → toast
  "Project deleted. Its tasks moved to the Inbox." (verified in the document). `08-project-sections.png`.
- **Layouts**: List / Board / Month toggle. Board layout groups by section (or by priority elsewhere); dragging a card
  "Landing page copy" into the "Build" column changed its section in the saved document. Month layout shows tasks with
  repeats expanded (`09-project-board-layout.png`, `10-project-month-layout.png`).
- **Saved filters**: "+ New filter" → editor (name, Due "Next 7 days", P1+P2, @finance, projects, words) → saved as
  "Urgent money" in the menu; "Edit filter" works; results change accordingly; "Delete filter" removes it.
  `11-filter-editor.png`, `12-filter-view.png`.
- **Search** box filters the current view by title/notes (e.g. "NEPA" → 1 row with 400 tasks loaded).
- **Productivity**: points, level ("Starter", "35 points to Getting going"), tiles, 7-day and 8-week bars (with an sr-only
  table), goals. Goal inputs clamp: -3 → 1, 999 → 50, 0 → 1, 1.5 → 2, weekly 400 → 300; letters cannot be typed
  (number input). `13-productivity.png`, `14-productivity-goal-met.png`.
- **Saving / reopening**: "Saved to your account" after every change; reload shows the same tasks; `?view=` keeps the view
  on reload (`?view=settings`, `?view=board`). Two-tab conflict: tab B saved, then tab A saved again → red status
  "This was changed in another tab. Your changes are kept until you choose." and a panel "Remind was changed in another
  tab or device" with "Keep my version / Use the newer saved version / Review both / Decide later"; after reload both tabs'
  earlier tasks are present. `47-tab-a-stale-save.png`.
- **?add= prefill** (from Bills/Visits/Shifts): the box is filled and a note says "Check the task below, change it if you
  need to, then press Add. Nothing is added until you do." `15-prefill.png`.
- **Pass: Board** (`?view=board`): three columns, rename column ("Backlog"), add cards, Left/Right/Remove, "1 of 40 cards";
  cards survive reload and are saved in the separate "board" document. `17-pass-board.png`.
- **Pass: Habits** (`?view=habits`): add habits, tick a day, "0/7 this week", Previous/This week/Next; the Add button
  disables at 8 ("8 of 8"). On Today a strip "Today's habits · 0 of 3 · Open Habits" ticks a habit (aria-pressed=true,
  saved to the habits document). `18-pass-habits.png`, `19-today-with-habits.png`.
- **Pass: Focus** (`?view=focus`): "Focus for 25 min" in a task's detail opens Focus with "For Pay rent · Clear", the
  timer runs at once (24:58 after 2.5 s), Pause / Reset / Skip (Skip → "Break · 5 minutes"); the task name survives
  reload; saved in the "pulse" document. `20-pass-focus.png`.
- **Pass: shared projects and invites** (two accounts): "+ New shared project" → People panel (owner, Invite, Rename,
  Delete project). Invalid email is stopped by the browser ("Please include an '@'…"). Inviting
  qa-remind-guest…@example.test → "Invited qa-remind-guest…@example.test." and a pending row "Invited. They'll see a Join
  button in Remind when they sign in with this email." The guest (no Pass) signs in and sees "QA Admin invited you to the
  shared project Studio launch (shared)." with Join/Decline; Join → "You joined …", the project appears under "Shared
  projects" with "People (2)". Guest adds a task, comments, and assigns a task to "QA Admin"; the owner's page picked up the
  new task within ~5 s without reloading, shows "💬 1 → You" and "Amaka Okafor" as the comment author, and "Assigned to me"
  lists it. Guest "Leave project" → "You left the project." Owner "Delete project" → "Delete this project for everyone?" →
  "Project deleted." A personal project's "Share" button turned Home into a shared project with its tasks and sections.
  `21-shared-project-people.png`, `22-shared-project-tasks.png`, `25-guest-invite-banner.png`, `26-guest-task-detail.png`,
  `27-owner-people-after-join.png`.
- **Pass: attachments**: "Attach a file" uploaded passport-notes.txt → "File attached.", row shows "📎 1", "📎
  passport-notes.txt · 1 KB"; clicking it downloads the file with the original content; a 2.2 MB file → "Files can be up to
  2 MB."; Remove deletes it. The no-Pass guest sees "Attach files with Midnry Pass." instead. `23-attachment.png`.
- **Settings and calendar** (`24-settings.png`): Email: "Emails go to qa-admin@example.test.", toggles "Morning summary"
  and "Reminder at the task's time" save and survive reload; "Send me a test email" → "Email isn't connected on this copy of
  the site, so nothing was sent."; a second press within a minute → "Wait a minute before sending another test."
  Calendar link: "Get my calendar link" → URL `/api/remind/calendar/<48-hex>`; Copy; fetched it: HTTP 200
  `text/calendar`, a valid VCALENDAR (X-WR-CALNAME "Midnry Remind", refresh PT1H) with 25 VEVENTs — timed tasks as
  DTSTART+30-minute DURATION with a VALARM, all-day tasks as DATE values, repeats as RRULE (Pay rent → FREQ=MONTHLY;BYMONTHDAY=25,
  Gym → FREQ=WEEKLY;BYDAY=MO,TH), project name and "Open in Midnry" link in DESCRIPTION. "Make a new link" → "New link
  made. The old one has stopped working." (old URL now 404). "Turn off" removes the link.
- **Large data**: seeded 400 tasks (≈127 KB of the 600 KB document limit): reload 2.1 s, Today 48 rows with Overdue group,
  Upcoming 90 rows / Inbox 119 / Completed 75 each in 350–550 ms, Month layout 384 ms, search 343 ms, typing 28 chars 508 ms,
  open detail 168 ms, adding and completing tasks still saves. At 500 tasks, Add says "You've reached 500 tasks. Delete some
  finished ones first." `28-large-today.png`, `29-large-completed.png`, `30-large-month.png`, `31-large-board-layout.png`,
  `32-large-productivity.png`, `33-limit-500.png`.
- **Export**: there is no CSV/PDF/print; the only "export" is the calendar link (checked above).

#### Unverified
- Real email delivery (invites, morning summary, due-time reminders, test email): the site reports "Email isn't connected
  on this copy of the site"; invite toast correctly omits "We've emailed them."
- Browser pop-up alerts: "Turn alerts on" did nothing visible in headless Chromium (no toast, button unchanged) — the
  permission prompt cannot be answered there.
- No-Pass locked states for Board/Focus/Habits (`[data-pass-locked]`) — not re-run by me; covered by
  scripts/qa/remind-merge.mjs. I did verify the no-Pass guest sees "Share projects with Midnry Pass." and "Attach files with
  Midnry Pass."
- Weekly streaks over several weeks; Completed view's 150-row cap; behaviour when a document already over 500 tasks is
  loaded (code truncates to 500 silently); adding a sub-task at the 500 limit; touch drag-and-drop in the Board layout;
  the calendar link inside real Google/Apple clients; the "Keep my version" conflict path.

#### Problems found
1. **Medium — Editing a task out of the current view closes the editor instantly.** Today → tap "Pay NEPA bill" → change
   Date to two days ahead: the row disappears and the open detail panel vanishes mid-edit (no message). Same in Inbox when
   changing Project to "Work". A user editing several fields loses the panel after the first one. (Logs p2.log / p2b.log:
   "detail still open? 0; row still listed? false".)
2. **Medium — Sharing is one tap and irreversible; deleting a shared project deletes its tasks with no warning.** "Share" on a
   personal project immediately converts it (no confirmation). Later "Delete project" → "Delete this project for everyone?"
   → the tasks ("Reply to landlord email") are gone from the account, unlike a personal project where "Its tasks moved to the
   Inbox." There is no "unshare" / "move tasks back" option.
3. **Medium — Two different things are called "Board".** The List/Board/Month layout toggle shows your tasks as columns,
   while the Pass "Board" in the menu is a separate card board with its own cards (no dates, no points, not linked to tasks).
   The catalogue says "a three-column Board" without saying it is separate from your tasks. `09-project-board-layout.png`
   vs `17-pass-board.png`.
4. **Low — Parser quirks**: "Weekend market shopping this weekend" → title "market shopping this weekend" (the first word is
   eaten); "Pay school fees 30/9" → "Sep 30, 2027" (a past day/month jumps a year ahead instead of being overdue, with no
   hint); custom repeat "every tue and fri" keeps the existing Sunday due date (row reads "Sunday 2:30pm ↻ Every Tuesday and
   Friday"); adding from the Today view silently dates an undated task today (the chip does say "Today").
5. **Low — Missing confirmations / wording**: "Delete filter" and "Delete project" (personal) act immediately; inviting the
   same email twice shows "Invited …" again rather than "already invited"; an empty saved filter says "No tasks here yet.
   Add one above."; no warning as you approach the 500-task limit (only the refusal at 500).
6. **Low — Phone layout**: the app header, blurb and "Features and how to use" bar push the first task below the fold
   (first row at ~y 850 of 844); the add box's example placeholder is clipped ("Water the pla"); in Habits the week grid
   needs a sideways scroll inside the card and today's column is half hidden (`42-mobile-pass-habits.png`); layout toggles
   are 36 px tall (other controls are 44 px).
7. **Low — Points for sub-tasks**: a sub-task inherits the parent's priority, so ticking a P1 sub-task earns +4 like a full
   task (easy to inflate points).

#### Promise check (catalogue `features` / `guide`)
- "Type naturally: 'call mum tomorrow 6pm @home' sets the date, time, and label" → **kept**.
- "Repeats like every Tuesday, every weekday, every 2 weeks, or every 15th" → **kept** (every weekday, every 2 weeks,
  every 25th, every mon and thu, every tue and fri all verified).
- "Projects, sections, sub-tasks, colour-coded priorities, labels, and saved filters" → **kept**.
- "Comments on tasks, and Productivity with daily and weekly streaks" → **kept** (daily streak observed; weekly streak
  needs more than one week — partly observed).
- "Midnry Points and levels for every task you finish" → **kept**.
- "With Midnry Pass: shared projects, assigning tasks, file attachments, and a Google or Apple Calendar link" → **kept**
  (feed verified as valid iCalendar; email delivery of invites unverified).
- "With Midnry Pass: a three-column Board, a Focus timer you can start from any task, and Habits with today's ticks next to
  Today" → **kept**, but the Board is a separate card board, not your tasks (problem 3).
- Guide "Type a task in the box and press Add. Words like tomorrow, 6pm, every Friday, p1, @label, and #project are picked up"
  → **kept**. "Use Today and Upcoming… Tick the circle to finish a task and earn points." → **kept**. "Tap a task to add
  notes, sub-tasks, comments, a time, a repeat, or labels." → **kept**. "Make projects and sections in the menu, and save
  filters" → **partly**: projects and filters are in the menu; sections are made from the "+ Section" box inside a project
  view. "Open Productivity to see your streaks and set daily and weekly goals." → **kept**. "With Midnry Pass, share a
  project, invite people by email, assign tasks, attach files, and add your calendar link under Settings." → **kept**
  (email sending unverified). "open Board, Focus, and Habits in the menu. Tap Focus on a task to start a 25-minute round" →
  **kept** (the button is "Focus for 25 min" inside the task's detail).
- Blurb "'Pay rent every 25th p1' just works" → **kept**.

#### Mobile (390×844)
- No horizontal page overflow on Today, menu, Upcoming, task detail, Month and Board layouts, Productivity, Settings,
  Pass Board/Focus/Habits, filter editor (scrollWidth 390 everywhere). `34-mobile-today.png`, `35-mobile-menu.png`,
  `36-mobile-upcoming.png`, `37-mobile-detail.png`, `38-mobile-month.png`, `39-mobile-board-layout.png`,
  `40-mobile-productivity.png`, `41-mobile-settings.png`, `42-mobile-pass-*.png`, `43-mobile-filter-editor.png`.
- "☰ Today / Menu" button (350×44) opens the full menu; picking a view closes it. Checkbox tap target 44×44, Delete task
  115×44. Pass Board columns stack vertically; the project Board layout scrolls sideways inside its container.
- Weak points: see problem 6 (list below the fold, clipped placeholder, Habits grid).

#### Suggested essential fixes
1. Keep the detail panel open (or show "Moved to Upcoming / Work" with Undo) when an edit takes a task out of the current view.
2. Confirm "Share" (explain tasks move to a shared project), and warn on shared-project delete that tasks are deleted;
   offer "Move tasks back to my list" when leaving/deleting.
3. Rename one of the two "Board"s (e.g. layout "Columns", or call the Pass view "Card board") and say in the catalogue that
   the Pass Board is a separate card board.
4. Parser: don't strip a leading "Weekend"/weekday word that is the task's subject; show "last month?" for a day/month that
   already passed; when a custom weekly repeat is set, move the due date to the first matching day.
5. Phone: collapse the hero/guide block or pin the add box; make the Habits grid start at today or shrink the columns.
6. Small: confirm filter deletion, "already invited" message, warn near the 500-task limit.

| App | Tier | Verdict | Page errors | Main problems |
|---|---|---|---|---|
| Remind (/apps/tasks) | free (+Pass extras) | Ready | none (desktop + phone, 7 runs) | editor closes when an edit moves a task out of the view; share/delete-shared can lose tasks without warning; two things called "Board"; parser edge cases; phone list below the fold |
