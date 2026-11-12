# Ideas parking lot

Anything not in CLAUDE.md §1 or §6 goes here instead of being built. Add a line with the date and a short note. O decides what graduates into the spec.

## Roadmap after deployment (O's plan, 2026-11-13)

Nothing here is built or scheduled yet. This is the order O wants once the app is running on the home server, so that each big change can be tried on his own phone while it is being built. Each item needs its own spec and O's go-ahead before work starts. The remaining Phase 10 items (export, bulk actions) are not placed in this order; O decides where they go.

**Order**

1. Fix the small bugs O finds while using the app.
2. Deploy by hand to the home server (Phase 9, `docs/deploy-guide.md`) and check it works there.
3. Automatic deploys: a push to `main` updates the server.
4. Glass redesign (looks only).
5. Smarter search (meaning-based search, then questions over your own data).
6. A phone app that shares the same data as the website.
7. Open source the project and host it publicly.

### 3. Automatic deploys (CI/CD)

- **Goal:** push to GitHub, the home server rebuilds and restarts by itself.
- **Catch:** the server is not reachable from the internet except through the Cloudflare Tunnel to the app, so GitHub cannot simply SSH in.
- **Options:**
  - **Self-hosted GitHub Actions runner** on the server: the runner connects out to GitHub, and on each push runs `git pull` and `docker compose up -d --build`. Checks (typecheck, lint, tests) can run first on GitHub's machines, so a broken push never deploys. Recommended.
  - **Pull script on a timer** (cron or a systemd timer every few minutes): simplest, no GitHub set-up, but no checks before deploying and a short delay.
  - **Build the image on GitHub, push to GHCR, server pulls it** (Watchtower or a timer): fastest on a weak server because the server does not build, but the most set-up.
- **Must keep:** migrations stay the one-shot `migrate` service; a backup is taken before any deploy that has a migration; a failed health check should leave the old version running or at least alert O.
- **Blocked on:** the first manual deploy.

### 4. Glass redesign (glassmorphism or "liquid glass")

- **What:** frosted, translucent surfaces (blurred backgrounds, soft highlights, depth) across the app. No new functions; a look change large enough to count as a version (for example 0.2).
- **Skill O wants to try:** `npx skills add https://github.com/affaan-m/ecc --skill liquid-glass-design` (from skills.sh). Not installed or read yet. Before using it: read the skill file (a third-party skill is instructions an agent will follow), and check it is written for web CSS. If it targets Apple's native SwiftUI Liquid Glass, it can inspire but not drive a Tailwind app. Fallback: plain glassmorphism by our own rules (`backdrop-filter`, translucent tokens), which O trusts.
- **Risks to design for:**
  - **Readability:** text on a blurred, see-through surface easily fails WCAG AA contrast (§8). Every glass surface needs a tint strong enough to pass in light and dark; the axe audit stays the gate.
  - **Phone speed:** `backdrop-filter` blur is costly, most of all on long scrolling lists and on cheaper Android phones. Use it on few, small, mostly fixed surfaces (tab bar, sheets, headers, cards over a still background), not on every row.
  - **Something to blur:** glass over a flat white page looks like plain grey. It needs a background with colour or a gradient behind it, which is a design decision of its own.
  - **Settings to respect:** `prefers-reduced-transparency` and `prefers-reduced-motion` need a solid fallback.
- **How to try it cheaply:** every colour is already a token in `src/app/globals.css`, and the sheet backdrop already blurs. Do it on a branch, one screen first (suggest the phone tab bar, the sheets and the Expense Summary), look at it on the real phone, then decide whether to roll on. The floating pill tab bar idea below fits here.
- **Docs when it happens:** `docs/design.md` would get a third design language or be rewritten; CLAUDE.md §8 changes need O's OK.

### 5. Smarter search (vectors and RAG)

- **How search works today (so the starting point is clear):**
  - **Tasks:** Postgres full-text search. The database keeps a hidden indexed column of each task's title and notes (`tasks.search`, a GIN index), matches whole and half words, and ranks results. This is an index lookup, not brute force, and stays fast into the hundreds of thousands of rows.
  - **Expense entries:** a plain "contains this text" match (`ILIKE`) over title, notes, lender, platform and category. This one does read every row of yours, which is fine for some thousands of entries.
  - **Journal:** not searched yet (already parked under Journal, later additions).
- **Honest sizing:** one person's data for years is tens of thousands of rows. Speed will not be the problem. What plain search cannot do is match by **meaning** ("doctor" finding "dentist appointment", "that trip in winter" finding a journal page) or **answer questions** ("how much did I spend on eating out in March?"). That is the real reason to do this.
- **Words:** a **vector database** stores each piece of text as a list of numbers (an embedding) so that similar meanings sit close together. In Ledge this would be the **pgvector** extension inside the existing Postgres, not a second database. **RAG** means: find the most relevant pieces, hand them to a language model, and let it write an answer. Meaning-based search needs only the first half.
- **Suggested steps, each useful on its own:**
  1. **Cheap fixes first (no AI):** give expense entries and journal pages the same full-text index as tasks, and add `pg_trgm` for typo tolerance. This removes the "reads every row" part.
  2. **Meaning-based search:** an `embedding` column (pgvector) on tasks, entries and journal pages, filled when a row is saved, and results that blend keyword and meaning matches (hybrid search).
  3. **Ask your data (the RAG part):** a question box that answers with links to the rows it used. Money questions must be answered by real SQL sums (the model picks the query, the database does the maths), never by a model adding up text.
