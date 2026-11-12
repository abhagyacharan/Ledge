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

## 2026-11-11: Quick add has every task field

- **Decision:** The quick-add dialog now has due date and time, priority, list, tags, repeat and notes, next to the sentence box; controls win over parsed values (manual due, priority) and tags are the union. The inline "Add a task" row keeps its fast Enter-to-add and gains a "More options" button that opens the dialog through the existing quick-add event, carrying title, list, section, date and tags. `createTask` and `createTaskSchema` accept a repeat rule and mode with the same checks as `updateTask`. The provider also passes `weekStartsOn` for the date picker.
- **Reason:** O's request: the plus button should offer what editing a task offers. Sections and subtasks were left out of the dialog on purpose (sections need server data; subtasks belong to an existing task).

## 2026-11-11: Dashboard look for the expense Summary

- **Decision:** O supplied a dashboard screenshot and asked for the expense Summary in that language, with only four blocks: four tiles (inflows, EMIs and loans, expenses, orange net savings), the annual cash flow bar chart alone, the expense breakdown, and the annual details table. The language is written in `docs/design.md` (white `rounded-3xl` cards, grey wells, near-black ink, one orange, pastel delta pills, black bars with orange hatched bars) and implemented as `src/components/dash/` (`DashCard`, `StatTile`, `DeltaPill`) plus colour tokens scoped to a `.dash` class in `globals.css`, with dark values. Scoped on purpose: O said to do only the Summary now, so the rest of the app keeps the Phase 8 look until the rollout in `docs/design.md`. Each tile shows its change against the previous month (January compares with December of the year before; whole-year view shows none); `changePercent` and `previousMonthTotals` are pure and tested. The old Savings rate, Invested and Left after investing tiles became lines on the orange tile.
- **Accessibility adaptation:** white text on the screenshot's bright orange fails WCAG AA, so text-bearing orange uses a darker gradient (`#cc420b` to `#a63409`, 4.8 to 1 or better) and the bright orange is only used for fills without text. Pills carry an arrow and screen-reader words as well as colour.
- **Reason:** O's request in chat; axe audit and phone checks pass in both themes.

## 2026-11-11: Summary layout changed after review

- **Decision:** On the Summary, the expense breakdown and the cash flow chart swapped places: row one is the tiles (5 of 12 columns) and the breakdown (7); row two is the chart (4, narrower) and the details table (8, wider). The chart is now one bar per month with money in (solid) and money out (orange hatch) stacked inside it, as in the screenshot, instead of two side-by-side bars, and it stretches to the height of its row.
- **Reason:** O's request after seeing the first version.

## 2026-11-11: Summary layout reverted, chart kept

- **Decision:** O found the swapped layout worse, so the blocks are back where they were (tiles and chart on top, breakdown and details table below, columns 5 and 7). The stacked-bar chart stays, with fully rounded segment corners, a 2px gap between the money-in and money-out segments, and bars up to 22px wide (2px wider).
- **Reason:** O's request.

## 2026-11-11: Summary: 50/50 rows and a leaner details table

- **Decision:** Both rows are 50/50 (tiles and chart, breakdown and details table). The four tiles stretch to fill their card in two equal rows. The annual details table lost its Savings % column and its visible "Selected" tag (the chosen month keeps its tint and `aria-current`, plus screen-reader-only text "(selected)"), has a narrower Month column and smaller numbers so five columns fit half a row. The breakdown's share bars are one flat light orange instead of the two-tone hatch (`.dash-fill-soft`). The savings rate is still shown on the orange Net savings tile.
- **Reason:** O's request.

## 2026-11-11: Entry tabs redesigned in the dashboard look

