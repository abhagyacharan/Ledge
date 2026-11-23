# Ledge

A self-hosted personal life-management app: tasks, money, a daily journal and goal plans in one place. Run on a home server with Docker Compose and reached over HTTPS through a Cloudflare Tunnel.

Built with Next.js 16 (App Router), TypeScript, Tailwind and shadcn/ui, PostgreSQL with Drizzle, and Better Auth.

## What's in it

| Module          | What it does                                                                                                                                                                       | Spec                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Tasks           | Overview, Today, Upcoming, All, Completed and your lists; subtasks, repeats, natural-language quick add, drag to reorder, Undo, Trash, search, keyboard shortcuts, command palette | [CLAUDE.md §6](CLAUDE.md)                                        |
| Expense Tracker | Summary, income, EMIs and loans, expenses and investments by month or year; PDF reports                                                                                            | [docs/expenses-spec.md](docs/expenses-spec.md)                   |
| Journal         | One private page per day with the day's facts and mood; optional PIN lock                                                                                                          | [docs/journal-spec.md](docs/journal-spec.md)                     |
| Plans           | Describe a goal, answer a few questions, review the suggested tasks and add them as a plan                                                                                         | [docs/plans-module-spec.md](docs/plans-module-spec.md)           |
| Voice capture   | Hold + and speak tasks and expenses, in eleven languages; always reviewed before saving                                                                                            | [docs/voice-spec.md](docs/voice-spec.md)                         |
| Account         | Email and password or Google sign-in, forgot password, devices, export (JSON and CSV), delete account                                                                              | [docs/auth-google-reset-spec.md](docs/auth-google-reset-spec.md) |

It installs to a phone's home screen as an app ([docs/pwa-spec.md](docs/pwa-spec.md)). Plans and voice need a Groq API key; everything else works without outside services.

**Status:** in daily use by its owner, being deployed to the home server. Phase-by-phase progress is in [CLAUDE.md §14](CLAUDE.md); decisions are in [docs/decisions.md](docs/decisions.md). New to this? Read the non-technical write-ups in [docs/plain-english](docs/plain-english/README.md).

## Repository layout

The root holds only files that tools look for there: `package.json` and `pnpm-*` (packages), `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `.prettier*`, `vitest.config.mts`, `playwright.config.ts`, `drizzle.config.ts`, `components.json` (shadcn), `Dockerfile` and `docker-compose*.yml` (deploy; the `.dev` file only publishes the database port on your machine), `.env*.example` (settings templates), and `CLAUDE.md`, `AGENTS.md`, `PRODUCT.md` (notes for coding agents). The app is in `src/`, tests in `tests/`, server scripts in `scripts/`, and specs in `docs/`.

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

| Name                                                | Purpose                                                                              |
| --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `DATABASE_URL`                                      | Postgres connection string                                                           |
| `BETTER_AUTH_SECRET`                                | Long random string (32+ chars) used by Better Auth                                   |
| `BETTER_AUTH_URL`                                   | Public base URL of the app                                                           |
| `ALLOW_SIGNUP`                                      | `true` or `false`. Set to `false` on the server after creating the owner account     |
| `TZ`                                                | Server timezone (`Asia/Kolkata`)                                                     |
| `CLIENT_IP_HEADER` (optional)                       | Header a proxy sets to the visitor's address (`cf-connecting-ip` behind Cloudflare)  |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (opt.)   | Turn on "Continue with Google" (setup: docs/auth-google-reset-spec.md)               |
| `RESEND_API_KEY`, `EMAIL_FROM` (optional)           | Send password-reset emails. Unset in development: the link prints in the console     |
| `GROQ_API_KEY` (optional)                           | Turns voice capture on (docs/voice-spec.md). Empty: voice is off                     |
| `VOICE_FAKE` (optional)                             | `1` answers voice requests from built-in examples, without Groq (testing)            |
| `GROQ_TRANSCRIBE_MODEL`, `GROQ_PARSE_MODEL` (opt.)  | Groq model ids; defaults `whisper-large-v3-turbo`, `openai/gpt-oss-120b`             |
| `VOICE_DAILY_LIMIT` (optional)                      | Voice and planner requests per person per day (default 30, about 15 spoken commands) |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Credentials for the Postgres container; must match `DATABASE_URL`                    |
| `TEST_DATABASE_URL` (optional)                      | Overrides the integration-test database (default: `ledge_test` on the same server)   |

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

Update later: `sh scripts/deploy.sh` (safety backup, `git pull --ff-only`, rebuild, health check, prune old images; migrations run automatically; see `docs/deploy-guide.md` §10). After creating your account, set `ALLOW_SIGNUP=false` in `.env` and run `docker compose up -d`.

## Backup and restore

The `backup` container writes a gzip dump of the database every night at 02:30 India time (21:00 UTC) to `./backups/daily` (newest 14 kept) and copies Sunday's into `./backups/weekly` (newest 8 kept). **A backup on the same disk is not enough: copy `./backups` off the machine** (rclone or a second disk; see the guide, step 9.2).

```bash
docker compose run --rm --entrypoint "sh /backup.sh once" backup     # a backup right now
sh scripts/restore.sh backups/daily/ledge-2026-11-12-2100.sql.gz        # practice restore into a scratch database
sh scripts/restore.sh backups/daily/ledge-2026-11-12-2100.sql.gz --live # REPLACE the live database (asks you to type RESTORE)
```

The restore (scratch and live) was tested on a development machine against a real dump. Test it once on your own server too (guide, step 9.3).
