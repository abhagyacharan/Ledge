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
