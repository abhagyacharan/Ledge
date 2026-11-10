# Ledge in plain English

This folder explains what is being built in Ledge, one phase at a time, without technical jargon. You do not need to be a programmer to read it.

If a word is unfamiliar, look it up in [glossary.md](glossary.md).

## What is Ledge?

Ledge is a private app for managing your own life. You run it on your own computer at home, and only you use it. Version 0.1 has three parts:

1. **Sign in.** A way to create your account and log in, so nobody else can see your things.
2. **A to-do list.** The main part. Capture tasks, set due dates, group them in lists, tag them, and see them in views like "Today" and "Upcoming".
3. **An expense tracker.** Not designed yet. Only an empty place for it is prepared, until you describe what you want.

Later it can grow: a calendar, notes, a goals page, a public portfolio.

## How the work is split into phases

The work is done in ten steps, called phases, always in the same order. A phase is "done" only when its checklist is finished and the automatic checks pass.

| Phase | Name                          | Status            | Read                                           |
| ----- | ----------------------------- | ----------------- | ---------------------------------------------- |
| 0     | Scaffold (the empty workshop) | Done (2026-11-10) | [phase-0-scaffold.md](phase-0-scaffold.md)     |
| 1     | Auth (sign in and sign up)    | Done (2026-11-10) | [phase-1-auth.md](phase-1-auth.md)             |
| 2     | Data model                    | Done (2026-11-10) | [phase-2-data-model.md](phase-2-data-model.md) |
| 3     | Lists, tasks and tags         | Next              | Written when the phase is done                 |
| 4     | Views (Today, Upcoming...)    | Not started       | Written when the phase is done                 |
| 5     | Safety (undo, trash, keys)    | Not started       | Written when the phase is done                 |
| 6     | Polish                        | Not started       | Written when the phase is done                 |
| 7     | Deploy and backup             | Not started       | Written when the phase is done                 |
| 8     | Extra features (if time)      | Not started       | Written when the phase is done                 |
| 9     | Expenses placeholder          | Not started       | Written when the phase is done                 |

## What each future phase will do, in one paragraph

- **Phase 2: Data model (done).** See [phase-2-data-model.md](phase-2-data-model.md).
- **Phase 3: Lists, tasks and tags.** The first time you can actually use it. Add a task quickly, tick it off, open it to edit every detail, break it into sub-steps, give it a due date and a priority, group tasks into lists and sections, and label them with tags.
- **Phase 4: Views.** Ready-made ways of looking at your tasks: Inbox, Today (overdue first), Upcoming (next two weeks), All, Completed, each list and each tag. You can sort, group and filter them, and drag tasks to reorder.
- **Phase 5: Safety.** Nothing gets lost by accident. An "Undo" message after you complete or delete something, a Trash you can restore from (emptied after 30 days), instant-feeling updates, and keyboard shortcuts plus a search-everything command box.
- **Phase 6: Polish.** Go through every screen to make it pleasant: empty screens that say what to do next, loading placeholders, error messages in friendly words, phone-size layout, dark mode, and use with a keyboard only.
- **Phase 7: Deploy and backup.** Put the app on the home server so you can use it every day, reachable safely from outside. Set up an automatic nightly backup, copy it to another place, and prove once that a backup can really be restored. Then close sign-ups so only your account exists.
- **Phase 8: Extra features, only if time remains.** Type tasks in plain sentences ("pay rent tomorrow 5pm"), a board view, search, repeating tasks, export your data, and select many tasks at once.
- **Phase 9: Expenses placeholder.** A hidden, empty spot for the expense tracker, plus the careful money-handling code it will need (money is stored as whole paise, never decimals, to avoid rounding mistakes). The real tracker waits for your description.

## The rule for keeping this folder up to date

This folder is part of the project, not an afterthought. Whenever something changes in the project, the matching file here changes in the same piece of work:

- A phase is finished: its file here is written or finished, and the table above is updated.
- Something changes inside a phase that is already written up (a decision, a feature, a limit): that phase's file is corrected.
- A new word appears that a beginner might not know: it goes into the [glossary](glossary.md).
- A decision is logged in `docs/decisions.md`: the plain-English version is added to the relevant phase file under "Decisions in plain words".

The writing rules are: short sentences, everyday words, explain a technical term the first time it appears, say "why" as well as "what", and be honest about what is not finished or not checked.