- **Decision:** Income, EMIs & loans, Expenses and Investments were rebuilt in the `docs/design.md` language (rollout step 2), because O found them cluttered. Each tab is three blocks: a short overview card (period total with rolling digits, count, Add), one list card (search as you type, sort, category chips for the categories used in the period, rows with icon / name / one meta line / amount, day groups with day totals on Expenses), and one breakdown card (shares by payment method, category or type; EMI paid-so-far progress). Phone order is overview, list, breakdown; at `xl` the overview and breakdown stack on the left of the list. Row actions moved off the rows: the row itself opens the entry; on `md+` a hover/focus `⋯` menu has Edit, Mark paid, Delete; unpaid EMIs keep an inline Mark paid in a fixed slot so amounts align. The add/edit dialog became a sheet (bottom sheet with swipe-to-dismiss on phones, right panel on desktop) with the amount first and large, chip radio groups instead of selects (real `<input type="radio">`, invisible but covering the chip), Today/Yesterday shortcuts and a month stepper. Deletes and Mark paid are optimistic (`useOptimistic`); rows fold away with Motion. Every tab has a `loading.tsx` skeleton with the real geometry; a period or filter change keeps the old view dimmed (`PendingRegion`, one shared transition) instead of a skeleton flash. Global CSS gained the mobile basics (no tap highlight, `touch-action: manipulation`, no label selection on buttons) and two curves (`--ease-snap`, `--ease-sheet`). Pure helpers live in `entries-logic.ts` (tested).
- **Dependencies added (all from Emil Kowalski's curated list, which O asked to follow):** `@base-ui/react` 1.9.0 for the Drawer (swipe gestures, keyboard-aware bottom sheet, focus trap; Vaul has been unmaintained since 2024; the Radix primitives stay everywhere else), `motion` 14.6.0 for row exit and enter and the sliding tab underline, `@number-flow/react` 0.6.2 for the rolling totals. Sonner (toasts) was already in use. Selects were removed from inside the sheet on purpose: a Radix popup portalled outside a Base UI modal would count as an outside press.
- **Not changed:** the global task quick-add button still shows on expense tabs (§6.2 P0 says it is always reachable). Making it add an expense on expense tabs is a spec change, so it was asked of O instead of done.
- **Reason:** O's request in chat ("make it simple and readable... super responsive... phone is a must"), using the stageshow, Emil Kowalski, frontend-design and impeccable skills. Stageshow is for marketing mock-ups, so only its loading-state principle (a skeleton at the content's own geometry) applied here.

## 2026-11-11: Log a transaction, new expense header, Summary refined

- **Decision:** On every `/expenses` screen the round bottom-right button is **Log a transaction** (`transaction-launcher.tsx`): it opens a menu (Income, Expense, EMI or loan, Investment, each with a one-line hint) and the choice opens that kind's add sheet. One sheet instance lives in the expenses layout and the tabs' own Add buttons use it too (`useLogTransaction().open(kind)`). When the new entry is not on screen (another tab or another period), the "Added" toast has a **View** button that opens the right tab and month. The task quick-add button is hidden on those screens; `q` still opens task quick add. The plus turns into a cross while the menu is open. Picking an item suppresses the menu's focus return so focus lands in the sheet's amount field.
- **Header:** the page description was dropped; the five tabs became one pill bar with a raised pill that slides between tabs (Motion `layoutId`), scrolling sideways on a phone with the active tab kept centred. The period became one pill: previous and next arrows around a "Choose period" button that opens a month grid (Jan to Dec, the chosen month filled, an orange dot on the current month, a year stepper, Whole year and This month). Tabs and period share a row from `lg` up. A new token `--dash-raised` (white in light, a lifted grey in dark) is the selected pill of a segmented control.
- **Summary:** the four tiles sit 2 by 2 on phones too (smaller figures, no icon, no filler lines, the delta pill without its "vs last month" words, which screen readers still hear); figures roll with NumberFlow; the cash-flow chart moved to a client component where each month is a button (tooltip with in, out and net on hover or keyboard focus, the other months fade, a click opens that month); on phones the bars stay a picture because 15px-wide buttons break the 44px tap rule, and the period pill is right above. Bars change height smoothly. The breakdown shows category icons and keeps names on one line (the item count column hides at the in-between `xl` width). The yearly table keeps its month column fixed while it scrolls sideways. The empty month card has one Add income button that opens the sheet.
- **Reason:** O's requests in chat ("Yes, swap it... ask the user what type of transaction they want to log", and to apply the design to the Summary, the month and year toggle and the tabs).

## 2026-11-11: Phone polish for the expense tracker

