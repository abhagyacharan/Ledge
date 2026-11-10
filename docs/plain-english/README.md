# Ledge in plain English

This folder explains what is being built in Ledge, one phase at a time, without technical jargon. You do not need to be a programmer to read it.

If a word is unfamiliar, look it up in [glossary.md](glossary.md).

## What is Ledge?

Ledge is a private app for managing your own life. You run it on your own computer at home, and only you use it. Version 0.1 has three parts:

1. **Sign in.** A way to create your account and log in, so nobody else can see your things.
2. **A to-do list.** The main part. Capture tasks, set due dates, group them in lists, tag them, and see them in views like "Today" and "Upcoming".
3. **An expense tracker.** Your Google Sheet, built in: income, EMIs and loans, expenses and investments, with a summary by month and by year.

Later it can grow: a calendar, notes, a goals page, a public portfolio.

## How the work is split into phases

The work is done in eleven steps, called phases, always in the same order. A phase is "done" only when its checklist is finished and the automatic checks pass.

| Phase | Name                          | Status            | Read                                                         |
| ----- | ----------------------------- | ----------------- | ------------------------------------------------------------ |
| 0     | Scaffold (the empty workshop) | Done (2026-11-10) | [phase-0-scaffold.md](phase-0-scaffold.md)                   |
| 1     | Auth (sign in and sign up)    | Done (2026-11-10) | [phase-1-auth.md](phase-1-auth.md)                           |
| 2     | Data model                    | Done (2026-11-10) | [phase-2-data-model.md](phase-2-data-model.md)               |
| 3     | Lists, tasks and tags         | Done (2026-11-10) | [phase-3-lists-tasks-tags.md](phase-3-lists-tasks-tags.md)   |
| 4     | Views (Today, Upcoming...)    | Done (2026-11-10) | [phase-4-views.md](phase-4-views.md)                         |
| 5     | Safety (undo, trash, keys)    | Done (2026-11-10) | [phase-5-safety.md](phase-5-safety.md)                       |
| 6     | Polish                        | Done (2026-11-10) | [phase-6-polish.md](phase-6-polish.md)                       |
| 7     | Expense tracker               | Done (2026-11-11) | [phase-7-expense-tracker.md](phase-7-expense-tracker.md)     |
| 8     | Frontend redesign             | Done (2026-11-11) | [phase-8-redesign.md](phase-8-redesign.md)                   |
| 9     | Deploy and backup             | Built, you deploy | [phase-9-deploy-and-backup.md](phase-9-deploy-and-backup.md) |
| 10    | Extra features (if time)      | In progress       | Written when the phase is done                               |

## Other pages

- [How the tests work](how-tests-work.md): where test data comes from, why tests were slow, and how they were sped up.
- [Glossary](glossary.md): plain meanings of technical words.

## What each future phase will do, in one paragraph

- **Phase 2: Data model (done).** See [phase-2-data-model.md](phase-2-data-model.md).
- **Phase 3: Lists, tasks and tags (done).** See [phase-3-lists-tasks-tags.md](phase-3-lists-tasks-tags.md).
- **Phase 4: Views (done).** See [phase-4-views.md](phase-4-views.md).
- **Phase 5: Safety (done).** See [phase-5-safety.md](phase-5-safety.md).
- **Phase 6: Polish (done).** See [phase-6-polish.md](phase-6-polish.md).
- **Phase 7: Expense tracker (done).** See [phase-7-expense-tracker.md](phase-7-expense-tracker.md).
- **Phase 8: Frontend redesign (done).** See [phase-8-redesign.md](phase-8-redesign.md).
- **Phase 9: Deploy and backup (built; you deploy it).** See [phase-9-deploy-and-backup.md](phase-9-deploy-and-backup.md) and the step-by-step [deploy guide](../deploy-guide.md).
- **Phase 10: Extra features, only if time remains (in progress).** See [phase-10-extra-features.md](phase-10-extra-features.md). Done so far: type tasks in plain sentences, and a board view. Still to come: search, repeating tasks, export your data, and select many tasks at once.

## The rule for keeping this folder up to date

This folder is part of the project, not an afterthought. Whenever something changes in the project, the matching file here changes in the same piece of work:

- A phase is finished: its file here is written or finished, and the table above is updated.
- Something changes inside a phase that is already written up (a decision, a feature, a limit): that phase's file is corrected.
- A new word appears that a beginner might not know: it goes into the [glossary](glossary.md).
- A decision is logged in `docs/decisions.md`: the plain-English version is added to the relevant phase file under "Decisions in plain words".

The writing rules are: short sentences, everyday words, explain a technical term the first time it appears, say "why" as well as "what", and be honest about what is not finished or not checked.
