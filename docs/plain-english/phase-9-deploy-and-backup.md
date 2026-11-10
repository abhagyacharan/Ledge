# Phase 9: Deploy and backup (getting Ledge onto your server, safely)

**Status:** Built and checked on a development machine on 2026-11-11. **Not finished until you deploy it:** the last steps need your Cloudflare account, your domain and your server, so you do them by hand with the guide ([docs/deploy-guide.md](../deploy-guide.md)). This file says exactly what is done and what is yours.

## What this phase is for

Until now Ledge only ran on a development computer. To use it every day, it has to run on a computer that stays on (your home server), be reachable from your phone away from home, be safe on the internet, and be backed up so a dead disk does not erase a year of your tasks and money.

## What was built

### 1. A packaged copy of Ledge (the Dockerfile)

**Docker** is a tool that runs programs in sealed boxes called **containers**, so a program brings everything it needs and cannot mess up the rest of the computer. The **Dockerfile** is the recipe for the box that holds Ledge.

- It has several **stages** (like a kitchen with a prep area and a serving area). The heavy tools used to build Ledge stay in the prep stages. Only the finished, small result goes in the final box (about 317 MB).
- Ledge in the box runs as an ordinary user called `ledge`, **not** as the all-powerful administrator. If someone ever broke into the app, they would have little power.

### 2. The stack (docker-compose.yml)

**Docker Compose** starts several boxes together. Ledge's stack has:

- **db**: the Postgres database. Its door to the outside is **not** open at all. Its data lives in a named storage area that survives restarts and updates.
- **migrate**: a helper that runs once every time you start the stack. It brings the database's tables up to date (for example, after an update that adds a column), then stops. The app waits for it to succeed. If an update's database change fails, the app does not start with a half-updated database.
- **app**: Ledge itself. Its door is open only to the server itself, not to the home network or the internet.
- **cloudflared**: the connector for Cloudflare Tunnel (see below). It only starts if you ask for it.
- **backup**: the nightly backup job.

### 3. A way in that opens no doors: Cloudflare Tunnel

Normally to reach a home computer from outside you would "open a port" on your router, which also lets attackers knock. **Cloudflare Tunnel** reverses it: the **server dials out** to Cloudflare and keeps a connection open. When you visit `https://ledge.yourdomain.com`, Cloudflare passes the request down that connection. Nothing on your router changes. Cloudflare also provides the HTTPS padlock (encryption) for free.

Because every visitor now arrives through the tunnel, Ledge needs to know the **real** address of each visitor for its "too many sign-in attempts" limit (otherwise the whole world would look like one visitor). Cloudflare writes the real address in a header, and Ledge now reads it (a new setting, `CLIENT_IP_HEADER`).

### 4. A health check

`/api/health` is a small web address that answers "ok" only when Ledge can really talk to its database (otherwise "unavailable"). Docker uses it to know whether the app is healthy, and you can use it to check by hand.

### 5. Security headers

Every page now comes with instructions to the browser that make attacks harder: only load things from Ledge itself, never show Ledge inside another site's frame (a trick used by scammers), do not guess file types, always use HTTPS, and do not give the camera, microphone or location to anything. This is called a **Content Security Policy** and friends. One known weaker point: it still allows small scripts written directly into the page, because the toolkit Ledge is built on needs that. A stricter version is on the ideas list.

### 6. Nightly backups

Every night at **02:30 India time** a backup job copies the whole database into one compressed file and saves it in the `backups` folder, named with the date. It checks the file is not empty or damaged. It keeps the **last 14 daily** files and **8 weekly** files (Sunday's), and deletes older ones so the disk does not fill up.

**Important:** a backup on the same disk as the data is not really a backup. If the disk breaks or the house floods, both are gone. The guide shows how to copy the folder to a cloud drive (with a free tool called rclone) or to a second disk each night. **That step is yours to set up**, because only you know where you want the copies to go.

### 7. Restoring

`scripts/restore.sh` puts a backup back.

- **Practice mode (default):** loads the backup into a throwaway scratch database, then prints how many users, lists, tasks and money entries it found. Your real data is not touched. Do this once on your own server so you know it works.
- **Real mode (`--live`):** replaces the real database with the backup. It stops the app, asks you to type the word RESTORE, replaces the data, and starts the app again.

### 8. Clean-ups found on the way

- A few stray sample images from the project template were deleted from `public/`.
- The `shadcn` helper tool moved out of the "needed to run" list into the "needed to build" list. It is not in the finished app, and this made the security audit of the running parts come out clean.
- A new `.gitattributes` file keeps the scripts' line endings correct (Windows and Linux end lines differently, and the wrong kind breaks scripts inside Linux boxes).

## What was checked, and what was not

Checked (on a development computer, with a real production build):

- The image builds, and runs as the non-root user.
- The stack starts in the right order: database, then migration, then app and backup. `/api/health` answers "ok". The security headers are present.
- I created an account on the production build in a browser, added a task, saw the fonts load from the app itself and no browser security errors.
- The nightly backup script wrote a valid file. **A restore into a scratch database, and a real restore after deleting a task, both brought the data back**, and the app became healthy again.
- The security audit for the parts that ship is clean. Three warnings in build-only tools were reviewed and do not ship.
- All earlier tests still pass.

Not checked (this needs you):

- **Cloudflare Tunnel and HTTPS on your real server.** I could not use your Cloudflare account or domain. The steps in the guide follow Cloudflare's current documentation, but menu names change, so the guide says what to look for.
- **The padlock-only ("secure") login cookie over real HTTPS.** It was set up but only a plain-http test was possible.
- **The off-site copy of the backups,** and a restore on your own server.
- **Your account creation and closing sign-ups** on the server.

## What you do now

Follow [docs/deploy-guide.md](../deploy-guide.md) from the top. It takes about an hour. When you are done, tell me, and I will tick the remaining boxes in the plan.

## Decisions in plain words

- **Cloudflare Tunnel, not Tailscale.** You chose it. You will need a domain name on Cloudflare.
- **The migration helper runs before the app, every time.** Safer than doing it inside the app.
- **Real visitor addresses are read from Cloudflare's header.** Only safe because the only way in is the tunnel.
- **Backups are files you can open.** Plain SQL, compressed, so you are never locked in to a special tool.
- **No "forgot password" email yet.** There is no email service. Keep your password in a password manager. A command-line reset is on the ideas list in case you ever need it.
