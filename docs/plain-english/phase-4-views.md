# Phase 4: Views (seeing your tasks the way you need them)

**Status:** Done on 2026-11-10.

## What this phase is for

By the end of Phase 3 you could add and edit tasks, but you could only look at them one list at a time. Phase 4 adds the different **windows onto your tasks**: "what is due today?", "what is coming up?", "everything with the tag bills", "what did I finish?". It also lets you **sort, group and filter** a list, and **drag tasks into the order you want**.

## The views

All of them live in the side menu. Every view lets you click a task to open its detail panel, and every row shows which list the task belongs to (when the view mixes lists).

### Today

- At the top, the date in words ("Tuesday, 10 November").
- An **Overdue** block comes first. It lists tasks whose date is in the past, oldest first, and tasks due today whose time has already passed. It has a warning icon, red text and the word "Overdue", so it never depends on colour alone.
- Then a **Today** block: tasks due today, ordered by time (tasks with a time first, earliest first), then by priority (high first).
- A task due today with no time is **not overdue** until tomorrow.
- At the bottom, "Add a task for today" adds a task to your Inbox with today's date.
- If nothing is due, you see a short message and an "Add a task" button.

### Upcoming

- The next 14 days, from tomorrow on, **grouped by day**, each day headed like "Tomorrow · 11 Nov" or "Friday · 13 Nov".
- Tasks with no date are left out, and so are overdue tasks and today's tasks (they live in Today).
- "Add a task for tomorrow" at the bottom.

### All tasks

- Every task in every list, starting sorted by due date.
- You can change how it is sorted, grouped and filtered (see below). Your choices are written into the **web address**, so you can bookmark a particular view, and the browser's Back button works.
- Tasks that have subtasks show their progress ("1/2").

### Completed

- Finished tasks, **newest first, grouped by the day you finished them** ("Today · 10 Nov", "Yesterday · 9 Nov", and so on). "The day" is worked out in your own time zone.
- It shows your 200 most recent finished tasks.

### Tag view

- Click a tag in the new **Tags** group of the side menu to see every task with that tag, from every list.
- Same sort, group and filter controls as All tasks. "Add a task tagged ..." creates a task in your Inbox that already has the tag.

### Inbox and your lists

- These now have the sort, group and filter controls too, and **each list remembers its own choices**, even after you close the app.

### Which tasks never appear in these views

Tasks in the Trash, tasks in a list that is in the Trash, and tasks in an **archived** list. Archiving means "put away", so its tasks leave Today, Upcoming, All and the rest. Unarchive the list to get them back.

## Sorting, grouping and filtering

A **View** button (with a small number on it when something is changed) opens a panel:

- **Sort by:** Manual (your own order, lists only), Due date, Priority, or Newest first.
- **Group by:** No grouping, Due date (Overdue, Today, Tomorrow, Next 7 days, Later, No date), Priority (High to None), or Tag (a task with two tags appears under both; tasks with no tag go last).
- **Show only:** a tag, a priority, tasks with or without a due date.
- **Show completed tasks:** off by default. Finished tasks, when shown, go to the bottom of each group.
- **Reset view** puts everything back.

Details worth knowing:

- Sorting by due date puts earlier dates first and tasks with no date last; on the same day, timed tasks come before untimed ones. Ties are broken by priority and then your manual order.
- On a list, **sections and dragging only show when the sort is Manual and nothing is grouped**. With any other sort or grouping you see a flat, grouped list, with a note and a "Back to manual order" button.
- If your filters hide everything, a message says "No tasks match this view" with a Reset button.

## Dragging tasks into order

- Each task has a **grip handle** on its left (six dots). Drag it with the mouse or your finger. The handle, not the whole row, is what you grab, so scrolling on a phone still works.
- **With the keyboard:** Tab to a handle, press **Space** to pick the task up, use the **arrow keys** to move it, **Space** to drop it, **Escape** to cancel. A screen reader announces what is happening.
- You can reorder inside a section, or drag a task into another section.
- The new order shows **instantly**. If saving fails, the old order comes back and an error message appears.
- The order is saved and survives a reload.
- Behind the scenes only the moved task changes: it gets a new short order-code that sorts between its two new neighbours (see "fractional index" in the glossary). The server checks that both neighbours are really yours, in the same list, before trusting the request.

