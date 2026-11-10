# Phase 0: Scaffold (setting up the workshop)

**Status:** Done on 2026-11-10.

## What this phase is for

Before building a house you need a workshop: tools, a clean workbench, a place to keep materials. Phase 0 is that. Nothing here is something you would use day to day. It makes sure everything built later stands on solid ground.

At the end of this phase, you can start the app on your computer, open it in a web browser, and see a page. The database (where your information will be kept) is running. The automatic checks that catch mistakes are in place.

## What was built, step by step

### 1. The project folder and its notes

- A folder called `Ledge` holds everything. It is tracked by **git**, a tool that remembers every version of every file, so any change can be looked at or undone. The project is also copied to GitHub, an online home for it.
- `CLAUDE.md` is the master plan. It describes what is being built, in what order, and the rules for building it. It is read at the start of every working session and is kept up to date as things change.
- `docs/decisions.md` is a diary of choices ("we picked X because Y").
- `docs/ideas.md` is a parking lot. New ideas go there instead of being built right away, so the plan does not keep growing.
- `README.md` is the instruction sheet: how to set up and run the app.
- Empty folders were prepared for each part of the app (sign in, tasks, expenses, and so on), so everything has a place.
- A file called `.env.example` lists the settings the app needs (like a form with the blanks named). The real file with your real values is called `.env`, and it is deliberately **never** saved to GitHub, because it holds secrets.

### 2. The app itself: an empty shell that runs

The app is built with **Next.js**, a popular toolkit for making websites that behave like apps. It is written in **TypeScript**, a stricter form of the usual web language that catches many mistakes before the app even runs. Strict mode is switched on.

The first version simply showed a page. Later in Phase 1 that page became the sign-in screen.

### 3. The look and feel

- **Tailwind CSS** is a system for styling: colours, spacing, text sizes.
- **shadcn/ui** is a set of ready-made, accessible building blocks (buttons, text boxes, side menus, pop-up sheets) that can be restyled. "Accessible" means people using only a keyboard, or a screen reader, can use them.
- The colours are stored as named settings in one place (called **design tokens**), so changing the look later means changing one list, not hunting through hundreds of screens.
- **Light and dark themes** both exist. By default they follow your computer's setting, and a small button in the side menu lets you choose light, dark or "follow my computer".

### 4. The database

- **PostgreSQL** (often called Postgres) is the database: the organised filing cabinet where your accounts, tasks and everything else will be stored.
- It runs inside **Docker**, a tool that runs programs in sealed boxes (called containers) so they do not mess up the rest of your computer and behave the same everywhere. Version 18 of Postgres is used, the newest stable version.
- Two Docker setup files exist:
  - `docker-compose.yml` is the "real" setup. It deliberately does **not** open the database to the outside world. That is the safe setting for the home server.
  - `docker-compose.dev.yml` is a development-only addition that lets your own computer reach the database on a private address (`127.0.0.1`, which means "this computer only") at door number **5433**.
- The database has a "health check", a small automatic question ("are you ok?") asked every few seconds so you can tell when it is ready.
- The command `pnpm db:up` starts it with both files.

### 5. The checking tools

These tools run automatically and tell you if something is wrong:

- **Type checking** (`pnpm typecheck`): reads all the code and finds mismatches, like putting text where a number is expected.
- **ESLint** (`pnpm lint`): a spell-checker for code habits, which flags risky or sloppy patterns.
- **Prettier** (`pnpm format`): tidies the layout of the code so it all looks consistent.
- **Vitest** (`pnpm test`): runs small automatic experiments ("tests") that confirm pieces of the app still work. One real test existed at the end of this phase.
- **Playwright** (`pnpm test:e2e`): a robot that opens a real browser and clicks through the app like a person would. It is set up but has no robot scripts yet; they come in later phases. (Its browser downloads have not been installed yet.)

The rule from the master plan is that before any piece of work is called finished, type checking, linting and tests must all pass.

### 6. The commands

A set of short commands was created so you never have to remember long ones: start the app, build it for real use, run the checks, start the database, create and apply database changes, open a visual database viewer. They are listed in `README.md`. One command (`pnpm db:seed`, which will fill the app with sample data) exists only as a placeholder that says "not yet", because that comes in Phase 2.

### 7. Exact versions

Every outside tool the app uses is locked to one exact version (for example Next.js 16.4.5), not "this version or anything newer". That way the app does not break by surprise when a tool updates. The versions are listed in `CLAUDE.md`.

## Decisions in plain words

- **Code checker and tidy-up tool: ESLint and Prettier.** The alternative was a newer all-in-one tool called Biome. ESLint already knows the special rules for Next.js, and Prettier needs almost no setup.
- **Database door 5433, not 5432.** 5432 is the standard door for Postgres, but another project on this computer was already using it. Rather than interfere, Ledge uses 5433.
- **Database is hidden from the outside on the real setup.** Only the development setup opens a private door, on your computer only.
- **Some Next.js speed features were switched off** ("Cache Components" and "partial prefetching"). They are for pages that look the same for everyone, so they can be prepared in advance. Every page in Ledge is personal to you, so those features would only add complications.
- **Exact versions.** Explained above.
- **A small permission was given to a build helper called esbuild** to run its own setup step. Package tools block such steps by default as a safety measure. The helper is needed by the database tools, and two others stay blocked.

## How you can see it working

1. Start the database: `pnpm db:up`.
2. Start the app: `pnpm dev`.
3. Open `http://localhost:3000` in a browser.

## What was not done in this phase

- No sign-in yet (Phase 1).
- No sample data command (Phase 2).
- No automatic browser-clicking tests yet (they start in Phase 4 and later).
