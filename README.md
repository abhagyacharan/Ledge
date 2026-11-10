# Ledge

A self-hosted personal life-management app: auth, a to-do/task manager, and (later) an expense tracker. Single owner, run at home, reached over HTTPS through a tunnel.

**Status:** pre-scaffold (Phase 0). See [CLAUDE.md](CLAUDE.md) for the spec, phases and current status, and [docs/decisions.md](docs/decisions.md) for decisions.

This README is kept accurate as phases land. Sections marked _TBD_ are filled in by the phase named.

## Setup
_TBD (Phase 0)._ Requires Node.js, pnpm and Docker.

## Environment variables
Copy `.env.example` to `.env` and fill it in.

| Name | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `BETTER_AUTH_SECRET` | Long random string used by Better Auth |
| `BETTER_AUTH_URL` | Public base URL of the app |
| `ALLOW_SIGNUP` | `true` or `false`. Set to `false` on the server after creating the owner account |
| `TZ` | Server timezone (`Asia/Kolkata`) |

## Run
_TBD (Phase 0)._ Commands are listed in CLAUDE.md §10.

## Test
_TBD (Phase 0)._ `pnpm typecheck && pnpm lint && pnpm test`, plus `pnpm test:e2e`.

## Deploy
_TBD (Phase 7)._ Docker Compose on the home server, exposed via Cloudflare Tunnel or Tailscale.

## Backup and restore
_TBD (Phase 7)._ Nightly `pg_dump`, copied off the machine; the restore command will be documented here after a restore has been tested.
