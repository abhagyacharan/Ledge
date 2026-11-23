# Agentic workflow for Ledge

How to build Ledge with several Claude agents instead of one session doing everything. Written 2026-11-24.
The workflow itself lives in `.claude/skills/build-feature/SKILL.md` and the two agents in `.claude/agents/`.

## The idea in one paragraph

One Opus session is the **orchestrator**: it understands the feature, writes the plan, splits it into
work packages, hands each package to an **implementer** agent (Sonnet) with a written brief, checks
what comes back, has a **reviewer** agent (Opus) look for problems, then writes the docs and opens a
pull request. You make two decisions: approve the plan, and approve the push. CI checks the pull
request; you merge it.

## The pieces

| Piece            | File                                    | Model               | Job                                                                     |
| ---------------- | --------------------------------------- | ------------------- | ----------------------------------------------------------------------- |
| `/build-feature` | `.claude/skills/build-feature/SKILL.md` | your session (Opus) | The steps: understand, plan, build, review, integrate                   |
| implementer      | `.claude/agents/implementer.md`         | Sonnet              | Builds one package from a brief, runs the checks, reports               |
| reviewer         | `.claude/agents/reviewer.md`            | Opus                | Read-only review against the spec and CLAUDE.md; findings with evidence |
| Explore          | built in                                | (cheap)             | Wide searches, so file dumps do not fill the orchestrator's memory      |
| CI               | `.github/workflows/ci.yml`              | —                   | Typecheck, lint, format and tests on every pull request                 |

## What a subagent is, and what it costs

A subagent starts with an empty memory. It knows CLAUDE.md (every agent loads it) and the brief it is
given, nothing from your conversation. It works, then sends back one report. So:

- **Delegating has a fixed cost.** Someone writes the brief and the agent re-reads the code. It pays
  off only when the work is much bigger than the brief.
- **It buys three things:** work done at the same time, cheaper models for well-defined work, and an
  orchestrator whose memory stays on the plan instead of filling with file contents.
- **CLAUDE.md is paid for by every agent.** That is why it was trimmed on 2026-11-24 (history moved to
  `docs/reference/`). Keep it lean.

A **session** is different: it is a task you open, steer and review yourself (what you do today).
A **subagent** is one piece of a task, and its report goes back to the session that started it.

## Which way to do a piece of work

| The work                                             | Do it like this                                                                                                                                |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| One to a handful of small fixes (UI tweaks, a bug)   | One session, fixes one after another, checks once at the end. Sonnet is enough for clear fixes; Opus when it needs taste or the bug is unclear |
| A question or investigation                          | One session; let it use Explore for wide searches                                                                                              |
| An unrelated task while another is running           | A separate session, as you do now                                                                                                              |
| A new feature, module or phase; a big multi-file fix | `/build-feature` in an Opus session at high effort                                                                                             |
| Something huge (the mobile app)                      | Spec first, split into stages, one `/build-feature` run per stage                                                                              |

**Your example: five small UI fixes.** One session doing all five is cheapest and best. They share the
same design system, so one agent learns it once. Opus planning plus five Sonnet agents would cost
about as much in briefs as the fixes themselves, and five agents in `globals.css` would collide.

**Picking a model:** Opus for planning, specs, design calls, unclear bugs and review. Sonnet for
carrying out a clear plan. Haiku or Explore for searching and mechanical edits. Effort high or extra
high for the orchestrator; normal for implementers.

## How to use it, step by step

1. **Open a new session** in the Ledge folder. Pick **Opus**, effort **high** (extra high for something
   like the mobile app plan).
2. **Start it:** `/build-feature <what you want>` and, if you have one, the spec:
   `/build-feature task reminders docs/reminders-spec.md`. No spec? It writes one with you first and
   asks its open questions. Answer those; that is where your judgement matters most.
3. **Stop point 1, the plan.** It shows a table of packages: id, name, model, what each depends on,
   which files each may touch. Check that:
   - each package is a sensible piece of work, and no two touch the same files;
   - the data package (database, ownership test) comes first;
   - Opus is used only where judgement is needed.
     Say "go", or change it ("merge wp3 and wp4", "wp2 should be Opus").
4. **Build.** It creates a branch (`feat/<name>`) and starts the agents. Dependent packages go one at
   a time; independent ones run together, each in its own git worktree (a separate copy of the code in
   `.claude/worktrees/`, so they never edit the same files). Each has its own test database
   (`ledge_wp2_test` and so on). You can watch or do other things. It checks each agent's diff and
   checks itself; a report is not proof.
5. **Review.** The reviewer reads the whole change against the spec and CLAUDE.md (ownership first).
   The orchestrator fixes what must be fixed and checks the UI in the browser.
6. **Stop point 2, the push.** It tells you what was built, what the review found, and what is
   unchecked. Say yes and it pushes the branch and opens a pull request. CI runs on it.
7. **Merge** the pull request on GitHub when CI is green and you are happy (later this can be required
   by the ruleset; see below). Then on the server: `sh scripts/deploy.sh`.

## Rules that keep it safe

- Agents never commit, push or edit CLAUDE.md and the docs; the orchestrator does, once.
- No two agents write the same file at the same time.
- No new dependencies, migrations or env vars unless the plan says so.
- Every pull request passes CI before it is merged.
- Nothing is pushed without your yes.

## Suggested next steps

- **First run:** task reminders (`docs/reminders-spec.md`, a draft). It has a data part, a server part
  and UI parts: a good size to learn on.
- **After it works:** change the "Protect main" ruleset so `main` only accepts pull requests that pass
  CI. Then agent work always goes through review.
- **Measure:** after a run, use `/explain-usage` to see where the tokens went, and note what you learn
  below.
- **Other projects:** once it has worked a few times, copy the skill and the two agents to
  `~/.claude/skills/` and `~/.claude/agents/`, and take the Ledge-specific lines (CLAUDE.md sections,
  pnpm commands, test database names) out into a short "project notes" part each project fills in.

## Lessons

_Add a line after each run: what went well, what to change in the skill or agents._

- 2026-11-24, reminders (Phase 16): four packages, three in parallel worktrees, then two fix packages after the review. Worked: freezing shared contracts (payload, routes, helper names) in the plan let parallel packages fit together with no merge conflicts. Change: (1) worktrees start from `main`, not the feature branch, so every brief must say to `git reset --hard <feature branch>` first; (2) a mocked dependency hid a crash (web-push 4 has no default export) — tell implementers to import a new package once for real (`node -e "import('pkg')"`) as well as mocking it; (3) the reviewer found three real must-fixes (a snooze swallowing the next round, a half-typed Custom reminder ringing, an open endpoint letting any account make the server call home-network addresses), so keep the Opus review; (4) `guarded()` turns Zod refusals into a generic message, so a UI that matches an error text needs the action to return that text itself.