## New states: loading, empty and error

- **Loading:** while a view is fetched you see grey placeholder bars shaped like a task list, so the page does not jump when the content arrives.
- **Empty:** every view has its own short message and, where it makes sense, one button ("Add a task").
- **Error:** if a page fails to load, you see "Something went wrong. This page couldn't load. Your tasks are safe." with a "Try again" button.
- **Not found:** a list or tag that does not exist, or belongs to somebody else, shows "We couldn't find that" with a button back to your Inbox. Someone else's list looks exactly like a missing one.

## Smaller changes

- **Opening a task keeps your view settings.** Before, clicking a task would have dropped choices such as "group by tag" from the address; now they are kept, and closing the panel returns you to the same view.
- **The side menu** gained "All tasks", "Completed" and a "Tags" group (each tag with its colour dot).
- **Inline add** now exists on Today, Upcoming, All and the Tag view (not on Completed, where adding a finished task makes no sense).
- **Quick add** can be opened from an empty-state button as well as the "+" and the `q` key.
- **The demo data** gained a task "Call mom", due today with no time, so the Today view always has something in its "Today" block regardless of the clock.
- **Tests got faster** (see "How the tests work").

## Decisions in plain words

- **"Next 14 days" means tomorrow through 14 days from today.** Today has its own view.
- **Archived lists hide their tasks from every view.** Put away means put away.
- **All and Tag keep their choices in the web address; lists keep theirs in the database.** Views that mix lists have no list to save on, and an address can be bookmarked.
- **A grip handle instead of dragging the whole row.** It works with fingers and keyboards.
- **The date views are fixed on purpose.** Today, Upcoming and Completed have a fixed order because that is what they are for; only lists, All and Tag are customisable.
- **"Newest first" for the Created sort.** It is the more useful direction; the plan only said "created".

## How you can see it working

1. Start the database, seed demo data and start the app: `pnpm db:up`, `pnpm db:seed`, `pnpm dev`. Sign in as `demo@ledge.test`.
2. Open **Today**: overdue tasks first, then "Call mom".
3. Open **All tasks**, press **View**, group by **Priority**. Look at the web address.
4. Open a tag in the side menu. Open **Completed**.
5. Open **Home**. Drag a task by its grip, or Tab to it and use Space and the arrow keys. Reload: the order stays.
6. Press **View** on Home, sort by **Due date**, reload: it is remembered.

## What was checked, and what was not

Checked:

- **237 automatic tests pass** in about 15 seconds. New ones cover: sorting, grouping and filtering (every sort, every group, tie-breaking, tag groups, finished tasks last), the Today split (overdue by date and by passed time, a task with no time is never overdue), Upcoming (both ends of the 14 days, month and year boundaries), Completed by day in different time zones, the saved-settings reading and the URL round trip, and the date headings.
- **Database tests** confirm each view returns the right tasks, hides trashed tasks, trashed lists and archived lists, never returns another person's tasks, and that reordering works (between two tasks, to the top and bottom, many times in a row, into another section) and **refuses** neighbours from another list, another parent or another person.
- **5 end-to-end tests pass** in a real Chrome browser against their own database: signing in, the Today view (overdue first, "Call mom" under Today, later tasks absent, the word "Overdue" present), Upcoming (what is in and out), creating a list then **dragging with the keyboard and reloading to check the order is kept**, and a list remembering its sort.
- By hand in the browser: Today, All tasks grouped by priority, Completed, the not-found page and the loading placeholder.

Not done or not checked yet:

- **Light theme** and **phone-size dragging** were not looked at on screen.
- A full **keyboard-only walk-through** and a **screen-reader** check are part of Phase 6 (only the drag handle was tested with the keyboard).
- The **Trash screen**, **undo after completing or moving**, **instant updates for ticking tasks**, and the other **keyboard shortcuts** and command box are Phase 5.
- **Dragging subtasks** within a task, and dragging to reorder lists in the side menu, are not built (lists still use Move up and Move down).
- The **board view** (columns) is a later optional feature (Phase 8).
