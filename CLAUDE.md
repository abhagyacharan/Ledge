# CLAUDE.md: Ledge

> **This file is a living document.** Claude keeps it accurate as part of the work (see §17). Stale instructions are worse than none.

## Status snapshot

_Updated by Claude per §17. If this block disagrees with the repo (git log, file tree, `package.json`), the repo wins: fix this block and tell O._

| Field                  | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Last updated           | 2026-11-11                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Current phase          | **Phase 10: P1 items** (Phases 0 to 8 done; Phase 9 built and verified locally, waiting for O to deploy by hand)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Start date             | 2026-11-10 (Phase 0 began; the §14 stop line is relative to it)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Versions in use        | see §3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Last verified test run | 2026-11-11 (after the dashboard Summary): `typecheck`, `lint`, `format:check` clean; `pnpm test` 433 tests pass (real database); `pnpm test:e2e` 94 Playwright tests pass in Chrome: axe accessibility audit (WCAG 2.1 A and AA, colour contrast included) of every screen and dialog in light and dark, phone-width checks, sign-up and sign-in, keyboard-only and focus rings, expense flows, quick add, search, repeating tasks. Also verified locally earlier: the production Docker stack (build, migrate, health, headers, sign-up and task on the production build, nightly backup, scratch and live restore). Not checked: Cloudflare Tunnel and HTTPS on the real server, the off-site backup copy, a real screen reader, `secure` cookie over real HTTPS, real touch devices |
| Open blockers          | none                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Enabled modules        | todos (lists, tasks, views); expenses (summary, income, EMIs and loans, expenses, investments)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

---

## 1. What we are building

A self-hosted personal life-management app that the owner (O) will use daily for a year or more. Version 0.1 covers **auth, a to-do/task manager, and an expense tracker**. Later modules might include a calendar, notes, a goals dashboard, and a public portfolio, so the architecture must make adding modules cheap.

**Quality bar:** a proper app O is happy to use every day, not a throwaway MVP. Scope is deliberately small so it can be finished _well_ in about 5 days.

### v0.1 scope

1. **Auth**: sign up, sign in, sign out, sessions, protected routes (§5).
2. **To-do tracker**: the main deliverable, specified in §6.
3. **Expense tracker**: income, EMIs and loans, expenses and investments with a monthly and yearly summary, modelled on O's Google Sheet. Specified in `docs/expenses-spec.md`; built in Phase 7 (§7).

### Non-goals for v0.1 (do not build, even if tempting)

Social features, blogs, public profile or portfolio, calendar sync, push or email notifications, native mobile app, real-time collaboration, AI features, file attachments, i18n, rich-text editor, team or shared workspaces, billing.

Park any new idea in `docs/ideas.md` instead of building it.

---

## 2. Working agreement (how Claude should work in this repo)

1. At the start of each session, read this file and `docs/decisions.md`, then check the status snapshot against the repo (§17.5).
2. **Plan before big changes.** List the files you will create or touch, then proceed.
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

| Concern                   | Choice                                                                                         | Why                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Framework                 | **Next.js** (App Router) + **TypeScript (strict)**                                             | Same stack as O's other projects, so this doubles as practice |
| Styling                   | **Tailwind CSS** + **shadcn/ui** (Radix primitives)                                            | Fast, accessible, easy to restyle                             |
| Database                  | **PostgreSQL**                                                                                 | Reliable, and works with pgvector later                       |
| ORM / migrations          | **Drizzle ORM** + drizzle-kit                                                                  | Typed, SQL-close, light                                       |
| Auth                      | **Better Auth** (email and password, DB sessions)                                              | Do not hand-roll auth                                         |
| Validation                | **Zod** at every boundary                                                                      | One schema for client and server                              |
| Data fetching / mutations | Server Components + Server Actions; TanStack Query only where optimistic client state needs it | Keep it simple                                                |
| Dates                     | **date-fns** + **chrono-node** (natural-language dates)                                        | Avoid hand-written date math                                  |
| Drag and drop             | **dnd-kit**                                                                                    | Accessible reordering                                         |
| Command palette           | **cmdk**                                                                                       | Standard                                                      |
| Ordering                  | **fractional-indexing** (string `position` column)                                             | Reorder without rewriting rows                                |
| Tests                     | **Vitest** (unit and integration), **Playwright** (3 to 5 critical flows)                      |                                                               |
| Package manager           | **pnpm**                                                                                       |                                                               |
| Deploy                    | **Docker Compose** on the home server, exposed via **Cloudflare Tunnel or Tailscale**          | Cookies need HTTPS                                            |

