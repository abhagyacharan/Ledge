# Phase 1: Auth (signing up and signing in)

**Status:** Done on 2026-11-10.

## What this phase is for

Ledge holds private things: your tasks, later your money. So the very first real feature is a front door with a lock. Phase 1 builds that door: a way to create your account, sign in, sign out, and a guarantee that nobody who is not signed in can get past the front page.

It also builds the **frame** of the app (the side menu and the page layout) that every later feature will sit inside.

## What was built, step by step

### 1. Creating an account (sign up)

- A **Create account** page asks for your name, email and password.
- The password must be **at least 10 characters**. If it is shorter, a message tells you right away, in plain words.
- After you create an account you are signed in automatically and taken to your Inbox.
- Your password is never stored as you typed it. The login tool scrambles it with a one-way process called **hashing**, so even someone who stole the database could not read it. The app also never writes passwords into its logs.

### 2. Signing in and out

- A **Sign in** page asks for your email and password.
- If something is wrong, it says **"Incorrect email or password."** It says exactly the same thing whether the email does not exist or the password is wrong. This is on purpose: if the messages were different, a stranger could use them to find out which emails have accounts.
- On the sign-up page, if something unexpected goes wrong, it likewise gives one general message instead of saying "that email is already registered", for the same reason.
- A **Sign out** button sits in the side menu and in Settings. After signing out you are sent to the Sign in page.

### 3. Being locked out of the private pages

- Every page inside the app (Inbox, Today, Upcoming, Settings) requires a valid sign-in. If you are not signed in, you are sent to the Sign in page.
- There are **two layers** of protection:
  1. A quick "doorman" at the entrance (called a **proxy**) that turns away anyone with no login badge at all. It only checks that a badge exists, not that it is real. It is a convenience, not real security.
  2. A real check on every page and every action, done by a helper called `requireUser()`. It looks up your login in the database and confirms it is valid. This is the layer that actually protects you.
- Why two layers? The master plan says never rely on only the entrance check. If it were ever skipped by mistake, the real check on each page would still stop the intruder.
- If you are already signed in and visit the Sign in page, you are sent straight to your Inbox.

### 4. Your login badge (the session)

- When you sign in, the server gives your browser a small piece of data called a **cookie**, like a wristband at an event. Each time your browser asks for a page it shows the wristband, so you do not have to type your password again.
- The wristband is set up with safety rules:
  - **HttpOnly:** scripts running on the page cannot read it, which blocks one common way of stealing logins.
  - **SameSite = Lax:** it is not sent along with requests started from other websites, which blocks another common attack.
  - **Secure:** it only travels over an encrypted (HTTPS) connection. This is switched on for the real server. On your own computer at `http://localhost` it cannot be on, because that is not encrypted, so development differs from the real thing in this one setting.
- The wristband lasts 30 days, and is refreshed about once a day while you keep using the app.
- The real record of who is signed in is kept in the database (a "session"), not just in the wristband. That is why signing out truly ends the login.

### 5. Protection against guessing passwords

- Sign-in and sign-up are limited to **5 attempts per minute** from the same internet address. After that the app answers "Too many attempts. Wait a minute and try again."
- The counting is kept in the database so a restart of the app does not wipe it.
- Note: when Ledge is placed behind the home-server tunnel in Phase 9, one setting must be added so the counter sees each visitor's real address (otherwise everyone looks like they come from the tunnel). This is recorded as a to-do.

### 6. Closing sign-ups

- A setting called `ALLOW_SIGNUP` can be `true` or `false`. The plan is that you create your account, then switch it to `false` on the server so no one else can ever register.
- When it is `false`, the Create account page says "Sign-ups are closed", and, importantly, the **server itself refuses** sign-up requests. Hiding the page alone would not stop someone sending the request by other means.

### 7. The app frame (the shell)

