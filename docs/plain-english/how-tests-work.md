# How the tests work

This page explains the automatic tests in plain words: where their data comes from, why they used to be slow, and how they were sped up.

## What a test is

A test is a small program that uses a piece of Ledge the way a person or another program would, then checks the result. If the result is wrong, the test fails and says what differed. Ledge has three kinds:

1. **Unit tests.** Check one small piece of logic with no database, for example "does 'Tomorrow' come out right on the day the clocks change?". Very fast.
2. **Integration tests.** Check the app's data code against a **real database**, for example "can person B see person A's tasks?". They are the main safety net.
3. **End-to-end tests.** A robot uses a real Chrome browser: it signs in, clicks, types and drags, like a person. Slowest, so there are only a few.

## Where the data comes from

- **Not your real data, and not random.** Every test builds the exact data it needs and nothing else, using fixed, readable values ("A's list", "Buy groceries", a title of exactly 500 characters).
- **Separate databases.** Unit and integration tests use a database named `ledge_test`. End-to-end tests use `ledge_e2e`. Your own `ledge` database is never touched. Each tool refuses to run unless the database name ends in `_test` or `_e2e`.
- **Wiped before every test.** Each integration test starts by deleting every user (and, with them, everything they own), so one test can never depend on another.
- **Random only where randomness is the point.** A random ID is used to check that a missing item is handled ("not found"), and counters give each task a unique sort code. Nothing else is random, so a failing test fails the same way every time.
- **The end-to-end demo data** comes from the same sample-data command you use yourself (`pnpm db:seed`), re-run before every end-to-end run. It includes a task due today with no time, so the "Today" test does not depend on what time you run it.

## Why they were slow, and what changed

Almost all the time went into **creating test users**. Signing up and signing in run the app's password protection, which is **deliberately slow** so that stolen passwords are hard to crack. Most tests made two users, and each user cost two slow steps (one to sign up, one to sign in), so every test paid four times before checking anything.

Fixes:

1. **Fast users.** Tests that only need "a user" now insert the user straight into the database and run the same start-up steps as sign-up (settings and Inbox). No password, so nothing slow. Only the sign-in and session tests still use the real, slow route, because that is exactly what they test.
2. **No loading the login system when it is not needed.** The fast-user helper deliberately does not load the login system's code, which was the next biggest cost when starting each test file.
3. **One shared worker.** All test files now run in the same background process, so code is loaded once instead of once per file. This is safe because test files already ran one at a time against one database.

Result: the suite went from about **52 seconds to about 15 seconds**, while growing from 179 to 237 tests.

## Running them

- `pnpm test`: unit and integration tests (needs the database: `pnpm db:up`).
- `pnpm test:e2e`: the browser tests. They start their own copy of the app on port 3100 with their own database, so they do not disturb the app you may have running. They use the Chrome already installed on this computer, so nothing is downloaded.
- Before work is called finished, `pnpm typecheck`, `pnpm lint` and `pnpm test` must all pass.