- **Decision:** On phones the four Summary figures are a statement, not four boxes: three rows (label left; change pill and figure right; one shared centre line; hairlines between) and Net savings as a slim orange total row (12px corners). The extra lines (paid / to pay, savings rate, invested) show only from `sm` up. Expense cards use a 14px radius and 16px side padding on phones (desktop keeps the earlier radius and padding); menus and the period card use the same 14px. The phone tab bar uses monochrome Lucide line icons (pie chart, wallet, bank, rupee receipt, trend) instead of colour emojis, spread evenly across the full width; names stay readable to screen readers. Below 440px the chart's month labels are single letters and the bar gaps tighten, so December stays inside the card (it overflowed on a 412px Pixel 9).
- **Why Lucide:** O asked for black-and-white minimal icons, sourced if possible. Lucide is the open-source icon set the whole app already uses, it has exactly these glyphs (including an Indian rupee receipt), and it adds no download or style mismatch.
- **Reason:** O's feedback after using it on a phone ("looking very cheap", too much padding and rounding, labels off-centre, generic emojis, December out of the chart).

## 2026-11-11: Tasks redesign, new navigation, tags and sections removed

- **Asked first (O's answers):** Inbox becomes a list called **General** and a new **Tasks overview** takes its place in the menu; phones get a **bottom tab bar**; the sidebar turns **light** to match the Expense Tracker; **tags and sections are removed**.
- **Navigation:** the module registry now drives everything: Expense Tracker (first) and Tasks are two equal modules, each with its views (`nav`). The desktop sidebar shows them as expandable sections (Tasks also shows the lists), then Search, Trash, Settings and the account. Phones get a bottom tab bar (Expense Tracker, Tasks, More); More is a Base UI sheet with Search, Trash, Settings, the lists, theme and sign out. The phone top bar with the menu button is gone. Each module's pages use the same pill tabs (`PillTabs`) built from the registry; Tasks pages share a header (route group `(tasks)`, URLs unchanged) with the tabs, a Lists picker and Search. The command palette lists pages as "Expense Tracker: Income", "Tasks: Today" and so on.
- **One + button:** `FAB_CLASS` gives both round buttons the same size, colour and place (above the tab bar on phones). On Expense Tracker pages it opens Log a transaction; elsewhere it opens Add a task (quick add). Dialogs app-wide became bottom sheets on phones (Radix Dialog restyled), so quick add, the list form and confirmations feel native there.
- **Look:** the dashboard tokens are now the app's tokens (`:root` and `.dark` remapped: soft grey canvas, white cards, ink primary, neutral rings); the dark green sidebar and the "ledger paper" palette are retired (docs/design.md rollout step 3). Task screens sit in the same cards (`TaskPanel`, `TaskGroup`), rows have no dividers, the checkbox ring takes the priority colour, empty states have a quiet icon.
- **Overview page (`/tasks`):** four figures (due today, overdue, next 7 days, done this week), a Today card (capped at 6 rows), Coming up (next 7 days, capped at 6), Lists with open counts and progress bars, and This week (tasks finished per day). New pure helpers `weekDates` and `countCompletedOn` (tested) and the query `getListProgress` (top-level tasks, recurring snapshots excluded).
- **Inbox to General:** migration 0007 renames each default list still called Inbox (and its 📥 icon to 📋); lists the user renamed are left alone. `/inbox` redirects to `/tasks`; sign-in, sign-up and the home page go to `/tasks`.
- **Tags and sections removed:** screens, actions, data functions, quick-add `@tag`, the Tag view, group/filter by tag, the drawer fields, the seed and their tests are gone. Saved list settings that grouped by tag now read as no grouping. The `tags`, `task_tags` and `sections` tables and `tasks.section_id` stay in the database untouched, so no data is deleted; a clean-up migration can come later if O wants it.
- **Reason:** O's request in chat ("the functionality is great, but the UI sucks"; Expense Tracker above Tasks; consistent + button; responsive).

## 2026-11-11: Light mode contrast, icons not emojis, app-wide search, sign-in gradient

- **Light mode:** the pill track behind tabs and the period picker was the same grey as the page, so the tabs looked like floating buttons. New tokens: `--dash-track` (a darker green-grey track with a hairline inner edge), `--dash-lift` (the shadow that lifts the chosen pill), `--dash-card-shadow` (a faint shadow so white cards never melt into the canvas). The light canvas became a faint green-grey (`#eceee9`), the light echo of the dark theme. Dark values are unchanged (track = well, no card shadow).
- **Tasks overview:** the four figures are their own white cards (`StatTile variant="card"`): no outer padded box from `sm` up, 16px corners instead of 20 to 24, bigger numbers. Phones keep the statement rows.
- **Lists picker removed** from the Tasks header (lists are in the sidebar, the More sheet and the Overview); the header is the title with Search beside it, then the pill tabs.
- **Sidebar spacing:** 4px between rows (was 2px), so neighbouring items no longer touch when one is selected.
- **No colour emojis:** list icons are minimal line icons (`src/modules/todos/list-icons.ts`, 16 choices); a list stores the icon's key. Migration 0008 maps the emojis the app used to offer to their icons and removes General's emoji; any other stored emoji now shows the plain list icon. The list form offers the icons instead of emojis (no free-text emoji box). Rule recorded in docs/design.md §8.
- **Search for everything:** `/search` moved out of the Tasks section and now also searches Expense Tracker entries (name, notes, lender, platform, category; `searchEntries`, newest 50). An entry result opens its tab in its month with the words as the filter. The sidebar, More sheet, palette and `/` all go there.
- **Sign-in and sign-up:** the cover panel is pinned to the dark green-black in both themes; the form side is a grainy green-and-orange gradient generated afresh on the server for every visit (`randomGradient`: five blobs, three orange and two green, over a random-angle wash, blurred, with an SVG noise layer), with the form on a solid card. Phones get the gradient behind the card and the brand inside it. The feTurbulence grain is a deliberate exception to the impeccable skill's ban, because O asked for exactly this.
- **Reason:** O's final pre-deployment requests in chat.

## 2026-11-12: Logo concepts and project-level agent skills

- **Logo:** four concepts drawn from the brief in `docs/brand/logo-prompt.md` (A shelf, B bottom line, C foothold, D set square), as SVGs in `public/brand/` and side by side in `docs/brand/concepts.html`. All sit on a 32-unit grid with a 24-unit L, the same height as the wordmark's capitals. The wordmark is the app's Bricolage Grotesque at weight 600 and optical size 96, outlined to paths so no font is needed. Claude recommended A.
- **Chosen: B, the bottom line** (O, 2026-11-12). Every edge is on a 4-unit step of the 32 grid (one stroke = 4 units), so at 16px and 32px no pixel is blurred (checked by rendering to a canvas). Final files in `public/brand/` (icons, lockups, a favicon that switches to light in dark mode, a rounded and a maskable 512 app icon); the sheet is `docs/brand/logo.html` and the rules are `docs/brand/usage.md`. The other concepts' SVGs were removed from `public/` and survive only inline in `concepts.html`. Nothing in the app uses B yet: `LedgeMark` still draws the old placeholder, and no PNGs exist.
- **Agent skills:** the SVG Logo Designer skill was installed at O's request with `npx skills add`, into `.agents/skills/` (linked from `.claude/skills/`, tracked in `skills-lock.json`). These are third-party files kept exactly as published, so Prettier ignores them.

## 2026-11-12: Logo B in the app

- **Brand:** the sidebar and sign-in logo is now the exact lockup drawn inline (outlined wordmark, not live text), so it matches the logo files; sizes are chosen so strokes are whole pixels (3px and 4px). Removed the old stroke-drawn mark.
- **Icons:** new `src/app/icon.svg` (theme-aware), `favicon.ico` (dark tile, 16/32/48) and `apple-icon.png` (180, full bleed). The PNGs are rasterised from the rectangles by a small script, not by a design tool. `apple-icon.png` added to the proxy's public list so signed-out visitors and iOS can fetch it.
- **Not added:** a web app manifest (it would change how the app installs on Android; ask O first).
- **Reason:** O said "Yes, switch it".

## 2026-11-12: Sidebar sections are one toggle button; Blog placeholder

- **Sidebar:** each module's header (Expense Tracker, Tasks) was a link to the module plus a separate chevron button, and clicks often hit the wrong one. Now the whole row is one button that shows or hides the module's pages; it never navigates. The pages under it are the links (Summary and Overview are the homes). It still opens itself when you arrive inside the module.
- **Blog placeholder:** a third module, `blog` (route `/blog`, Newspaper icon, no views), shows in the sidebar as a plain link, in the phone tab bar between Tasks and Search, and in the palette. The page only says "Coming soon". The blog itself stays a v0.1 non-goal and is parked in `docs/ideas.md`; this is O's explicit request in chat.
- **Phone tab bar:** with five tabs (Expenses, Tasks, Blog, Search, More) the full "Expense Tracker" label wrapped, so modules may set a `shortLabel` for the tab bar; the Expense Tracker's is "Expenses".
- **Reason:** O's requests in chat (2026-11-12).

## 2026-11-12: Orange-rule logo everywhere; logo on phones; Search in the phone tab bar

- **Orange rule everywhere:** the logo's second rule is always orange (`fill-dash-accent`) in `Brand`, `LedgeMark`, the new `BrandTile` and on sign-in, and in `icon.svg` (`#f26b21`, `#f58445` in dark mode) and `favicon.ico`. This replaces "one colour by default" in `docs/brand/usage.md`. The logo's orange is part of the logo, so it does not count against the one-orange-tile rule. Always-dark surfaces set `--dash-accent` to `#f58445`.
- **Phone logo row:** `AppMain` starts every page on phones with the lockup, as a 44px link to home. Chosen over putting it in the old Search corner because only the Tasks and Expenses headers have that corner; this way the logo is on every page.
- **Search on phones:** a bottom tab (the bar is Expenses, Tasks, Blog, Search, More), so the header's round `SearchButton` is tablet and up only, and Search left the More sheet.
- **Phone sign-in:** the logo moved out of the card. Above it sit `BrandTile` (the app icon at 72px; a rounded square rather than a circle, to match the home-screen icon) and `Wordmark`.
- **Reason:** O's requests in chat (2026-11-12).

## 2026-11-12: Pointer cursor everywhere; sidebar headers open their first view; quick add tidy-up

- **Pointer cursor:** Tailwind 4 resets buttons to `cursor: default`, so many controls (sign-in buttons, the + button, the dialog close, theme toggle, Sign out, View, the sidebar headers, period arrows, entry rows, sort) showed an arrow. One rule in the `globals.css` base layer gives every enabled button, ARIA button/menu/option/tab/checkbox/switch/radio role, select, summary and checkbox/radio label `cursor: pointer`; disabled controls keep the arrow and a `cursor-*` class still wins (drag grips keep `grab`). The shadcn menu, select and command items had `cursor-default` hard-coded; changed to `cursor-pointer`. Chosen over adding the class to each component, so new controls get it too.
- **Sidebar headers (tried, then reverted the same day):** opening a closed section also went to its first view (Summary, Overview). O tried it and found it felt wrong, so the header is back to a plain show/hide toggle that never changes the page (the entry above stands).
- **Quick add:** the title placeholder is "What needs doing?" instead of the parser example. The priority segmented control has a sliding raised pill (Motion `layoutId`, spring 0.3s, no bounce; instant with reduced motion), the same pattern as `PillTabs`.
- **Reason:** O's requests in chat (2026-11-12).

## 2026-11-12: What Ledge is, in its own words (sign-in cover)

- **Positioning:** "The everyday ledger: one book for the things you keep track of." Tasks and money today; a blog, journal, reminders and health later. Replaces "Private and self-hosted" and "Ledge runs on your own server", because O means to let other people use it on his server one day, and for them it would not be self-hosted.
- **Cover panel:** logo, kicker, headline, one line on the name, then a "Contents" page (numbered modules with Ready, Soon or Later) in place of the decorative ruled rows. Real text, so it is a labelled list. `APP_DESCRIPTION` (the page description) and `PRODUCT.md` match.
- **Not decided:** opening Ledge to other people (§16 Q3) and the later modules are parked in `docs/ideas.md`; the cover only names them as "Later".
- **Reason:** O's request in chat (2026-11-12).

## 2026-11-12: Phone sign-in logo side by side

- The tile and the wordmark above the phone sign-in card now sit in a row instead of stacked: a 48px tile (4px strokes, still whole pixels) and the wordmark at 1px per unit, so its capitals are as tall as the mark inside the tile.
- **Reason:** O's request in chat (2026-11-12).

## 2026-11-12: No logo row on phone pages; Lists menu in the phone Tasks header

- **Logo row removed:** the lockup at the top of every phone page (added earlier today) took space and did not look good to O. Phone app pages start with the title again; the logo stays in the sidebar, sign-in, favicon and app icons.
- **Lists on phones:** moved out of the More sheet (which is now Trash, Settings and the account) into a "Lists" menu at the top right of every Tasks page (`ListsMenu`, phones only; Radix dropdown in the Log a transaction card style, with "New list"). While it is open the page behind is dimmed and blurred. This brings back a phone-only version of the Lists button removed on 2026-11-11; tablets and desktops keep the lists in the sidebar and the round Search button.
- **Reason:** O's requests in chat (2026-11-12).

## 2026-11-12: PDF reports, figure rows and the Summary tiles

- **PDF reports:** the expense breakdown (month or year) and the annual cash flow trend (year) download as PDFs from their Summary cards and from a new Expense Tracker card in Settings. Empty periods give a full sheet of zeros.
- **No PDF library:** the files are written by a small built-in writer (`src/lib/pdf.ts`: text in the standard Helvetica faces, rectangles and lines, A4, multi-page tables). Reasons: pnpm cannot run on this machine at all (Windows Device Guard blocks its native binary, including pnpm 12 from npm), so a dependency could not be added to the lockfile; and two simple tables do not need a layout engine. Trade-off: the standard fonts have no rupee sign or non-Latin letters, so figures carry no symbol, the subtitle names the currency, and other characters are replaced. If richer reports are wanted later, `@react-pdf/renderer` is the candidate (needs O's OK and a working pnpm).
- **Period control:** the Summary's month picker was split into a controlled `PeriodControl` (with a year-only mode) so Settings uses the same control; `PeriodPicker` keeps the URL wiring. The arrows now stop at the year limits (2000 to 2100).
- **Phone figure rows:** on the Expense Summary and the Tasks overview all four rows are identical and evenly spaced; the highlighted one (Net savings last, Due today first) is filled orange edge to edge instead of being a smaller rounded band. The extra space under the last row is gone.
- **Desktop Summary tiles:** the four figures are separate cards in a 2 by 2 grid, with no outer box, like the Tasks overview.
- **Sign-in contents:** Blog removed; Journal is "Soon", then Reminders and Health "Later" (O is replacing the blog with a journal).
- **Reason:** O's requests in chat (2026-11-12).

## 2026-11-12: Journal (Phase 11), Need or want labels, and a day filter for expenses

- **Scope:** O asked for a journal in place of the Blog placeholder and approved the design in chat (two sketches, then "Seems good"). This adds a module to v0.1 (CLAUDE.md §1) as Phase 11, built ahead of the remaining Phase 10 items. The full spec is in `docs/journal-spec.md`.
- **Shape:** one page per day (editable all day, any past day, never a future one), plain text with autosave, an optional five-step mood, and a day picker built like the Expenses period pill (with a dot on days that have a page). A page with no words and no mood is deleted, not kept empty.
- **Facts strip:** tasks done, money spent, slipped tasks and, only on days that had any, money in and saved. They are worked out by pure code (`day-facts.ts`) from one data function, and each links to the same day in Tasks or Expenses. O asked for kind wording instead of bare zeros ("No-spend day", "All caught up"). The money card is hidden on days with nothing, because a daily "you didn't invest" would nag. "Your usual" spending is the 30-day daily average, and within 25% either way counts as "about".
- **No AI yet:** O chose plain facts for now. The AI reflection card, the weekly look-back and the other later ideas are parked in `docs/ideas.md`; AI features stay a v0.1 non-goal until O picks a provider.
- **Need or want:** an optional label on expenses (O chose Need · Want), stored in `finance_entries.spend_label`, which a CHECK limits to expenses. It shows as clearable chips in the sheet, in the row details, and as filter chips on the Expenses tab.
- **Day filter:** `?day=` on the entries tabs and on Completed, so the journal's cards can open one day. It is a filter on top of the period, not a new period type, so the period picker and the reports are unchanged.
- **Routes:** `/blog` is gone. `/journal` replaces it in the registry, the sidebar, the phone tab bar and the palette, and the sign-in contents list Journal as Ready.
- **Small fixes found on the way:** `scrollbar-gutter: stable` on `html`, so pages that grow or shrink (folding the facts) do not shift sideways. The journal's limits live in `modules/journal/limits.ts`, imported relatively by the database schema, because drizzle-kit does not read the `@/` alias.
- **Reason:** O's requests in chat (2026-11-12).

## 2026-11-12: Tasks first; a welcome page after sign-in

- **Order:** the module registry lists Tasks, then Expense Tracker, then Journal, so the sidebar, the phone tab bar and the command palette all follow that order.
- **Welcome page:** `/` used to redirect to `/tasks`; it is now a page in the app shell where sign-in and sign-up land. It greets you and offers two buttons: "Add a task" (Tasks overview with quick add open) and "Log a transaction" (Expense Summary with the Log a transaction menu open). The buttons pass `?add=task` or `?add=transaction`; a small hook (`useOpenOnArrival`) opens the thing and then removes `add` from the address, so a reload or Back does not open it again. A query parameter was chosen over a stored flag so the link works in a new tab too.
- **Reason:** O's requests in chat (2026-11-12).

## 2026-11-12: Quick add as a sheet, blur behind sheets, one width for Tasks

- **Quick add** moved from a centred dialog into the dashboard `Sheet` (right side with a mouse, bottom sheet on a phone), so adding a task and logging a transaction look and behave the same.
- **Sheet backdrop:** a 6px blur with a light tint (15% black, 35% in dark) instead of a 32% to 60% black dim, so the page stays recognisable behind the sheet. It applies to every sheet.
- **Tasks width:** all Tasks routes have one width. Before, only the Overview was wide, so the header and pill tabs jumped sideways when switching tabs. First all tabs took the Overview's full width; O found the blocks too wide, so every Tasks tab is now one centred column (`max-w-4xl`), the same width on every tab.
- **Journal:** no Search button in its header and no round + (add a task) button; the day control sits alone at the right.
- **Sidebar Lists collapsible:** "Lists" under Tasks is a toggle like the module headers; the new-list + only shows while it is open, so a collapsed section is just one quiet row.
- **No + button on Search, Settings and Trash** either: the round button only appears where adding something belongs (Tasks pages, the welcome page, and Log a transaction on the Expense Tracker). `q` still opens quick add everywhere.
- **Reason:** O's requests in chat (2026-11-12).

## 2026-11-13: Roadmap after deployment (plan only, nothing built)

- **Order O set:** fix small bugs, deploy by hand to the home server, set up automatic deploys (push to `main` updates the server), then three big changes one at a time, each finished and running in production before the next: a glass redesign (glassmorphism or "liquid glass", looks only), smarter search (pgvector, then RAG), and a phone app that shares the website's data. Last: open source the project and host it publicly.
- **Why after deployment:** O uses the app mostly on his phone and wants to try each change on the real phone, against the real server, while it is being built.
- **Nothing is scheduled or specced.** The details, options, risks and recommendations are in `docs/ideas.md` ("Roadmap after deployment"). Each item needs its own spec and O's go-ahead; none of them changes §1 scope or the §14 phases yet.
- **Findings recorded with the plan:**
  - Search today is not brute force for tasks (Postgres full-text index); expense entries use a plain `ILIKE` match; the journal is not searched. Data size will not make search slow; the case for vectors is matching by meaning and answering questions.
  - Vector search and RAG need a model provider (local or API), which is the same open choice that keeps AI features a v0.1 non-goal.
  - A phone app needs no second database: any app talks to the same server. An installable web app (PWA) is the small first step; a native app needs an HTTP API and token sign-in that do not exist yet; offline sync is the hard part.
  - The liquid-glass skill O found (`affaan-m/ecc`, `liquid-glass-design`) has not been installed or read; it must be reviewed first and checked that it suits web CSS.
- **Reason:** O's plan in chat (2026-11-13).

## 2026-11-13: Ledge joins the existing Cloudflare tunnel

- **Decision:** O's home server already runs one Cloudflare tunnel with several routes (portfolio, SSH, a trip planner). Ledge is added to it as one more route instead of getting its own tunnel. The rule is one tunnel per machine, one route per app.
- **Service URL** depends on where that tunnel's cloudflared runs: `http://localhost:3000` for a system service (Ledge's port is bound to 127.0.0.1, so only the machine itself reaches it), or `http://app:3000` for a cloudflared container joined to Ledge's `ledge_default` network. The guide's step 6.1 shows how to tell.
- **Kept:** the compose `cloudflared` service (profile `tunnel`) for a machine without a tunnel; on the home server `TUNNEL_TOKEN` stays empty.
- **Clean-up advice (guide 6A):** O's two older per-app tunnels (Trip Deck, Tracker; apps no longer used) can be removed: stop their connectors, delete their routes and tunnels, delete leftover `cfargotunnel.com` CNAMEs. If those apps return, they become routes on the main tunnel. Also: keep the SSH route behind Cloudflare Access, and turn on domain auto-renew (every route, including SSH, depends on the domain).
- **Not written into the repo:** the real domain and hostnames. The guide uses `ledge.<your-domain>`, so the repository does not advertise the server's SSH address.
- **Reason:** O's request in chat (2026-11-13).

## 2026-11-13: No keyboard on open, blurred backdrops, the Ledge mark as More, About card

- **Keyboard:** on a touch screen (`(pointer: coarse)`), sheets and dialogs no longer focus their first field when they open, so the on-screen keyboard stays down until you tap a field. Covers Add a task, every expense or income form, the list dialog, the task drawer and the Search page. Mouse users still land in the first field. One helper, `src/lib/touch.ts` (`isTouchDevice`, `keepKeyboardClosed`); `Sheet` (Base UI) focuses the sheet itself on touch; `DialogContent` and `SheetContent` do the same through `onOpenAutoFocus`. The re-focus after adding a task is kept (the keyboard is already up then).
- **Blur:** the Log a transaction menu now dims and blurs the page behind it, like the sheets; the menu and the round button stay sharp. The shared dialog, side sheet and alert overlays use the same 6px blur and tint as the dash sheet (they were unblurred or barely blurred).
- **More tab:** the Ledge mark (L in the text colour, orange rule) replaces the menu icon; the label stays "More".
- **App name:** Settings starts with an About card holding the full Ledge lockup and the tagline.
- **Overview:** the empty Today card is shorter on phones (`EmptyState compact`).
- **Speed:** `getUserSettings` is cached per request (the layout and the page both asked for it). Then, with O's OK ("Yes, add it"), Better Auth's `session.cookieCache` is on with a 5 minute `maxAge`: the signed-in user is kept in a signed cookie, so most requests skip the session lookup (measured: 8 page loads read the session table 0 times). Cost: signing out on one device can take up to 5 minutes to reach another device that still holds the cookie; signing out on the same device is instant (checked). The cookie is signed with `BETTER_AUTH_SECRET`, `httpOnly`, same attributes as the session cookie. The proxy and every `requireUser()` call are unchanged (§5). A "sign out everywhere" button (P1, not built) should be told about this delay.
- **Reason:** O's requests in chat (2026-11-13).

## Pending decisions (log here when made)

- Model provider for AI features (embeddings, RAG answers, the Journal's AI ideas): local model on the home server or a hosted API. Blocks the smarter-search item in `docs/ideas.md`.
- Licence for open sourcing (MIT or AGPL), and whether the seed data and git history are safe to publish.

- Password reset: Ledge has no "forgot password" (no email service). A command-line reset script is parked in `docs/ideas.md`.
