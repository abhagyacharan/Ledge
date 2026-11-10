# Phase 2: Data model (the filing cabinet)

**Status:** Done on 2026-11-10.

## What this phase is for

Until now the app only knew about people who sign in. It had nowhere to put a task, a list, or a tag. Phase 2 builds the **filing cabinet**: the exact drawers, folders and rules for storing everything the to-do part of Ledge will need.

You will not see new screens yet. This phase is about the foundation underneath them. The screens that use it arrive in Phase 3 and Phase 4.

Think of it like building shelves before moving into a house. Nobody admires shelves, but every later step depends on them being right.

## What was built, step by step

### 1. The drawers (tables)

A **table** is one drawer in the database, holding one kind of thing. Phase 2 added six:

- **Settings (one per person).** Your personal preferences: your time zone (starts as India Standard Time), which day your week starts on (Monday), light/dark theme (follow the computer), currency (Indian rupees), and language and number style (English, India).
- **Lists.** A named container for tasks, like "Home" or "Work". Each list can have a colour, a small emoji picture, a description, an optional **target date** (this is how goals are handled: a list called "Open source" with a target date is a goal), whether it is archived (put away), its place in the order, and its view settings (see below).
- **Sections.** A heading inside a list that groups tasks, for example "Now", "Next" and "Later". Later they also become the columns of a board view.
- **Tasks.** The main thing. Each task stores: a title, notes, whether it is open or done, a priority (none, low, medium, high), an optional due date, an optional due time, which list and section it lives in, whether it is a subtask of another task, its place in the order, when it was completed, when it was moved to Trash, and, for repeating tasks, the repeat rule and how it repeats (see below).
- **Tags.** Labels you make yourself, like "bills" or "errands", each with a colour.
- **Task-tag links.** Which tags are stuck on which tasks. One task can have many tags and one tag can be on many tasks.

Every one of these records carries when it was created and last changed, and (except settings) a long random ID.

### 2. Two kinds of "when"

- **Moments in time** (created, completed, moved to Trash) are stored with their time zone attached, in a universal form. That way they mean the same thing wherever you are.
- **Due dates and due times** are stored as "floating": just "26 March, 9:30" with no time zone attached. The app reads them in your own time zone. This avoids a classic bug where daylight saving changes shift your reminders by an hour. (India has no daylight saving, but this keeps the door open for travel.)

### 3. Rules the database itself enforces

A rule written only in the app can be forgotten by a mistake. A rule built into the database cannot be broken, whatever the app does. Phase 2 puts the important rules in the database:

**Everyone stays in their own lane.**

- A list, section, task or tag link is tied to its owner in a way that makes it **impossible** to connect to someone else's list, task or tag. Even if the app had a bug that forgot to check, the database would refuse.

**Subtasks.**

- A subtask can only go **one level deep**. A subtask cannot have its own subtasks.
- A subtask must be in the **same list** as its parent, and belong to the same person.
- A task that already has subtasks cannot be turned into a subtask.
- A task cannot be its own parent.
- Deleting a parent deletes its subtasks.

**Sections.**

- A task's section must belong to the **same list** as the task.
- Deleting a section does not delete its tasks. They simply move to "no section".

**The Inbox.**

- Everyone has exactly **one Inbox**, no more.
- The Inbox **cannot be deleted**, cannot be archived, and cannot be turned into an ordinary list (or the other way round). The only exception is deleting the whole account, which removes everything that person owns.

**Tasks.**

- A title must be 1 to 500 characters. A list name must be 1 to 100 characters. A tag name 1 to 50. A section name 1 to 100.
- Priority must be from 0 (none) to 3 (high).
- A task marked "done" must have a completion time, and an open task must not. The two always agree.
- A due time needs a due date. A time without a day makes no sense.

**Tags.**

- Tag names are unique per person, ignoring capital letters: "Home" and "home" are the same tag. Two different people can each have a "home" tag.
- The same tag cannot be stuck on the same task twice.

**Cleaning up.**

- Deleting a list removes its sections and tasks. (There is an open question about this; see "What is not decided yet".)
- Deleting a tag removes only the sticker, never the task.
- Deleting an account removes all of its data.

### 4. Search that is ready for later

Each task has a hidden **search column** that the database fills in by itself from the title and the notes. It understands word forms ("paying" matches "pay"). A special index makes searching fast even with thousands of tasks. The search screen itself is a later feature (Phase 8), but the plumbing is installed and tested now. The app can never write into this column by hand, so it cannot go stale.

### 5. Speed helpers (indexes)

An **index** is like the index at the back of a book: it lets the database jump straight to the right place instead of reading every page. Added for: tasks by list and order, open tasks by due date (for Today and Upcoming), tasks by completion time (for the Completed view), tasks by parent (for subtasks), lists by order, and the search column.

### 6. Putting things in order

Lists and tasks can be reordered by dragging. Instead of numbering them 1, 2, 3 (which forces renumbering everything when you move one), each item gets a short piece of text called a **fractional index** (like "a0", "a1", "a0V"). To put an item between two others, the app invents a piece of text that sorts between them. Only the moved item changes. A small, trusted tool called `fractional-indexing` does this.

