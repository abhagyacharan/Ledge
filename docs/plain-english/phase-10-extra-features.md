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

## Board view (done 2026-11-11)

### What it does

Every list now has two ways to look at it, chosen with the **List | Board** buttons at the top of the list:

- **List** is the familiar stacked view.
- **Board** shows **one column per section**, side by side, plus a first column called **No section** for tasks that have none. Think of sticky notes on a wall: columns like "To do", "Doing", "Done".

In the board you can **drag a card from one column to another**. That moves the task into that section and puts it where you dropped it. The same works with the keyboard: pick a card's grip with Tab, press Space to pick it up, the **left and right arrow keys** to change column (up and down to change place), and Space to drop (Escape cancels). A screen reader announces the moves.

Each column has its own "add a task" box, and a menu (rename, move, delete) for the section, exactly as in the list view. **Add section** adds a new column.

**Your choice is remembered per list.** If you leave "Work" on Board and "Home" on List, they stay that way after a reload or on another device.

### Good to know

- The board always uses **manual order** (the order you dragged things into). Sort and group are for the list view; if you had set them, a small note says so. Filters (tag, priority, has a due date, hide or show completed) still apply to the board.
- Finished tasks sit at the bottom of their column when shown.
- On a phone the columns are about as wide as the screen and the **board scrolls sideways inside its own box**. The page itself never wobbles sideways.

### Behind the scenes

- The database already had a place to store "list or board" for each list from the very start (Phase 2). This phase uses it. Only the owner of a list can change it (a test proves another user cannot).
- The board reuses the same dragging code as the list view, so the safety nets are the same: the card moves at once, and if saving fails it goes back with an error message.
- A bug found on the way: the hidden text meant only for screen readers, in columns far to the right, made the whole page slightly wider than a phone screen. The board's scroll box now contains it.

### Checked, and not checked

- Checked: a browser test creates a list, adds a section and two tasks, switches to the board, drags a card to the other column with the keyboard, reloads and sees both the move and the board choice remembered, then switches back to the list view. Also: the accessibility inspector on a board in light and dark, the phone rule (no sideways page scroll, 44-pixel buttons, the box really scrolls), and an ownership test.
- Not checked: dragging with a real finger on a real phone, and a screen reader hearing the announcements.

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
