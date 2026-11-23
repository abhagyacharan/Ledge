# Completed phases 0 to 8

Moved from CLAUDE.md §14 on 2026-11-24. Every deliverable here is ticked; the phase table in §14 still lists them.

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

_Later change (2026-11-11): tags and sections were removed and Inbox became General plus a Tasks overview, at O's request. The ticks below are kept as history._

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
