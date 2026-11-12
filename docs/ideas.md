# Ideas parking lot

Anything not in CLAUDE.md §1 or §6 goes here instead of being built. Add a line with the date and a short note. O decides what graduates into the spec.

## Parked

- 2026-11-11: **Blog** (O mentioned it as a possible later module, after the expense tracker, redesign and deployment). Needs its own spec: public or private, markdown editor, drafts, images. The placeholder page it had on 2026-11-12 was replaced the same day by the Journal; posting a journal entry as a blog post is the planned route (see Journal, later additions).
- 2026-11-12: **Journal, later additions** (O chose these for after the first version; the first version is one page per day with a day-facts strip, Need/Want expense labels, mood and a past-days calendar):
  - **AI reflection card**: a short read of the day from its tasks, spending and entry. Provider not chosen yet (Claude API or a local model); the day's data would leave the server with the Claude API.
  - **AI weekly look-back**: patterns over the last 7 days.
  - **AI prompts to answer** and **AI first draft** of an entry: offered to O, not chosen; revisit when AI is added.
  - **On this day**: the same date a month and a year ago (entry, tasks, spending).
  - **Weekly review page**: computed summary of the week with space to write; AI can sit on top later.
  - **Journal in search and export**: journal pages in the app-wide search and in the JSON export (the export is a Phase 10 item).
  - **Post to blog**: a "Post" button that copies an entry into a separate draft post (never flips the private entry public), edited and then published. Open question: public pages inside Ledge (new unauthenticated surface on the same server as the finances) or export as Markdown to a separate static blog.
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
- 2026-11-12: **Reminders** and **Health** (health data pulled from tracking devices), named by O as where Ledge is heading, with the Journal (built the same day as Phase 11). The sign-in page lists them as "Later" on its contents page; neither is specced or built.
- 2026-11-12: **Other people using Ledge** on O's server (accounts for others, so not "self-hosted" from their point of view). O's stated direction; it touches §16 Q3, sign-up, privacy wording and backups, so it needs a decision before anything is built.
