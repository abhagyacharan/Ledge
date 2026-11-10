# Phase 5: Safety (nothing is lost by accident, and it feels instant)

**Status:** Done on 2026-11-10. With this phase, every must-have (P0) feature in the plan is built.

## What this phase is for

A daily app has to forgive mistakes and not make you wait. This phase adds the safety net (Undo and a Trash you can restore from), makes changes appear **instantly**, and adds **keyboard shortcuts** and a **command box** so you can move around without touching the mouse.

## Undo

A small message pops up at the bottom of the screen for **5 seconds** with an **Undo** button after you:

- **Complete a task** ("Completed 'Buy milk'"). Undo reopens it.
- **Move a task to another list** ("Moved to Work"). Undo puts it back in its old list and section.
- **Delete a task** ("Task moved to Trash"). Undo brings it back.
- **Delete a list** ("Moved 'Home' to Trash"). Undo brings back the list and all its tasks.

## The Trash

A new **Trash** page in the side menu.

- Deleting a task or list never erases it. It moves to the Trash and waits there for **30 days**. (Since Phase 7, money entries from the expense tracker use the same Trash, with the same restore, delete forever and 30-day clean-up.)
- For each item the Trash shows what it is, where it came from ("In Home", "Subtask of Plan trip in Home", or "List with 4 tasks") and how many days are left before it is erased for good.
- **Restore** puts it back where it was.
- **Delete forever** erases it at once, after a confirmation. It only works on items that are in the Trash; it can never erase a live task.
- **Empty Trash** erases everything in it, after a confirmation.
- Things trashed together come back together: a list returns with its tasks, and a task returns with the subtasks that were deleted with it (a subtask you deleted on its own earlier stays in the Trash until you restore it).
- **Automatic clean-up:** items older than 30 days are erased for good. The app checks for them when you load a page, at most once an hour, so there is no separate scheduled program to keep running. It only ever looks at your own items.

## Instant changes (and what happens if something fails)

Before, you ticked a task and waited a moment for the screen to catch up. Now the screen changes **immediately** and the app saves in the background. If saving fails (for example you lost your connection), the screen **goes back** to how it was and an error message tells you.

This applies to: ticking a task, and everything you pick in the task panel (due date and time, priority, list, section and tags). Typing in the title and notes boxes already showed your text as you typed; if saving them fails, the saved text comes back. Dragging tasks into order was already instant.

## Keyboard shortcuts

Plain keys work when you are **not typing in a box** and no pop-up is open. Press **?** at any time to see this list on screen.

| Keys                    | What it does                                        |
| ----------------------- | --------------------------------------------------- |
| Ctrl+K (Cmd+K on a Mac) | Opens the command palette (works even while typing) |
| /                       | Opens the command palette to jump somewhere         |
| q                       | Quick add a task                                    |
| j, or the Down arrow    | Select the next task                                |
| k, or the Up arrow      | Select the previous task                            |
| Enter                   | Open the selected task                              |
| x                       | Tick or untick the selected task                    |
| e                       | Open the selected task with its title ready to edit |
| Esc                     | Close the task panel or a pop-up                    |
| ?                       | Show the shortcut list                              |

"Selected" means the task has the keyboard cursor on it (it shows a focus ring). The arrow keys only move the selection while a task is selected, so the page still scrolls normally with them otherwise.

## The command palette

A search box that pops up in the middle of the screen. Start typing and it narrows the choices; Enter picks the highlighted one; Esc closes it. It offers:

- **Actions:** New task, New list, Show keyboard shortcuts, Switch theme, Sign out.
- **Go to:** every view (Inbox, Today, Upcoming, All tasks, Completed, Trash, Settings).
- **Lists:** every list. **Tags:** every tag.

**A note about `/`:** the plan lists `/` as "search". Real searching of the words inside your tasks is a later, optional feature (Phase 10). For now `/` opens the palette, which can jump to any view, list or tag.

## Bugs found and fixed along the way

- The ready-made command-box component had two faults that the new tests caught: its pop-up had **no accessible name** (a screen reader could not tell what it was) and it **crashed** when opened. Both were fixed.
- The drag-and-drop tool produced element names that differed between the server and the browser, causing a harmless-looking warning. It now uses a fixed name per list.

## Decisions in plain words

- **Clean-up when you load a page, not a timer.** A home server has nothing else scheduling jobs; this needs no extra moving part.
- **5 seconds for Undo,** as the plan says.
- **Selection is the real keyboard focus.** That means Enter, Tab and screen readers work naturally with it.
- **`/` opens the palette** until real text search exists.
- **Not built yet:** the extra shortcuts "g then i/t/u" (go to Inbox, Today, Upcoming), "d" (set date) and "p" (set priority). They are optional (P1).

## How you can see it working

1. Sign in as the demo user. Press **q**, type a task, press Enter (it stays open for the next one), press Esc.
2. Tick the task. A message appears with **Undo**. Press it.
3. Press **j** a few times, then **x**, then **e**.
4. Press **Ctrl+K**, type "upcoming", press Enter. Press **?**.
5. Open a task, choose **Move to Trash**, then open **Trash** in the side menu and **Restore** it.

## What was checked, and what was not

Checked:

- **250 automatic tests pass** (13 new for the Trash). They cover: the Trash listing (lists with task counts, tasks in live lists, subtasks trashed with their parent, a subtask trashed alone), delete forever (only items in the Trash, never live ones), empty Trash, the 30-day clean-up (31 days old is erased, 29 is kept, only your own items, the clock can be moved in tests), and that another person can never see or erase your Trash.
- **10 browser tests pass** in Chrome. New ones: quick-add with `q` then complete and **Undo**; open a task, edit title, notes and priority, and see them after a **reload**; delete a task, **Undo**, then delete again and **restore** it from the Trash page, then delete it **forever**; restore the demo data's trashed task; and the shortcuts (`?`, `j`/`k`, `x`, `e`, Esc, Ctrl+K, `/`).

Not checked yet:

- **Optimistic rollback on a real failure** (for example going offline mid-save) was not simulated; the code path is the same one that shows the error message.
- **Phone-size use** of the Trash and the palette, the **light theme**, and a **screen-reader** check are part of Phase 6.
- Shortcuts were tested with a physical-style keyboard in desktop Chrome only.
