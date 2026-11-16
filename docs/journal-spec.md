# Journal spec

Decided with O in chat on 2026-11-12. Built as Phase 11 (CLAUDE.md §14). Anything beyond this file goes to `docs/ideas.md` first.

## What it is

A private journal with one page per day. At the top of each page is a strip of plain facts about that day, taken from Tasks and the Expense Tracker. Each fact opens the matching screen for that day. Below the facts are an optional mood and the page itself. There is no AI in this version.

## The page

- **One page per day.** Writing in the morning and again in the evening edits the same page. Dates are floating days in the user's timezone, like task due dates.
- **Any day up to today.** `/journal` is today. `/journal?d=YYYY-MM-DD` is another day. A missing, invalid or future date falls back to today, and the server refuses saves for future dates.
- **Plain text** up to 20,000 characters, with no editor toolbar (a rich-text editor is a v0.1 non-goal). The box grows as you write. A character counter appears only near the limit.
- **Autosave.** The page saves 0.8 s after the last key, when you leave the box, when you change the mood, and when you move to another day. The line under the box reads "Saving…", "Saved · 8:42 pm", or "Not saved yet…" when there is an error. Closing the tab with unsaved changes asks first.
- **Mood** (optional): five line icons, Rough, Low, Okay, Good and Great, stored as 1 to 5. Tapping the chosen mood again clears it.
- A page with no words and no mood is deleted rather than kept empty, so it leaves no dot in the calendar.

## Day picker

The Expenses period pill, one day at a time:

- The arrows step one day; "next" stops at today.
- The pill reads "Today · 12 Nov", "Yesterday · 11 Nov" or "Monday · 9 Nov". It opens a month of days:
  - weeks start on the user's week-start setting;
  - a dot marks each day that has a page;
  - today is shown in the accent colour;
  - days after today are disabled.
- Tapping the month name switches to the Expenses month grid with a year stepper. "Today" and "Close" sit at the bottom.

## The facts strip

Worked out in code (`src/modules/journal/day-facts.ts`, unit tested) from figures the data layer gathers (`getDayFactsInput`).

| Card               | Shown                                                 | With data                                                                                     | Empty-day wording                                                                                        | Opens                                     |
| ------------------ | ----------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Tasks done         | always                                                | "4 done", lists under it ("General 2 · Freelance 2", at most three, then "N more")            | today "Nothing ticked off yet / There's still time for one."; past "A rest day / No tasks finished."     | Completed, that day (`/completed?day=`)   |
| Money spent        | always                                                | "₹1,240 spent", then "₹900 on wants · mostly Eating out · about your usual"                   | today "Nothing spent yet / A no-spend day so far."; past "No-spend day / Nothing went out. Nicely done." | Expenses tab, that day (`?day=`)          |
| Slipped            | always                                                | today "2 still open / Due today, not done yet."; past "2 slipped / Due this day, still open." | "All caught up" (today), "Nothing slipped" (past) or "Nothing due"                                       | Today (its overdue block)                 |
| Money in and saved | only on days with an investment, income or an EMI due | first of "₹5,000 invested", "₹50,000 came in", "₹12,000 EMI due"; the rest under it           | not shown                                                                                                | Investments, Income or EMIs tab, that day |

Rules behind the wording:

- **Tasks done:** tasks finished that day by the user's timezone, subtasks included. Trash and archived lists are left out, as in Completed.
- **Slipped:** tasks due that day that are still open now.
- **"Mostly" a category:** only when one category is at least half of the day's spending.
- **"Your usual":** the average daily spending over the 30 days before. Within 25% either way is "about"; below that is "below", above that is "above". If there was no spending in those 30 days, the comparison is left out.
- **"On wants":** shown only when some of the day's spending is labelled Want.
- Empty cards keep the same shape. Their icon turns green and their words are encouraging.
- **Folding:** the facts start open. They fold into one line ("4 done · ₹1,240 spent · 2 slipped · ₹5,000 invested") as soon as you focus the page, or with "Fold away". Tapping the line opens them again.
- **Layout:** on phones the facts are one card of rows. From tablet width up they are tiles: three, or 2×2 or four in a row with the money card.

## Need or want label on expenses

- Expenses can carry an optional label, **Need** or **Want**. It is a chip group in the add/edit sheet, under Payment method. Tapping the chosen chip again, or pressing Delete on it, clears the label.
- It is stored in `finance_entries.spend_label`. The database only allows it on expenses, and only the values `need` and `want`.
- The label shows in the row's details ("Food & Groceries · UPI · Need").
- The Expenses tab offers Any / Needs / Wants filter chips (`?label=`) once any expense in the period has a label.

