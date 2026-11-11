# Phase 10: Extra features (the "should have" list)

**Status:** In progress. Each feature below is finished on its own, with tests, and committed on its own. A feature is listed only when it is done.

## Natural-language quick add (done 2026-11-11)

### What it does

The round **+** button (or the **q** key) opens quick add. You can now type a task the way you would say it:

> pay rent tomorrow 5pm #home @bills p1

Ledge picks the meaning out of the sentence and shows it as small **chips** under the box before you press Enter:

- **A date and time**: "tomorrow", "friday", "25 dec", "in 3 days", "next week", "5pm", "9:30am". The date words follow Indian order, so `5/12` means 5 December.
- **#list**: puts the task in that list. You can write the name in any capitals, with dashes instead of spaces, or just the start (`#open` for "Open source"). If no list matches, the text stays in the title.
- **@tag**: adds that tag. A tag you have never used shows as "New tag" and is created when you add the task.
- **p1, p2, p3**: priority high, medium, low.

The chips are only for **words that were really understood**. Anything else stays in the title.

### Removing a chip

If Ledge guessed wrong (for example the word "may" in a title), press the **×** on the chip. The words go back into the task title and stop being used. It only removes that one chip.

### Small rules worth knowing

- A time on its own means today, or tomorrow if that time has already passed ("gym 7am" at 10 in the morning is tomorrow at 7).
- If your whole text is only a date ("tomorrow"), it is kept as the title, because a task needs a title.
- Only the first priority word counts.
- An email address like `bob@example.com` is not mistaken for a tag.
- The chip buttons are 44 pixels on a phone, like every other control.

### Why it was built this way

- The reading of the sentence is a small, separate piece of code with its own tests (23 of them), so it can be trusted and changed safely. Dates are understood by a ready-made library (chrono-node), as planned from the start.
- It runs in your browser, so the chips appear as you type with no waiting. "Today" is worked out from your own timezone setting, the same way the server does, so a phone in another country still gets the right day.

### Checked, and not checked

- Checked: 23 unit tests for the reading of sentences; browser tests that type a full sentence and check every chip, remove one, add the task and find it with its date, tag and title in the right list; a test for a brand-new tag; the accessibility inspector (light and dark) and the phone-size rule on the dialog with chips.
- Not checked: every possible English phrase. The date library is good but not perfect, which is why chips can be removed. Other languages are not supported (internationalisation is outside version 0.1).

## Board view (built, then removed on 2026-11-11)

A board view (one column per section) was built and then **removed at your request**: it was not as useful as the list view. The list view is unchanged. The database still has the unused "list or board" field from the original plan (Phase 2); nothing reads it.

## Search (done 2026-11-11)

### What it does

A new **Search** page, in the side menu and the command box, and reachable from anywhere by pressing **/** (the slash key). Type a word and press Enter: Ledge looks through the **titles and notes** of all your tasks and lists the matches, best match first, each showing which list it is in.

- It understands **word forms**: searching "pay" also finds "paying" and "paid".
- It understands **half-typed words**: "gro" finds "groceries".
- With several words, **every word has to match** (in any order): "pull review" finds "Review pull requests".
- Click a result to open it in the task panel, like anywhere else.
- Tasks in the Trash never show up, and neither do tasks in a list you deleted or archived. **Nobody else's tasks can ever appear** (a test proves it).
- If nothing matches you get a clear message, not a blank page.

The slash key used to open the command box. It now opens Search. The command box is still on **Ctrl+K** (Cmd+K on a Mac), and Search is one of its entries too.

### Behind the scenes

- The database was already prepared for this since Phase 2: it keeps a hidden "search column" up to date by itself from every task's title and notes, with a special fast index. This phase only asks it questions.
- What you type is cut down to letters and digits before it goes anywhere near the database, so punctuation or code-like text cannot cause trouble (a test tries it).
- The search address is `/search?q=word`, so a search can be bookmarked and works with the browser's back button.

### Checked, and not checked

- Checked: 9 tests against the real database (titles, notes, word forms, half words, all-words-must-match, only-stop-words like "the", odd characters, ranking, other users, Trash and archived lists); a browser test that presses `/`, searches, opens a result and sees the "nothing found" message; the accessibility inspector in light and dark and the phone-size rule on the search page, empty and with results.
- Not checked: very large collections (thousands of tasks should be fast because of the index, but this was not timed), or other languages (word forms are English only).

## Repeating tasks (done 2026-11-11)

### What it does

In the task panel there is a new **Repeat** box under the due date. Choose **Every day, week, month or year**, or fine-tune it:

- **Repeat every N** days, weeks, months or years ("every 2 weeks").
- For weekly repeats, **which weekdays** (Mon and Fri, say).
- **Next date**: either **Follows the schedule** (the next date on the calendar pattern) or **Counts from when I finish it** (one interval after the day you tick it, good for "water the plants every 3 days after the last time").

A task needs a due date to repeat; if it has none, turning on a repeat gives it today's date. Clearing the due date turns the repeat off. Only whole tasks repeat, not subtasks. Repeating tasks show a small repeat symbol and words ("Every week on Mon, Wed") in their row.

### What happens when you tick one

The task is **not finished for good**. Ledge adds a finished copy to **Completed** (so your history shows every time you did it) and moves the task to its **next date**. Its subtasks are unticked for the next round, and the copy keeps its tags. A message says "Done ... Next: tomorrow" with **Undo**, which removes the copy and puts everything back, including the subtasks' ticks.

With "follows the schedule", finishing early moves to the date after the one that was due, and finishing late skips the dates you missed, so the next date is never in the past. Month ends are handled: a task on the 31st uses the 28th, 29th or 30th in short months and goes back to the 31st afterwards, and a 29 February task uses 28 February in other years.

### Behind the scenes

- The repeat is stored as a short text in a small, strict subset of the standard calendar format (for example `FREQ=WEEKLY;BYDAY=MO,WE`). Anything outside that subset is refused rather than guessed.
- The date maths is a separate, pure piece of code with 20 tests (month ends, leap years, early and late completion, every-2-weeks patterns). The completion, copy, undo and ownership rules have 14 tests against a real database. Another user can never complete, undo or change your repeats.

### Checked, and not checked

- Checked: the tests above, browser tests that set a weekly repeat, tick it, see it move, undo, and set a custom every-2-weeks repeat that survives a reload; the accessibility inspector on the drawer of a monthly and a weekly task in light and dark; the phone-size rule.
- Not built: "every weekday" style presets, an end date or a count ("repeat 5 times"), and typing "every day" into quick add.

## The full form in quick add (done 2026-11-11)

You asked that the **+** button (and the **q** key) offer everything the task panel has, not only a title and a list. The quick add box now has: the sentence box with its chips, **Due** (date and optional time), **Priority**, **List**, **Tags** (including creating one), **Repeat**, and **Notes**. Choices you make with the controls win over what Ledge guessed from the sentence. Enter still adds the task and keeps the box open; the box scrolls on a small phone screen.

The **"Add a task" line** at the bottom of a list or view still adds a plain task with Enter. Next to it is a new **More options** button (sliders icon) that opens this full form with what you had typed, in the same list and section. A task can now be created with a repeat straight away, and the server checks the same rules (a repeat needs a due date and cannot be on a subtask).

Not in the form: choosing a **section** (the form uses the one you came from), and subtasks (add those from the task panel).