- On a computer: a **side menu** on the left with Inbox, Today and Upcoming at the top, and Settings, your name and email, a theme button and Sign out at the bottom.
- On a phone: a top bar with a menu button. Tapping it slides the side menu in over the page. The buttons are tall enough (at least 44 pixels) to tap easily with a thumb.
- The side menu is built from a **module list** kept in one file. Each part of the app (tasks, and later expenses) adds itself to that list. This means adding a new part later does not require rebuilding the menu. The expense entry already exists but is switched off, so it does not show.
- Inbox, Today, Upcoming and Settings exist as pages. Inbox, Today and Upcoming currently just show a friendly "nothing here yet" message, because tasks arrive in Phase 3. Settings shows your name and email and a Sign out button.
- The light/dark button cycles through "follow my computer", "light" and "dark".

### 8. How the app talks to the database

- **Drizzle** is the translator between the app and the database. Changes to the database's structure are written as small numbered files called **migrations**, so the database can be rebuilt from scratch, in the same way, anywhere.
- **Better Auth** is the ready-made login system. The plan says never to build a login system by hand (too easy to get subtly wrong), so a trusted library does the sensitive parts. Its five tables (user, session, account, verification, rate limit) were produced by the library's own tool, not typed by hand.
- Every record gets a long random ID (a **UUID**) instead of 1, 2, 3, so nobody can guess other people's IDs.
- **Zod** checks everything that comes in (for example, that the email looks like an email). The same rules are used in the browser, for instant feedback, and on the server, for safety.
- The app's settings are validated when it starts. If a required one is missing or too short, it stops with a readable message instead of failing in a strange way later.

### 9. Automatic tests added in this phase

14 automatic tests now run, including ones against a real database (a separate one called `ledge_test`, so your own data is never touched). They prove:

- A new account can be created and gets a working login.
- A password under 10 characters is refused.
- With `ALLOW_SIGNUP=false`, sign-up is refused by the server.
- A wrong password and an unknown email produce exactly the same error.
- The login wristband is HttpOnly and SameSite Lax.
- With two accounts, each wristband identifies only its own owner, and a missing or forged wristband identifies nobody. This is the **starting point** of the "user B can never see user A's things" test. The part about lists and tasks is added in Phases 2 and 3, once lists and tasks exist.
- The sign-in and sign-up form rules behave as expected (for example, the email is tidied to lowercase).

## Decisions in plain words

- **Sign-in goes through the login system's own web address, not through the app's internal shortcuts.** The rate limit only works for requests that come through that address. Internal shortcuts would skip it, which would leave password guessing unlimited.
- **The entrance doorman only checks that a badge exists.** The real check is on each page. Also, the doorman does not redirect signed-in people away from the Sign in page, because a stale (old) badge could then make the browser bounce between two pages forever.
- **The login library's tables keep the library's own date format.** Our own tables (from Phase 2) will store times with their time zone, as the plan asks.
- **Sign-up gives vague failure messages on purpose.** Explained above.
- **A known small gap:** someone talking to the login system directly, bypassing the page, could still learn that an email is already registered. Closing that fully needs emails to be verified, which is outside this version. Since sign-ups will be closed on your server, the practical risk is small.

## How you can see it working

1. Start the database (`pnpm db:up`) and the app (`pnpm dev`).
2. Open `http://localhost:3000`. You are sent to Sign in.
3. Choose "Create an account", fill the form, and you land in your Inbox.
4. Try Sign out, then try opening `/today` directly. You are sent back to Sign in.
5. Make several wrong sign-in attempts quickly to see the "Too many attempts" message.
6. Resize the window to phone width and use the menu button.

## What was not done or not checked

- The **Secure** wristband setting was configured but not seen working over a real encrypted connection yet. That happens at deployment (Phase 9).
- The automatic browser-clicking tests (Playwright) do not exist yet. The sign-in flow was checked by hand in a browser.
- At the end of this phase a new account did not yet get an Inbox list and personal settings. That was added in Phase 2, along with the lists and tasks storage.
- "Sign out everywhere" and "delete my account" are later optional features (Phase 10).

