# CLAUDE.md: Ledge

> **This file is a living document.** Claude keeps it accurate as part of the work (see §17). Stale instructions are worse than none.

## Status snapshot

_Updated by Claude per §17. If this block disagrees with the repo (git log, file tree, `package.json`), the repo wins: fix this block and tell O._

- **Last updated:** 2026-11-24
- **Current phase:** **Phase 10: P1 items** (Phases 0 to 8 done; Phase 9 built and verified locally, O began deploying by hand on 2026-11-12 (Ledge route added to his existing Cloudflare tunnel; HTTPS check, account creation and step 9 backups still to do); Phase 11 Journal built, its e2e run still pending (pnpm runs again as of 2026-11-24); Phase 12 Voice capture built 2026-11-15; Phase 14 goal planner and multilingual voice built 2026-11-22, planner tried with the real Groq key, other languages not yet spoken; Phase 15 Plans module built 2026-11-23 from O's Claude Design screens, tried end to end with the real Groq key on desktop, phone polish to come; Settings redesign (screens 9a to 9p) built 2026-11-23)
- **Start date:** 2026-11-10 (Phase 0 began; the §14 stop line is relative to it)
- **Versions in use:** see §3
- **Last verified test run:** 2026-11-23 (GitHub cleanup: CI workflow, README, design exports left out of Prettier): `typecheck`, `lint` and `format:check` clean, all 779 Vitest tests pass (run with `node`), and the same checks pass in GitHub Actions CI on `main`. Older runs: `docs/reference/test-runs.md`.
- **Open blockers:** none
- **Enabled modules:** expenses ("Expense Tracker": summary, income, EMIs and loans, expenses, investments); todos ("Tasks": overview, today, upcoming, all, completed, lists); journal ("Journal": one page per day with the day's facts, mood, day picker; optional PIN lock); voice capture (app-wide, hold + to speak, eleven languages; needs `GROQ_API_KEY`); plans ("Plans": saved plans with history, new-plan flow, card review, plan pages; needs `GROQ_API_KEY`); AI usage card in Settings; Settings in sections (account with optional photo, sign-in and devices, appearance, voice and AI, journal lock, tasks, reports and export, delete account); Google sign-in (needs `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`) and forgot password (needs `RESEND_API_KEY` in production)

**Reference files** (moved out of this file to keep it short; read the one that matches your task):

- `docs/reference/test-runs.md`: every earlier verified test run, with what was and was not checked
- `docs/reference/completed-phases.md`: deliverables and exit criteria of finished Phases 0 to 8
- `docs/reference/claude-md-changelog.md`: the §18 change log of this file

---

## 1. What we are building

A self-hosted personal life-management app that the owner (O) will use daily for a year or more. Version 0.1 covers **auth, a to-do/task manager, and an expense tracker**. Later modules might include a calendar, notes, a goals dashboard, and a public portfolio, so the architecture must make adding modules cheap.

**Quality bar:** a proper app O is happy to use every day, not a throwaway MVP. Scope is deliberately small so it can be finished _well_ in about 5 days.

### v0.1 scope

1. **Auth**: sign up, sign in, sign out, sessions, protected routes (§5).
2. **To-do tracker**: the main deliverable, specified in §6.
3. **Expense tracker**: income, EMIs and loans, expenses and investments with a monthly and yearly summary, modelled on O's Google Sheet. Specified in `docs/expenses-spec.md`; built in Phase 7 (§7).
4. **Journal** (added at O's request, 2026-11-12): one private page per day with plain facts about the day from Tasks and Expenses, an optional mood and a day picker. Specified in `docs/journal-spec.md`; built in Phase 11.

### Non-goals for v0.1 (do not build, even if tempting)

Social features, blogs (posting journal entries publicly is parked in `docs/ideas.md`), public profile or portfolio (the one public page about Ledge itself, `/welcome`, was built at O's request on 2026-11-21), calendar sync, push or email notifications, native mobile app, real-time collaboration, AI features beyond voice capture and the goal planner (O chose Groq for voice on 2026-11-15, `docs/voice-spec.md`, and asked for the planner and multilingual voice on 2026-11-22, `docs/planner-spec.md`; the journal's AI ideas stay parked), file attachments, i18n, rich-text editor, team or shared workspaces, billing.

Park any new idea in `docs/ideas.md` instead of building it.

---

## 2. Working agreement (how Claude should work in this repo)

1. At the start of each session, read this file and `docs/decisions.md`, then check the status snapshot against the repo (§17.5).
2. **Plan before big changes.** List the files you will create or touch, then proceed. For a new feature or a large multi-file fix, O may run `/build-feature` (Opus plans, Sonnet `implementer` agents build, an Opus `reviewer` checks; `docs/agentic-workflow.md`). Small fixes stay in one session.
3. Work in small, reviewable steps. Before saying a task is done, run `pnpm typecheck && pnpm lint && pnpm test` and report the result honestly.
4. **Do not invent library APIs.** Libraries move fast. Check the current official docs before using an API you are not sure about. Use the latest stable versions, pinned in `package.json`.
5. Do not add a dependency without saying why. Prefer fewer dependencies.
6. When something is ambiguous (especially anything beyond `docs/expenses-spec.md`), **ask**. Do not guess.
7. Do not expand scope. Anything not in §1 or §6 goes to `docs/ideas.md`.
8. When a decision is made or changed, append it to `docs/decisions.md` (date, decision, reason).
9. Keep `README.md` accurate: setup, env vars, run, deploy, backup and restore.
10. Never commit secrets. `.env` is gitignored; `.env.example` is committed and kept current.
11. **Keep this file true.** When something important to the project changes, update this file in the same change, following §17. Report what you changed in it when you finish.
12. Work phase by phase (§14). Do not start phase N+1 until phase N's exit criteria are met, except where §14 says otherwise.
13. **Keep the plain-English docs in step.** `docs/plain-english/` explains the project to a non-programmer, phase by phase, plus a glossary. Whenever you finish a phase or change anything those write-ups describe (a feature, a decision, a limit, a command, a setting), update the matching file in the same change. Write in short sentences and everyday words, explain each technical term the first time, say why as well as what, leave no detail out, and be honest about what is unfinished or unchecked. Rules and status table: `docs/plain-english/README.md`.

---

## 3. Tech stack (decided; do not swap without logging a reason)

| Concern                   | Choice                                                                                               | Why                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Framework                 | **Next.js** (App Router) + **TypeScript (strict)**                                                   | Same stack as O's other projects, so this doubles as practice                    |
| Styling                   | **Tailwind CSS** + **shadcn/ui** (Radix primitives)                                                  | Fast, accessible, easy to restyle                                                |
| Database                  | **PostgreSQL**                                                                                       | Reliable, and works with pgvector later                                          |
| ORM / migrations          | **Drizzle ORM** + drizzle-kit                                                                        | Typed, SQL-close, light                                                          |
| Auth                      | **Better Auth** (email and password, DB sessions)                                                    | Do not hand-roll auth                                                            |
| Validation                | **Zod** at every boundary                                                                            | One schema for client and server                                                 |
| Data fetching / mutations | Server Components + Server Actions; TanStack Query only where optimistic client state needs it       | Keep it simple                                                                   |
| Dates                     | **date-fns** + **chrono-node** (natural-language dates)                                              | Avoid hand-written date math                                                     |
| Drag and drop             | **dnd-kit**                                                                                          | Accessible reordering                                                            |
| Command palette           | **cmdk**                                                                                             | Standard                                                                         |
| Sheets, motion, numbers   | **Base UI** Drawer (swipe sheets), **Motion** (enter/exit, layout), **NumberFlow** (rolling figures) | From Emil Kowalski's curated list (2026-11-11); Radix stays for other primitives |
| Ordering                  | **fractional-indexing** (string `position` column)                                                   | Reorder without rewriting rows                                                   |
| Tests                     | **Vitest** (unit and integration), **Playwright** (3 to 5 critical flows)                            |                                                                                  |
| Package manager           | **pnpm**                                                                                             |                                                                                  |
| Deploy                    | **Docker Compose** on the home server, exposed via **Cloudflare Tunnel or Tailscale**                | Cookies need HTTPS                                                               |

Next.js and Better Auth APIs change between versions. **Verify against current docs before writing code.**

**Versions in use** (recorded 2026-11-10; update on any major bump): Node 26.2.0, pnpm 12.18.0, Next.js 16.4.5, React 19.3.0, TypeScript 5.9.3, Tailwind 4.3.5, shadcn CLI 4.23.0 (style `radix-nova`, Radix primitives, `cn` package for class merging), Better Auth 1.7.18, Drizzle ORM 0.45.4 + drizzle-kit 0.31.11, `pg` 8.23.1, Zod 4.6.7, date-fns 4.4.0, fractional-indexing 4.0.0, dnd-kit core 6.3.1 + sortable 10.0.0, cmdk 1.1.1, Base UI 1.9.0 (`@base-ui/react`, Drawer only), Motion 14.6.0, NumberFlow 0.6.2 (`@number-flow/react`), Vitest 5.1.0, Playwright 1.65.0, PostgreSQL 18.

**Next.js 16 notes** (verified in `node_modules/next/dist/docs/`; `AGENTS.md` says to read them before writing Next code): `middleware` is now `proxy` (`src/proxy.ts`); `LayoutProps<"/">` types come from `next typegen`, which `pnpm typecheck` runs first; Cache Components is off (see `docs/decisions.md`).

---

## 4. Project structure

```
.env.example  .gitignore  README.md  CLAUDE.md  AGENTS.md (Next.js agent notes)
package.json  pnpm-workspace.yaml  .npmrc  next.config.ts  eslint.config.mjs  .prettierrc.json
vitest.config.mts  playwright.config.ts  drizzle.config.ts  components.json
docker-compose.yml  docker-compose.dev.yml   # prod-like db / dev-only DB port override
Dockerfile  .dockerignore  .gitattributes    # multi-stage image: base, deps, builder, migrator, runner
.env.production.example                      # the server's settings template (compose reads .env)
.github/                                     # workflows/ci.yml (typecheck, lint, format:check, test against Postgres 18), dependabot.yml, PR and issue templates
scripts/                                     # seed.ts, backup.sh (nightly dump), restore.sh, deploy.sh (one-command server update)
src/
  proxy.ts                  # optimistic cookie redirect only (not real auth); lets sw.js, offline.html, manifest, icons, /welcome and /site/ through; signed-out / shows /welcome
  hooks/                    # shared React hooks (shadcn)
  app/                      # routes (App Router)
    (auth)/sign-in, sign-up, forgot-password, reset-password   # Google button and reset flow: docs/auth-google-reset-spec.md
    (site)/welcome          # public page about Ledge (no sign-in); signed-out visitors see it at / (docs/site designs/)
    (app)/                  # authenticated shell (sidebar + content); page.tsx is Home at / (sign-in lands here; docs/new_design.md screens 1a, 1e)
      inbox, today, upcoming, completed, all
      (tasks)/              # route group: shared Tasks header; tasks (Overview), today, upcoming, all, completed, lists/[listId], search
      inbox                 # redirects to /tasks (Inbox became the General list)
      expenses/             # layout (tabs + period picker), page (summary), income, emis, spending, investments (§7); loading.tsx skeleton in each
      journal/              # one page per day (?d=), loading.tsx skeleton; see docs/journal-spec.md
      settings/               # layout (settings column), page (phone home / desktop Account), account, security, appearance, voice, journal-lock, tasks, export, delete, about; loading.tsx skeletons (screens 9a to 9p)
      plan/                   # redirects to /plans/new (the old one-page planner)
      plans/                  # Plans module (docs/plans-module-spec.md): home, new/, [id] (plan page), [id]/setup (draft steps and review), [id]/more (Add more tasks); loading.tsx skeletons
    api/journal/lock        # removes the journal unlock (sendBeacon when the page is hidden)
    api/voice/transcribe, api/voice/understand  # voice capture: audio to words, words to a plan (docs/voice-spec.md)
    api/avatar              # your own profile photo (bytes from user_avatars)
    api/health, api/export  # health check; export/expense-breakdown and export/cash-flow (PDF reports); export/everything (JSON) and export/tasks (CSV)
  modules/
    auth/                   # sign-in/up, forgot and reset forms, Google button, oauth-errors.ts, reset-email.ts (pure, tested), Zod schemas (client side of auth)
    todos/                  # components/ (list screen, views, task row, drawer, quick add, drag board, Trash, palette, shortcuts), actions/ (server actions), schema.ts (Zod), view-logic.ts, day-views.ts, view-settings.ts (pure, tested)
    expenses/               # components/ (tab bar and period picker, pending state, transaction launcher, summary sections, cash-flow chart, entries overview and list, entry sheet, money-flow, skeletons), actions.ts, schema.ts (Zod), categories.ts, category-icons.ts, periods.ts, summary.ts, entries-logic.ts, emi-series.ts, context.ts (pure maths tested), report-pdf.ts and reports.ts (PDF reports); see docs/expenses-spec.md
    site/                   # the public page: site.css (scoped under .lg), content.ts (copy, links, FAQ, demo data), components/ (nav, hero phone, Before/With switch, voice and quick-add demo using the real parser, FAQ, scroll reveals in site-motion.tsx, page); light only; the mockups show real screenshots in public/site/, made by `SITE_SHOTS=1 pnpm exec playwright test tests/e2e/site-shots.spec.ts --project=desktop`
    home/                   # hints.ts (greeting, task sentence; pure, tested), home-actions.tsx (Add a task, Log a transaction, Jump to anything)
    account/                # Settings: actions.ts (preferences, name, photo, devices, Google, delete, set password), schema.ts, sections.ts, avatar.ts and devices.ts (pure, tested), settings-data.ts, account-content.tsx, ai-usage-card.tsx, components/ (ui.tsx building blocks, settings nav and phone home, one file per section, crop sheet, password fields, skeleton)
    planner/                # Plans module (docs/plans-module-spec.md): schema.ts, json-schema.ts, prompt.ts, resolve.ts, fake.ts, estimate.ts, resources.ts, reschedule.ts, phase-label.ts, plan-view.ts (pure, tested), actions.ts (drafts, questions, follow-ups, make, review, add all or nothing, undo, more tasks, rename, status, reschedule, delete, resources), components/ (plans/: home and plan page, flow/: new-plan steps, review/: cards and list)
    voice/                  # voice capture: schema.ts (Zod), json-schema.ts (Groq strict schema), prompt.ts, resolve.ts, fake.ts, languages.ts (pure, tested), actions.ts (save and Undo), components/ (voice sheet, review cards, recorder, hold-to-talk, mic button)
    journal/                # components/ (day control, journal day: facts, mood, autosaving page; journal-lock: lock screens and auto-lock; pin-pad; journal-lock-settings), actions.ts, lock-actions.ts (turn on or off, unlock by PIN or password, reset, change, lock again), schema.ts (Zod), limits.ts, day-facts.ts and calendar.ts (pure, tested); see docs/journal-spec.md
  server/
    db/ (client, schema/, migrations)   # schema/auth.ts is generated by the Better Auth CLI
    auth.ts                 # Better Auth config (email and password, Google, reset email, linking)
    email.ts                # sendEmail(): Resend over fetch, or an in-memory outbox in development and tests
    env.ts                  # Zod-validated environment
    session.ts              # getSession() / requireUser() helpers
    version.ts              # APP_VERSION from package.json (Settings › About)
    user-defaults.ts        # ensureUserDefaults(): settings row + General (the default list, stored as the inbox), run on sign-up
    journal-lock.ts         # journal lock: scrypt PIN hash, signed unlock cookie tied to the sign-in, escalating pauses, password check
    groq.ts, voice.ts, voice-limit.ts   # Groq client (fetch + Zod), voice service (context, fake mode), per-user voice rate limit
    planner.ts              # planner service: key and rate limit (shared with voice), context, Groq or fake, resolve, usage recorded
    ai-prices.ts            # Groq prices (checked 2026-11-23) over src/lib/ai-cost.ts; usage rows in data/ai-usage.ts
    action-guard.ts         # guarded(): requireUser + Zod + typed result + revalidate, shared by todo and expense actions
    data/                   # data functions (lists, tasks, views, settings, finance, journal, trash, sign-in-methods, avatars, devices): every one takes userId
  components/
    ui/                     # shadcn primitives
    shell/                  # app sidebar, page header, empty state, theme toggle, sign out, phone tab bar and its filled icons (tab-icons.tsx)
    dash/                   # dashboard look (docs/design.md): DashCard, StatTile, DeltaPill, DashButton, Sheet (Base UI Drawer); tokens under .dash in globals.css
  config/
    app.ts                  # app name, defaults
    modules.ts              # module registry (nav items, routes, icons)
  lib/                      # shared utils: dates.ts (floating dates), money.ts (integer paise), ordering.ts (fractional index), pdf.ts (tiny PDF writer), result.ts, utils.ts
docs/ decisions.md  ideas.md  agentic-workflow.md (how to build big features with agents)  reference/ (history moved out of this file)  auth-google-reset-spec.md  expenses-spec.md  journal-spec.md  pwa-spec.md (installable app, Phase 13)  work-spec.md (proposal, not built)  voice-spec.md (voice capture with Groq; proposal, not built)  voice-multilingual-spec.md (eleven languages and mixes; first stage built, Phase 14)  planner-spec.md (first planner, Phase 14; replaced)  plans-module-spec.md (Plans module, Phase 15)  plans-design-prompt.md and plans designs/ (O's Claude Design screens 8a to 8n)  settings-design-prompt.md (Settings screens 9a to 9p, built)  design.md  new_design.md (O's Claude Design spec, draft; wins over design.md)      # PRODUCT.md (root): product brief read by the impeccable design skill
  plain-english/            # layman write-up per phase + glossary (kept in step with the project, §2 item 13)
  brand/                    # logo: logo-prompt.md (brief), concepts.html (all four), logo.html (chosen B), usage.md (rules); SVGs in public/brand/, home-screen PNGs in public/icons/ (scripts/make-icons.py; src/app/manifest.ts lists them)
.agents/skills/             # third-party agent skills from `npx skills add` (skills-lock.json; Prettier ignores them)
.claude/agents/            # implementer.md (Sonnet: builds one work package), reviewer.md (Opus, read-only review)
.claude/skills/            # build-feature/ (the agentic workflow, docs/agentic-workflow.md); svg-logo-designer (third party)
.claude/worktrees/         # agent worktrees, ignored by git, ESLint, TypeScript and Prettier
tests/ e2e/ (journal-pin.ts: PIN helper)  integration/  helpers/ (fast-users.ts, users.ts, action-session.ts: shared session and cookie stand-in for action tests)  setup/  stubs/
```

**Module registry:** every feature module registers itself in `src/config/modules.ts` (id, label, icon, route, enabled). The sidebar renders from this registry. Adding a module later should not require touching the shell.

**Skeleton note:** empty folders are kept in git with a `.gitkeep`. Delete the `.gitkeep` when a real file lands in that folder.

---

## 5. Auth spec

- Email and password sign-up and sign-in via Better Auth. Passwords hashed by the library; never store or log them.
- **Continue with Google** (O, 2026-11-23; a black button with Google's G **under** the email form, after an "or" rule; "Sign up with Google" on Create account; `docs/auth-google-reset-spec.md`): shown only when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. It follows `ALLOW_SIGNUP` (a `user.create.before` hook refuses new users when closed) and links to an existing account with the same email only when that email is verified; a completed password reset verifies it.
- **Forgot password**: a one-time link (60 minutes) emailed through Resend; the same answer whether or not the email exists; a reset ends every session. Without `RESEND_API_KEY` in production, Forgot password? is hidden. Accounts made with Google set a password in Settings › Security; the journal lock needs one.
- Password forms use `method="post"`, so a submit before hydration never puts a password in the URL.
- Sessions are server-side, in `httpOnly`, `secure`, `sameSite=lax` cookies. A signed session cookie cache (5 minutes) saves the database lookup on most requests (O's OK, 2026-11-13); signing out on another device can take up to 5 minutes to apply here.
- Env flag `ALLOW_SIGNUP=true|false`. O will create his account, then set it to `false` on the server.
- Rate-limit sign-in and sign-up attempts.
- Minimum password length 10; show clear errors; no account-enumeration hints.
- On first sign-up, create: `user_settings` row (defaults below) and the default list, **General** (stored with `is_inbox`; it was called Inbox until 2026-11-11).
- Sign out clears the session. Settings › Sign-in & security (2026-11-23) lists the signed-in devices: sign out one, or everywhere else (this device stays); other devices notice within the 5-minute cookie cache. Change password there signs out other devices by default. Delete account needs the typed phrase and the password, or for an account with only Google a Google sign-in in the last 10 minutes.
- Better Auth owns its tables (`user`, `session`, `account`, `verification`). **Generate them with its CLI; do not hand-write them.**
- **Authorization rule (critical):** every data function in `src/server` and every server action takes the authenticated `userId` and filters by it. **Never trust an id from the client without checking ownership.** Do not rely only on middleware or a proxy for protection; call `requireUser()` in every action and data function.
- Write an integration test proving user B cannot read, update, or delete user A's lists or tasks.

---

## 6. To-do tracker spec

The reference points are Todoist, Things, TickTick, and Notion tasks: fast capture, clear views, keyboard-first, calm UI. Priorities: **P0 = must ship v0.1, P1 = should ship v0.1 if time allows, P2 = later (do not build now).**

### 6.1 Core objects

- **Task**: title, notes, priority, due date and optional time, subtasks, recurrence, list.
- **List**: a named container (color, emoji icon, description). Every user has an undeletable default list, **General** (formerly Inbox). A list may have an optional `target_date` and description; **this is how goals are modeled in v0.1** (for example the list "Open source", "Freelance").
- ~~Section~~ and ~~Tag~~: removed at O's request (2026-11-11) to keep the app simple. Their tables stay in the database, unused; do not rebuild without asking.

### 6.2 Features

**Capture**

- P0: Quick-add input always reachable (button and `q` shortcut). Enter creates the task, and the field stays open for the next one. On `/expenses` screens the round button is "Log a transaction" instead (O, 2026-11-11); `q` still opens task quick add there.
- P0: Inline add at the bottom of any list and view.
- P1: **Natural-language parsing** in quick-add: "pay rent tomorrow 5pm #home p1". Date and time via chrono-node, `#list`, `p1` to `p3` (p1 = high, p2 = medium, p3 = low). Show parsed tokens as removable chips before submit.

**Task fields and detail**

- P0: Title (1 to 500 chars), notes (plain text or basic markdown rendering), priority (none, low, medium, high), due date, optional due time, list.
- P0: Complete and uncomplete with a checkbox. Completing sets `completed_at`.
- P0: Click a task to open a **detail drawer** (right side on desktop, full-screen sheet on mobile) with all fields editable. Autosave on blur, no Save button. The URL reflects the open task (`?task=<id>`).
- P0: **Subtasks**, one level deep only (enforce in code and DB constraint). Progress "2/5" shown on the parent. Completing all subtasks does NOT auto-complete the parent.
- P1: Duplicate task (built 2026-11-15, copies subtasks). Move task to another list.
- P1: Task count and "completed this week" in the Today header.

**Lists**

- P0: Create, rename, recolor, reorder, archive, and delete lists. Deleting a list with tasks requires confirmation and moves tasks to Trash.
- P1: List progress bar (done and total).

**Views (sidebar)**

- P0: **Overview** (the Tasks home: due today, overdue, next 7 days, done this week, lists with progress; it replaced Inbox on 2026-11-11), **Today** (overdue block first, then today, sorted by time then priority), **Upcoming** (next 14 days grouped by day, with undated tasks excluded), **All tasks**, **Completed** (grouped by completion day), each **List**, each **Tag**.
- P0: **List view** (default) for every list.
- ~~P1: Board view per list~~ Built, then removed at O's request (2026-11-11): not useful enough. Do not rebuild without asking.
- P1: **Search** (title and notes) via Postgres full-text search, reachable with `/`. Since 2026-11-11 it also searches Expense Tracker entries (O's request) and lives at the app level, not inside Tasks.
- P2: Calendar (week and month) view. Do not build.

**Organization**

- P0: Manual ordering by drag and drop in list view (fractional-index `position`).
- P0: Sort options: manual, due date, priority, created. Group by: none, due date, priority. Filter: priority, has due date, show or hide completed. Store these per list in `lists.view_settings` (jsonb).
- P1: Bulk select (shift-click or checkbox mode) with bulk complete, move, set date, delete.
- P2: Saved filters, custom views.

**Dates, reminders, recurrence**

- P0: Date picker with quick options (Today, Tomorrow, Next week, No date) and a typed-date field.
- P0: Overdue tasks are visually distinct (color and label, never color alone).
- P1: **Recurring tasks**: daily, weekly (choose weekdays), monthly, yearly, "every N days/weeks/months". Two modes: `fixed` (next date follows the schedule) and `after_completion` (next date counts from completion). On completing a recurring task: insert a completed snapshot (`status=done`, `recurrence_origin_id` points to the original) and advance the original's due date. A repeat can have an optional end date (`recurrence_until`, added 2026-11-13 at O's request: Never, After 1 week, 1 month or 3 months, or a date): once the next date would pass it, ticking the task finishes it like a normal task. Frequent repeats (every day, every 2 to 6 days, or weekly on two or more days) are routines (O, 2026-11-22): Today keeps them in a Repeating card under the day's tasks ("2 of 3 done", folding to one line when all are done), and Upcoming lists each once in a Repeating card at the top instead of on every day. Weekly, monthly and yearly repeats stay on their day, with each later date of a `fixed` one as a read-only preview. A repeat can be ticked only on its day or once it is late, never ahead; unticking its finished copy undoes that round.
- P2: Reminders and notifications. Do not build.

**Safety and ergonomics**

- P0: **Undo toast** (6 seconds, docs/new_design.md §1) after complete, delete, and move. Quick add confirms in the sheet itself, with Undo.
- P0: Delete moves to **Trash** (soft delete, `deleted_at`). A Trash view allows restore or delete forever. Auto-purge after 30 days via a scheduled job or on-load cleanup.
- P0: Optimistic UI for toggling complete, reordering, and inline edits, with rollback and a toast on failure.
- P1: **Export** all data as JSON and tasks as CSV (Settings). O will keep a year of data and should be able to leave at any time. Built 2026-11-15 (`/api/export/everything`, `/api/export/tasks`).
- P1: Delete account (with a typed confirmation) removes all data. Built 2026-11-15: type "delete my ledge"; cascades remove everything. Since 2026-11-23 it also needs the password (or a fresh Google sign-in for an account without one).

**Keyboard and command palette**

- P0: `Cmd/Ctrl+K` command palette (jump to a page or list; run actions). `?` opens the shortcuts help.
- P0: `q` quick add, `/` search, `j`/`k` or arrow keys move selection, `Enter` open detail, `x` toggle complete, `e` edit title, `Esc` close drawer or dialog.
- P1: `d` set due date, `p` set priority, `g` then `i`, `t`, or `u` go to Overview, Today, or Upcoming.
- P1: In inline edit, `Enter` creates a new task below, `Tab` makes it a subtask, `Shift+Tab` outdents.

### 6.3 Data model (reference; adapt in Drizzle)

All tables have `id` (uuid), `created_at`, `updated_at`. All user-owned tables have `user_id` (indexed, FK, cascade delete).

- `user_settings`: `user_id` (pk), `timezone` (default `Asia/Kolkata`), `week_starts_on` (default Monday), `theme` (system/light/dark), `currency` (default `INR`), `locale` (default `en-IN`)
- `lists`: `name`, `color`, `icon` (emoji), `description`, `target_date` (nullable), `is_inbox`, `is_archived`, `position`, `view_mode` (`list`|`board`), `view_settings` (jsonb)
- `sections`: `list_id`, `name`, `position` (unused since 2026-11-11; kept so nothing is deleted)
- `tasks`: `list_id` (not null), `section_id` (nullable), `parent_id` (nullable, max depth 1), `title`, `notes`, `status` (`open`|`done`), `priority` (0 to 3), `due_date` (date, nullable), `due_time` (time, nullable; both are "floating" and interpreted in the user's timezone, which avoids DST bugs), `recurrence_rule` (text, RRULE subset, nullable), `recurrence_mode` (`fixed`|`after_completion`), `recurrence_until` (date, nullable, only with a rule), `recurrence_origin_id` (nullable), `completed_at`, `position` (text, fractional index), `deleted_at`, `search` (generated tsvector over title and notes)
- `tags`, `task_tags`: unused since 2026-11-11 (tags were removed); kept so nothing is deleted

Indexes: `(user_id, list_id, position)`, `(user_id, due_date)` where not deleted and open, GIN on `search`, `(user_id, completed_at)`.

---

## 7. Expense tracker (built in Phase 7)

Full spec: **`docs/expenses-spec.md`**. In short:

- One **Expenses** entry in the sidebar; inside it tabs **Summary · Income · EMIs & loans · Expenses · Investments**, and a month or year picker kept in the URL (`?y=&m=`).
- Money is stored as **integer minor units** (paise for INR), never floats. `src/lib/money.ts` formats, parses and does percentages with integer maths. Currency and locale come from `user_settings`.
- One table, `finance_entries` (`kind` + kind-specific nullable columns, CHECK constraints), soft delete through the same Trash as tasks. Fixed category lists live in `src/modules/expenses/categories.ts` (custom categories are parked in `docs/ideas.md`).
- Summary maths (net savings, savings rate, EMIs counted by due date) is pure code in `summary.ts`, unit tested; every data function takes `userId`; ownership is integration-tested.
- Anything beyond the spec (budgets, import, recurring entries, custom categories) goes to `docs/ideas.md` first; ask O before building it.

---

## 8. UI and UX guidelines

- **Feel:** calm, fast, minimal; closer to Linear, Notion, or Things than to a busy dashboard. Content first, chrome second.
- **Layout:** (docs/new_design.md §3, draft, O 2026-11-15) light sidebar from tablet width up, a floating pill tab bar on phones (Home, then up to three pinned modules: Tasks, Expenses, Journal; no Search or More tab; Search, Trash and Settings are tiles on Home, the header Search button shows on phones, Theme and Sign out are in Settings; the lists sit in a Lists menu on the phone Tasks header), right-side detail drawer. Sidebar: Home, a "Modules" label, Tasks and Expense Tracker as equal sections (Tasks first), each header one button that opens and closes it, then Journal (a single link) (Tasks also lists your lists), then Search (Ctrl K), Trash, Settings and the account. One round + button: beside the tab bar on phones, bottom right with a mouse. Log a transaction on Expense Tracker pages, Add a task elsewhere; on Journal, Search and Trash it shows on phones only. Settings has no tab bar and no + on phones (O, 2026-11-23): a settings home with "‹ Home", and each section its own screen with "‹ Settings"; with a mouse a settings column beside the content. Home is the landing page (`/`): greeting, task sentence, Add a task and Log a transaction (opens the sheet in place; `t` on Home), one live hint per module.
- **Design tokens** as CSS variables (colors, radius, spacing). 4/8px spacing scale. No colour emojis anywhere: minimal line icons only (docs/design.md §8). Three typefaces with clear jobs (Phase 8): Geist for body text, Bricolage Grotesque for page titles and big figures, IBM Plex Mono for money, dates and column heads. Light and dark themes, following the system by default with a manual override.
- **Responsive:** mobile-first. Tap targets at least 44px. Usable one-handed on a phone, since O will use it on his phone daily.
- **Accessibility:** WCAG AA contrast, visible focus rings, full keyboard operation, ARIA for drag and drop (dnd-kit keyboard sensor), respect `prefers-reduced-motion`. Never convey state by color alone.
- **States:** every view has a designed empty state (one sentence and one action), skeleton loaders (no layout shift), and friendly error states.
- **Motion:** subtle (150 to 200ms): completion check, drawer slide, list reorder. No decorative animation. A ticked task keeps its tick and strike-through for half a second, then fades and folds away while the rows below glide up (O, 2026-11-16). Switching light and dark spreads the new colours from the clicked button in a circle (View Transitions, `src/lib/theme-transition.ts`; instant with reduced motion; O, 2026-11-23).
- **Copy:** short, plain, human. Sentence case.
- **Dashboard look:** the whole expense tracker (Summary and the four entry tabs) uses the second design language in `docs/design.md` (white rounded cards, grey wells, one orange, sheets, chips, skeletons, motion rules in its §9). Other screens move to it only when O asks (rollout is in that file); do not mix it with the Phase 8 look inside one card.

---

## 9. Code conventions

- TypeScript strict. No `any` (use `unknown` and narrow). No non-null assertions without a comment.
- Validate all external input (forms, actions, route params, query strings) with Zod. Share schemas between client and server.
- Server-only code lives in `src/server` and `*.server.ts` with `import "server-only"`.
- Prefer Server Components. Add `"use client"` only for interactivity.
- Server Actions return a typed result (`{ ok: true, data } | { ok: false, error }`); do not throw for expected failures.
- Timestamps are `timestamptz` in UTC. Due dates and times are floating (see §6.3). Convert using the user's `timezone` setting. Never use `new Date()` string parsing for user dates.
- IDs are UUIDs. Never expose sequential ids.
- Small files, small functions, named exports. Colocate tests as `*.test.ts`.
- Commits follow **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`). One logical change per commit. **No `Co-Authored-By` or other attribution lines** in commit messages (O's explicit preference).
- Lint and format with ESLint and Prettier (or Biome if chosen; log it in `docs/decisions.md`).

---

## 10. Commands

```
pnpm dev               # run locally
pnpm build && pnpm start
pnpm typecheck         # next typegen && tsc --noEmit
pnpm lint
pnpm format            # prettier --write . (format:check to verify)
pnpm test              # vitest (needs the dev DB: pnpm db:up)
pnpm test:e2e          # playwright (desktop and phone projects, axe audit): own DB (ledge_e2e), server on port 3100, installed Chrome; needs `pnpm db:up`
pnpm db:up             # start Postgres on 127.0.0.1:5433 (compose + dev override)
pnpm db:generate       # drizzle-kit generate migration
pnpm db:migrate        # apply migrations
pnpm db:studio         # drizzle studio
pnpm db:seed           # demo user demo@ledge.test with sample data (dev only; refuses in production)
docker compose up -d --build   # prod stack: db, migrate (one-shot), app, backup; add `--profile tunnel` for cloudflared (docs/deploy-guide.md)
sh scripts/restore.sh <backup.sql.gz> [--live]   # restore a backup (scratch database by default)
sh scripts/deploy.sh [--skip-backup]   # on the server: backup, git pull --ff-only, rebuild, health check, prune
```

Add a `db:seed` script that creates a demo user with realistic lists, subtasks, and overdue and recurring tasks, so every view can be checked quickly. **Seed must refuse to run when `NODE_ENV=production`.**

_Commands listed above are the intended set. Mark any not yet working as "(not yet wired)" until its phase lands, and keep this list equal to the real `package.json` scripts (§17)._

---

## 11. Environment variables (`.env.example` must list all of these)

```
DATABASE_URL=postgres://user:pass@localhost:5432/ledge
BETTER_AUTH_SECRET=             # long random string
BETTER_AUTH_URL=http://localhost:3000
ALLOW_SIGNUP=true
TZ=Asia/Kolkata
CLIENT_IP_HEADER=               # optional: cf-connecting-ip behind Cloudflare Tunnel
GOOGLE_CLIENT_ID=               # optional, with GOOGLE_CLIENT_SECRET: Continue with Google
GOOGLE_CLIENT_SECRET=
RESEND_API_KEY=                 # optional, with EMAIL_FROM: password-reset emails (dev without it: printed in the console)
EMAIL_FROM=
GROQ_API_KEY=                   # optional: turns voice capture on (docs/voice-spec.md)
VOICE_FAKE=                     # optional: 1 = answer voice from built-in rules, no Groq (tests, trials)
# GROQ_TRANSCRIBE_MODEL, GROQ_PARSE_MODEL, VOICE_DAILY_LIMIT (default 30 a day): optional overrides
```

The server uses `.env.production.example` (adds `TUNNEL_TOKEN`, `BACKUP_UID`, `BACKUP_GID`, optional `BACKUP_AT`, `APP_PORT`); compose builds `DATABASE_URL` itself.

Also listed in `.env.example` for the Postgres container: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` (must match `DATABASE_URL`). Local `DATABASE_URL` uses port 5433. Tests use `TEST_DATABASE_URL` if set, else `ledge_test` on the same server.

---

## 12. Deployment, backup, security

**Deploy (home server)** (decided 2026-11-11: **Cloudflare Tunnel**; step-by-step guide: `docs/deploy-guide.md`)

- Multi-stage `Dockerfile` (stages base, deps, builder, migrator, runner) using Next.js standalone output; the runner is `node:26-alpine` as the non-root user `ledge`.
- `docker-compose.yml`: `db` (Postgres 18, named volume, healthcheck, port **not** published), `migrate` (one-shot, `service_completed_successfully` before `app` and `backup`), `app` (port bound to `127.0.0.1` only), `cloudflared` (profile `tunnel`, `TUNNEL_TOKEN`; only for a machine without its own tunnel), `backup` (sidecar, nightly).
- Expose via Cloudflare Tunnel, never by opening router ports. HTTPS is required because cookies are `secure`. O's home server already runs a Cloudflare tunnel for other sites; Ledge is one more route on it (one tunnel per machine), with service URL `http://localhost:3000` if cloudflared is a system service or `http://app:3000` if it is a container joined to `ledge_default` (guide step 6). The bundled `cloudflared` service also uses `http://app:3000`. Rate limits read the visitor address from `CLIENT_IP_HEADER` (`cf-connecting-ip`), which is safe only because the app port is not reachable except through the tunnel.
- `GET /api/health` returns 200 only if the DB is reachable (503 otherwise); it is public and uncached.
- Migrations run as the one-shot `migrate` service on every `docker compose up`, never on web requests.
- Security headers are set in `next.config.ts` (CSP with `'unsafe-inline'` scripts because Next inlines small scripts, `nosniff`, `Referrer-Policy`, `X-Frame-Options`, COOP, Permissions-Policy, HSTS in production).

**Backup**

- `scripts/backup.sh` (run by the `backup` container): `pg_dump` plain SQL, gzip, dated filename, verified (`gzip -t`, minimum size), into `./backups/daily` (newest 14 kept) and, on Sundays, `./backups/weekly` (newest 8 kept). Runs at 21:00 UTC (02:30 IST) and once at first start.
- Copy dumps **off the machine** (second disk, `rclone`, or a cloud bucket). A backup on the same disk is not a backup. Documented in the guide; **O sets it up** (the repo cannot know the destination).
- Restore: `scripts/restore.sh <file> [--live]` (README and guide). Tested on a development machine (scratch and live paths); O repeats the scratch restore once on the server.

**Security checklist**

- Ownership check on every query (§5). Tested.
- Zod validation on every action and route.
- Security headers (CSP, `X-Content-Type-Options`, `Referrer-Policy`), and no secrets in client bundles (only `NEXT_PUBLIC_*` is public).
- Never log request bodies containing passwords or tokens.
- Rate-limit auth endpoints.
- Dependencies: `pnpm audit` before each deploy. Avoid abandoned packages.

---

## 13. Testing

- **Unit (Vitest):** natural-language parser, recurrence next-date logic, fractional ordering helpers, `money.ts`, date and timezone helpers (include DST and month-end cases).
- **Integration:** ownership and authorization tests; task and list CRUD against a real test database (not mocks).
- **E2E (Playwright), 3 to 5 flows:** sign up and sign in; quick-add a task and complete it with undo; create a list and drag-reorder; open a task in the drawer and edit; Today view shows overdue and today correctly.

---

## 14. Phases and build order (stop line: Sunday night)

This is the canonical plan. It expands the original suggested build order into phases with deliverables and exit criteria. Status markers: `[ ]` not started, `[~]` in progress, `[x]` done (add the date). Claude updates the markers and the status snapshot as work happens (§17).

**Phase gate:** a phase is done only when every deliverable is ticked, its exit criteria hold, the §15 definition of done is met, and `pnpm typecheck && pnpm lint && pnpm test` pass. Then set the next phase as current. If a phase reveals a spec problem, log it in `docs/decisions.md` and ask O; do not silently change scope.

**Stop line:** if it is Saturday evening and P0 is not done, drop all P1 work. If it is Sunday night, deploy what exists and freeze. After that, maintenance is capped at about 2 hours per week so the main plan is not starved. When the stop line triggers, record it in the status snapshot.

| #   | Phase                           | Status                       |
| --- | ------------------------------- | ---------------------------- |
| 0   | Scaffold                        | `[x]` done 2026-11-10        |
| 1   | Auth                            | `[x]` done 2026-11-10        |
| 2   | Data model                      | `[x]` done 2026-11-10        |
| 3   | Lists, tasks, tags CRUD (P0)    | `[x]` done 2026-11-10        |
| 4   | Views (P0)                      | `[x]` done 2026-11-10        |
| 5   | Safety (P0)                     | `[x]` done 2026-11-10        |
| 6   | Polish                          | `[x]` done 2026-11-10        |
| 7   | Expense tracker (§7)            | `[x]` done 2026-11-11        |
| 8   | Frontend redesign               | `[x]` done 2026-11-11        |
| 9   | Deploy and backup               | `[~]` built; O deploys       |
| 10  | P1 items (only if time remains) | `[~]`                        |
| 11  | Journal                         | `[~]` built; e2e pending     |
| 12  | Voice capture                   | `[~]` built; Groq untried    |
| 13  | Installable app (PWA)           | `[~]` built; phone untried   |
| 14  | Planner and multilingual voice  | `[~]` built; speech untried  |
| 15  | Plans module                    | `[~]` built; phone to polish |

**Phases 0 to 8** (scaffold, auth, data model, CRUD, views, safety, polish, expense tracker, frontend redesign) are done; their deliverables and exit criteria are in `docs/reference/completed-phases.md`. Read it when you need what a finished phase promised or how it was checked.

### Phase 9: Deploy and backup

Goal: running on the home server, backed up, restorable. **Status: built and verified locally (2026-11-11); O began deploying by hand with `docs/deploy-guide.md` on 2026-11-12 (route added to his existing tunnel; the account, the off-site backup copy and the restore test are still to do).** O chose to do the server steps himself, so the items marked (O) cannot be ticked by Claude.

- [x] Multi-stage `Dockerfile` (standalone output, non-root) (2026-11-11)
- [x] Production `docker-compose.yml` (DB not published, healthcheck, named volume) (2026-11-11)
- [x] `GET /api/health` returns 200 only when the DB is reachable (2026-11-11)
- [x] Migrations run as a one-shot step on deploy (2026-11-11)
- [x] Cloudflare Tunnel service in compose and a step-by-step guide; hostname and Cloudflare account are O's (§16 Q2 answered: Cloudflare Tunnel) (2026-11-11)
- [ ] (O) Cloudflare Tunnel configured on the real server; HTTPS working
- [x] Security headers; `pnpm audit --prod` clean (the `shadcn` CLI moved to dev dependencies; 3 dev-tooling advisories reviewed, none ship) (2026-11-11)
- [x] Nightly `pg_dump` (14 daily, 8 weekly) with verification (2026-11-11)
- [ ] (O) Backups copied off the machine (guide step 9.2)
- [x] Restore tested against a real dump, scratch and live paths, locally; restore commands in README (2026-11-11)
- [ ] (O) Restore tested once on the server; O creates his account, then `ALLOW_SIGNUP=false`

Exit: app reachable over HTTPS; a backup was restored successfully into a scratch database. (Verified locally over http on a production build; HTTPS and the tunnel are verified only when O deploys.)

### Phase 10: P1 items (only if time remains)

Do in this order, one at a time, each with tests and §15 done: natural-language quick add, board view, search, recurrence, export, bulk actions. Other P1 items in §6.2 (duplicate, move, list progress, extra shortcuts, sign out everywhere, delete account, Today header counts) may be slotted in after these, in O's order of preference. Exporting the expense data (JSON and CSV) belongs with the export item.

- [x] Natural-language quick add (chrono-node; chips; parser unit tests) (2026-11-11)
- [-] Board view: built, then removed at O's request (2026-11-11)
- [x] Search (Postgres full-text, `/`) (2026-11-11)
- [x] Recurrence (fixed and after_completion; next-date unit tests) (2026-11-11)
- [x] Export (JSON of everything, CSV of tasks; expense entries are in the JSON) (2026-11-15)
- [ ] Bulk actions
- [ ] Remaining P1 items as chosen by O

Exit: each shipped P1 item meets §15; unshipped ones are noted in `docs/ideas.md` or the status snapshot.

### Phase 11: Journal

Goal: a private journal page per day, with the day's facts from Tasks and Expenses (spec: `docs/journal-spec.md`). Added by O on 2026-11-12 in place of the Blog placeholder and built ahead of the open Phase 10 items. Numbered 11 so the existing phase numbers stay stable.

- [x] Spec agreed with O in chat (questions, phone and desktop sketches) and written to `docs/journal-spec.md` (2026-11-12)
- [x] `journal_entries` table and `finance_entries.spend_label`; migration 0009 (2026-11-12)
- [x] Data functions (page, month dots, day facts) and server actions with Zod, ownership and typed results (2026-11-12)
- [x] Journal page: day picker, facts strip that folds, mood, autosaving page, loading skeleton; Blog placeholder replaced (2026-11-12)
- [x] Need or want label on expenses (sheet chips, row details, filter chips) and `?day=` filters on the entries tabs and Completed (2026-11-12)
- [x] Unit tests (facts wording, calendar, input), integration tests (pages, privacy, day facts, label constraint), e2e spec written (2026-11-12)
- [x] Journal lock (O, 2026-11-16; screens 7a to 7h): optional 4- or 6-digit PIN, server-enforced signed unlock cookie, keypad on phones and boxes on desktop, pauses of 5, 15 then 60 minutes, unlock or reset with the account password, change or turn off with the current PIN, "Lock again" choices, Lock now, Locked on Home and the sidebar; migrations 0012 and 0013; integration tests (2026-11-16)
- [ ] e2e run (`journal.spec.ts` incl. the PIN lock test, and the updated sidebar, phone and a11y specs): not run yet (pnpm runs again as of 2026-11-24)

Exit: a day's page saves and reloads; facts match the day's tasks and money; another user cannot read or change a page; the §15 definition of done holds (desktop and phone, light and dark, keyboard, empty and loading states).

### Phase 12: Voice capture

Goal: hold + (or press `v`) and speak to add tasks and money, reviewed before saving (spec: `docs/voice-spec.md`). O chose Groq and said "start building" on 2026-11-15, which approved the spec; §13 open questions use the spec's recommendations until O says otherwise (always review, English, new lists created in the plan, 300 a day, `v`).

- [x] 12.1 Foundations: env vars, Groq client (`src/server/groq.ts`, fetch + Zod), `user_settings.voice_enabled` (migration 0011) and the Settings switch, `microphone=(self)`, per-user rate limit (2026-11-15)
- [x] 12.2 Understanding: schema, strict JSON schema, prompt, resolver, `POST /api/voice/understand`, fake mode; unit tests (2026-11-15)
- [ ] 12.2 Eval set of 60+ real sentences run against Groq (needs O's key)
- [x] 12.3 Recording: recorder hook, long-press on both + buttons, voice sheet, `POST /api/voice/transcribe`, desktop mic button, `v`, palette entry, Type instead (2026-11-15)
- [x] 12.4 Review and save: cards, guessed marks, EMI picker, `applyVoicePlanAction` (all or nothing by taking back on failure), one Undo; integration tests (2026-11-15)
- [~] 12.5 Hardening: error states, docs and e2e spec written; e2e not run (pnpm); real microphone and real Groq not yet tried

Exit: on O's phone over the tunnel, the §1 example commands go from voice to saved items correctly and Undo reverses each; the §15 definition of done holds.

### Phase 13: Installable app (PWA)

Goal: "Add to Home screen" gives Ledge its own icon and a full-screen window on Android and iPhone; same code, server and data (spec: `docs/pwa-spec.md`). O asked for it on 2026-11-21 ("spec the PWA and start building"). A native app stays parked.

- [x] Spec written: `docs/pwa-spec.md` (2026-11-21)
- [x] Service worker `public/sw.js` (static files only, never pages or data; offline page `public/offline.html`), `ServiceWorkerRegister` (production only), `/sw.js` no-cache header, proxy lets both through signed out (2026-11-21)
- [x] Manifest shortcuts, orientation, categories; `appleWebApp` metadata (2026-11-21)
- [x] `src/proxy.test.ts`: matcher and the worker's privacy rule (2026-11-21)
- [ ] (O) Installed and tried on his phone over the tunnel; offline page seen with the network off

Exit: installable over HTTPS; offline navigation shows the offline page; nothing from the database is in Cache Storage; the §15 definition of done holds for what is visible (offline page: phone width, light and dark).

### Phase 14: Goal planner and multilingual voice

Goal: describe a goal and get a reviewed plan of tasks (spec: `docs/planner-spec.md`); speak to voice capture in eleven languages and mixes (spec: `docs/voice-multilingual-spec.md`, first stage). O asked on 2026-11-22: "Plan and implement the 2 features", planned by Opus and coded by Sonnet subagents. Both stay on Groq; no new provider.

- [x] Specs: `docs/planner-spec.md` written; build decisions added to `docs/voice-multilingual-spec.md` (2026-11-22)
- [x] Planner: `/plan` (goal, up to 4 tap-to-answer questions, review cards, Add all with one Undo), `src/modules/planner`, `src/server/planner.ts`, Tasks header button and palette entry; unit and integration tests; e2e spec written (2026-11-22)
- [x] Planner tried with the real Groq key; prompts fixed so it asks questions and gives a goal its own list, never General by itself (2026-11-22)
- [x] Multilingual voice: `voice_languages` and `voice_title_language` (migration 0014), Settings chips, Whisper language chosen from them, multilingual system prompt, `dir="auto"` on heard words, Hindi and Telugu fake examples; tests (2026-11-22)
- [ ] Real speech in Hindi, Telugu and the other languages, and the per-language eval (needs O's microphone and clips)
- [ ] e2e run (`planner.spec.ts`)

Exit: a goal becomes a saved list of tasks that Undo removes; a Hindi or Telugu command becomes the right plan on O's phone; the §15 definition of done holds.

### Phase 15: Plans module

Goal: plans become a module with history (spec: `docs/plans-module-spec.md`, build plan in its §11; screens: `docs/plans designs/plans-screens.dc.html`, O's 8a to 8n). O asked on 2026-11-23 for the whole feature, planned by Opus and coded by Sonnet subagents. Web first; phone polish after.

- [x] 15.A Data and usage: `plans` table, `tasks.plan_id` and `plan_phase`, `ai_usage`, `user_settings.usd_to_inr` (migration 0015), `plans.milestone_task_ids` (0016), plans in Trash, purge and export, usage recorded for voice and the planner (2026-11-23)
- [x] 15.B Planner engine: basics, four question kinds, one follow-up round, phases, subtasks, estimates, milestones, resources (search links only), drafts that resume, Add plan all or nothing with Undo, Add more tasks, reschedule, archive, done, delete and restore; one retry after a rate limit (2026-11-23)
- [x] 15.C Pages: Plans home, plan page with live task rows, menus and sheets, Home card, sidebar count, Settings AI usage card and rupee rate, Trash, palette, Tasks header link, task detail plan chip (2026-11-23)
- [x] 15.D Flow: goal (with a speak button), basics, one question per screen, follow-ups, making and error, card review (keys, swipe, cut tray, summary), list review with side panel, Add more tasks (2026-11-23)
- [x] 15.E Tried end to end with the real Groq key on desktop, dark and light (2026-11-23)
- [ ] Phone polish (O: after the web version is done) and the e2e run (`planner.spec.ts`)

Exit: a goal becomes a saved plan whose page, tasks and history stay; Undo, delete and restore work; the §15 definition of done holds on desktop, then on a phone.

### After the phases: O's roadmap (plan only, 2026-11-13)

Not phases yet; do not build any of it without a spec and O's go-ahead. Order: fix small bugs, deploy by hand (Phase 9), automatic deploys on push, then one at a time and each live before the next: glass redesign (looks only), smarter search (pgvector, then RAG; needs a model provider), a phone app sharing the same data (PWA first), and last open source plus public hosting. Details, options and risks: `docs/ideas.md` ("Roadmap after deployment"). **Voice capture** (hold + to speak tasks and expenses; Groq Whisper and a Groq language model, chosen by O on 2026-11-15) is now Phase 12 above.

---

## 15. Definition of done (every feature)

- Works on desktop and a phone-sized viewport, in light and dark mode.
- Fully operable by keyboard; focus order is sensible.
- Empty, loading, and error states exist.
- Inputs validated with Zod; ownership enforced.
- Unit or integration test for any non-trivial logic.
- `typecheck`, `lint`, and `test` pass.
- README or `docs/decisions.md` updated if behavior or setup changed.
- This file updated if anything in the §17 trigger table applies.
- `docs/plain-english/` updated for what changed (§2 item 13), in simple language, with nothing left out.

---

## 16. Open questions for O (answer when ready; Claude should not guess)

Format when answered: replace the question's status with `ANSWERED YYYY-MM-DD: <answer>`, then apply the answer everywhere it matters (§17).

1. Expense tracker spec (categories, accounts, budgets, recurring expenses, reports, import from bank or UPI exports?). **ANSWERED 2026-11-10:** O described it from his Google Sheet (tabs: summary, income, EMIs and loans, expenses, investments; month and year views); written up in `docs/expenses-spec.md` and built in Phase 7. Budgets, recurring entries, custom categories and import are parked in `docs/ideas.md`.
2. Domain or hostname for the home server, and Cloudflare Tunnel vs Tailscale. **PARTLY ANSWERED 2026-11-11:** Cloudflare Tunnel. The hostname is still O's to choose (it goes in `.env` as `BETTER_AUTH_URL`; see `docs/deploy-guide.md`).
3. Is this multi-user from day one, or single-user with `ALLOW_SIGNUP=false` after the first account? **PARTLY ANSWERED 2026-11-12:** O wants other people to be able to use it one day, hosted on his server; for now it stays single-user. What that needs (sign-up, privacy wording, backups) is parked in `docs/ideas.md`.
4. Final app name and branding. **OPEN** (working name: Ledge)

---

## 17. Self-maintenance protocol (how this file rewrites itself)

### 17.1 Principle

This file is the project's source of truth for future sessions. Claude updates it in the same change that makes it stale, not later. Keep it short, factual and current.

### 17.2 Triggers: when to update this file

When any of these happens, update the listed places before finishing the task.

| Event                                                                                                                 | Update                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A deliverable is finished, or a phase starts or ends                                                                  | Tick the box in §14, update the phase table and the status snapshot (date, current phase)                                                                           |
| A test run is made at the end of a task                                                                               | Status snapshot: "Last verified test run" (date and result; move the previous one to `docs/reference/test-runs.md`)                                                 |
| A decision is made or changed (library, pattern, convention, behaviour)                                               | Append to `docs/decisions.md`; fix any section here that it contradicts                                                                                             |
| The stack changes or a major version is bumped                                                                        | §3 table and "Versions in use"; `docs/decisions.md` (needs O's OK, §17.3)                                                                                           |
| A script is added, renamed or removed                                                                                 | §10 (keep equal to `package.json`)                                                                                                                                  |
| An env var is added, renamed or removed                                                                               | §11, `.env.example`, README                                                                                                                                         |
| A folder or file layout in §4 changes, or a module is added                                                           | §4 (and the module registry note)                                                                                                                                   |
| A module is enabled or disabled                                                                                       | Status snapshot "Enabled modules"; §7 if it is expenses                                                                                                             |
| An open question in §16 is answered                                                                                   | Mark it `ANSWERED` with date; propagate (for example the expense spec becomes `docs/expenses-spec.md` plus a new phase in §14; the hostname goes to §12 and README) |
| O corrects Claude's behaviour or states a lasting preference                                                          | Add it as a rule in §2 or §9, with the reason if known                                                                                                              |
| A rule here turns out wrong, impossible or outdated (for example an API changed)                                      | Fix the rule; record why in `docs/decisions.md`                                                                                                                     |
| The stop line triggers, or a priority changes (P1 dropped, P2 pulled in)                                              | Status snapshot and §14                                                                                                                                             |
| Scope would change (new feature, new non-goal)                                                                        | Do not build it. Put the idea in `docs/ideas.md`; change §1 or §6 only with O's OK                                                                                  |
| Deployment facts become known (host, tunnel, backup location)                                                         | §12 and README                                                                                                                                                      |
| A phase is finished, or anything changes that a phase write-up describes (feature, decision, limit, command, setting) | The matching `docs/plain-english/phase-N-*.md` (create it when the phase ends), the status table in `docs/plain-english/README.md`; follow the writing rules there  |
| A technical term appears that a beginner would not know                                                               | `docs/plain-english/glossary.md`                                                                                                                                    |

### 17.3 Who may change what

- **Claude may edit freely** (facts and status): the status snapshot, §14 checkboxes and phase table, §3 "Versions in use", §4 layout, §10 commands, §11 env vars, §16 answered markers, §18 changelog, and everything under `docs/plain-english/` (the plain-English write-ups and glossary).
- **Claude must get O's explicit OK first** (propose the exact change in chat): §1 scope and non-goals, §3 stack choices, §5 auth rules, §6 spec and priorities, §8 UX principles, §12 security checklist, the order or scope of phases in §14, the stop line, and this §17. Never silently delete or weaken a P0 item or a security rule.
- A change O dictates in chat counts as OK. Record it as a decision.

### 17.4 How to rewrite

- Edit in place with small, targeted edits. Do not regenerate the whole file.
- Keep section numbers stable (other docs and code comments refer to them). Add new sections at the end or as sub-sections; do not renumber.
- Put the _why_ in `docs/decisions.md`; keep this file to the current rules and state.
- Add one line to the change log (§18, in `docs/reference/claude-md-changelog.md`) for every non-trivial edit: date, what changed, why.
- Commit the file change together with the code change that caused it, or as `docs:`.
- Do not record: transient task notes, things readable from the code, secrets, personal data, or guesses.
- Keep it lean. If this file passes roughly 500 lines or a section is rarely needed, ask O before moving detail to `docs/` with the `compact-context` skill, leaving a one-line pointer behind.

### 17.5 Session start and end checks

- **Start:** read this file and `docs/decisions.md`. Compare the status snapshot with reality (file tree, `package.json` scripts, git log). If they disagree, correct the snapshot and tell O.
- **End:** walk the §17.2 table, apply what is due, and say in the final message what changed in this file (or that nothing needed to).

---

## 18. Change log for this file

One line per non-trivial edit (date, change, why), kept in `docs/reference/claude-md-changelog.md`. Append there, not here.