### 7. New accounts get started properly

When someone creates an account, the app now automatically creates their **settings** (with the defaults above) and their **Inbox**. It happens in one step: either both are created or neither. The step is safe to repeat; running it twice never makes a second Inbox.

### 8. A first set of "safe" functions

A few functions were written for reading and changing lists and tasks (get a list, rename a list, delete a list, get a task, change a task's title, move a task to Trash, delete a task forever). Each one **requires the signed-in person's ID and uses it every time**. If someone asks for an item that belongs to somebody else, the answer is "not found", exactly as if it did not exist. That way nobody can even discover whether another person's items exist. Phase 3 builds the rest of the app's actions on top of these.

### 9. Sample data

The command `pnpm db:seed` fills the app with a realistic demo so every screen can be tried out once it exists:

- A demo person: `demo@ledge.test`, with a simple password that is printed when the command runs. This is for your own computer only.
- Five lists: Inbox, Home, Work, Open source and Freelance. "Open source" and "Freelance" have target dates, showing how goals work. "Work" is set up for a board view with three sections.
- Five tags, and 26 tasks including: some **overdue** tasks, tasks due today with a time, tasks due later, tasks with no date, a task with **subtasks** (one already done, showing "1 of 3" style progress), **repeating** tasks (a weekly one and a monthly one), a **completed copy** of the monthly one, tasks completed on different days (for the Completed view), and one task already in the **Trash**.
- Running it again wipes the demo person and rebuilds them from scratch, so you can reset at any time.
- Safety: the command **refuses to run on a real server** (when the app is in production mode). It would never fill your real data with fake tasks.

### 10. Tests added

54 new automatic tests (68 in total now), all run against a real database. They check:

- New accounts get the right default settings and exactly one Inbox each.
- Every Inbox rule above (cannot delete, archive, duplicate, or change).
- Every subtask rule above, including the refusals.
- Every title, priority, completion and due-time rule above, including the edges (exactly 500 characters is allowed, 501 is not).
- Search finds words in titles and notes, updates when a title changes, and cannot be written by hand.
- Tag rules (case-insensitive, per person, no doubles, deleting a tag keeps the task).
- Section and list cleanup behaviour.
- The "own lane" rules: someone trying to put a task in another person's list, use their section, attach their tag, or become a subtask of their task is always refused.
- **The main ownership test the plan demanded:** a second person cannot **read**, **change** or **delete** the first person's lists or tasks through the app's functions. Each of these also has a "control" check showing the same action works fine on one's own data, so the test cannot pass merely because everything is broken.

Also checked by hand: all migrations (the numbered database change files) run cleanly on a brand-new empty database, and the database matches the code with no drift.

## Decisions in plain words

- **Rules live in the database, not only in the app.** Slightly more setup, but a mistake in the app can then never mix up two people's data. This matters most for a project that will hold a year of personal information.
- **The tag-link table also stores the owner,** which the original sketch did not list. It makes it possible for the database to guarantee tags and tasks match.
- **Search uses English word handling.** If results disappoint later, this can change.
- **The Inbox is guarded by the database too,** so even buggy code cannot delete it.
- **Sample data goes through the real sign-up,** so it also proves that the "create settings and Inbox" step works.
- **A fix to the earlier phases:** some outside tools were not locked to exact versions as Phase 0 claimed. That has been corrected. No behaviour changed.

## How you can see it working

1. Start the database: `pnpm db:up`.
2. Apply the changes: `pnpm db:migrate`.
3. Fill it with demo data: `pnpm db:seed`.
4. Look inside with `pnpm db:studio` (a visual database browser). You will see the lists, tasks and tags.
5. Sign up a brand-new account in the app, then look in the studio: it has its own settings row and its own Inbox.

The task screens themselves (Inbox, Today and so on) still show "nothing here" until Phase 3 and Phase 4, because nothing reads the data yet.

## What is not decided yet (and needs your input before Phase 3)

- **Deleting a list.** The plan says deleting a list should move its tasks to Trash, so you can undo it. But right now a list is removed for real, and its tasks go with it. There are two ways to fix this: (a) give lists their own Trash status, so a deleted list and its tasks can be restored together; or (b) keep the list in an "archived" state and send only its tasks to Trash. Option (a) feels more natural. This will be raised again at the start of Phase 3.
- **Moving a task with subtasks to another list.** Because subtasks must stay in the same list as their parent, moving a parent needs a careful multi-step move behind the scenes. It is solvable; it is just noted so it is not forgotten.

## What was not done or not checked

- No screens use the data yet, so the demo data is not visible in the app.
- The "completed copy of a repeating task" is stored, but the logic that creates it when you tick a repeating task is a later feature (Phase 8).
- A rare failure case: if creating the settings and Inbox ever failed right after an account was created, the account would exist without them. Phase 3 will make the Inbox lookup repair this automatically.