Next.js and Better Auth APIs change between versions. **Verify against current docs before writing code.**

**Versions in use** (recorded 2026-11-10; update on any major bump): Node 26.2.0, pnpm 12.18.0, Next.js 16.4.5, React 19.3.0, TypeScript 5.9.3, Tailwind 4.3.5, shadcn CLI 4.23.0 (style `radix-nova`, Radix primitives, `cn` package for class merging), Better Auth 1.7.18, Drizzle ORM 0.45.4 + drizzle-kit 0.31.11, `pg` 8.23.1, Zod 4.6.7, date-fns 4.4.0, fractional-indexing 4.0.0, dnd-kit core 6.3.1 + sortable 10.0.0, cmdk 1.1.1, Vitest 5.1.0, Playwright 1.65.0, PostgreSQL 18.

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
scripts/                                     # seed.ts, backup.sh (nightly dump), restore.sh
src/
  proxy.ts                  # optimistic cookie redirect only (not real auth)
  hooks/                    # shared React hooks (shadcn)
  app/                      # routes (App Router)
    (auth)/sign-in, sign-up
    (app)/                  # authenticated shell (sidebar + content)
      inbox, today, upcoming, completed, all
      lists/[listId], tags/[tagId], search
      expenses/             # layout (tabs + period picker), page (summary), income, emis, spending, investments (§7)
      settings/
    api/health, api/export  # health check, JSON/CSV export
  modules/
    auth/                   # sign-in/up forms, Zod schemas (client side of auth)
    todos/                  # components/ (list screen, views, task row, drawer, quick add, drag board, Trash, palette, shortcuts), actions/ (server actions), schema.ts (Zod), view-logic.ts, day-views.ts, view-settings.ts (pure, tested)
    expenses/               # components/ (tab bar, period picker, summary tiles and tables, entries view, entry dialog), actions.ts, schema.ts (Zod), categories.ts, periods.ts, summary.ts, emi-series.ts, context.ts (pure maths tested); see docs/expenses-spec.md
  server/
    db/ (client, schema/, migrations)   # schema/auth.ts is generated by the Better Auth CLI
    auth.ts                 # Better Auth config
    env.ts                  # Zod-validated environment
    session.ts              # getSession() / requireUser() helpers
    user-defaults.ts        # ensureUserDefaults(): settings row + Inbox, run on sign-up
    action-guard.ts         # guarded(): requireUser + Zod + typed result + revalidate, shared by todo and expense actions
    data/                   # data functions (lists, sections, tasks, tags, settings, finance, trash): every one takes userId
  components/
    ui/                     # shadcn primitives
    shell/                  # app sidebar, page header, empty state, theme toggle, sign out
    dash/                   # dashboard look (docs/design.md): DashCard, StatTile, DeltaPill; tokens under .dash in globals.css
  config/
    app.ts                  # app name, defaults
    modules.ts              # module registry (nav items, routes, icons)
  lib/                      # shared utils: dates.ts (floating dates), money.ts (integer paise), ordering.ts (fractional index), result.ts, utils.ts
docs/ decisions.md  ideas.md  expenses-spec.md  design.md
  plain-english/            # layman write-up per phase + glossary (kept in step with the project, §2 item 13)
