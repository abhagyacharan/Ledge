# Ledge

A self-hosted personal life-management app: auth, a to-do/task manager, and an expense tracker. Single owner, run at home, reached over HTTPS through a tunnel.

**Status:** Phases 0 to 7 are done: sign-in, the database, a full task manager (lists, sections, tags, subtasks, detail drawer, quick add, six views, sort, group, filter, drag-and-drop, Undo, Trash, instant updates, keyboard shortcuts, command palette), and an expense tracker (summary, income, EMIs and loans, expenses, investments; month and year views; spec in [docs/expenses-spec.md](docs/expenses-spec.md)), audited for accessibility on phone and desktop in light and dark. A frontend redesign (Phase 8) is next, then deployment and backups (Phase 9).

New to this? Read the non-technical write-ups in [docs/plain-english](docs/plain-english/README.md).

This README is kept accurate as phases land. Sections marked _TBD_ are filled in by the phase named.

## Setup

Requires a current Node.js (developed on 26.2), [pnpm](https://pnpm.io) 12 and Docker.

```bash
pnpm install
cp .env.example .env        # then set BETTER_AUTH_SECRET (e.g. openssl rand -base64 32)
pnpm db:up                  # Postgres 18 on 127.0.0.1:5433
pnpm db:migrate             # apply migrations
pnpm db:seed                # optional: demo data (demo@ledge.test / demo-password-123, dev only)
pnpm dev                    # http://localhost:3000
```

Port 5433 (not 5432) avoids clashing with other local Postgres containers. If you change it, update `DATABASE_URL` and `docker-compose.dev.yml`.

## Environment variables

Copy `.env.example` to `.env` and fill it in.

| Name                                                | Purpose                                                                            |
| --------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `DATABASE_URL`                                      | Postgres connection string                                                         |
| `BETTER_AUTH_SECRET`                                | Long random string (32+ chars) used by Better Auth                                 |
| `BETTER_AUTH_URL`                                   | Public base URL of the app                                                         |
| `ALLOW_SIGNUP`                                      | `true` or `false`. Set to `false` on the server after creating the owner account   |
| `TZ`                                                | Server timezone (`Asia/Kolkata`)                                                   |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Credentials for the Postgres container; must match `DATABASE_URL`                  |
| `TEST_DATABASE_URL` (optional)                      | Overrides the integration-test database (default: `ledge_test` on the same server) |

## Run

| Command                                                   | What it does                                   |
| --------------------------------------------------------- | ---------------------------------------------- |
| `pnpm dev`                                                | Dev server                                     |
| `pnpm build && pnpm start`                                | Production build and server                    |
| `pnpm db:up` / `db:generate` / `db:migrate` / `db:studio` | Database container, migrations, Drizzle Studio |

The full command list is in CLAUDE.md §10.

## Test

```bash
pnpm typecheck && pnpm lint && pnpm test
```

`pnpm test` needs the dev database running (`pnpm db:up`). It creates a separate `ledge_test` database and migrates it automatically; your dev data is never touched.

End-to-end tests drive a real browser (desktop and phone sizes, including an accessibility audit):

```bash
pnpm test:e2e
```

They need the dev database running (`pnpm db:up`) and the Chrome browser installed (no download needed). They use their own database (`ledge_e2e`) and their own server on port 3100, re-seeded on every run, so your dev data and any running `pnpm dev` are not touched.

Unit and integration tests take about 15 seconds. Tests that only need a user use `createUser` (`tests/helpers/fast-users.ts`), which skips slow password hashing.

## Deploy

_TBD (Phase 9)._ Docker Compose on the home server, exposed via Cloudflare Tunnel or Tailscale.

## Backup and restore

_TBD (Phase 9)._ Nightly `pg_dump`, copied off the machine; the restore command will be documented here after a restore has been tested.
