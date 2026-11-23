# Google sign-in and forgot password

Asked for by O on 2026-11-23 ("implement google sign in and forgot/reset password"). Built the same day. CLAUDE.md §5 is the parent spec; this file covers only what these two features add.

## Decisions (O, 2026-11-23)

| Question                                                 | Answer                                                                                                                             |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| How reset emails are sent                                | **Resend**, through its HTTP API with `fetch` (no SDK, no new package).                                                            |
| Google when `ALLOW_SIGNUP=false`                         | **Follows `ALLOW_SIGNUP`.** Sign-up open: Google creates the account. Closed: only existing accounts can use Google.               |
| Google with an email that already has a password account | **Links to that account**, so both ways work afterwards. Better Auth links only to an account whose email is verified (see below). |
| Journal lock for accounts made with Google               | **Set a password first** (Settings › Security). "Confirm with Google again" is parked in `docs/ideas.md`.                          |

## Google sign-in

- The Google button sits **under** the email form on Sign in ("Continue with Google") and Create account ("Sign up with Google"), after an "or" rule: black (`#131314`, Google's dark button colours) with the four-colour G, in both themes (O, 2026-11-23; it first sat above the form). It shows only when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are both set.
- Better Auth's Google provider (`socialProviders.google`, `prompt: "select_account"` so a phone with several Google accounts can pick one). Scopes are Better Auth's defaults: `openid email profile`. No Google data beyond name, email and picture is read, and the tokens are kept only in the `account` table Better Auth already owns.
- The callback is `<BETTER_AUTH_URL>/api/auth/callback/google`. It must be listed in the Google Cloud OAuth client exactly.
- **Closed sign-ups:** `databaseHooks.user.create.before` throws `FORBIDDEN` with code `signup_disabled` when `ALLOW_SIGNUP=false`. That covers every way a user could be created; the email sign-up route is also refused earlier, as before.
- **Linking:** `account.accountLinking = { enabled: true, trustedProviders: ["google"] }`. Better Auth 1.7 also requires the local account's email to be verified before it links (`requireLocalEmailVerified`, default true and soon permanent). That stops someone from signing up with another person's address and then catching that person's Google sign-in. Ledge never verified emails, so **completing a password reset marks the email verified** (opening the emailed link proves the address). An existing account therefore gets Google after one password reset; until then Google sends the visitor back with `account_not_linked`, and the sign-in page tells them to sign in with the password or use Forgot password? first.
- Errors come back to `/sign-in?error=<code>`. `src/modules/auth/oauth-errors.ts` turns the known codes into plain sentences and every other code into one general line, so an address cannot put made-up text on the page.

## Forgot and reset password

1. **Sign in › Forgot password?** opens `/forgot-password`: one email field. The answer is always "If this email has a Ledge account, a link is on its way", whether or not it does (no account enumeration; Better Auth also evens out the timing).
2. Better Auth makes a one-time token (60 minutes) and calls `sendResetPassword`, which sends the email (`src/modules/auth/reset-email.ts`: plain text and a simple HTML version). A failed send is logged by reason only, never with the link, and the visitor sees the same answer.
3. The link opens `/api/auth/reset-password/<token>`. Better Auth checks the token and sends the browser to `/reset-password?token=…`, or `?error=INVALID_TOKEN`.
4. `/reset-password` asks for the new password twice (10 characters or more). On success: the password is changed, **every session of the account ends** (`revokeSessionsOnPasswordReset`), the email is marked verified, and the page says "Password changed" with a Sign in button. A used, expired or made-up link shows "This link has expired" with Send a new link.
5. An account made with Google that asks for a reset gets its first password this way.

**Without email:** in development and tests with no `RESEND_API_KEY`, emails go to an in-memory outbox and the development server prints them in its console. In production with no key, "Forgot password?" is hidden and `/forgot-password` says the server cannot send email.

**Rate limits** (per visitor address, per minute): Google sign-in 10, reset requests 3, reset submissions 5.

## Settings › Sign-in & security

Rebuilt with the Settings redesign on 2026-11-23 (screens 9e to 9i; `docs/decisions.md`).

- **Password:** "Set · last changed <date>" with **Change password** (current, new twice, "Sign out other devices" on by default; Better Auth's `changePassword`), or "Not set" with **Set a password** (new password twice; Better Auth's own hasher and account row, like its `setPassword`).
- **Google:** "Connected as <email> · since <date>" with **Disconnect** (a confirm sheet; only with a password set, so the account keeps a way in), or "Not connected" with **Connect Google** (Better Auth's `linkSocial`; the Google email must match). Errors come back as `?error=`: `account_already_linked_to_different_user` and `email_does_not_match` get their own sentences. Shown only when Google is set up.
- **Devices:** the live sessions, sign out one, or everywhere else.

## Journal lock

The lock's way back in after a forgotten PIN is the account password, so an account with no password cannot turn the lock on: the switch leads to Settings › Security, a line explains why, and the server action refuses too.

## Setup (O)

1. **Google Cloud Console** › APIs & Services › Credentials › Create credentials › OAuth client ID › Web application.
   - Authorised JavaScript origins: `https://<your Ledge host>` (and `http://localhost:3000` for development).
   - Authorised redirect URIs: `https://<your Ledge host>/api/auth/callback/google` (and `http://localhost:3000/api/auth/callback/google`).
   - The consent screen needs an app name and support email; while it is in "Testing", only test users you add can sign in. Publish it when sign-up opens to others.
   - Put the client ID and secret in `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
2. **Resend** (resend.com): add and verify your domain (a few DNS records in Cloudflare), create an API key with sending access, and set `RESEND_API_KEY` and `EMAIL_FROM` (for example `Ledge <no-reply@yourdomain.com>`; the domain must be the verified one).
3. `docker compose up -d` to restart with the new settings.

## Not built (parked in docs/ideas.md)

Confirming with Google instead of a password for the journal lock, and verifying email at sign-up. (Changing the password while signed in and connecting or disconnecting Google were built with the Settings redesign on 2026-11-23. Delete account now uses "Confirm with Google" for accounts with no password.)
