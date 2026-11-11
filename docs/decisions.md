# Decisions

Append-only log. Newest at the bottom. Format: date, decision, reason. See CLAUDE.md §2.8 and §17.

## 2026-11-10: Adopt CLAUDE.md as the source of truth

- **Decision:** Stack, scope and spec are as in CLAUDE.md §1, §3 and §6 (Next.js App Router + strict TypeScript, Tailwind + shadcn/ui, PostgreSQL, Drizzle, Better Auth, Zod, Vitest + Playwright, pnpm, Docker Compose).
- **Reason:** Decided by O up front; same stack as O's other projects.

## 2026-11-10: Work in phases 0 to 9 with exit criteria

- **Decision:** The build order in CLAUDE.md §14 is split into phases with deliverables and exit criteria, tracked by checkboxes and a status snapshot.
- **Reason:** Makes progress and the stop line checkable across sessions.

## 2026-11-10: CLAUDE.md maintains itself

- **Decision:** CLAUDE.md §17 defines when Claude must update it, what Claude may change freely, and what needs O's explicit OK. Every non-trivial edit is logged in §18.
- **Reason:** The file is read at the start of every session; stale content misleads later work.

## 2026-11-10: Empty folders tracked with `.gitkeep`

- **Decision:** The skeleton in CLAUDE.md §4 exists on disk from the start; empty folders hold a `.gitkeep`, removed when a real file lands.
- **Reason:** Git does not track empty directories.

## 2026-11-10: Ownership test split across phases

- **Decision:** Phase 1 sets up the real-database, two-user test scaffold. The assertions that user B cannot touch user A's lists and tasks land in Phases 2 and 3.
- **Reason:** Lists and tasks tables do not exist until Phase 2.

## 2026-11-10: Lint and format with ESLint + Prettier

- **Decision:** ESLint (`eslint-config-next`, from `create-next-app`) for linting, Prettier for formatting. Not Biome.
- **Reason:** Next's lint rules (core web vitals, React hooks) come ready-made; Prettier is zero-config. Revisit only if the two tools conflict.

## 2026-11-10: Local DB access through a dev-only compose override

- **Decision:** `docker-compose.yml` never publishes the DB port. `docker-compose.dev.yml` adds `127.0.0.1:5433:5432`; `pnpm db:up` uses both files. Host port is 5433, not 5432.
- **Reason:** CLAUDE.md §12 forbids publishing the DB port in production, but `pnpm dev` and tests need it locally. 5432 is commonly taken by other local Postgres containers (it was on this machine).

## 2026-11-10: PostgreSQL 18

- **Decision:** Pin `postgres:18` in Compose. Data volume mounts at `/var/lib/postgresql` (the Postgres 18 image layout).
- **Reason:** Current stable major per postgresql.org (18.6, supported to 2030). Version 19 was only a release candidate.

## 2026-11-10: Cache Components and partial prefetching left off

- **Decision:** Removed `cacheComponents` and `partialPrefetching` from `next.config.ts`, which `create-next-app` 16.4.5 enabled by default.
- **Reason:** Every route in this app is per-user and dynamic, so there is nothing to prerender. Cache Components would force a `<Suspense>` boundary around every session read for no benefit. Revisit if a public page (for example the portfolio module) is added.

## 2026-11-10: Sign-in and sign-up go through the Better Auth HTTP client, not server actions

- **Decision:** The auth forms call `authClient` (`/api/auth/*`). Sign-out does too. Everything else uses server actions with `requireUser()`.
- **Reason:** Better Auth's rate limiter only applies to HTTP requests; direct `auth.api.*` calls from server actions bypass it. §5 requires rate-limited sign-in and sign-up (5 per minute per IP, stored in the `rate_limit` table).

## 2026-11-10: Proxy is an optimistic redirect only