## Added later: Sign in with Google, and Forgot password (2026-11-23)

You asked for two more ways through the front door. Both were built on 2026-11-23. The technical details are in `docs/auth-google-reset-spec.md`.

### Continue with Google

- Sign in and Create account now have a Google button **under** the email form, after a thin "or" line: black, with Google's four-colour G, reading **Continue with Google** on Sign in and **Sign up with Google** on Create account (moved there and made black at your request later the same day; it started above the form). You pick your Google account, Google tells Ledge your name and email, and you are in. Ledge never sees your Google password.
- This uses a standard called **OAuth**: Google vouches for you, so Ledge does not need a password of its own for you.
- The button only appears once you have created a "client" in Google's developer console and put its two values (`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`) in the server's settings. Until then it stays hidden.
- **When sign-ups are closed** (`ALLOW_SIGNUP=false`), Google can only sign in people who already have an account. Anyone new sees "Sign-ups are closed".
- **If you already have an account with the same email**, Google joins it to that account, so you can sign in either way afterwards. There is one catch, on purpose: Google only joins an account whose email has been **confirmed**. Otherwise a stranger could sign up with your email first and then capture your Google sign-in. Ledge never used to confirm emails, so now **resetting your password confirms your email** (clicking the emailed link proves the address is yours). In practice: reset your password once, and from then on Google works for your existing account. Until then, Google sends you back to Sign in with a message explaining this.

### Forgot password

1. On Sign in, click **Forgot password?** and type your email.
2. Ledge always answers "If this email has a Ledge account, a link is on its way". It says the same thing for emails that have no account, so nobody can use the page to find out who has one.
3. The email has a link that works **once, for 60 minutes**.
4. The link opens a page where you type your new password twice (10 characters or more).
5. When you save it, Ledge **signs you out everywhere**, to be safe: if someone else had your old password, they are thrown out too. Then you sign in with the new password.
6. A link that was already used, has run out, or was typed wrong shows "This link has expired" with a button to send a new one.

**How the email is sent:** through a service called **Resend**. You add your domain to Resend, create a key, and put `RESEND_API_KEY` and `EMAIL_FROM` in the server's settings. Without them, the server cannot send email, so **Forgot password?** is hidden. On a developer's computer, the email is printed in the dev server's window instead of being sent.

**Limits:** 3 reset requests and 5 new-password attempts per minute per visitor, and 10 Google sign-ins per minute, so nobody can hammer these pages.

### Accounts made with Google, and the journal lock

- An account made with Google has no password. **Settings › Sign-in & security** shows how you sign in: Password (with **Change password**, or **Set a password** if there is none) and Google (with **Connect Google** or **Disconnect**). See [the new Settings](settings.md).
- The journal lock needs a password, because the password is the way back in if you forget your PIN. So an account with no password must set one before it can turn the lock on. The lock page explains this and links to Settings. Unlocking with Google instead is an idea for later.

### A safety fix found while testing

While testing, a sign-up form was submitted a moment before the page had finished loading, and the browser put the typed password into the web address. All the sign-in forms now send their contents the hidden way (a "POST"), so that cannot happen, even on a slow phone.

### What was checked, and what was not

- Checked: automatic tests for the reset email, the whole reset (old password stops working, every sign-in ends, the email is confirmed, the link works once), the same answer for unknown emails, closed sign-ups stopping Google, an account made with Google setting its first password, and the journal lock refusing an account with no password. All 757 automatic tests pass.
- Checked by hand in the browser: the whole Forgot password path with a throwaway account (ask for the link, open it, set a new password, sign in with it, a used link shows "expired"), the Google button and its messages, and the new Settings rows, on a computer and at phone size.
- **Not checked yet:** a real Google sign-in (that needs your Google client values) and a real email arriving (that needs your Resend key and domain). The browser-clicking tests (Playwright) were not run.
