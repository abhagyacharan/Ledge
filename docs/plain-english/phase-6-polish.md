# Phase 6: Polish (making it pleasant and fair to everyone)

**Status:** Done on 2026-11-10.

## What this phase is for

Phases 1 to 5 made Ledge work. Phase 6 makes sure it works **well, for everyone, on every screen**: on a phone held in one hand, in light and dark colours, with a keyboard only, for people who use a screen reader, and for people who find animation uncomfortable. Most of the work was **checking**, and fixing what the checks found.

## How the checking was done

Instead of eyeballing, new automatic tests now check these things every time the test suite runs:

### 1. The accessibility audit (a robot inspector)

A tool called **axe** inspects each screen against the international accessibility rules (WCAG 2.1 levels A and AA). It checks things like: is there enough contrast between text and background, does every button and box have a name a screen reader can read, are headings and lists built correctly. It was run on **every screen, in both the light and the dark theme**:

Inbox, Today, Upcoming, All tasks, Completed, Trash, Settings, a list with sections, the View panel, the task panel, the command box, the shortcut list, and the sign-in and sign-up pages.

What it found and what was fixed:

- On the Trash screen, the "Delete forever" buttons had a hidden name ("Delete Buy milk forever") that did not contain the words printed on the button. A screen-reader user who says "click Delete forever" would not find it. The hidden name now starts with the visible words.
- In the command box, the dividers between groups were built in a way that breaks the list structure for screen readers. They were removed (the group headings remain).

Everything else passed in both themes, which includes the **colour contrast** checks.

### 2. Phone-size checks

A test uses a phone-sized screen (a Pixel 7) with touch. It checks that:

- **Nothing scrolls sideways** on any screen.
- **Every button, link, checkbox, selection box and typing box is at least 44 pixels tall** (about the size of a fingertip), and small icon buttons are also 44 wide. Links and little text buttons that sit inside a sentence are excused, and a checkbox is measured by the label you can tap along with it.
- The **task panel fills the whole screen** on a phone.
- The side menu, the View panel and the quick-add box also follow the 44-pixel rule.

What it found and what was fixed:

- Task rows with no extra details were 40 pixels tall. Now at least 44 on a phone.
- Selection boxes (priority, list, section, sort and so on) were 32 pixels tall. Now 44 on a phone (still compact on a computer).
- The X (close) buttons on pop-ups and the task panel were 28 pixels. Now 44 on a phone.

### 3. Keyboard-only checks

- A test presses **Tab** 45 times on the Today screen and on a list screen and requires that **every control that receives the keyboard focus shows a visible ring**, so you can always see where you are. It also confirms that Tab really moves through many different controls (it is not stuck), and that each task's drag handle can be reached.
- Another test **adds, selects, opens, renames and closes a task using only the keyboard**.

### 4. Sign-up and sign-in test

A test starts signed out and: confirms a private page sends you to sign-in; tries a too-short password and sees the message; signs up and lands in an empty Inbox with none of anyone else's tasks; signs out; confirms private pages are locked again; tries a wrong password (one general message); signs in properly. A second test confirms an unknown email gets the **same** message as a wrong password.

## Things added

- **Reduced motion.** If your computer is set to "reduce motion", Ledge switches off all sliding, fading and animation. Everything still changes; it just does not move.
- **Motion length.** Every transition in the app lasts between 0.1 and 0.2 seconds. The only longer motion is the grey "loading" bars pulsing and the spinning loader, which show that something is in progress (and they stop under "reduce motion").
- **Screen-reader announcements for dragging.** When you drag a task with the keyboard, a screen reader now hears things like "Picked up Pay rent, position 2 of 5 in the list" and "Dropped Pay rent", instead of internal codes. Instructions on how to drag are read out too.
- **A themed "page not found" screen** for addresses that do not exist (before, it was a plain white page even in dark mode), and a **last-resort error screen** for the rare case where the whole app frame fails.
- **Reviewed every screen's states.** Each view has a loading placeholder, an empty message with one action, and an error screen with "Try again".

## Decisions in plain words

- **Automatic checks are good, not perfect.** The accessibility tool catches mechanical faults. It cannot tell whether the reading order feels natural or whether the wording makes sense when read aloud, so a person should still try Ledge with a screen reader at some point.
- **44 pixels on phones, compact on computers.** Mouse users get a denser layout; phone users get fingertip-sized targets.
- **New development tool added:** `@axe-core/playwright`, used only by the tests.

## How you can see it working

1. Run `pnpm test:e2e`. It now runs 49 browser checks in two sizes (computer and phone).
2. Switch your computer to dark mode, then light mode: Ledge follows it, or use the theme button in the side menu.
3. Turn on "reduce motion" in your computer's accessibility settings and open a task: the panel appears without sliding.
4. Resize your browser window to phone width and try the menu, the task panel and quick add.
5. Press Tab repeatedly on any screen and watch the focus ring move.

## What was checked, and what was not

Checked:

- **49 browser tests pass**, including the full accessibility audit in light and dark and all the phone-size checks. 250 unit and integration tests also pass.
- I looked at the **light theme** on screen myself (Today), which had not been checked before.
- All five end-to-end flows named in the plan now pass: sign up and sign in; quick-add a task and complete it with undo; create a list and drag-reorder; open a task in the drawer and edit; Today shows overdue and today correctly.

Not checked:

- **A real screen reader** (such as NVDA or VoiceOver) has not been used. The announcements are built to the library's documented design but were not heard.
- **A real phone.** The phone tests use a phone-sized screen with touch in desktop Chrome, which is close but not the same as holding a device.
- The **"secure" cookie over real HTTPS** is still to be checked at deployment (Phase 9).
- The reading order of the Trash and Settings screens and the exact wording for screen readers have not had a human review.
