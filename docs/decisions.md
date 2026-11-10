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

## Pending decisions (log here when made)
- Lint and format tool: ESLint + Prettier vs Biome (Phase 0).
- How local development reaches the Postgres container, given production never publishes the DB port (Phase 0).
- Trash auto-purge mechanism: scheduled job vs on-load cleanup (Phase 5).