tests/ e2e/  integration/  helpers/ (fast-users.ts, users.ts)  setup/  stubs/
```

**Module registry:** every feature module registers itself in `src/config/modules.ts` (id, label, icon, route, enabled). The sidebar renders from this registry. Adding a module later should not require touching the shell.

**Skeleton note:** empty folders are kept in git with a `.gitkeep`. Delete the `.gitkeep` when a real file lands in that folder.

---

## 5. Auth spec

- Email and password sign-up and sign-in via Better Auth. Passwords hashed by the library; never store or log them.
- Sessions are server-side, in `httpOnly`, `secure`, `sameSite=lax` cookies.
- Env flag `ALLOW_SIGNUP=true|false`. O will create his account, then set it to `false` on the server.
- Rate-limit sign-in and sign-up attempts.
- Minimum password length 10; show clear errors; no account-enumeration hints.
- On first sign-up, create: `user_settings` row (defaults below) and an **Inbox** list.
- Sign out clears the session. A "sign out everywhere" button in Settings is P1.
- Better Auth owns its tables (`user`, `session`, `account`, `verification`). **Generate them with its CLI; do not hand-write them.**
- **Authorization rule (critical):** every data function in `src/server` and every server action takes the authenticated `userId` and filters by it. **Never trust an id from the client without checking ownership.** Do not rely only on middleware or a proxy for protection; call `requireUser()` in every action and data function.
- Write an integration test proving user B cannot read, update, or delete user A's lists or tasks.

---

## 6. To-do tracker spec

The reference points are Todoist, Things, TickTick, and Notion tasks: fast capture, clear views, keyboard-first, calm UI. Priorities: **P0 = must ship v0.1, P1 = should ship v0.1 if time allows, P2 = later (do not build now).**

### 6.1 Core objects

- **Task**: title, notes, priority, due date and optional time, tags, subtasks, recurrence, list, section.
- **List**: a named container (color, emoji icon, description). Every user has an undeletable **Inbox**. A list may have an optional `target_date` and description; **this is how goals are modeled in v0.1** (for example the list "Open source", "Freelance").
- **Section**: a heading inside a list that groups tasks and acts as a board column.
- **Tag**: user-defined label, many-to-many with tasks.

### 6.2 Features

**Capture**

- P0: Quick-add input always reachable (button and `q` shortcut). Enter creates the task, and the field stays open for the next one.
- P0: Inline add at the bottom of any list and view.
- P1: **Natural-language parsing** in quick-add: "pay rent tomorrow 5pm #home @bills p1". Date and time via chrono-node, `#list`, `@tag`, `p1` to `p3` (p1 = high, p2 = medium, p3 = low). Show parsed tokens as removable chips before submit.

**Task fields and detail**

- P0: Title (1 to 500 chars), notes (plain text or basic markdown rendering), priority (none, low, medium, high), due date, optional due time, list, tags.
- P0: Complete and uncomplete with a checkbox. Completing sets `completed_at`.
- P0: Click a task to open a **detail drawer** (right side on desktop, full-screen sheet on mobile) with all fields editable. Autosave on blur, no Save button. The URL reflects the open task (`?task=<id>`).
- P0: **Subtasks**, one level deep only (enforce in code and DB constraint). Progress "2/5" shown on the parent. Completing all subtasks does NOT auto-complete the parent.
- P1: Duplicate task. Move task to another list.
- P1: Task count and "completed this week" in the Today header.

**Lists, sections, tags**

- P0: Create, rename, recolor, reorder, archive, and delete lists. Deleting a list with tasks requires confirmation and moves tasks to Trash.
- P0: Tags: create inline while editing a task, rename, delete, color. Case-insensitive unique per user.
- P0: Sections inside a list: create, rename, reorder, delete (tasks move to "no section").
- P1: List progress bar (done and total).

**Views (sidebar)**

- P0: **Inbox**, **Today** (overdue block first, then today, sorted by time then priority), **Upcoming** (next 14 days grouped by day, with undated tasks excluded), **All tasks**, **Completed** (grouped by completion day), each **List**, each **Tag**.
- P0: **List view** (default) for every list.
- ~~P1: Board view per list~~ Built, then removed at O's request (2026-11-11): not useful enough. Do not rebuild without asking.
- P1: **Search** (title and notes) via Postgres full-text search, reachable with `/`.
- P2: Calendar (week and month) view. Do not build.

**Organization**

- P0: Manual ordering by drag and drop in list view (fractional-index `position`).
- P0: Sort options: manual, due date, priority, created. Group by: none, due date, priority, tag. Filter: tag, priority, has due date, show or hide completed. Store these per list in `lists.view_settings` (jsonb).
- P1: Bulk select (shift-click or checkbox mode) with bulk complete, move, tag, set date, delete.
- P2: Saved filters, custom views.

**Dates, reminders, recurrence**

- P0: Date picker with quick options (Today, Tomorrow, Next week, No date) and a typed-date field.
- P0: Overdue tasks are visually distinct (color and label, never color alone).
- P1: **Recurring tasks**: daily, weekly (choose weekdays), monthly, yearly, "every N days/weeks/months". Two modes: `fixed` (next date follows the schedule) and `after_completion` (next date counts from completion). On completing a recurring task: insert a completed snapshot (`status=done`, `recurrence_origin_id` points to the original) and advance the original's due date.
- P2: Reminders and notifications. Do not build.

**Safety and ergonomics**

- P0: **Undo toast** (about 5 seconds) after complete, delete, and move.
- P0: Delete moves to **Trash** (soft delete, `deleted_at`). A Trash view allows restore or delete forever. Auto-purge after 30 days via a scheduled job or on-load cleanup.
- P0: Optimistic UI for toggling complete, reordering, and inline edits, with rollback and a toast on failure.
- P1: **Export** all data as JSON and tasks as CSV (Settings). O will keep a year of data and should be able to leave at any time.
- P1: Delete account (with a typed confirmation) removes all data.

