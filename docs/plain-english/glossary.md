# Glossary

Plain meanings of words that appear in this project. Terms are in alphabetical order. New words are added whenever they first appear in a phase write-up.

**Accessibility audit.** An automatic inspection of each screen against the international rules (WCAG) for contrast, names for screen readers, structure and more.

**Accessible.** Usable by everyone, including people who use only a keyboard or a screen reader, or who have trouble seeing low-contrast text.

**API.** A doorway that programs use to talk to each other. A web address that returns data instead of a page.

**App Router.** The way Next.js decides which page to show for which web address, based on how folders are arranged.

**Archive.** Putting a list away without deleting it. Archived lists leave the side menu and can be brought back from Settings.

**Autosave.** Saving a change automatically, without a Save button. In Ledge, text saves when you click away; choices save when you make them.

**Backup.** A saved copy of the database, kept so you can recover from a disaster.

**Better Auth.** The ready-made login system used for sign-in, sign-up, and sessions.

**Bottom sheet.** A panel that slides up from the bottom of a phone screen, used here for the add and edit form. You can drag it down to close it.

**Build.** Turning the code into the finished, optimised version that actually runs for daily use.

**Cascade.** When deleting one record automatically deletes the records that depend on it, for example deleting a list deletes its tasks.

**Check constraint.** A rule built into a database table that rejects bad values, for example a priority above 3.

**Cloudflare Tunnel.** A way to reach your home server from the internet without opening any door on your router. Your server connects out to Cloudflare, and Cloudflare passes visitors down that connection, with HTTPS included.

**Collation.** The rule a database uses to decide alphabetical order, for example whether capital letters count the same as small ones.

**Chip.** A small rounded button with a word on it, used for quick choices (a category, a payment method) or filters. A filled black chip is the chosen one.

**Command palette.** A search box that pops up (Ctrl+K or `/`) to jump to any view, list or tag, or to run an action, without using the menu.

**Commit.** A saved snapshot of the project in git, with a short note about what changed.

**Composite foreign key.** A link between two records that must match on two things at once. Ledge uses it so a task can only be linked to a list owned by the same person.

**Container.** A sealed box in which a program runs, so it cannot interfere with the rest of the computer. Made by Docker.

**Content Security Policy (CSP).** A set of instructions a website gives the browser about what it may load, for example "only things from this site, never inside another site's frame". It limits the damage if an attacker slips something into a page.

**Contrast.** How different the colour of text is from its background. Too little makes text hard to read, especially for people with low vision.

**Cookie.** A small piece of data a website stores in your browser, like a wristband that proves you are signed in.

**Demo user.** The made-up account created by the seed command so every screen has something to show.

**Dependency.** An outside tool or library the app relies on instead of writing it from scratch.

**Design tokens.** A single list of named colours, sizes and spacing that the whole app draws from, so the look can be changed in one place.

**Detail drawer.** The panel that slides in from the side (full screen on a phone) when you open a task, to see and change everything about it.

**Display face.** The typeface used for big titles and big numbers. Ledge uses Bricolage Grotesque for these and a plainer face for ordinary text.

**Docker / Docker Compose.** A tool for running programs in containers, and a file format for describing which containers to run together.

**Double rule.** Two thin lines drawn under a final total, the accountant's way of saying "this is the bottom line". Ledge uses it under net savings and totals, and in its logo.

**Drag handle.** The grip (six dots) on the left of a task. You grab it to move the task, with a mouse, a finger or the keyboard.

**Drizzle.** The translator that lets the app read and write the database safely in code.

**EMI.** "Equated monthly instalment": the fixed amount you pay each month towards a loan. In Ledge's expense tracker, "EMIs & loans" also covers credit card bills and other debt payments.

**End-to-end test (e2e).** A robot that uses a real browser and clicks through the app the way a person would.

**Environment variable.** A setting kept outside the code (for example a secret or an address), so the same code can run in different places. Stored in the `.env` file.

**ESLint.** A tool that scans code for risky or sloppy patterns.

