# Ideas parking lot

Anything not in CLAUDE.md §1 or §6 goes here instead of being built. Add a line with the date and a short note. O decides what graduates into the spec.

## Parked

- 2026-11-11: **Blog** (O mentioned it as a possible later module, after the expense tracker, redesign and deployment). Needs its own spec: public or private, markdown editor, drafts, images.
- 2026-11-11: **Custom expense categories** (add, rename, recolor, retire) instead of the fixed lists in `src/modules/expenses/categories.ts`. Stored as text already, so no migration is needed to start.
- 2026-11-11: **Monthly budgets per category**, with over-budget warnings on the summary.
- 2026-11-11: **Recurring income and expenses** (rent, salary, subscriptions) created automatically, and editing a whole EMI series at once. Today only EMIs can be repeated, once, when added.
- 2026-11-11: **Import from bank or UPI statements** (CSV or PDF), with duplicate detection.
- 2026-11-11: **Investments: current value and returns** (gain or loss, XIRR), not only money put in.
- 2026-11-11: **Multi-currency** entries and conversion (today one currency per user, from Settings).
- 2026-11-11: **More expense charts** (category trends over time, payment-method split) beyond the one cash-flow bar chart.
- 2026-11-11: **Export expense data** as CSV and JSON. Fits the P1 export item (Phase 10).
- 2026-11-11: **Password reset** for the single owner: a command-line script (`docker compose exec app ...`) that sets a new password, since there is no email service. Needed if the password is ever lost.
- 2026-11-11: **Nonce-based Content Security Policy** (drop `'unsafe-inline'` for scripts) by generating a nonce per request in `proxy.ts` and passing it to the theme provider.
- 2026-11-11: **Automatic off-site backups** built into the stack (an `rclone` sidecar) once O has chosen where they go.
- 2026-11-11: **Uptime alert**: ping `/api/health` from outside (Cloudflare Health Checks, UptimeRobot or Healthchecks.io) and notify O when it fails or when the nightly backup stops.
- 2026-11-11: **Pin `cloudflared` and other image versions** in `docker-compose.yml` after the first successful deploy (the compose file uses `latest` for cloudflared).

## P2 items already named in the spec (do not build now)

- Calendar view (week and month)
- Saved filters, custom views
- Reminders and notifications

## Later modules mentioned in the spec

- Calendar, notes, goals dashboard, public portfolio
