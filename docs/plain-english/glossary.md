# Glossary

Plain meanings of words that appear in this project. Terms are in alphabetical order. New words are added whenever they first appear in a phase write-up.

**Accessible.** Usable by everyone, including people who use only a keyboard or a screen reader, or who have trouble seeing low-contrast text.

**API.** A doorway that programs use to talk to each other. A web address that returns data instead of a page.

**App Router.** The way Next.js decides which page to show for which web address, based on how folders are arranged.

**Backup.** A saved copy of the database, kept so you can recover from a disaster.

**Better Auth.** The ready-made login system used for sign-in, sign-up, and sessions.

**Build.** Turning the code into the finished, optimised version that actually runs for daily use.

**Commit.** A saved snapshot of the project in git, with a short note about what changed.

**Container.** A sealed box in which a program runs, so it cannot interfere with the rest of the computer. Made by Docker.

**Cookie.** A small piece of data a website stores in your browser, like a wristband that proves you are signed in.

**Dependency.** An outside tool or library the app relies on instead of writing it from scratch.

**Design tokens.** A single list of named colours, sizes and spacing that the whole app draws from, so the look can be changed in one place.

**Docker / Docker Compose.** A tool for running programs in containers, and a file format for describing which containers to run together.

**Drizzle.** The translator that lets the app read and write the database safely in code.

**End-to-end test (e2e).** A robot that uses a real browser and clicks through the app the way a person would.

**Environment variable.** A setting kept outside the code (for example a secret or an address), so the same code can run in different places. Stored in the `.env` file.

**ESLint.** A tool that scans code for risky or sloppy patterns.

**Git / GitHub.** Git remembers every version of the project. GitHub is a website that stores a copy online.

**Hashing.** Scrambling a password in a one-way process so that the original cannot be recovered from the stored result.

**HTTPS.** The encrypted version of web traffic. Needed for the "Secure" cookie rule. It shows as a padlock in the browser.

**HttpOnly.** A cookie rule: scripts on a web page are not allowed to read the cookie.

**Integration test.** A test that checks several pieces working together, here including a real database.

**Localhost.** The name for "this very computer". `http://localhost:3000` is the app running on your own computer.

**Lint.** Running ESLint.

**Migration.** A small numbered file describing one change to the database's structure. Running all of them in order builds the database from nothing.

**Module.** One self-contained part of the app, such as tasks or expenses.

**Module list (registry).** The single file listing all modules, from which the side menu is built.

**Next.js.** The toolkit used to build the app's pages and server side.

**Optimistic update.** Showing the result of your action instantly, before the server confirms it, and quietly undoing it if the server says no.

**Password minimum.** The shortest password allowed. In Ledge it is 10 characters.

**Phase.** One numbered stage of the build plan.

**Playwright.** The tool that runs end-to-end tests.

**PostgreSQL (Postgres).** The database, the organised filing cabinet for all your information.

**Prettier.** A tool that tidies the layout of code so it is consistent.

**Proxy.** The quick doorman at the front of the app. In Ledge it only checks that a login wristband exists.

**Rate limit.** A cap on how many attempts are allowed in a short time, to stop automated guessing.

**Radix.** A set of building blocks for interface parts such as menus and dialogs that work well with keyboards and screen readers.

**requireUser().** A small helper run at the start of every private page and action. It confirms who you are, or sends you to Sign in.

**SameSite = Lax.** A cookie rule: the browser does not attach the cookie to most requests started from other websites.

**Scaffold.** The starting skeleton of a project, with the tools and folders in place but little content.

**Secure (cookie).** A cookie rule: only send the cookie over HTTPS.

**Seed data.** Sample records created on purpose so every screen can be tried out with something to show.

**Server action.** A function that runs on the server when you do something in the page (such as adding a task).

**Session.** The server's record that you are signed in. Your cookie points to it.

**shadcn/ui.** A collection of ready-made interface parts (buttons, menus, and so on) that can be restyled.

**Strict mode (TypeScript).** The most careful setting of TypeScript's mistake-catching.

**Tailwind CSS.** The styling system used for colours, spacing and text sizes.

**Test database.** A second, throwaway database used only by automated tests, so tests never touch your real data.

**TypeScript.** The web language used for the code, with extra checks for mistakes.

**Type checking.** The mistake-finding pass that TypeScript performs on all the code.

**UUID.** A long random identifier (like `3f2b8c1e-…`) used instead of 1, 2, 3, so IDs cannot be guessed.

**Validation.** Checking that information is acceptable (for example, that an email looks like an email) before using it.

**Vitest.** The tool that runs the small automatic tests.

**Zod.** The tool that does validation, with the same rules used in the browser and on the server.