**Filter.** Hiding tasks that do not match your choice, for example only tasks with the tag "bills".

**Floating date and time.** A date or time stored without a time zone, read in the owner's time zone. Avoids daylight-saving mistakes.

**Focus ring.** The visible outline around the control that currently has the keyboard cursor, so you can see where you are when using Tab.

**Foreign key.** A link from one record to another, for example from a task to its list. The database refuses links to things that do not exist.

**Fractional index.** A short piece of text used to keep items in order. A new item dropped between two others gets text that sorts between them, so nothing else has to be renumbered.

**Full-text search.** Searching for words inside text, including word forms, rather than matching exact letters.

**Git / GitHub.** Git remembers every version of the project. GitHub is a website that stores a copy online.

**Goal.** In Ledge, a list that has a target date. The list heading shows how many days are left.

**Group by.** Splitting a list into headed blocks, for example by priority or by due date.

**Hashing.** Scrambling a password in a one-way process so that the original cannot be recovered from the stored result.

**Health check.** A small address (`/api/health`) that says "ok" only if the app can really reach its database. Docker and you use it to tell whether Ledge is working.

**HttpOnly.** A cookie rule: scripts on a web page are not allowed to read the cookie.

**HTTPS.** The encrypted version of web traffic. Needed for the "Secure" cookie rule. It shows as a padlock in the browser.

**Image (Docker).** The finished, packaged copy of a program that Docker starts containers from. Ledge's image is built from the Dockerfile.

**Inbox.** The old name of the default list. Since 2026-11-11 it is called **General**, and the Tasks Overview took its place in the menu.

**General.** The list every account has from the start. New tasks land here unless you choose another list. It cannot be deleted.

**Overview (Tasks).** The first Tasks page: how many tasks are due today, late, coming up and done this week, plus today's tasks, what is coming, and each list's progress.

**Index (database).** A shortcut the database keeps so it can find records quickly, like an index at the back of a book.

**Integration test.** A test that checks several pieces working together, here including a real database.

**Invested.** Money you put into something that should grow (a fund, shares, a deposit, gold). Ledge counts it separately from spending, so it does not reduce your savings rate.

**Keyboard shortcut.** A key or key combination that does something without the mouse, such as `q` for quick add.

**Lint.** Running ESLint.

**Localhost.** The name for "this very computer". `http://localhost:3000` is the app running on your own computer.

**Migration.** A small numbered file describing one change to the database's structure. Running all of them in order builds the database from nothing.

**Module list (registry).** The single file listing all modules, from which the side menu is built.

**Module.** One self-contained part of the app, such as tasks or expenses.

**Net savings.** Money in, minus EMIs and loans, minus living expenses, for the period you are looking at.

**Next.js.** The toolkit used to build the app's pages and server side.

**Off-site backup.** A copy of your backups kept somewhere other than the server (a cloud drive, another computer, a second disk), so one disaster cannot destroy both the data and its backup.

**Optimistic update.** Showing the result of your action instantly, before the server confirms it, and quietly undoing it if the server says no.

**Overdue.** A task whose due date has passed, or whose due time today has passed. Shown with an icon, red text and the word "Overdue".

**Paise.** One hundredth of a rupee. Ledge stores every amount as a whole number of paise (₹28,000.00 is 2800000) so money never suffers the tiny rounding mistakes that decimals cause.

**Password minimum.** The shortest password allowed. In Ledge it is 10 characters.

**Period picker.** The arrows and menus under the expense tabs that choose which month, or which whole year, you are looking at. The choice is kept in the web address.

**Phase.** One numbered stage of the build plan.

**Playwright.** The tool that runs end-to-end tests.

**PostgreSQL (Postgres).** The database, the organised filing cabinet for all your information.

**Prettier.** A tool that tidies the layout of code so it is consistent.

**Proxy.** The quick doorman at the front of the app. In Ledge it only checks that a login wristband exists.

**Purge (clean-up).** Erasing items that have been in the Trash longer than 30 days.

