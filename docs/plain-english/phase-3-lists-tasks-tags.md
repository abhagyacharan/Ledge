# Phase 3: Lists, tasks and tags (the first usable version)

**Status:** Done on 2026-11-10.

> **Later change (2026-11-11):** at your request, **tags and sections were removed** and the **Inbox became a list called General**, with a new Tasks Overview page in its place. The rest of this page describes the original version; see [the redesign page](phase-8-redesign.md) for what changed.

## What this phase is for

Phases 0 to 2 built the workshop, the front door and the filing cabinet. Phase 3 is the first time you can **actually use Ledge**: write tasks down, tick them off, group them in lists, label them, and open any task to change every detail.

The screens named Today, Upcoming and the rest (Phase 4) are still to come. In this phase you work from your **Inbox** and from your **lists**.

## What you can do now

### 1. Add tasks quickly

There are three ways, all designed so you can type task after task without touching the mouse:

- **The round "+" button** in the bottom-right corner, always visible. Press it, type, press Enter. The box **stays open** and clears itself, ready for the next one. A small message confirms "Added to Home". You choose which list it goes to; it starts on the list you are looking at, or your Inbox if you are elsewhere.
- **The `q` key.** Press it anywhere (when you are not typing in a box) to open the same quick-add box.
- **The "Add a task" line** at the bottom of every list, and at the bottom of every section. Type, press Enter, and the box stays ready for the next task.

### 2. Tick tasks off

Every task has a round checkbox on its left. Tick it and the task counts as done (the app notes the exact moment). Untick it and it is open again. Finished tasks tuck away under a "Show 1 completed" button so they do not clutter the list, and the button is there when you want to see them.

The checkbox is large enough to tap easily with a thumb on a phone.

### 3. See what matters at a glance

Each task row shows, under its title, only what it has:

- **Due date.** Friendly words for nearby days ("Today", "Tomorrow", "Friday"), or a short date ("30 Nov"). If there is a time, it is shown too ("Tomorrow, 6:00 pm").
- **Overdue.** A task whose date has passed (or whose time today has passed) is marked with a warning icon, red text **and the word "Overdue"**, so nobody depends on colour alone to notice it.
- **Priority.** Low, Medium or High, shown with a flag icon and the word, not just a colour.
- **Subtask progress.** "1/3" means one of three subtasks is done.
- **Tags.** Small labels with a coloured dot.

### 4. Open a task to see and change everything (the detail drawer)

Click or tap a task and a panel slides in from the right (on a phone it fills the whole screen). It has:

- The **title**, which you can edit.
- The **checkbox**.
- **Due date and time.** A button opens a small picker with four quick choices (Today, Tomorrow, Next week, No date), a date box where you can type or pick a date, and an optional time. "Next week" means the coming Monday (or whichever day your week starts on).
- **Priority** (None, Low, Medium, High).
- **List.** Choose another list and the task moves, along with its subtasks and tags.
- **Section** (when the list has sections).
- **Tags.** See below.
- **Notes.** A free text box.
- **Subtasks.** See below.
- **Move to Trash.**

**There is no Save button.** Text boxes (title, notes) save when you click away from them. Choices (date, priority, list, section, tags) save the moment you choose. A small line under the title says "Saving…", then "Saved" (or "Not saved" if something went wrong, with a message).

The address in your browser changes to include the open task, so you can reload the page, press the browser's Back button, or bookmark a task and land on it again. Closing the panel (the X, the Escape key, or clicking outside) removes it from the address.

If the title is emptied, the app refuses ("A task needs a title.") and puts the old title back.

### 5. Subtasks

- Inside a task's panel, type in "Add a subtask" and press Enter. Subtasks appear as a small checklist with "0/3 done".
- Subtasks go **one level deep only**. A subtask has no subtasks of its own (the panel for a subtask simply has no subtask section, and shows a link back to its parent).
- A subtask always lives in its parent's list.
- **Ticking all the subtasks does not tick the parent.** You decide when the parent is done.
- The main list shows only the parent, with the "2/5" style progress.

### 6. Tags (labels)

- In a task's panel press **Add tags** (or **Edit tags**). Type to search your tags. Tick the ones you want.
- **Create a tag on the spot:** type a new name and press Enter (or the "Create" button). It is created and attached at once.
- Names ignore capital letters: typing "Home" when you already have "home" simply uses the existing one.
- To **rename, recolour or delete** tags, go to **Settings**, section "Tags". Deleting a tag removes it from every task but never deletes a task, and the app asks you to confirm.
- There are nine named colours to choose from (plus "none"). The colours have names, so they are not the only signal.

### 7. Lists

- The side menu has a **Lists** group with your lists, each with its emoji. The round "+" next to "Lists" makes a new one.
- **Create a list:** name (required), an emoji (optional), a colour, a description, and an optional **target date**. A list with a target date works as a **goal**: the list's heading shows "Goal: by 30 Dec (50 days left)".
- On any list page, the **"..." menu** at the top right offers: **Edit details**, **Move up**, **Move down**, **Archive**, **Delete**. (The Inbox only offers "Edit details": it cannot be renamed here, moved, archived or deleted.)
- **Archive** puts a list away without deleting anything. Archived lists leave the side menu; **Settings → Archived lists** brings them back with one button.
- **Delete** asks you to confirm and says how many tasks are inside. The whole list, with its tasks, then moves to **Trash**, and for a few seconds a message offers **Undo**. (See "A decision you made" below.)
- Reordering lists is done with Move up / Move down for now. Drag-and-drop arrives in Phase 4.

### 8. Sections

- At the bottom of a list, **Add section** creates a heading such as "Now", "Next", "Later".
- Each section has its own "Add to Now" line and a **"..." menu**: **Rename**, **Move up**, **Move down**, **Delete section**.
- Deleting a section **does not delete its tasks**. They move to the top of the list under no section (the app tells you so before you confirm).

