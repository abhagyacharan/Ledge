# Ledge

A self-hosted personal life-management app: auth, a to-do/task manager, and an expense tracker. Single owner, run at home, reached over HTTPS through a tunnel.

**Status:** Phases 0 to 7 are done: sign-in, the database, a full task manager (an overview, lists, subtasks, detail drawer, quick add, five views, sort, group, filter, drag-and-drop, Undo, Trash, instant updates, keyboard shortcuts, command palette), and an expense tracker (summary, income, EMIs and loans, expenses, investments; month and year views; spec in [docs/expenses-spec.md](docs/expenses-spec.md)), audited for accessibility on phone and desktop in light and dark. The look was redesigned in Phase 8 and again on 2026-11-11 (the dashboard look across the app, a light sidebar and a phone tab bar). Phase 9 (deployment and backups) is built and checked locally; the step-by-step guide for putting it on your server is [docs/deploy-guide.md](docs/deploy-guide.md).

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

| Name                                                | Purpose                                                                             |
| --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `DATABASE_URL`                                      | Postgres connection string                                                          |
| `BETTER_AUTH_SECRET`                                | Long random string (32+ chars) used by Better Auth                                  |
| `BETTER_AUTH_URL`                                   | Public base URL of the app                                                          |
| `ALLOW_SIGNUP`                                      | `true` or `false`. Set to `false` on the server after creating the owner account    |
| `TZ`                                                | Server timezone (`Asia/Kolkata`)                                                    |
| `CLIENT_IP_HEADER` (optional)                       | Header a proxy sets to the visitor's address (`cf-connecting-ip` behind Cloudflare) |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Credentials for the Postgres container; must match `DATABASE_URL`                   |
| `TEST_DATABASE_URL` (optional)                      | Overrides the integration-test database (default: `ledge_test` on the same server)  |

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

Ledge runs on a home server with Docker Compose and is reached over HTTPS through a Cloudflare Tunnel (no router ports are opened). **The full step-by-step guide is [docs/deploy-guide.md](docs/deploy-guide.md).** In short, on the server:

```bash
cp .env.production.example .env   # fill in the secrets and your https address
mkdir -p backups
docker compose up -d --build                # database, migrations, app, nightly backups
curl http://127.0.0.1:3000/api/health       # {"status":"ok"} when the app can reach the database
```

Then add Ledge as one more route on the server's existing Cloudflare tunnel (`ledge.<your-domain>` → `http://localhost:3000` when cloudflared runs as a system service), as step 6 of the guide explains. A server without a tunnel can run the bundled connector instead: put the tunnel token in `TUNNEL_TOKEN` and start with `docker compose --profile tunnel up -d`.

What is in the stack (`docker-compose.yml`): `db` (Postgres 18, named volume, port not published), `migrate` (one-shot: applies new migrations, then exits), `app` (the Next.js standalone server as a non-root user, port bound to 127.0.0.1 only), `cloudflared` (only with `--profile tunnel`), `backup` (nightly dump). The image is built by the multi-stage `Dockerfile`. A build needs internet access once (packages and fonts); the running app does not.

Update later: `git pull && docker compose up -d --build` (migrations run automatically). After creating your account, set `ALLOW_SIGNUP=false` in `.env` and run `docker compose up -d`.

## Backup and restore

The `backup` container writes a gzip dump of the database every night at 02:30 India time (21:00 UTC) to `./backups/daily` (newest 14 kept) and copies Sunday's into `./backups/weekly` (newest 8 kept). **A backup on the same disk is not enough: copy `./backups` off the machine** (rclone or a second disk; see the guide, step 9.2).

```bash
docker compose run --rm --entrypoint "sh /backup.sh once" backup     # a backup right now
sh scripts/restore.sh backups/daily/ledge-2026-11-12-2100.sql.gz        # practice restore into a scratch database
sh scripts/restore.sh backups/daily/ledge-2026-11-12-2100.sql.gz --live # REPLACE the live database (asks you to type RESTORE)
```

The restore (scratch and live) was tested on a development machine against a real dump. Test it once on your own server too (guide, step 9.3).
