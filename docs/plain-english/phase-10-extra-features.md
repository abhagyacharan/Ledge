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