### 9. Your day, in your own time zone

The app works out "today" and "now" using the time zone in your settings (India Standard Time to start with), not the time zone of whatever computer it runs on. That is why "Overdue" and "Today" stay right even if the server is somewhere else.

## What happens behind the scenes (for the curious)

- **Every action asks "who is this?" first.** Each button press that changes something runs a small program on the server. The first thing it does is check you are signed in, and from then on it uses **your** account's ID, never an ID the page sends. The page can ask for "task number X", but the server only ever looks for task X **among your own**.
- **Every input is checked.** Titles, dates, times, priorities, colours and names are checked on the server with fixed rules (for example a title must be 1 to 500 characters; a date must be a real date, so 30 February is refused). The same rules give you the helpful messages in the forms.
- **Failures are polite.** If something goes wrong, you see a short message (a "toast") such as "Something went wrong. Try again." The technical details go only into the server's log.
- **Order is kept with fractional indexes** (see the Phase 2 write-up). New tasks go to the end of their list. A fix was needed here: the database sorted those short order-codes ignoring capital letters, which would eventually have scrambled the order. The order columns now sort strictly letter by letter, the way the app's own code does, and tests prove it.
- **Moving a task that has subtasks** is done as one safe step behind the scenes: the subtasks are briefly detached, the task moves, and they are re-attached in the new list. Either everything moves or nothing does.
- **Trashing a task also trashes its subtasks,** and restoring brings back exactly the same ones (a subtask you trashed earlier stays in Trash).
- **A trashed list hides its tasks.** Nothing about the tasks themselves changes; they simply are not shown while the list is in Trash.
- **Self-repair.** If an account ever lacked its settings or its Inbox (which should not happen), the app creates them the next time they are needed.
- **Modules plug into the app frame.** The "Lists" group in the side menu and the "+" button are provided by the tasks module and registered in the module list. The app frame itself does not know about tasks. This keeps adding the expense tracker later cheap.
- **A small set of building blocks was added:** pop-up dialogs, confirmation dialogs, drop-down menus, select boxes, pop-over panels and text areas (all from the ready-made, keyboard-friendly set), and `date-fns`, a trusted library for date arithmetic.

## Decisions in plain words

- **A decision you made: deleting a list sends the list itself to Trash.** The plan said deleting a list should move its tasks to Trash, which only works if the list can be restored too. You picked "the list goes to Trash". So a deleted list and its tasks come back together on undo or restore. The Trash screen itself (to see, restore or empty it) arrives in Phase 5; until then the Undo message is the way back, and nothing is erased (the data is only hidden).
- **The Inbox keeps its name.** You can change its emoji, colour and description, but not its name, and it cannot be moved, archived or deleted.
- **Reordering without dragging, for now.** Move up and Move down are simple, work with a keyboard and a screen reader, and need no extra tools. Dragging comes in Phase 4 along with drag-and-drop for tasks.
- **Date picking uses the browser's own date and time boxes** instead of a calendar add-on, which keeps the app lighter and works well on phones.
- **Tags are managed in Settings, created inside tasks.** That keeps creating a tag one step, and managing them in one tidy place.
- **Instant updates are not here yet.** After you tick a task or save a field, the screen refreshes from the server a moment later. Making changes appear instantly, and rolling back if something fails, is part of Phase 5.

## How you can see it working

1. Start the database (`pnpm db:up`), fill it with demo data (`pnpm db:seed`) and start the app (`pnpm dev`).
2. Sign in as `demo@ledge.test` (the password is shown when the seed command runs).
3. Open **Home** in the side menu. You see tasks with overdue markers, priorities, tags and a "1/3" progress.
4. Click **Buy groceries**. Edit the notes, click away, and watch "Saved". Add a subtask. Set the date to Tomorrow.
5. Press the round "+" (or the `q` key), type two tasks in a row.
6. Create a list with the "+" next to Lists. Then delete it from its "..." menu and use Undo.
7. Open **Settings** to rename or recolour tags.

## What was checked, and what was not

Checked:

- 179 automatic tests pass (about 110 new). They cover: the date and time rules (including daylight-saving days, month ends and leap days, and the moment of midnight in other time zones), the ordering helpers, the input rules, and the data functions against a real database: creating, editing, moving, completing, tagging, trashing and restoring.
- A big ownership test group shows a second person **cannot read, change, move, tag, trash, restore or delete** the first person's lists, sections, tasks or tags, and cannot attach their own things to the first person's. The same group confirms the failed attempts leave the first person's data untouched.
- By hand in a browser (dark theme) with the demo account: the Inbox and list screens, quick add (several tasks in a row), inline add, the detail drawer (autosaving notes, due date picker, adding subtasks, progress), creating a list, sending a list to Trash, a deleted list's address now showing "not found", the Settings page, and the phone-size layout (the panel fills the screen).

Not done or not checked yet:

- The **light theme** was not looked at on screen in this phase (only dark).
- A full **keyboard-only walk-through** and screen-reader check come in Phase 6. Controls were built to be reachable by keyboard (Escape closes the panel, Enter adds), but it has not been tested end to end.
- **Automatic browser-clicking tests** (Playwright) are not written yet.
- There is no **Trash screen** yet, no **Today/Upcoming/All/Completed/Tag views**, no **sorting, grouping or filtering**, and no **dragging to reorder tasks**. These are Phases 4 and 5.
- **Instant (optimistic) updates**, the **undo message after completing a task or moving it**, and the other **keyboard shortcuts** (`j`/`k`, `x`, `e`, `/`, the command box) are Phase 5. (Undo after deleting a task or a list is already there.)
