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

## Pending decisions (log here when made)

- Trash auto-purge mechanism: scheduled job vs on-load cleanup (Phase 5).
- Behind Cloudflare Tunnel, set Better Auth's `advanced.ipAddress.ipAddressHeaders` (for example `cf-connecting-ip`) so rate limits see real client IPs (Phase 7).