- **The decision that blocks it:** which model makes the embeddings and answers.
  - **Local** (for example Ollama on the home server): nothing leaves the house; needs enough RAM and CPU; slower; small models give weaker answers.
  - **API** (for example the Claude API for answers plus a hosted embedding model): better and faster; costs a little per use; tasks, spending and journal text leave the server.
  - AI features are a v0.1 non-goal until O picks a provider (CLAUDE.md §1), the same open choice as the Journal's AI ideas.
- **Other things to settle:** every vector query still filters by `userId` (§5); embeddings must be deleted with their rows (Trash, delete account); embeddings are tied to one model, so changing the model means recomputing them; backups grow a little.
- **Difficulty:** step 1 is small (a migration and two queries). Step 2 is medium (extension in the Postgres image, a background fill, a ranking blend, tests). Step 3 is the big one (provider, prompts, cost, wrong-answer handling).

### 6. Phone app sharing the same data

- **Short answer:** the data already lives in one place, the home server. Any app is just another window onto that same server and database, so the website and the app can never drift apart. No second database. It can live in this repo.
- **Three routes, smallest first:**
  1. **Installable web app (PWA):** add a web app manifest, icons and a small service worker. "Add to Home screen" then gives an icon, a full-screen window with no browser bars and its own entry in the app switcher, on Android and iPhone. Same code, same repo, same deploys; an update on the server is an update of the app. Needs HTTPS, which the tunnel provides. A few days of work at most. Limits: no app store listing, and offline use needs extra work.
  2. **Store wrapper around the website:** a Trusted Web Activity (Play Store) or Capacitor shell that opens the hosted site. Gives a store listing and some native features (share target, widgets with more work). Still one codebase; a small extra folder in this repo. The iPhone App Store tends to reject thin wrappers and needs a paid developer account.
  3. **A real native app (React Native with Expo):** a second front end. It can sit in this repo as a workspace (pnpm workspaces: `apps/web`, `apps/mobile`, shared `packages/` for the Zod schemas, money and date code). It needs things that do not exist yet: a proper HTTP API (today the screens call Server Actions, which are not a public API), token sign-in for the app (Better Auth has an Expo integration; check its current docs), and every screen rebuilt in native components. Weeks of work, and every later feature is built twice.
- **The hard part, in any route, is offline:** "works like Notion" with edits made offline and merged later means a local copy of the data on the phone and a sync engine with conflict rules. That is a project of its own. Online-only, the PWA already behaves like one session across phone and web today.
- **Recommendation:** do route 1 right after deployment (it is small enough to come before the glass redesign, and it makes testing on the phone nicer). Use it daily for a while. Move to route 3 only if something concrete is missing (offline, widgets, push notifications, the share sheet).
- **Related parked items:** reminders and notifications (P2) are the usual reason to want a native app; web push works on installed PWAs on both platforms but is a non-goal for now.

### 7. Open source and public hosting

- **Before making the repo public:** scan the whole git history for secrets and personal data (the seed data mirrors O's sheet; check it is made up), choose a licence (MIT is the simple default; AGPL if hosted copies must share changes), write a contributor-friendly README, and decide what CLAUDE.md and `docs/` should say to strangers.
- **Public hosting** is the "other people using Ledge" item below: sign-up policy, email (verification and password reset), privacy wording, per-user limits, and backups that hold other people's finances. Needs a decision on §16 Q3.

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
- 2026-11-12: **Floating pill tab bar on phones**: make the bottom navigation a pill-shaped bar that floats above the bottom edge (rounded ends, a little gap from the screen edges and the home bar) instead of the full-width solid bar. O's idea for later; check the 44px tap targets, the safe area, and that the round + button still clears it.

## P2 items already named in the spec (do not build now)

- Calendar view (week and month)
- Saved filters, custom views
- Reminders and notifications

## Later modules mentioned in the spec

- Calendar, notes, goals dashboard, public portfolio
- 2026-11-12: **Reminders** and **Health** (health data pulled from tracking devices), named by O as where Ledge is heading, with the Journal (built the same day as Phase 11). The sign-in page lists them as "Later" on its contents page; neither is specced or built.
- 2026-11-12: **Other people using Ledge** on O's server (accounts for others, so not "self-hosted" from their point of view). O's stated direction; it touches §16 Q3, sign-up, privacy wording and backups, so it needs a decision before anything is built.
