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

## Pending decisions (log here when made)

- Trash auto-purge mechanism: scheduled job vs on-load cleanup (Phase 5).
- Behind Cloudflare Tunnel, set Better Auth's `advanced.ipAddress.ipAddressHeaders` (for example `cf-connecting-ip`) so rate limits see real client IPs (Phase 7).
