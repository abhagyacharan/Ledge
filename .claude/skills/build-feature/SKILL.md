---
name: build-feature
description: Plan a big Ledge feature or fix with Opus, build it with Sonnet implementer agents (in parallel worktrees where packages are independent), review it with an Opus reviewer, then integrate, document and open a pull request. Use when O asks to build a new feature, a module, a phase or a large multi-file fix. Not for small fixes (do those in one session).
---

# /build-feature

You are the **orchestrator**: an Opus session at high effort. You think, plan, brief, check and
integrate. The `implementer` agents (Sonnet) write the code; the `reviewer` agent (Opus, read-only)
checks it. O decides at the two stop points. The full guide for O is `docs/agentic-workflow.md`.

Arguments: what to build, and optionally a spec path (`/build-feature reminders docs/reminders-spec.md`).

## 0. Is this the right tool?

Use the workflow only when the work is big: several files across layers (schema, data, actions, UI),
or more than about an hour of focused work. Otherwise say so in one line and do it directly in this
session. Five small UI fixes are one session, done one after another, not five agents.

## 1. Understand (orchestrator)

- CLAUDE.md is loaded. Read `docs/decisions.md` and the spec if there is one. Read the code the feature
  touches; for wide searches use the Explore agent so file dumps stay out of your context.
- If the feature changes §1 scope, §5 auth, §6 priorities or another rule that needs O's OK (§17.3),
  or if there is no spec yet: write or finish the spec in `docs/<feature>-spec.md`, list the open
  questions, and ask O. Do not plan packages on open questions.

## 2. Plan the packages (orchestrator)

Append a **Build plan** section to the spec. Each work package gets:

```
### wp<N>: <name>
Model: sonnet | opus      (opus only for packages that need real judgement: tricky logic, security, a design call)
Depends on: none | wp<M>
Files: <exact files or folders it may create or change>
Do: <what to build, with the spec sections it follows>
Done when: <checkable list: behaviour, tests, states>
Out of scope: <what not to touch>
```

Rules for cutting packages:
- Split by layer or by independent slice, never so that two packages edit the same file. Files shared
  by everything (migrations, `src/server/db/schema/*`, `src/config/modules.ts`, `globals.css`) belong
  to one early package that the others depend on.
- The first package is usually **data**: migration, schema, data functions, Zod, ownership test. Later
  packages (actions, UI pieces) depend on it and can often run in parallel with each other.
- Aim for 2 to 6 packages. One package means no workflow is needed; more than 6 means the feature
  should be split into stages.
- Docs (CLAUDE.md, decisions, plain-English) are never a package: you write them in step 5.

**Stop point 1.** Show O the packages (a short table: id, name, model, depends on, files) and the
order. Wait for O's go-ahead or changes. Do not spawn agents before that.

## 3. Build (implementer agents)

- Create a branch for the feature first: `git switch -c feat/<feature>` from an up-to-date `main`.
  Commit the spec and plan on it.
- Run packages in dependency order. Packages with no dependency between them and no shared files run
  **at the same time**, each with `isolation: "worktree"` so they work on separate copies. A package
  that the next ones depend on runs alone, in this checkout, and you commit it before starting them.
- Spawn each one with `subagent_type: "implementer"` (or the model the plan names) and a brief that
  stands on its own. The agent knows only CLAUDE.md and what you write:

  ```
  Package: wp<N> <name>   (use wp<N> for the test database name)
  Feature and spec: <one paragraph of what the feature is> — spec: docs/<feature>-spec.md §<sections>
  Already in place: <what earlier packages built: files, function names, schema columns>
  Do: <from the plan>
  Files you may touch: <from the plan>
  Done when: <from the plan>
  Out of scope: <from the plan>
  ```

- When an agent reports, **check its work yourself**: read the diff (`git diff` here, or the
  worktree's branch), and confirm its checks really passed. A report is not proof.
- Bring worktree results in by merging or cherry-picking their commits onto the feature branch (ask the
  agent's worktree branch name from the result). Then run `pnpm typecheck && pnpm lint && pnpm test`
  on the combined branch.
- A blocked or failed package: fix small things yourself; for bigger ones send a follow-up to the same
  agent (SendMessage) with what is wrong, rather than starting a new one.

## 4. Review (reviewer agent)

Spawn `subagent_type: "reviewer"` with the spec path, the package list, and how to see the change
(`git diff main...feat/<feature>`). Fix every **Must fix** (yourself or through an implementer), and
the **Should fix** items that are cheap. If the change has UI, check it in the browser (preview tools,
desktop and phone width, light and dark) and say what you could not check.

## 5. Integrate (orchestrator)

- Update CLAUDE.md per §17.2 (status snapshot, §4 layout, §14 phase, test run; append to
  `docs/reference/claude-md-changelog.md`), `docs/decisions.md`, `docs/plain-english/`, README and
  `.env.example` if they apply.
- Commits follow §9: Conventional Commits, one logical change each, no `Co-Authored-By` lines.

**Stop point 2.** Tell O what was built, what the review found and fixed, what is unchecked, and ask
before pushing. On O's yes: push the branch and open a pull request (`gh pr create`, body from the
repo's template). CI must pass. O merges.

## 6. Report

Finish with: the PR link, the packages and who built them, the checks and CI result, the review
verdict, and what is still unchecked (phone, real Groq key, e2e). Note any lesson for this workflow in
`docs/agentic-workflow.md` ("Lessons" section) so the next run is better.
