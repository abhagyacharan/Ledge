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

## Update 2026-11-13: one tunnel for everything

Your home server already has a Cloudflare tunnel that serves your portfolio, your SSH login and your trip planner. Instead of making a new tunnel for Ledge, the guide now adds Ledge to that same tunnel as one more "route". A route is a line that says "visitors to this name go to this program on the server". One tunnel per machine, one route per app, is the simplest way to keep things tidy.

The guide (step 6) first helps you check how your tunnel's connector program (cloudflared) runs on the server, because that decides which address the route points to: `http://localhost:3000` if it runs as a normal system service, or `http://app:3000` if it runs in its own Docker container (then you connect that container to Ledge's network with one command).

A new part of the guide (6A) explains how to tidy up the two old tunnels you made for single apps you no longer use (Trip Deck and Tracker): stop their connectors, delete their routes and the tunnels, and remove leftover DNS records. If you want those apps back one day, each becomes one more route on the main tunnel. It also reminds you to keep the SSH route behind Cloudflare Access (a second lock that only lets your email through) and to turn on automatic renewal for your domain, because if the domain expires every route stops at once, including remote SSH.

The repository does not contain your real domain name: the guide writes `ledge.<your-domain>`, so the code never advertises where your server's SSH login is. Like the rest of the Cloudflare steps, this part could not be tried here, because it needs your Cloudflare account.

## Update 2026-11-13: the first real deployment, and an FAQ

You started deploying Ledge on your home server. So far: the settings file was created, the database and app were started, and Ledge was added as a new route on your existing Cloudflare tunnel (your tunnel keeps its routes in a configuration file on the server, so the route was added there and the tunnel was restarted). Still to do: confirm Ledge opens over HTTPS, create your account and close sign-ups, and the backup steps.

The backup part of the guide (step 9) is deferred for now. What that means in practice: the nightly backup still runs by itself and keeps its copies on the server, so you have protection against a mistake, but not against the server's disk failing. The two steps that are left, copying backups to another place and trying a restore once, are worth doing before you depend on Ledge for anything you cannot re-enter.

The guide has a new FAQ (section 15) with the questions that came up on the way: why `.env` does not show in a plain `ls`, how to tell the migration worked when it prints very little, whether the firewall prompt is safe, what "locally managed tunnel" means, how to find which cloudflared configuration file is really in use, why several cloudflared programs can be running at once, and why you should never paste keys or tokens anywhere.