**Keyboard and command palette**

- P0: `Cmd/Ctrl+K` command palette (jump to list, tag, or view; run actions). `?` opens the shortcuts help.
- P0: `q` quick add, `/` search, `j`/`k` or arrow keys move selection, `Enter` open detail, `x` toggle complete, `e` edit title, `Esc` close drawer or dialog.
- P1: `d` set due date, `p` set priority, `g` then `i`, `t`, or `u` go to Inbox, Today, or Upcoming.
- P1: In inline edit, `Enter` creates a new task below, `Tab` makes it a subtask, `Shift+Tab` outdents.

### 6.3 Data model (reference; adapt in Drizzle)

All tables have `id` (uuid), `created_at`, `updated_at`. All user-owned tables have `user_id` (indexed, FK, cascade delete).

- `user_settings`: `user_id` (pk), `timezone` (default `Asia/Kolkata`), `week_starts_on` (default Monday), `theme` (system/light/dark), `currency` (default `INR`), `locale` (default `en-IN`)
- `lists`: `name`, `color`, `icon` (emoji), `description`, `target_date` (nullable), `is_inbox`, `is_archived`, `position`, `view_mode` (`list`|`board`), `view_settings` (jsonb)
- `sections`: `list_id`, `name`, `position`
- `tasks`: `list_id` (not null), `section_id` (nullable), `parent_id` (nullable, max depth 1), `title`, `notes`, `status` (`open`|`done`), `priority` (0 to 3), `due_date` (date, nullable), `due_time` (time, nullable; both are "floating" and interpreted in the user's timezone, which avoids DST bugs), `recurrence_rule` (text, RRULE subset, nullable), `recurrence_mode` (`fixed`|`after_completion`), `recurrence_origin_id` (nullable), `completed_at`, `position` (text, fractional index), `deleted_at`, `search` (generated tsvector over title and notes)
- `tags`: `name` (unique per user, case-insensitive), `color`
- `task_tags`: `task_id`, `tag_id` (composite pk)

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
- **Layout:** collapsible sidebar (sheet on mobile), main list, right-side detail drawer. Sidebar: Inbox, Today, Upcoming, then Lists, Tags, then modules, then Settings.
- **Design tokens** as CSS variables (colors, radius, spacing). 4/8px spacing scale. Three typefaces with clear jobs (Phase 8): Geist for body text, Bricolage Grotesque for page titles and big figures, IBM Plex Mono for money, dates and column heads. Light and dark themes, following the system by default with a manual override.
- **Responsive:** mobile-first. Tap targets at least 44px. Usable one-handed on a phone, since O will use it on his phone daily.
- **Accessibility:** WCAG AA contrast, visible focus rings, full keyboard operation, ARIA for drag and drop (dnd-kit keyboard sensor), respect `prefers-reduced-motion`. Never convey state by color alone.
- **States:** every view has a designed empty state (one sentence and one action), skeleton loaders (no layout shift), and friendly error states.
- **Motion:** subtle (150 to 200ms): completion check, drawer slide, list reorder. No decorative animation.
- **Copy:** short, plain, human. Sentence case.
- **Dashboard look:** the expense Summary uses the second design language in `docs/design.md` (white rounded cards, grey wells, one orange). Other screens move to it only when O asks (rollout is in that file); do not mix it with the Phase 8 look inside one card.

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
```

Add a `db:seed` script that creates a demo user with realistic lists, tags, subtasks, and overdue and recurring tasks, so every view can be checked quickly. **Seed must refuse to run when `NODE_ENV=production`.**

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
```

The server uses `.env.production.example` (adds `TUNNEL_TOKEN`, `BACKUP_UID`, `BACKUP_GID`, optional `BACKUP_AT`, `APP_PORT`); compose builds `DATABASE_URL` itself.

Also listed in `.env.example` for the Postgres container: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` (must match `DATABASE_URL`). Local `DATABASE_URL` uses port 5433. Tests use `TEST_DATABASE_URL` if set, else `ledge_test` on the same server.

---

## 12. Deployment, backup, security

**Deploy (home server)** (decided 2026-11-11: **Cloudflare Tunnel**; step-by-step guide: `docs/deploy-guide.md`)

- Multi-stage `Dockerfile` (stages base, deps, builder, migrator, runner) using Next.js standalone output; the runner is `node:26-alpine` as the non-root user `ledge`.
- `docker-compose.yml`: `db` (Postgres 18, named volume, healthcheck, port **not** published), `migrate` (one-shot, `service_completed_successfully` before `app` and `backup`), `app` (port bound to `127.0.0.1` only), `cloudflared` (profile `tunnel`, `TUNNEL_TOKEN`), `backup` (sidecar, nightly).
- Expose via Cloudflare Tunnel, never by opening router ports. HTTPS is required because cookies are `secure`. The tunnel's service URL is `http://app:3000` (the compose service name). Rate limits read the visitor address from `CLIENT_IP_HEADER` (`cf-connecting-ip`), which is safe only because the app port is not reachable except through the tunnel.
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

| #   | Phase                           | Status                 |
| --- | ------------------------------- | ---------------------- |
| 0   | Scaffold                        | `[x]` done 2026-11-10  |
| 1   | Auth                            | `[x]` done 2026-11-10  |
| 2   | Data model                      | `[x]` done 2026-11-10  |
| 3   | Lists, tasks, tags CRUD (P0)    | `[x]` done 2026-11-10  |
| 4   | Views (P0)                      | `[x]` done 2026-11-10  |
| 5   | Safety (P0)                     | `[x]` done 2026-11-10  |
| 6   | Polish                          | `[x]` done 2026-11-10  |
| 7   | Expense tracker (§7)            | `[x]` done 2026-11-11  |
| 8   | Frontend redesign               | `[x]` done 2026-11-11  |
| 9   | Deploy and backup               | `[~]` built; O deploys |
| 10  | P1 items (only if time remains) | `[ ]`                  |

### Phase 0: Scaffold

Goal: an empty app that runs, with all tooling in place.

- [x] Repo skeleton: folders per §4, `docs/`, `.env.example`, `.gitignore`, README stub (2026-11-10)
- [x] `git init` and first commit (Conventional Commits) (2026-11-10)
- [x] Next.js (App Router) + TypeScript strict. If `create-next-app` refuses the non-empty folder, scaffold in a temp folder and move the files in; merge its `.gitignore` with ours, keeping `.env` ignored (2026-11-10)
- [x] Tailwind CSS + shadcn/ui initialised; design tokens as CSS variables; light and dark theme (2026-11-10)
- [x] Lint and format tooling (ESLint + Prettier or Biome; log the choice in `docs/decisions.md`) (2026-11-10)
- [x] Vitest configured with one real passing test; Playwright installed and configured (2026-11-10)
- [x] `docker-compose.yml` with Postgres (pinned major, named volume, healthcheck). Local development needs DB access: decide how (for example a dev-only override bound to `127.0.0.1`) and log it; the production compose never publishes the DB port (2026-11-10)
- [x] All §10 scripts exist in `package.json` (stubs allowed, marked "(not yet wired)") (2026-11-10)
- [x] `.env.example` matches §11; README setup section is accurate (2026-11-10)
- [x] Exact versions recorded in §3 and the status snapshot (2026-11-10)

Exit: `pnpm dev` serves a page; `pnpm typecheck && pnpm lint && pnpm test` pass; `docker compose up -d` brings up a healthy Postgres.

### Phase 1: Auth

Goal: only a signed-in user reaches the app shell.

- [x] Drizzle client and `drizzle-kit` config; connection from `DATABASE_URL` (2026-11-10)
- [x] Better Auth configured (`src/server/auth.ts`); its tables generated with its CLI, not hand-written; first migration applied (2026-11-10)
- [x] Sign-up and sign-in pages; sign out; clear errors; no account-enumeration hints; password minimum 10 (2026-11-10)
- [x] `ALLOW_SIGNUP` flag honoured on server (not just hidden in UI) (2026-11-10)
- [x] Rate limiting on sign-in and sign-up (2026-11-10)
- [x] `requireUser()` in `src/server/session.ts`; protected `(app)` routes (2026-11-10)
- [x] App shell: collapsible sidebar (sheet on mobile) rendered from `src/config/modules.ts` (2026-11-10)
- [x] Ownership test scaffold: real test database, two-user fixture. The list and task assertions land with Phases 2 and 3 once those tables exist (logged in `docs/decisions.md`) (2026-11-10)

Exit: sign up, sign in, sign out work in a browser on desktop and phone width; protected routes redirect when signed out; cookies are `httpOnly`, `secure` (over HTTPS), `sameSite=lax`.

### Phase 2: Data model

Goal: the full §6.3 schema, migrated and seedable.

- [x] Drizzle schema for `user_settings`, `lists`, `sections`, `tasks`, `tags`, `task_tags` with the indexes in §6.3 (2026-11-10)
- [x] DB constraint enforcing subtask depth of 1; case-insensitive unique tag names per user (2026-11-10)
- [x] Generated `search` tsvector column and GIN index (2026-11-10)
- [x] Migrations generated with `pnpm db:generate` and applied with `pnpm db:migrate` (2026-11-10)
- [x] On first sign-up: create `user_settings` (defaults) and an undeletable Inbox list (2026-11-10)
- [x] `pnpm db:seed`: demo user, lists, tags, subtasks, overdue and recurring tasks; refuses when `NODE_ENV=production` (2026-11-10)
- [x] Ownership integration test (user B cannot read, update or delete user A's lists or tasks) against a real database (2026-11-10)

Exit: fresh database migrates cleanly; sign-up creates settings and Inbox; seed runs; ownership test passes.

### Phase 3: Lists, tasks, tags CRUD (P0)

Goal: you can capture and manage tasks end to end.

- [x] Every server action and data function calls `requireUser()`, takes `userId`, validates with Zod, returns a typed result (2026-11-10)
- [x] Lists: create, rename, recolor, reorder, archive, delete (confirmation; tasks go to Trash) (2026-11-10)
- [x] Sections: create, rename, reorder, delete (tasks move to "no section") (2026-11-10)
- [x] Tags: create inline while editing, rename, delete, color (2026-11-10)
- [x] Tasks: quick-add (`q`, field stays open), inline add, complete and uncomplete (`completed_at`), edit all fields (2026-11-10)
- [x] Detail drawer (right side desktop, full-screen sheet mobile) with autosave on blur and `?task=<id>` in the URL (2026-11-10)
- [x] Subtasks, one level, with "2/5" progress; completing all subtasks does not complete the parent (2026-11-10)
- [x] Date picker with quick options and typed-date field; overdue shown with color and label (2026-11-10)
- [x] Unit tests: date and timezone helpers (DST, month-end); fractional ordering helpers (2026-11-10)
- [x] Integration tests: list and task CRUD against a real database (2026-11-10)

Exit: all P0 items under "Capture", "Task fields and detail", "Lists, sections, tags" and "Dates" in §6.2 work; tests pass.

### Phase 4: Views (P0)

Goal: every view in §6.2 renders correctly.

- [x] Inbox, Today (overdue block, then today, by time then priority), Upcoming (next 14 days by day, undated excluded), All, Completed (grouped by completion day) (2026-11-10)
- [x] List view and Tag view (2026-11-10)
- [x] Sort (manual, due date, priority, created), group by (none, due date, priority, tag), filters; stored per list in `lists.view_settings` (2026-11-10)
- [x] Drag-and-drop manual ordering with fractional index and dnd-kit keyboard sensor (2026-11-10)
- [x] Empty, loading (skeleton) and error state for each view (2026-11-10)
- [x] E2E: create a list and drag-reorder; Today view shows overdue and today correctly (2026-11-10)

Exit: every P0 view is correct against the seed data; reorder survives reload.

### Phase 5: Safety (P0)

Goal: nothing is lost by accident; the app feels instant.

- [x] Undo toast (about 5 seconds) after complete, delete, move (2026-11-10)
- [x] Soft delete (`deleted_at`), Trash view with restore and delete forever, 30-day auto-purge (scheduled job or on-load cleanup) (2026-11-10)
- [x] Optimistic UI for toggle complete, reorder, inline edits, with rollback and toast on failure (2026-11-10)
- [x] Keyboard: `Cmd/Ctrl+K` palette, `?` help, `q`, `/`, `j`/`k` and arrows, `Enter`, `x`, `e`, `Esc` (2026-11-10)
- [x] E2E: quick-add a task and complete it with undo; open a task in the drawer and edit (2026-11-10)

Exit: all P0 items under "Safety and ergonomics" and "Keyboard and command palette" work; all P0 in §6.2 is done.

**P0 checkpoint:** when Phase 5 exits, all of P0 is complete. If this is after the Saturday-evening stop line, P1 is dropped (see Stop line above).

### Phase 6: Polish

Goal: it is pleasant to use daily.

- [x] Empty, loading and error states reviewed everywhere (2026-11-10)
- [x] Responsive pass at phone width (tap targets at least 44px, one-handed use) (2026-11-10)
- [x] Dark mode pass; WCAG AA contrast (2026-11-10)
- [x] Accessibility pass: focus rings, keyboard-only run-through, ARIA for drag and drop, `prefers-reduced-motion` (2026-11-10)
- [x] Motion limited to 150 to 200ms purposeful transitions (2026-11-10)
- [x] Sign-up and sign-in E2E flow (2026-11-10)

Exit: the §15 definition of done holds for every shipped feature; all five E2E flows in §13 pass.

### Phase 7: Expense tracker

Goal: O's Google Sheet, replaced by a proper module (spec: `docs/expenses-spec.md`).

- [x] Spec written from O's description and sheet screenshot: `docs/expenses-spec.md` (2026-11-11)
- [x] `src/lib/money.ts` (format, parse, percent in integer maths) with tests (2026-11-11)
- [x] `finance_entries` table, enums, CHECK constraints, indexes; migration 0006 (2026-11-11)
- [x] Data functions and server actions (income, EMI, expense, investment) with Zod, ownership and typed results; EMI "repeat monthly" series (2026-11-11)
- [x] Entries go to Trash, restore, delete forever and 30-day clean-up with tasks (2026-11-11)
- [x] Summary tab: five tiles, invested and left-after-investing, expense breakdown, annual Jan to Dec trend with full-year total (2026-11-11)
- [x] Income, EMIs and loans, Expenses and Investments tabs: add and edit dialog, delete with Undo, filter, sort, search, totals, empty states (2026-11-11)
- [x] Period picker (month, whole year, arrows) in the URL (2026-11-11)
- [x] Sidebar entry, command palette routes, seed data matching the sheet (2026-11-11)
- [x] Unit, integration (incl. ownership) and Playwright tests; axe audit and phone checks of every new screen (2026-11-11)

Exit: every tab works end to end; summary numbers equal the sheet for the same data; ownership test passes; the §15 definition of done holds.

### Phase 8: Frontend redesign

Goal: the whole app looks designed and intentional, not default. Used the `frontend-design` skill (Anthropic). Behaviour, data and keyboard flows did not change. Direction: a modern account book (see `docs/decisions.md`, 2026-11-11).

- [x] Audit the current look (stock grey shadcn theme) and choose a direction (2026-11-11)
- [x] Design tokens, typography and spacing refreshed in one place (`src/app/globals.css`, fonts in `src/app/layout.tsx`), light and dark (2026-11-11)
- [x] Sign-in and sign-up pages redesigned (book cover panel on wide screens, brand bar on phones) (2026-11-11)
- [x] App shell (green spine sidebar, brand mark), task screens and expense screens restyled; empty and loading states inherit the tokens (2026-11-11)
- [x] All earlier tests (typecheck, lint, unit, e2e incl. axe and phone checks) still pass; contrast re-verified in both themes (2026-11-11)

Exit: O has looked at it in a browser and approved the direction (O: please review; changes are cheap because every colour is a token); no regression in the §15 definition of done.

### Phase 9: Deploy and backup

Goal: running on the home server, backed up, restorable. **Status: built and verified locally (2026-11-11); waiting for O to deploy by hand with `docs/deploy-guide.md`.** O chose to do the server steps himself, so the items marked (O) cannot be ticked by Claude.

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
- [ ] Export (JSON and CSV; tasks and expense entries)
- [ ] Bulk actions
- [ ] Remaining P1 items as chosen by O

Exit: each shipped P1 item meets §15; unshipped ones are noted in `docs/ideas.md` or the status snapshot.

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
3. Is this multi-user from day one, or single-user with `ALLOW_SIGNUP=false` after the first account? **OPEN**
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
| A test run is made at the end of a task                                                                               | Status snapshot: "Last verified test run" (date and result)                                                                                                         |
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
- Add one line to §18 for every non-trivial edit: date, what changed, why.
- Commit the file change together with the code change that caused it, or as `docs:`.
- Do not record: transient task notes, things readable from the code, secrets, personal data, or guesses.
- Keep it lean. If this file passes roughly 500 lines or a section is rarely needed, ask O before moving detail to `docs/` with the `compact-context` skill, leaving a one-line pointer behind.

### 17.5 Session start and end checks

- **Start:** read this file and `docs/decisions.md`. Compare the status snapshot with reality (file tree, `package.json` scripts, git log). If they disagree, correct the snapshot and tell O.
- **End:** walk the §17.2 table, apply what is due, and say in the final message what changed in this file (or that nothing needed to).

---

## 18. Change log for this file

| Date       | Change                                                                                                                                                                                                                                                                                                                      | Why                                                                                                                              |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-10 | Initial CLAUDE.md added to the repo. Added status snapshot, working-agreement items 11 and 12, "Versions in use", skeleton note in §4, §14 expanded into phases with exit criteria, §16 answer format, §17 self-maintenance protocol, this log                                                                              | Make the plan trackable and keep the file true as the project changes                                                            |
| 2026-11-10 | Repo skeleton created (folders per §4, docs, `.env.example`, `.gitignore`, README stub)                                                                                                                                                                                                                                     | Phase 0 first deliverable                                                                                                        |
| 2026-11-10 | Git repo initialised on `main`; first commit made                                                                                                                                                                                                                                                                           | Phase 0 deliverable                                                                                                              |
| 2026-11-10 | Phases 0 and 1 completed. Status snapshot, §3 versions and Next 16 notes, §4 layout, §10 commands, §11 extra env vars, §14 ticks updated; decisions logged in `docs/decisions.md`                                                                                                                                           | Scaffold and auth built; keep this file equal to the repo                                                                        |
| 2026-11-10 | Ownership test split: scaffold in Phase 1, list and task assertions in Phases 2 and 3                                                                                                                                                                                                                                       | The tables do not exist until Phase 2                                                                                            |
| 2026-11-10 | Added `docs/plain-english/` (layman write-up per phase + glossary) and the rule that it is updated with every project change: new working-agreement item 13, §4 layout, §15 done-checklist, two §17.2 triggers, §17.3 free-edit list                                                                                        | O asked for non-technical documentation that never falls behind                                                                  |
| 2026-11-10 | Phase 2 completed. Status snapshot, §3 versions, §4 layout (data layer, user-defaults, seed), §10 `db:seed`, §14 ticks updated; decisions logged                                                                                                                                                                            | Data model built and verified; keep this file equal to the repo                                                                  |
| 2026-11-10 | §9: commit messages carry no `Co-Authored-By` or attribution lines                                                                                                                                                                                                                                                          | O asked for it                                                                                                                   |
| 2026-11-10 | Phase 3 completed. Status snapshot, §3 versions (date-fns), §4 layout, §14 ticks updated; decisions logged                                                                                                                                                                                                                  | Lists, sections, tags, tasks, drawer and quick add built and verified                                                            |
| 2026-11-10 | Phase 4 completed. Status snapshot, §3 versions (dnd-kit), §4 layout, §10 `test:e2e`, §14 ticks updated; decisions logged. Test speed-up recorded (fast user fixtures, shared worker)                                                                                                                                       | Views, saved view settings, drag and drop and the first Playwright tests are built and verified                                  |
| 2026-11-10 | Phase 5 completed. Status snapshot, §3 versions (cmdk), §4 layout, §14 ticks updated; Trash clean-up question resolved in decisions                                                                                                                                                                                         | Undo, Trash, optimistic updates, keyboard shortcuts and the command palette are built and verified; all P0 features are in       |
| 2026-11-10 | Phase 6 completed. Status snapshot, §10 `test:e2e`, §14 ticks updated; decisions logged                                                                                                                                                                                                                                     | Accessibility audit, phone-width checks, reduced motion, sign-up/in and keyboard tests are in; all five §13 E2E flows pass       |
| 2026-11-11 | Expense tracker built as the new Phase 7; Frontend redesign inserted as Phase 8; Deploy and backup moved to Phase 9, P1 items to Phase 10; the old Phase 9 (expenses scaffolding) removed. §1 scope, §2 item 6, §4 layout, §7 (rewritten), §14 table and phases, §16 Q1 answered, status snapshot updated; decisions logged | O asked to finish the expense tracker before deploying, then redesign the frontend (O's instruction in chat counts as OK, §17.3) |
| 2026-11-11 | Phase 8 completed. §8 typeface line (three faces), §14 Phase 8 ticked, status snapshot updated; decisions logged                                                                                                                                                                                                            | O asked for a redesign with Anthropic's frontend-design skill and told Claude to proceed through the next phases                 |
| 2026-11-11 | Phase 9 built (verified locally; O deploys by hand). §4 layout, §10 commands, §11 env (`CLIENT_IP_HEADER`, `.env.production.example`), §12 rewritten with the real deployment and backup facts, §14 Phase 9 items split between Claude and O, §16 Q2 partly answered; decisions logged                                      | O wants to deploy himself with a detailed guide (`docs/deploy-guide.md`) and told Claude to continue with the next phases        |
| 2026-11-11 | Board view built then removed (§6.2, §14); quick add has all task fields; recurrence ticked; new `docs/design.md` and the dashboard look on the expense Summary (§4, §8); decisions logged                                                                                                                                  | O asked for these changes before deploying                                                                                       |