**Quick add.** The round "+" button (or the `q` key) that opens a small box for adding tasks one after another.

**Radix.** A set of building blocks for interface parts such as menus and dialogs that work well with keyboards and screen readers.

**Rate limit.** A cap on how many attempts are allowed in a short time, to stop automated guessing.

**Reduced motion.** A setting on your computer or phone that asks apps not to animate. Ledge obeys it.

**requireUser().** A small helper run at the start of every private page and action. It confirms who you are, or sends you to Sign in.

**Restore.** Putting a backup back, so the database matches how it was when the backup was taken. Anything saved after the backup is lost.

**Rollback.** Putting the screen back the way it was when a change that already appeared on screen could not be saved.

**SameSite = Lax.** A cookie rule: the browser does not attach the cookie to most requests started from other websites.

**Savings rate.** Net savings as a percentage of the money that came in. 47.4% means you kept about 47 paise of every rupee.

**Scaffold.** The starting skeleton of a project, with the tools and folders in place but little content.

**Screen reader.** Software that reads a screen aloud for people who cannot see it well. It relies on every control having a proper name.

**Section.** A heading inside a list that grouped tasks. Removed on 2026-11-11 to keep the app simple.

**Secure (cookie).** A cookie rule: only send the cookie over HTTPS.

**Seed data.** Sample records created on purpose so every screen can be tried out with something to show.

**Seed.** The command (`pnpm db:seed`) that fills the app with sample data for development.

**Selected task.** The task the keyboard cursor is on. It shows a ring around it, and keys such as `x` and `e` act on it.

**Server action.** A function that runs on the server when you do something in the page (such as adding a task).

**Session.** The server's record that you are signed in. Your cookie points to it.

**shadcn/ui.** A collection of ready-made interface parts (buttons, menus, and so on) that can be restyled.

**Skeleton (loading).** Grey placeholder bars shown while a page loads, shaped like the real content so nothing jumps.

**Soft delete.** Marking something as deleted without erasing it, so it can be restored from Trash.

**Sort.** Choosing the order tasks are shown in: your own manual order, due date, priority or newest first.

**Strict mode (TypeScript).** The most careful setting of TypeScript's mistake-catching.

**Subtask.** A small step under a task. Only one level is allowed. Ticking all subtasks does not tick the parent.

**Table.** One drawer in the database, holding one kind of thing, such as tasks.

**Tag.** A label you could stick on tasks, such as "bills". Removed on 2026-11-11; lists and priorities do the grouping now.

**Tab bar (bottom).** The bar along the bottom of a phone screen with the app's main parts (Expense Tracker, Tasks, More), like a native app.

**Tailwind CSS.** The styling system used for colours, spacing and text sizes.

**Tap target.** The area you can press with a finger. It should be at least 44 pixels square so it is easy to hit.

**Test database.** A second, throwaway database used only by automated tests, so tests never touch your real data.

**Toast.** A short message that pops up briefly, for example "Added to Home", sometimes with an Undo button.

**Transaction.** A group of database changes that either all happen or none do.

**Trash.** Where deleted tasks and lists wait before they are erased for good, so a mistake can be undone.

**Trigger.** A small rule stored in the database that runs automatically whenever something is added or changed, and can refuse the change.

**Type checking.** The mistake-finding pass that TypeScript performs on all the code.

**TypeScript.** The web language used for the code, with extra checks for mistakes.

**Undo.** A button in a toast that reverses what you just did, for a few seconds.

**UUID.** A long random identifier (like `3f2b8c1e-…`) used instead of 1, 2, 3, so IDs cannot be guessed.

**Validation.** Checking that information is acceptable (for example, that an email looks like an email) before using it.

**View.** One way of looking at your tasks, such as Today, Upcoming, All tasks, Completed, a list or a tag. Also the name of the button that opens the sort, group and filter panel.

**Vitest.** The tool that runs the small automatic tests.

**Worker (tests).** A background process that runs tests. Reusing one worker for all test files saves start-up time.

**Zod.** The tool that does validation, with the same rules used in the browser and on the server.