## Day filter on expense tabs

- `?day=YYYY-MM-DD`, together with `?y=&m=` for the day's month, narrows any entries tab to one day.
- A dark chip shows the day; tapping it, or "Clear filters", returns to the whole period.
- With no entries that day, the tab says "No expenses on Tuesday · 10 Nov" and, on the Expenses tab, "A no-spend day".

## Data and privacy

- Table `journal_entries`: `user_id`, `entry_date`, `body`, `mood` (nullable, 1 to 5), timestamps. It is unique on `(user_id, entry_date)`, deleted with the user (cascade), and has checks on body length and mood. Migration `0009`.
- Every data function takes `userId`. Integration tests prove that another user can neither read, list, overwrite nor delete your page.
- The journal is the most personal data in the app. It lives in the same database and nightly backups as everything else, in plain text, like the rest.

## Not in this version (parked in `docs/ideas.md`)

- AI reflection card and AI weekly look-back
- AI prompts and AI drafts
- On this day
- A weekly review page
- Posting an entry to a blog
- Journal pages in app-wide search, and in the export

## Journal lock (added 2026-11-16 at O's request; screens 7a to 7h in docs/new_design.md)

Anyone who sits at an unlocked computer or picks up an unlocked phone with Ledge open should not be able to read the journal.

- **Optional.** Off until turned on, from Settings > Preferences > Journal lock (screen 7f) or the Journal's "Lock with a PIN" button. Turning it on asks for a PIN twice (7a, "Step 1 of 2"); 4 digits, or 6 with "Use a 6-digit PIN". If the two don't match, it goes back to step 1 with "Those didn't match. Try again."
- **Locked (7b, 7h).** "Journal is locked" and the PIN. Phones: dots and an on-screen keypad, with the tab bar and + hidden so the keypad sits under the thumb; a back arrow and the date at the top; "Forgot PIN?" at the bottom. Desktop: digit boxes typed on the keyboard in a card, with "Forgot PIN?" and "Use account password". It unlocks on the last correct digit, with no button. Until then the server reads and sends no journal content (the page, the mood, the day's facts, the month's dots), and saves are refused.
- **Wrong PIN (7c).** The dots turn red, shake once and clear; "That PIN isn't right. N tries left." (never colour alone).
- **Paused (7d).** After 5 wrong tries: "PIN entry is paused" with a countdown ("4:52 left · try again at 4:35 pm"). The pause grows each time: 5, then 15, then 60 minutes (a correct PIN or the password resets it). "Unlock with account password" always works; "Back to Home".
- **Forgot PIN (7e).** A sheet asks for the account password ("Show" toggles it), then "Choose a new PIN" (7a). A wrong password gets the same neutral words as sign-in. Password checks are limited to 5 in 15 minutes per person.
- **Lock again (7f).** When I leave the Journal (default), After 1 minute away, After 5 minutes away, When I close Ledge. "Away" means the app or tab hidden (another app or tab, the screen off, minimised) or another page of the app. Leaving locks at once in the first mode; in the timed modes the journal is hidden while away and locks if you were gone at least that long; closing Ledge always locks. On leaving or hiding, the content is hidden at once (before the phone's app-switcher picture) and, for "When I leave the Journal", the unlock is removed on the server (`navigator.sendBeacon` to `POST /api/journal/lock`).
- **Lock now.** While unlocked, the Journal header has "Lock now" (Ctrl+Shift+L).
- **Change PIN / Turn off the lock (7f)** ask for the current PIN first. A forgotten PIN is reset with the account password instead.
- **Elsewhere.** Home's Journal row says "Locked" and only whether today's page is written (7g); the sidebar's Journal row shows a lock icon while locked (7h). Data exports still include journal pages; the PIN hash and lock counters are never exported.
- **How the unlock is kept.** A signed, httpOnly, SameSite=Strict cookie tied to this sign-in (HMAC with `BETTER_AUTH_SECRET`), dropped when the browser closes and never valid for more than 12 hours or for another sign-in.
- **Storage.** `user_settings`: `journal_pin_hash` (scrypt, Better Auth's password hashing), `journal_pin_length`, `journal_pin_failures`, `journal_pin_lockouts`, `journal_pin_locked_until`, `journal_relock` (migrations 0012 and 0013).
- **Limits, honestly.** A short PIN guards against someone using an open device, not against someone with the server or the database; the pauses make guessing slow. The timed "Lock again" modes are decided in the browser (the server's unlock lasts until then); "When I leave the Journal" also removes it on the server.