- **Decision:** `src/proxy.ts` (Next 16's name for middleware) redirects when no session cookie exists. It does not redirect away from `/sign-in`. Real checks are `requireUser()` in the `(app)` layout, pages and actions.
- **Reason:** §5: do not rely on the proxy alone. Redirecting signed-in users away from `/sign-in` in the proxy would loop on a stale cookie; the sign-in page does that check against a validated session instead.

## 2026-11-10: Auth hardening choices

- **Decision:** Sign-in returns one message for unknown email and wrong password. Sign-up shows a generic failure message for anything except "closed", rate-limit and validation errors. `ALLOW_SIGNUP=false` is enforced in a Better Auth `before` hook (so it also blocks direct API calls) and read fresh on each call. UUID ids via `advanced.database.generateId: "uuid"`. `secure` cookies are enabled when `NODE_ENV=production`.
- **Reason:** §5 (no account-enumeration hints, signup flag on the server, UUID ids). Plain-http localhost cannot use `secure` cookies, so dev differs from production on that one attribute.
- **Known gap:** the raw Better Auth API still answers a duplicate-email sign-up with its own error code; the UI hides it. Fully hiding it needs email verification, which is out of scope for v0.1.

## 2026-11-10: Better Auth tables keep the CLI's column types

- **Decision:** The Better Auth tables (`user`, `session`, `account`, `verification`, `rate_limit`) are exactly as generated by its CLI, including `timestamp` without time zone.
- **Reason:** §5 says generate them, do not hand-write them. Our own tables (Phase 2 onward) use `timestamptz` per §9.

## 2026-11-10: Exact dependency versions

- **Decision:** `.npmrc` sets `save-exact=true`; `package.json` pins exact versions. pnpm 12 is used (`packageManager` field). `esbuild` is allowed to run its install script in `pnpm-workspace.yaml`; `sharp` and `unrs-resolver` stay blocked.
- **Reason:** §2.4 asks for pinned versions. pnpm blocks dependency build scripts by default; esbuild is needed by `drizzle-kit` and `tsx`.

## 2026-11-10: Integration tests use a separate database

- **Decision:** Vitest's global setup creates `ledge_test` (the name must end in `_test`), applies the migrations, and tests run one file at a time. `TEST_DATABASE_URL` overrides the default derived from `DATABASE_URL`.
- **Reason:** §13 wants real-database integration tests; dev data must never be truncated by a test run.

## 2026-11-10: Phase 2 schema follows §6.3, with these adaptations

- **Decision:** All tables use `uuid` ids and `timestamptz`. `user_settings` is keyed by `user_id` as the spec says. `task_tags` also carries `user_id` (the spec lists only `task_id` and `tag_id`). `week_starts_on` is an ISO weekday number (1 = Monday). Search uses Postgres's `english` text configuration. `recurrence_mode` defaults to `fixed` even when a task has no rule.
- **Reason:** §6.3 says every user-owned table has `user_id`; storing it on `task_tags` lets the database enforce ownership there too (next entry). `english` stemming helps ("paying" finds "pay"); revisit if search results disappoint.

## 2026-11-10: The database enforces ownership and task rules, not just the app

- **Decision:** Lists, sections, tasks and `task_tags` reference their parents through composite foreign keys on `(id, user_id)`, so a row can never point at another user's list, task or tag. A trigger (`tasks_validate`) rejects subtasks deeper than one level, a task that has subtasks becoming a subtask, a subtask in another list or user than its parent, a section from another list, and a recurrence origin from another user. Check constraints cover title length (1 to 500), priority (0 to 3), status vs `completed_at` always agreeing, and `due_time` needing a `due_date`. Both triggers live in custom migrations (`0002`, `0003`).
- **Reason:** §5 and §6.2 say to enforce critical rules "in code and DB constraint". If an application bug ever forgot a `user_id` filter, the database would still refuse to link or leak across users. Costs: a few extra unique indexes and some trigger code.

## 2026-11-10: The Inbox is protected by the database

- **Decision:** A partial unique index allows one Inbox per user. A trigger blocks deleting an Inbox (unless its owner is being deleted) and blocks changing `is_inbox` after creation. A check forbids archiving it.
- **Reason:** §6.1 says the Inbox is undeletable; this makes that true even for buggy code.

## 2026-11-10: Settings and Inbox are created by a sign-up hook

- **Decision:** `ensureUserDefaults()` runs from Better Auth's "user created" hook, in one transaction, and is safe to call twice.
- **Reason:** §5 requires both rows on first sign-up.
- **Known gap:** the hook runs just after the user row is saved, not in the same transaction. If it ever fails, the account exists without its defaults and sign-up reports an error. Phase 3 reads the Inbox through a function that can call `ensureUserDefaults()` again if the Inbox is missing.

## 2026-11-10: A small data layer arrives in Phase 2

- **Decision:** `src/server/data/lists.ts` and `tasks.ts` hold the first data functions (read, rename or retitle, trash, delete). Each takes `userId` and filters by it. Phase 3 builds the rest on top of them.
- **Reason:** The Phase 2 ownership test must exercise real app functions, not just raw queries. Someone else's row returns "not found", never "forbidden", so ids cannot be probed.

## 2026-11-10: Seed script design

- **Decision:** `pnpm db:seed` (`scripts/seed.ts`, run with `tsx --conditions=react-server`) creates `demo@ledge.test` through the real sign-up path, so the hook creates its Inbox. Re-running deletes and recreates that one user. It exits immediately when `NODE_ENV=production` and only loads the database code after that check. Dates are computed in the `Asia/Kolkata` timezone.
- **Reason:** §10. Using real sign-up proves the hook and gives the demo user a working password. The `react-server` condition lets the `server-only` marker import cleanly outside Next.js.

## 2026-11-10: Dependency pinning fixed

- **Decision:** `saveExact: true` now lives in `pnpm-workspace.yaml` (pnpm 12 ignored `.npmrc` for this), and every dependency in `package.json` is an exact version.
- **Reason:** Phase 0 wrote that versions were pinned, but packages added afterwards had `^` ranges. The lockfile held the real versions, so nothing changed at runtime.

## 2026-11-10: Plain-English documentation folder

- **Decision:** `docs/plain-english/` holds a layman write-up per phase plus a glossary. It is updated in the same change as anything it describes (CLAUDE.md §2 item 13, §15, §17.2).
- **Reason:** O wants to understand what is being built without technical language, and the write-ups must never fall behind the project.

## 2026-11-10: Deleting a list moves the list itself to Trash (O's decision)

- **Decision:** Lists have a `deleted_at` column. Deleting a list sets it; the list and all its tasks disappear together (reads skip tasks whose list is trashed) and come back together on restore. The Inbox cannot be trashed (a check constraint). Permanent deletion (`deleteListForever`) stays for the Trash view's "delete forever" (Phase 5). The sidebar toast offers Undo for a few seconds.
- **Reason:** §6.2 says deleting a list "moves tasks to Trash". Before this, deleting a list removed its tasks for good. O chose "list goes to Trash" over "archive the list, trash only its tasks".

## 2026-11-10: Subtasks go to Trash and come back with their parent

- **Decision:** Trashing a task also trashes its subtasks with the same timestamp. Restoring brings back the parent and exactly the subtasks trashed at that moment, so a subtask trashed earlier stays in Trash.
- **Reason:** A subtask without its parent would be invisible in the list. The shared timestamp makes restore precise.

## 2026-11-10: Moving a task with subtasks

- **Decision:** `moveTaskToList` detaches the subtasks, moves the parent, then reattaches the subtasks in the new list, all in one transaction. Subtasks cannot be moved on their own. Moving clears the section unless one in the target list is chosen.
- **Reason:** The subtask trigger checks the parent's list row by row, so a plain update of parent and children would be rejected halfway. This resolves the earlier pending question.

## 2026-11-10: Position columns use the "C" collation

- **Decision:** Migration `0005` sets `COLLATE "C"` on `lists.position`, `sections.position` and `tasks.position`.
- **Reason:** Fractional-index keys mix upper and lower case and only sort correctly byte by byte. The default database collation sorts case-insensitively, so `ORDER BY position` could disagree with the JavaScript library. Tests cover this.

## 2026-11-10: Phase 3 interface choices

- **Decision:** Reordering lists and sections uses "Move up / Move down" menu items; drag-and-drop arrives with Phase 4. Tag management (rename, recolor, delete) lives in Settings, and tags are created inline in the task drawer. Archived lists are managed in Settings. The date picker is quick buttons plus the browser's own date and time inputs (no calendar library). The task detail is loaded from `?task=<id>` on the server with an ownership check. Sign-in-gated data for the sidebar and quick add is loaded once in the app layout and shared through a small context.
- **Reason:** Fewer dependencies (§2.5), keyboard- and phone-friendly controls, and the URL stays the single source of truth for the open task.

## 2026-11-10: Modules own their sidebar section and always-on UI

- **Decision:** `AppModule` in `src/config/modules.ts` gained optional `SidebarSection` and `Global` components. The tasks module uses them for the "Lists" group and the quick-add button.
- **Reason:** §4 says adding a module should not require touching the shell. The shell now just renders whatever each enabled module provides.

## 2026-11-10: Server action pattern

- **Decision:** Every action goes through `guarded()` (`src/modules/todos/actions/guard.ts`): `requireUser()`, Zod validation with field errors, the authenticated `userId` passed to the handler, unexpected errors logged and returned as a friendly message. Actions return `Result<T>` and never throw for expected failures. After a change they revalidate the whole app layout.
- **Reason:** §5 and §9. One place to get the security-critical steps right.

## 2026-11-10: Tests got about 3.5 times faster

- **Decision:** Tests that only need a user id use `createUser` (`tests/helpers/fast-users.ts`), which inserts the user row directly and runs the same defaults as sign-up. Only the sign-in and session tests use `createTestUser` (real sign-up and sign-in). Vitest now reuses one worker for every file (`isolate: false`). Result: about 52 s down to about 15 s for 237 tests.
- **Reason:** Almost all the time was password hashing, which is deliberately slow and ran four times per test. `fast-users.ts` must not import `@/server/auth`, because loading Better Auth was the next biggest cost. Sharing a worker is safe because test files already run one at a time against one database and each test wipes its own data.

## 2026-11-10: How the views are defined

- **Decision:**
  - **Today:** open tasks due today or earlier. A task due today whose time has passed counts as overdue, matching its label.
  - **Upcoming:** tomorrow through today + 14 days; undated tasks are left out.
  - **All tasks:** every task in every list, with subtasks counted as progress on their parent.
  - **Completed:** the 200 most recently finished tasks, grouped by the day finished in the user's timezone.
  - **Tag:** every task with that tag, in every list.
  - Subtasks with their own due date appear as rows in Today and Upcoming, labelled "Subtask of ...".
  - Tasks in archived or trashed lists never appear in any cross-list view.
- **Reason:** §6.2 describes the views in a line each; these are the exact readings. Archiving means "put away", so its tasks leave the views too.

## 2026-11-10: Sort, group and filter storage

- **Decision:** Lists (including the Inbox) save their choices in `lists.view_settings`. The All and Tag views keep theirs in the URL (`?sort=due&group=tag&tag=...&priority=2&due=yes&done=1`), starting from "sorted by due date". Sort options: manual, due date, priority, newest first. Group: none, due date, priority, tag. Filters: tag, exact priority, has/has no due date, show completed. "Manual" is only offered where it makes sense (lists). Sections and dragging only show with manual order and no grouping; any other choice shows a flat grouped list with a one-click way back.
- **Reason:** §6.2 says to store these per list. Views that mix lists have no list to save on, and a URL can be bookmarked.

## 2026-11-10: Drag and drop

- **Decision:** dnd-kit with a dedicated drag handle on each row (mouse, touch and keyboard: Space to pick up, arrow keys to move, Space to drop). A task can move within its section or to another section. The client sends the ids of the tasks that end up directly before and after it; the server checks both are the user's, in the same list with the same parent, and places the task between them with a fractional index. If two neighbours are tied or out of order it places the task after the first. The new order shows at once and is rolled back with an error message if saving fails.
- **Reason:** §6.2 and §8 (accessible reordering). A handle keeps scrolling on phones working. Sending neighbours instead of a position means the client cannot invent positions.

## 2026-11-10: Navigation and quick additions

- **Decision:** "All tasks" and "Completed" were added to the sidebar under Inbox, Today and Upcoming. A "Tags" group lists every tag and opens the Tag view. Inline add exists on Today (due today), Upcoming (due tomorrow), All and Tag views (into the Inbox; the Tag view also applies the tag). Completed has none, because adding a finished task makes no sense. Empty states offer one action that opens quick add.
- **Reason:** §6.2 lists these views but §8's sidebar order names only three; they need a way in. "Inline add at the bottom of any list and view" is a P0 item.

## 2026-11-10: End-to-end tests

- **Decision:** Playwright runs against its own database (`ledge_e2e`, migrated and re-seeded on every run, rate-limit counters cleared) and its own dev server on port 3100 (build folder `.next-e2e`, chosen with `NEXT_DIST_DIR`), so it never touches dev data or an already-running `pnpm dev`. It uses the Chrome installed on this machine (`channel: "chrome"`), so no browser download is needed. A setup step signs in once and saves the session. One worker, desktop only for now. The seed gained a task due today with no time, so the Today test never depends on the clock.
- **Reason:** §13 wants 3 to 5 critical flows. Phase 4 covers Today and drag-reorder (plus Upcoming and "list remembers its sort"); sign-in, quick add with undo and the drawer edit come with Phases 5 and 6.

## 2026-11-10: Trash and the 30-day clean-up (resolves the pending question)

- **Decision:** Clean-up happens on load, not in a scheduled job. `maybePurgeTrash(userId)` runs in the app layout and on the Trash screen, at most once an hour per user per server process, and erases that user's lists and tasks that have been in Trash for more than 30 days. The Trash screen lists trashed lists (with a task count) and trashed tasks whose list is live; subtasks trashed together with their parent come back with the parent, so they are not listed alone. "Delete forever" only works on items that are in Trash, and asks for confirmation. "Empty Trash" erases everything in the user's Trash.
- **Reason:** §6.2 allows "a scheduled job or on-load cleanup". A single-user home server has no scheduler to maintain; on-load needs nothing extra. The once-an-hour throttle keeps ordinary page loads cheap. The clock is a parameter, so tests move time instead of waiting.

## 2026-11-10: Optimistic updates and Undo

- **Decision:** Ticking a task, and every picker in the drawer (date, time, priority, section, list, tags), uses React's `useOptimistic`: the screen changes at once and goes back, with an error toast, if the server refuses. Title and notes already show what you type and fall back to the saved text if saving fails. Drag-and-drop was already optimistic. Undo toasts last 5 seconds and exist for completing a task, moving a task to another list, moving a task to Trash, and moving a list to Trash.
- **Reason:** §6.2 (P0): optimistic UI for toggling, reordering and inline edits with rollback and a toast, and an undo toast after complete, delete and move.

## 2026-11-10: Keyboard shortcuts, command palette and `/`

- **Decision:** One global handler (`keyboard-shortcuts.tsx`) for `?`, `/`, `j`, `k`, arrow keys (only while a task is selected), `x`, `e` and Ctrl or Cmd + K. Selection is real keyboard focus on a task's title link, so Enter opens the task with no extra code. Plain keys are ignored while typing or while a dialog is open. The palette (cmdk) lists actions (new task, new list, shortcuts, switch theme, sign out), every view, every list and every tag. `/` opens the palette. Searching task text with Postgres full-text search stays Phase 10, so `/` jumps to views, lists and tags for now. The `g` then `i`, `t`, `u` and `d`, `p` shortcuts are P1 and not built.
- **Reason:** §6.2 lists `/` as "search" under P0 but the full-text search feature is P1; the palette is the P0 piece that can honestly answer `/` today.

## 2026-11-10: Two bugs fixed in the generated command component

- **Decision:** `src/components/ui/command.tsx` (generated by shadcn) was edited: the dialog title now sits inside the dialog content, and the children are wrapped in `<Command>`. The generated file had the title outside (so the dialog had no accessible name) and left the `<Command>` wrapper to callers (the palette crashed without it). If the component is regenerated, these two changes must be re-applied.
- **Reason:** Found by the end-to-end test of the palette. `DndContext` also gets a fixed `id` per list, because dnd-kit's generated ids differed between server and browser and caused a hydration warning.

## 2026-11-10: Automated accessibility audit (new dev dependency)

- **Decision:** `@axe-core/playwright` 4.14.0 runs the WCAG 2.1 A and AA rules (including colour contrast) on every main screen, plus the task drawer, the View panel, the command palette and the shortcut list, in both the light and the dark theme, and on the sign-in and sign-up pages signed out.
- **Reason:** §8 and §15 require WCAG AA, and "never convey state by colour alone". An automatic check keeps it true as screens change. It cannot judge everything (reading order, wording for screen readers), so it does not replace a human check.
- **Found and fixed:** the "Delete forever" buttons on the Trash screen had an accessible name that did not contain their visible text; the command palette listed separators inside a listbox.

## 2026-11-10: Phone-width rules

- **Decision:** A second Playwright project (`mobile`, a Pixel 7 sized screen with touch) checks that no screen scrolls sideways, every button, link, checkbox, select and input is at least 44 px tall (icon-only ones also 44 px wide), the task drawer fills the screen, and the side menu, View panel and quick-add dialog meet the same rule. Links and text buttons inside a sentence are exempt, and a checkbox inside a label is measured by its label. Fixes made: task rows are at least 44 px tall, select boxes are 44 px tall on phones (the generated component forced 32), and the close buttons on dialogs and panels are 44 px on phones.
- **Reason:** §8: tap targets of at least 44 px, usable one-handed.

## 2026-11-10: Reduced motion, motion length, and error pages

- **Decision:** With `prefers-reduced-motion: reduce`, all animations and transitions are cut to a hair (state changes still happen). Every transition in the app is 100 to 200 ms; the only longer motion is the loading skeleton's pulse and the spinner, which are progress indicators and stop under reduced motion. Added a themed 404 page for unknown addresses and a last-resort `global-error` page.
- **Reason:** §8 (respect reduced motion; subtle 150 to 200 ms motion) and the "friendly error states" rule.

## 2026-11-10: Drag and drop for screen readers

- **Decision:** The drag board gives dnd-kit custom announcements and instructions, so a screen reader hears task titles and places ("Picked up Pay rent, position 2 of 5 in the list") instead of internal ids.
- **Reason:** §8 (ARIA for drag and drop). Not yet confirmed with a real screen reader.

## 2026-11-10: Keyboard focus check

- **Decision:** An end-to-end test tabs through the Today screen and a list screen (45 stops each) and requires every stop to show a visible ring (outline or box shadow). Another test adds, selects, opens, renames and closes a task using only the keyboard. The Next.js development overlay is excluded; it does not exist in production.
- **Reason:** §8 (visible focus rings, full keyboard operation).

## 2026-11-11: Expense tracker brought forward; phases renumbered

- **Decision:** O asked to finish the expense tracker before deployment, then redesign the frontend with Anthropic's `frontend-design` skill, then deploy. New order: Phase 7 Expense tracker, Phase 8 Frontend redesign, Phase 9 Deploy and backup, Phase 10 P1 items. The old Phase 9 (expenses scaffolding) is removed because the real module replaces it. A blog is a possible later module and is parked in `docs/ideas.md`.
- **Reason:** O's own instruction in chat (counts as OK under §17.3). The spec for expenses (§16 Q1) arrived as a description of O's Google Sheet plus a screenshot; the written version is `docs/expenses-spec.md`.

## 2026-11-11: Expense data model, one table

- **Decision:** All four kinds (income, EMI, expense, investment) live in one table, `finance_entries`, with a `kind` column and a few nullable columns that only one kind uses (`payment_method` for expenses; `lender`, `emi_type`, `status`, `paid_on` for EMIs; `platform` for investments). CHECK constraints make a row of the wrong shape impossible. Amounts are `bigint` paise (kept as a JS number, capped at `MAX_AMOUNT_MINOR` = ₹1,000,000,000, far inside the safe integer range). `entry_date` is a floating date and places the row in a month.
- **Reason:** The four kinds share almost every column, queries by month and kind are the same shape, and Trash, ownership and the clean-up job work once instead of four times. Separate tables would duplicate all of that for no gain.

## 2026-11-11: Fixed category lists (stored as text)

- **Decision:** Category, EMI type, payment method and investment type are fixed lists in `src/modules/expenses/categories.ts` (the nine expense categories come from O's sheet; the rest were chosen to fit it). Stored as plain text, validated by Zod per kind, so custom categories can be added later without a migration.
- **Reason:** O did not list categories for income, EMIs or investments. Fixed lists keep the summary tidy and the data clean now; custom categories are parked in `docs/ideas.md`.

## 2026-11-11: Five tabs, with EMIs and loans separate

- **Decision:** The Expenses module has five tabs: Summary, Income, EMIs & loans, Expenses, Investments. O listed four but described EMIs as having their own columns and their own summary tile, so EMIs & loans is its own tab. Investment fields (date, name, type, platform, amount, notes) were left to us.
- **Reason:** Different columns and a different status workflow (scheduled, paid, delayed). Merging into Expenses later is easy if O prefers four tabs.

## 2026-11-11: How the summary counts

- **Decision:** Net savings = income − EMIs − expenses. Savings rate = net ÷ income (shown as "—" with no income). EMIs count in the month of their **due date**, whatever their status, because a loan instalment is owed either way; the tile also says how much is paid, still to pay and delayed. Investments are not an expense: they appear as two extra tiles ("Invested" and "Left after investing") and do not change net savings or the savings rate. A scheduled EMI whose due date has passed is shown as "Overdue" (text and icon) without changing its stored status. Percentages are computed with integer maths (basis points), never floats.
- **Reason:** Matches the numbers in O's sheet (verified with the demo data: ₹28,000 in, ₹10,142 EMIs, ₹4,600 expenses, ₹13,258 saved, 47.4%), and keeps money maths exact.

## 2026-11-11: EMI repeat series

- **Decision:** When adding an EMI, "Repeat monthly for N more months" (0 to 60) creates the whole series at once as Scheduled entries. A month without the chosen day uses its last day (31 Jan becomes 28 or 29 Feb, then 31 Mar). Each month is computed from the first date, so one short month does not drag later months earlier.
- **Reason:** Loans are the same amount on the same day for years; entering them one by one would be the main annoyance of the sheet. Full recurring entries (editing a whole series, recurring income) are parked in `docs/ideas.md`.

## 2026-11-11: Money entries use the same Trash as tasks

- **Decision:** Deleting an income, EMI, expense or investment entry sets `deleted_at` and shows an Undo toast; the Trash screen lists them with tasks (restore, delete forever), and the 30-day clean-up purges them too. Delete forever is permanent and asks for confirmation.
- **Reason:** One safety net everywhere (§6.2 "Delete moves to Trash"); someone tracking a year of money must be able to undo a mistaken delete.

## 2026-11-11: Period lives in the URL; optimistic picker

- **Decision:** The month, year and "whole year" choice is in the address (`?y=2026&m=11`, `m=all`), as are the category filter, sort and search on the entry tabs. The picker uses `useOptimistic`, so the label changes the instant you click an arrow even while the server renders the new month; a fast double click moves two months rather than one.
- **Reason:** Bookmarkable, survives reload, back button works. The optimistic state fixed a real bug found by the end-to-end test (a second click used the old address).

## 2026-11-11: Shared server-action guard

- **Decision:** The "require user, validate with Zod, return a typed result, revalidate the pages" wrapper moved from the todo module to `src/server/action-guard.ts` (`guarded()`); the todo module's `actions/guard.ts` re-exports it. Expense actions use it too.
- **Reason:** One implementation of the §5 and §9 rules for both modules, so a fix applies everywhere.

## 2026-11-11: Expense screens: accessibility choices

- **Decision:** The summary tiles are a description list with each tile's caption inside its value, and their captions use a darker text colour so contrast passes on the tinted backgrounds (axe measured 4.3 to 1 with the grey; the minimum is 4.5). The "Mark paid" button's hidden name starts with its visible words ("Mark paid: Car loan"), as with Trash's "Delete forever". The bar chart is hidden from screen readers; the table beside it is the accessible version. On phones the summary sections use `min-w-0` so a wide table scrolls inside its own box instead of stretching the whole page.
- **Reason:** §8 and §15 (WCAG AA, phone width), found by the axe audit and the phone checks.

## 2026-11-11: Frontend redesign: "an account book"

- **Decision:** The look moved from the stock grey shadcn theme to a modern account book. Ledger-paper surfaces (pale green-grey, never cream), dark ink text, **ledger green** as the one action colour, **margin red** kept for overdue, outflow and delete, and a dark cloth-green **sidebar spine** that stays dark in the light theme (inside it the ordinary tokens are re-pointed at the sidebar palette, so tags, the theme button and sign out need no special cases). Dark theme is deep ink-green with mint as the accent. All colours are oklch tokens in `src/app/globals.css`; the expense tiles and chart use semantic tokens (`inflow`, `outflow`, `brass`) instead of hard-coded rose, emerald and violet.
- **Type:** three faces with separate jobs: **Geist** for body text (unchanged), **Bricolage Grotesque** for page titles and the big figures on the summary tiles, **IBM Plex Mono** for money in tables, dates and the small uppercase column heads. This replaces the "one typeface" line in §8 (O asked for the redesign, so the change counts as OK under §17.3). The fonts come through `next/font/google`, which downloads them at build time and serves them from the app itself, so a build needs internet but the running app makes no request to Google.
- **Signature:** the accountant's **double rule**. A final total is underlined twice (`.rule-double`): the Net savings figure, the footer rows of the breakdown and annual tables. It is used only where a number really is a bottom line, so it carries meaning. The same mark is the logo: an "L" standing on a double rule (`src/components/shell/brand.tsx`, `src/app/icon.svg`).
- **Auth pages:** a "cover of the book" panel (brand, one sentence, a ruled-page motif) on wide screens, a slim brand bar on phones; headings are left aligned. Heading text and form labels are unchanged, so the sign-in tests and screen readers are unaffected.
- **Not changed:** layout, behaviour, shortcuts, data, copy of buttons and labels. The 74 browser tests, including the axe audit in light and dark and the phone-width checks, pass with the new tokens without edits to the tests.
- **Also fixed:** the month and year boxes on the expense tabs briefly looked empty on first paint; they now render their text immediately.
- **Reason:** §8 ("calm, fast, minimal; content first"), and O's request for a redesign that does not look like a template.

## 2026-11-11: Deployment shape (Phase 9)

- **Decision:** Docker Compose with `db`, a one-shot `migrate` job, `app`, an optional `cloudflared` (profile `tunnel`) and a `backup` sidecar. **Cloudflare Tunnel** was chosen over Tailscale (O's choice in chat). Migrations run as their own service built from a `migrator` Dockerfile target (it carries drizzle-kit and the migration files; the runtime image has neither), and `app` and `backup` wait for it to succeed, so a bad migration stops the deploy instead of serving a broken app. The app port is published on `127.0.0.1` only; the tunnel reaches `app:3000` over the internal network.
- **Reason:** §12 (non-root, DB unpublished, migrations as a deploy step, no router ports). The `backup` waits for `migrate` because the first backup found an empty database before migrations had run (caught while testing).

## 2026-11-11: Real client IPs behind the tunnel

- **Decision:** New optional env var `CLIENT_IP_HEADER`. When set (compose sets `cf-connecting-ip`), Better Auth's `advanced.ipAddress.ipAddressHeaders` is `[that header]`, so the sign-in and sign-up rate limits count each visitor separately instead of counting the whole world as the tunnel's one address.
- **Reason:** Better Auth warns that any client can send these headers, so list only one your proxy overwrites. Cloudflare overwrites `cf-connecting-ip`, and the app port is not reachable except through the tunnel. Left empty in development, where nothing sits in front of the app.

## 2026-11-11: Content Security Policy keeps `'unsafe-inline'` for scripts

- **Decision:** The CSP in `next.config.ts` allows inline scripts (and eval only in development). Everything else is locked to the site itself, with `frame-ancestors 'none'`, `object-src 'none'` and `form-action 'self'`. A nonce-based policy is parked in `docs/ideas.md`.
- **Reason:** Next.js puts small inline scripts in every page. Removing `'unsafe-inline'` needs a per-request nonce set in `proxy.ts` and passed to the theme provider, which touches every page's rendering. The remaining policy still blocks other origins and framing.

## 2026-11-11: Backups: plain SQL, sidecar, off-machine copy is the owner's

- **Decision:** `scripts/backup.sh` runs in a `postgres:18-alpine` sidecar (so `pg_dump` matches the server), dumps to plain SQL then gzips (two steps, so a failed dump cannot hide behind a successful gzip), verifies the file, keeps 14 daily and 8 weekly. The copy off the machine is documented (rclone or a second disk) but set up by O, because the destination is his. `scripts/restore.sh` restores into a scratch database by default and replaces the live one only with `--live` and a typed `RESTORE`.
- **Reason:** §12. Found while testing: `docker compose exec` swallowed the typed confirmation from standard input, so every command that does not need input now reads `/dev/null`. `.gitattributes` forces Unix line endings on shell scripts and container files, because Windows checkouts would break them inside Linux containers.

## 2026-11-11: `shadcn` moved to dev dependencies

- **Decision:** The `shadcn` package (component generator CLI; the app only imports its CSS at build time) is now a dev dependency. `pnpm audit --prod` is clean. Three advisories remain in dev tooling (the CLI's own dependencies), reviewed: none is installed in the production image, whose runtime packages are next, react, react-dom and pg.
- **Reason:** §12 ("pnpm audit before each deploy"); a build tool should not count as a runtime dependency.

## 2026-11-11: Phase 9 is not "done" until O deploys

- **Decision:** Phase 9 is marked built-and-verified-locally. Items that need O's Cloudflare account, domain, server and storage are listed separately and left unticked. O told Claude to continue with the next phases, so Phase 10 starts while those wait.
- **Reason:** Honesty about what was and was not checked: the Docker pieces, health check, headers, migrations, backup and restore were run on a development machine over plain http on a production build. The tunnel, HTTPS cookies and the off-site copy were not.

## 2026-11-11: Natural-language quick add (Phase 10)

- **Decision:** The sentence is read in the browser by `src/modules/todos/quick-add-parser.ts` (pure, 23 unit tests), not on the server. `chrono-node` 2.10.3 reads dates and times (its British parser for `en-IN` so `5/12` is 5 December, forward-looking so "friday" is the next one); `#list`, `@tag` and `p1` to `p3` are read by small patterns. Only words that were really understood become chips, and removing a chip adds its key (`kind:text`) to an ignore set so the words return to the title. Unknown `@tags` are created when the task is added. The app layout now also gives the browser the user's timezone and locale so "today" is computed the way the server does.
- **Reason:** §6.2 (chips before submit). Client-side parsing gives instant chips; the server still validates everything with Zod when the task is created, so the browser is not trusted.

## 2026-11-11: Board view (Phase 10)

- **Decision:** The board is the manual-order drag code with a second layout (`layout="columns"` in `manual-board.tsx`): one column per section plus a "No section" column, in a focusable, sideways-scrolling `role="region"` named "Board". The list-or-board choice is stored in the existing `lists.view_mode` column through `setListViewModeAction` (owner-checked, integration-tested) and shown instantly with rollback on failure. The board ignores sort and group (its columns are the sections); filters still apply.
- **Reason:** §6.2 (board view per list, columns = sections, choice remembered). Reusing the drag board keeps one implementation of ordering, Undo-free optimistic moves, rollback and screen-reader announcements.
- **Found and fixed:** `sr-only` text inside far-right columns is absolutely positioned and was not contained by the scroll box, so the page scrolled sideways by about 120 px on a phone. The region is `position: relative`, which contains it. The main content area also got `min-w-0` so a wide child can never stretch it.

## 2026-11-11: Search (Phase 10)

- **Decision:** `/search?q=` is a server-rendered page with a plain GET form (it works without scripts). `searchTasks` in `src/server/data/views.ts` reduces the text to letters and digits, builds `to_tsquery('english', 'w1:* & w2:*')` (stems plus word starts, every word must match) against the generated `tasks.search` column, ORs in a plain `ILIKE` on the title (so a query of only stop words still finds things), ranks with `ts_rank`, and reuses the cross-list view query, so Trash, trashed and archived lists and other users are excluded exactly like the other views. `/` now goes to the search page (or focuses its box when already there); the command palette moves to Ctrl or Cmd + K only, and "Search" is a side-menu and palette entry.
- **Reason:** §6.2 ("Search via Postgres full-text search, reachable with `/`"). Cutting the input to letters and digits means no part of it can act as query syntax or as a LIKE wildcard. English stemming only; other languages are out of scope for v0.1.

## 2026-11-11: Repeating tasks (Phase 10)

- **Decision:** `src/lib/recurrence.ts` (pure, 20 tests) owns a strict RRULE subset (`FREQ`, `INTERVAL`, `BYDAY` weekly, `BYMONTHDAY` monthly and yearly, `BYMONTH` yearly); anything else parses to null. New rules are anchored on the due date (weekday, day of month, month) so month-end clamping never drifts. Completing goes through `completeRecurringTask` in one transaction: insert a done snapshot (`recurrence_origin_id` = the task, tags copied, no rule), reopen done subtasks, move the due date. `fixed` takes the first scheduled date after `max(due date, today)`; `after_completion` adds one interval to the completion day (weekday and day-of-month settings are ignored in that mode). Undo deletes the snapshot and restores date, time and subtask ticks. A rule needs a due date and a top-level task; clearing the date clears the rule. The completion day is "today" in the user's timezone, worked out on the server.
- **Reason:** §6.2. Weekday toggle buttons use the visible text ("Mon") as their accessible name, because axe rejects a longer label ("Monday") that does not contain the visible text as a whole word.

## 2026-11-11: Board view removed

- **Decision:** O did not like the board view and found it not functional enough, so the whole feature was removed (reverting the code, tests and docs of the board commit). The `lists.view_mode` column from Phase 2 stays in the schema (it is in §6.3) but nothing reads or writes it. The main content area keeps `min-w-0` so wide content can never stretch the page.
- **Reason:** O's instruction in chat. History: the board commit and its decisions entry remain in git.

## Pending decisions (log here when made)

- Password reset: Ledge has no "forgot password" (no email service). A command-line reset script is parked in `docs/ideas.md`.
