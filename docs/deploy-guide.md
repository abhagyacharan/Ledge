# Deploying Ledge to your home server with Cloudflare Tunnel

A step-by-step guide you can follow by hand. It assumes you are a bit rusty with servers, so every command is spelled out, with what it does and what you should see.

**Questions that came up on a real first deployment** (hidden `.env`, locally managed tunnels, which cloudflared config is live, the firewall prompt, skipping the backup step for now) are answered in the FAQ, section 15.

**Time needed:** about 1 hour the first time (most of it waiting for the first build and for Cloudflare).

**This guide assumes** the home server already runs a Cloudflare tunnel for your other sites (portfolio, SSH and so on). Ledge is added to that tunnel as one more route; step 6 explains how, and 6A how to tidy up tunnels you no longer need.

**Honest note on testing:** the Docker pieces in this guide (build, start, health check, migrations, nightly backup, restore) were run end to end on a development machine. The Cloudflare steps were written from Cloudflare's documentation but could not be run, because that needs your Cloudflare account and domain. Cloudflare renames menu items now and then. If a button is not where this guide says, the "If the screen looks different" box in step 6 tells you what to do.

---

## 0. What you will end up with

```
 your phone or laptop
        │  https://ledge.yourdomain.com   (encrypted, certificate handled by Cloudflare)
        ▼
 Cloudflare ◄───────────── an outbound-only connection opened BY your server
        │                  (so you open NO ports on your router)
        ▼
 ┌──────────────────────── your home server (Docker) ─────────────────────────┐
 │  cloudflared  ──►  app (Ledge, port 3000)  ──►  db (Postgres, not reachable │
 │  (your existing     │                            from outside at all)        │
 │   tunnel; it also   │                                                        │
 │   serves your other │                                                        │
 │   sites)            │                                                        │
 │                     └─ migrate (runs once on every start, then exits)        │
 │  backup  ──►  ./backups/ (a nightly copy of the database)                    │
 └──────────────────────────────────────────────────────────────────────────────┘
```

Why this is safe: nobody can reach your server directly. The only way in is through Cloudflare, and the database cannot be reached from the internet at all. Ledge itself adds a login, rate limiting, secure cookies and security headers.

---

## 1. What you need before you start

- [ ] **A server** that stays on. A small Linux machine is ideal (Ubuntu 22.04 or 24.04, or Debian 12). At least 2 GB of memory and 10 GB of free disk. It can be an old PC or a mini PC. (Using a Windows or Mac machine as the server is possible with Docker Desktop. Notes are in step 2.)
- [ ] **Access to it** from your laptop with SSH (`ssh youruser@server-ip-address`), or a keyboard and screen attached to it.
- [ ] **A domain name on Cloudflare** (for example `yourdomain.com`). Cloudflare Tunnel publishes your app under a name on a domain that Cloudflare manages.
  - Do you have a domain? Then add it to Cloudflare: Cloudflare dashboard → **Add a domain**, choose the Free plan, and follow the instructions to change the domain's nameservers at the place you bought it. This can take from a few minutes to a day.
  - No domain yet? Buy one (about 10 dollars a year; Cloudflare Registrar sells them at cost, or use any registrar), then do the step above.
- [ ] **A free Cloudflare account** (https://dash.cloudflare.com/sign-up). The tunnel feature is free. Cloudflare may ask you to set up its "Zero Trust" area on first visit; choose the Free plan. It may ask for a payment card to confirm the free plan. You will not be charged.
- [ ] **The Ledge code** on GitHub (your repo). If the repo is private, the server needs permission to read it (see step 3).
- [ ] **A password manager** to store the passwords you will generate. There is no "forgot password" email in Ledge yet (see Troubleshooting).

---

## 2. Prepare the server

Log in to the server. All commands below run **on the server**.

### 2.1 Update it

```bash
sudo apt update && sudo apt upgrade -y
```

### 2.2 Install Docker

Docker runs Ledge in sealed boxes called containers. Docker's own install script is the quickest way:

```bash
curl -fsSL https://get.docker.com | sudo sh
```

Let your user run Docker without `sudo`, then **log out and back in** so it takes effect:

```bash
sudo usermod -aG docker $USER
exit
```

Log in again, then check:

```bash
docker --version
docker compose version
```

You should see two version lines (Docker 24 or newer, Compose v2 or newer). If `docker compose` is "not a command", your install is old: re-run the install script above.

Also make sure Docker starts when the server boots (it normally does):

```bash
sudo systemctl enable docker
```

### 2.3 Install git and openssl

```bash
sudo apt install -y git openssl
```

### 2.4 The firewall (optional but wise)

You do **not** need to open any port for Ledge. If you use the `ufw` firewall, allow only SSH:

```bash
sudo ufw allow OpenSSH
sudo ufw enable
```

Do **not** forward any port on your home router to this server. The tunnel does not need it.

### 2.5 Server is a Windows or Mac computer?

Install **Docker Desktop**, make sure it starts when you log in, and use a terminal that understands the commands below (Git Bash or WSL on Windows). Everything else in this guide is the same. The machine must not go to sleep, and Docker Desktop must be running for Ledge to be reachable. A small Linux machine is more dependable for something you rely on every day.

---

## 3. Get the code onto the server

```bash
cd ~
git clone https://github.com/YOUR-GITHUB-NAME/Ledge.git ledge
cd ledge
```

Replace `YOUR-GITHUB-NAME/Ledge` with the real address of your repository. The folder will be `~/ledge`.

**If the repository is private**, `git clone` asks for a username and password. GitHub no longer accepts your account password. Use one of:

- A **personal access token**: GitHub → Settings → Developer settings → Personal access tokens → fine-grained token with read access to this one repository. Paste the token when git asks for the password.
- Or an **SSH deploy key**: on the server run `ssh-keygen -t ed25519`, then add the contents of `~/.ssh/id_ed25519.pub` in the repo's Settings → Deploy keys, and clone with the `git@github.com:...` address.

Check you have the files:

```bash
ls
```

You should see `Dockerfile`, `docker-compose.yml`, `scripts`, `docs` and more.

---

## 4. Create the server's settings file (`.env`)

Ledge reads its settings from a file called `.env` in the project folder. It is secret and is never committed to git.

### 4.1 Copy the template

```bash
cp .env.production.example .env
chmod 600 .env
```

(`chmod 600` means only your user can read it.)

### 4.2 Make three secrets

Run each command and **copy the output** into your password manager:

```bash
openssl rand -hex 24      # for POSTGRES_PASSWORD (letters and digits only)
openssl rand -base64 32   # for BETTER_AUTH_SECRET
```

### 4.3 Edit the file

```bash
nano .env
```

(`nano` is a simple editor. Move with the arrow keys. Save with `Ctrl+O` then Enter. Quit with `Ctrl+X`.)

Fill in:

| Setting              | What to put                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POSTGRES_PASSWORD`  | The `-hex` value from above. Letters and digits only, because it is placed inside a web address.                                                 |
| `BETTER_AUTH_SECRET` | The `-base64` value from above. Keep it forever: changing it logs everyone out.                                                                  |
| `BETTER_AUTH_URL`    | The public address you will use, **exactly**, starting with `https://` and with no slash at the end. For example `https://ledge.yourdomain.com`. |
| `ALLOW_SIGNUP`       | Leave `true` for now. You will create your account, then set it to `false` (step 7).                                                             |
| `TUNNEL_TOKEN`       | Leave empty. Your server already has a tunnel; Ledge joins it as a route (step 6). Only used by the "no tunnel on this machine" path (6.5).      |
| `BACKUP_UID`         | The number printed by `id -u` (usually 1000).                                                                                                    |
| `BACKUP_GID`         | The number printed by `id -g` (usually 1000).                                                                                                    |

`BETTER_AUTH_URL` matters a lot. Ledge compares it with the address in your browser. If they differ even slightly (`http` instead of `https`, a different name), sign-in will fail.

### 4.4 Make the backups folder yourself

```bash
mkdir -p backups
```

If you skip this, Docker creates it owned by the system administrator and the backup job cannot write to it.

---

## 5. First start (without the tunnel yet)

Start everything except the tunnel, and check that it works on the server itself:

```bash
docker compose up -d --build
```

The first time this takes **5 to 15 minutes**: it downloads the software and builds Ledge. It needs internet. Later starts are quick.

What happens, in order: the database starts and reports healthy → the one-shot **migrate** job creates or updates the tables and exits → the **app** starts → the **backup** job starts.

Check the state:

```bash
docker compose ps
```

You should see `db` and `app` as **healthy** (it can take up to a minute), `backup` as running, and no `migrate` line (it finished; that is correct). To see the migration job's result:

```bash
docker compose logs migrate
```

Now ask the app if it is healthy:

```bash
curl http://127.0.0.1:3000/api/health
```

Expected answer: `{"status":"ok"}`. That means the app is running **and** can reach the database.

If something is wrong, read the logs:

```bash
docker compose logs --tail 80 app
docker compose logs --tail 80 db
```

Common first-start problems are in the Troubleshooting section at the end.

---

## 6. Connect Ledge to your Cloudflare tunnel

You already have a tunnel on this server that publishes other things (your portfolio, SSH, a trip planner). **Ledge joins that same tunnel as one more route.** You do not need a new tunnel per app.

### How a tunnel works (two minutes of background)

- A **tunnel** is a named, private pipe between Cloudflare and one machine. It belongs to your Cloudflare account.
- The pipe is held open by a small program on the machine called **cloudflared** (the **connector**). It dials out to Cloudflare, so no router ports are open.
- Each tunnel has a list of **routes** (Cloudflare also calls them "public hostnames" or "published applications"). A route says: "requests for `this-name.your-domain` go to `this address` on the machine", for example `http://localhost:3000`. Cloudflare creates the DNS record for each route.
- So the rule of thumb is **one tunnel per machine, one route per app.** Five apps on one home server means one tunnel with five routes. A second tunnel only makes sense for a second machine (or a cloud server).

### 6.1 Find out how your tunnel runs

The service address you give Ledge's route depends on **where cloudflared runs** on this server. Check, on the server:

```bash
systemctl status cloudflared --no-pager      # A: installed as a system service?
docker ps --format '{{.Names}}\t{{.Image}}' | grep -i cloudflared   # B: running in Docker?
ls ~/.cloudflared /etc/cloudflared 2>/dev/null   # C: a config.yml here means the routes live in that file
```

Then open the Cloudflare dashboard → **Networking** → **Tunnels** (older layouts: **Zero Trust** → **Networks** → **Tunnels**) and open the tunnel that carries your portfolio. You can tell:

- **Managed in the dashboard** (the usual kind): it has a **Routes** or **Public hostnames** tab you can edit. Follow 6.2.
- **Managed by a file** (`config.yml`, case C): the dashboard says it is configured locally and offers to migrate it. Follow 6.3. (Migrating it to the dashboard is a one-click option there and makes later changes easier, but it is not required.)

Which service address to use:

| Where cloudflared runs                               | Service URL for Ledge   | Why                                                                                                                           |
| ---------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **A. System service** (`systemctl status` is active) | `http://localhost:3000` | Ledge's port is published on this machine only (`127.0.0.1:3000`), which is exactly where a native cloudflared looks.         |
| **B. Its own Docker container**, started separately  | `http://app:3000`       | That container cannot see the server's `localhost`. Connect it to Ledge's Docker network once (below) and it can reach `app`. |

**Only for case B**, connect the existing cloudflared container to Ledge's network (Ledge must be running, step 5):

```bash
docker network ls | grep ledge                        # should list ledge_default
docker network connect ledge_default <cloudflared-container-name>
docker exec <cloudflared-container-name> wget -qO- http://app:3000/api/health 2>/dev/null || echo "(no wget in that image; just test through the browser in 6.4)"
```

Docker remembers this connection across restarts and reboots. If you ever **re-create** that cloudflared container (for example to update its image), run the `docker network connect` line again.

### 6.2 Add Ledge as a route (tunnel managed in the dashboard)

1. Dashboard → **Networking** → **Tunnels** → your existing tunnel → **Routes** (or **Public hostnames**) → **Add route** / **Add a public hostname** → **Published application**.
2. **Subdomain:** `ledge` (or any word you like). **Domain:** your domain.
3. **Service:** type `HTTP`, URL `localhost:3000` (case A) or `app:3000` (case B), so the full **Service URL** reads `http://localhost:3000` or `http://app:3000`.
4. Save. Cloudflare adds the DNS record by itself. Nothing needs restarting: cloudflared picks up dashboard routes within a few seconds.

Your address is now `https://ledge.<your-domain>`. It must be **exactly** what you put in `BETTER_AUTH_URL` (step 4.3). If you chose a different name, fix `.env` and run `docker compose up -d`.

> **If the screen looks different:** Cloudflare renames menus often. What you need is always one thing: a route on your existing tunnel from `ledge.<your-domain>` to the service URL in the table above. Cloudflare's current instructions: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/

### 6.3 Add Ledge as a route (tunnel managed by `config.yml`)

1. Open the file cloudflared uses (often `/etc/cloudflared/config.yml` or `~/.cloudflared/config.yml`):

   ```bash
   sudo nano /etc/cloudflared/config.yml
   ```

2. Under `ingress:`, add Ledge **above** the last catch-all line (the one with `service: http_status:404`, which must stay last):

   ```yaml
   ingress:
     # ...your existing portfolio, ssh and trip routes stay as they are...
     - hostname: ledge.<your-domain>
       service: http://localhost:3000
     - service: http_status:404
   ```

3. Check the file and create the DNS record (use your tunnel's name or ID from `cloudflared tunnel list`):

   ```bash
   cloudflared tunnel ingress validate
   cloudflared tunnel route dns <tunnel-name> ledge.<your-domain>
   sudo systemctl restart cloudflared
   ```

### 6.4 Try it

On your phone (on mobile data, to prove it works from outside your home) or laptop, open `https://ledge.<your-domain>`. You should see the Ledge sign-in page with a padlock. Your other routes (portfolio, SSH) keep working; adding a route does not touch them.

Two more checks from any computer:

```bash
curl https://ledge.<your-domain>/api/health
curl -sI https://ledge.<your-domain>/sign-in | grep -i -E "content-security-policy|strict-transport|x-frame"
```

The first should print `{"status":"ok"}`. The second should print Ledge's security headers.

**Make it start by itself after a power cut or reboot.** Ledge's containers have `restart: unless-stopped`, so Docker brings them back when the server reboots, as long as Docker starts at boot (step 2.2). Your cloudflared already restarts on its own (a system service, or a container with a restart policy). Test it once: `sudo reboot`, wait two minutes, and open the address again.

### 6.5 No tunnel on this machine? (the other way)

If Ledge ever runs on a machine without a tunnel, `docker-compose.yml` can run the connector for you. Create a tunnel in the dashboard, choose **Docker** on the install screen and copy only the token (the long text after `--token`, starting `eyJ`; do not run the shown command). Put it in `.env` as `TUNNEL_TOKEN=`, add the route with Service URL `http://app:3000`, then start with:

```bash
docker compose --profile tunnel up -d
docker compose logs --tail 20 cloudflared     # look for "Registered tunnel connection"
```

On your home server you do **not** need this: leave `TUNNEL_TOKEN` empty and never pass `--profile tunnel`, or you would run a second connector for nothing.

---

## 6A. Tidy up your Cloudflare tunnels (optional, any time)

Today you have three tunnels where one would do: the main one (portfolio, SSH, trip planner, and now Ledge), plus **Trip Deck** and **Tracker**, one per app. Separate tunnels per app on the same machine bring nothing but extra connectors to keep running and extra things to remember. Since you no longer use Trip Deck and Tracker, removing them is the simplest clean-up. If you want those apps back later, each becomes one more route on the main tunnel (step 6.2), which takes a minute.

Do it in this order, so nothing is left half-connected:

1. **Look before you delete.** Dashboard → **Networking** → **Tunnels**. For Trip Deck and Tracker, note the **connector** (which machine, under the tunnel's details) and the **routes** (hostnames). Also open your domain → **DNS** → **Records** and note the `CNAME` records whose target ends in `.cfargotunnel.com`: each points at one tunnel.
2. **Stop their connectors** on the machine(s) where they run, so they stop dialling in:

   ```bash
   docker ps --format '{{.Names}}' | grep -i -E "cloudflared|tripdeck|tracker"   # if they run in Docker
   docker stop <name> && docker rm <name>          # and remove them from their compose file if they have one
   systemctl list-units --type=service | grep -i cloudflared                     # if they run as services
   sudo systemctl disable --now <that-service-name>
   ```

   Careful: do not stop the connector of your **main** tunnel (the one with your portfolio and SSH), or you lose those routes and remote SSH until it is started again.

3. **Delete their routes**, then the **tunnels**: open each tunnel → remove its routes → back in the list, **Delete** the tunnel. Cloudflare refuses to delete a tunnel that still has a live connector; that is your sign step 2 missed one.
4. **Clean up DNS:** back in **DNS** → **Records**, delete any `CNAME` still pointing at the deleted tunnels' `.cfargotunnel.com` addresses. Leftover records just return errors, but they are clutter and confusing later.
5. **Optional:** rename the main tunnel to something that describes the machine, such as `home-server` (the name is only a label; routes and the connector are unaffected). Cloudflare lets you edit the name in the tunnel's settings if it is managed in the dashboard.

Two checks worth doing while you are in there:

- **Your SSH route should be behind Cloudflare Access.** A tunnel route to SSH without an Access policy lets anyone with the `cloudflared` client try to reach your server's SSH login. Zero Trust → **Access** → **Applications**: there should be a self-hosted application for your SSH hostname with a policy that allows only your email. If there is none, add one (same steps as section 8).
- **Domain renewal:** every route lives on your domain. If the domain expires, the portfolio, Ledge **and** your remote SSH all stop at once. Turn on auto-renew at your registrar (or move the domain to Cloudflare Registrar, which renews at cost), and put the expiry date in your calendar.

---

## 7. Create your account, then close sign-ups

1. Open your address, click **Create an account**, and sign up with your email and a strong password (at least 10 characters). Store it in your password manager.
2. You land on the welcome page ("Welcome back", with Tasks and Expenses buttons). Your account is the only one that exists.
3. **Close sign-ups so nobody else can create one.** On the server:

   ```bash
   nano .env
   ```

   Change `ALLOW_SIGNUP=true` to `ALLOW_SIGNUP=false`, save, then apply it:

   ```bash
   docker compose up -d
   ```

   (Compose notices the changed setting and recreates only the app.)

4. Check: open `https://ledge.yourdomain.com/sign-up`. It should say "Sign-ups are closed". Signing in still works.

Ledge enforces this on the server, not only on the page: even a hand-made request to create an account is refused.

---

## 8. Optional: put Cloudflare Access in front (a second lock)

Your Ledge login already protects your data. If you want a second lock that stops strangers from even seeing the sign-in page, Cloudflare Zero Trust offers **Access** for free (up to 50 users):

Zero Trust dashboard → **Access** → **Applications** → **Add an application** → **Self-hosted** → enter your Ledge hostname → add a policy that allows only your email address (it sends a one-time code to your inbox).

Trade-off: you do one extra email-code step on each new device. It is optional; skip it if you prefer simplicity.

---

## 9. Backups

> Skipping 9.2 and 9.3 for now? Nightly dumps (9.1) still run by themselves. See the first question in the FAQ (section 15) for what that does and does not protect.

### 9.1 What happens automatically

The `backup` container makes a dump of the whole database **every night at 02:30 India time** (21:00 UTC) and also once when it first starts. Files go to `~/ledge/backups`:

```
backups/daily/ledge-2026-11-12-2100.sql.gz     the newest 14 are kept
backups/weekly/ledge-2026-W46.sql.gz           a copy made on Sundays; the newest 8 are kept
```

Check it any time:

```bash
ls -lh backups/daily
docker compose logs --tail 10 backup
```

Make one right now (a good habit before any update):

```bash
docker compose run --rm --entrypoint "sh /backup.sh once" backup
```

### 9.2 Copy backups OFF the machine (do not skip this)

A backup that lives on the same disk as the data is not a backup: if the disk dies or the house floods, both are gone. Pick one:

**Option A: a cloud bucket or drive with rclone** (recommended).

```bash
sudo apt install -y rclone
rclone config
```

`rclone config` asks questions to connect one storage service. Follow https://rclone.org/docs/ for your provider (Google Drive, Backblaze B2, Dropbox, OneDrive, S3 and many more all work; Backblaze B2 and Google Drive have free tiers that are plenty for Ledge). Name the remote `offsite`. Test it:

```bash
rclone lsd offsite:
```

Then schedule a nightly copy at 03:30 (an hour after the backup):

```bash
crontab -e
```

Add this line at the bottom (change `youruser` to your user name), save and exit:

```
30 3 * * * rclone copy /home/youruser/ledge/backups offsite:ledge-backups >> /home/youruser/rclone-ledge.log 2>&1
```

`copy` only adds files; it never deletes old copies in the cloud, so a mistake here cannot wipe your offsite backups. You can tidy the cloud folder yourself now and then.

**Option B: a second disk or another computer.** Plug in a USB disk (mounted at `/mnt/usb` for example) and add a cron line like:

```
30 3 * * * rsync -a /home/youruser/ledge/backups/ /mnt/usb/ledge-backups/
```

**Check that offsite copies really arrive** a few days after setting it up (`rclone ls offsite:ledge-backups`).

### 9.3 Prove a restore works (do this once, now)

An untested backup is a hope, not a backup. This practice run loads a backup into a scratch database called `ledge_restore_test`. Your live data is not touched.

```bash
ls backups/daily                       # pick a file name
sh scripts/restore.sh backups/daily/ledge-2026-11-12-2100.sql.gz
```

It prints the number of users, lists, tasks and money entries inside the restored copy. They should match what you expect (at least 1 user). Then delete the practice copy:

```bash
docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE ledge_restore_test"'
```

### 9.4 Restore for real (after a disaster or a bad mistake)

This **replaces** the live database with a backup. Everything saved after that backup is lost.

```bash
sh scripts/restore.sh backups/daily/ledge-2026-11-12-2100.sql.gz --live
```

It asks you to type `RESTORE`, stops the app, replaces the database, starts the app and prints the counts.

Starting on a brand-new server (the old one is gone)? Do steps 2 to 5 first (so the empty database and tables exist), copy a backup file onto the new server into `~/ledge/backups/`, then run the command above. Use the **same** `BETTER_AUTH_SECRET` as before if you still have it; with a different one you will just need to sign in again.

---

## 10. Updating Ledge later

When there is a new version of Ledge in git:

```bash
cd ~/ledge
docker compose run --rm --entrypoint "sh /backup.sh once" backup   # a safety backup first
git pull
docker compose up -d --build
docker image prune -f                                              # tidy old images
```

The migrate job applies any new database changes automatically before the new app starts. Check afterwards:

```bash
docker compose ps
curl http://127.0.0.1:3000/api/health
```

**If an update goes wrong:** go back to the previous code with `git log --oneline` (find the old commit) and `git checkout <that-commit>`, then `docker compose up -d --build`. If the new version had already changed the database tables, also restore the safety backup you took (step 9.4).

---

## 11. Everyday commands

Run them in `~/ledge`.

| I want to...                      | Command                                                                     |
| --------------------------------- | --------------------------------------------------------------------------- |
| See what is running               | `docker compose ps`                                                         |
| Watch the app's log               | `docker compose logs -f app` (stop watching with `Ctrl+C`)                  |
| Restart the app                   | `docker compose restart app`                                                |
| Apply a changed `.env`            | `docker compose up -d`                                                      |
| Stop Ledge (data is kept)         | `docker compose down` (your tunnel and other sites keep running)            |
| Start Ledge again                 | `docker compose up -d`                                                      |
| Check the tunnel (system service) | `systemctl status cloudflared --no-pager`                                   |
| See how much disk Docker uses     | `docker system df`                                                          |
| Make a backup now                 | `docker compose run --rm --entrypoint "sh /backup.sh once" backup`          |
| Open a database prompt (to look)  | `docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'` |

> **Never run `docker compose down -v`.** The `-v` also deletes the database volume, which is your data. Plain `down` is safe.

---

## 12. Troubleshooting

| What you see                                                   | Likely cause and fix                                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker compose up` says `set POSTGRES_PASSWORD in .env`       | The `.env` file is missing, empty, or you are not in `~/ledge`. Run `ls -a` and check for `.env`.                                                                                                                                                                                             |
| The build fails while downloading                              | No internet from the server, or a temporary outage. Check with `curl -I https://registry.npmjs.org` and try again.                                                                                                                                                                            |
| `migrate` fails (check `docker compose logs migrate`)          | Usually a wrong password: `POSTGRES_PASSWORD` was changed after the database was first created. The database keeps the first password. Put the original back, or (only if you have no data yet) remove the volume: `docker compose down -v` and start again.                                  |
| `app` never becomes healthy                                    | Read `docker compose logs --tail 80 app`. A message starting "Invalid environment" lists the bad setting (a short `BETTER_AUTH_SECRET`, a `BETTER_AUTH_URL` that is not a full address).                                                                                                      |
| Cloudflare shows **502 Bad Gateway** for Ledge only            | The app is not healthy yet, or the route's Service URL does not match where cloudflared runs (step 6.1): `http://localhost:3000` for a system service, `http://app:3000` for a container connected to `ledge_default`. Check `docker compose ps` and `curl http://127.0.0.1:3000/api/health`. |
| 502 after re-creating the cloudflared container (case B)       | The new container is not on Ledge's network any more. Run `docker network connect ledge_default <cloudflared-container-name>` again.                                                                                                                                                          |
| **All** your sites are down (portfolio, SSH and Ledge)         | The tunnel's connector stopped, or the domain lapsed. Check `systemctl status cloudflared` (or the container), the tunnel status in the dashboard, and the domain's expiry date.                                                                                                              |
| The page loads but sign-in fails or you are signed out at once | `BETTER_AUTH_URL` is not exactly the address in your browser. Fix `.env`, then `docker compose up -d`.                                                                                                                                                                                        |
| "Too many attempts. Wait a minute"                             | The rate limit allows 5 sign-in attempts a minute per visitor. Wait a minute.                                                                                                                                                                                                                 |
| The site stopped working after a power cut                     | Check `docker compose ps`. If Docker itself did not start: `sudo systemctl start docker`, and `sudo systemctl enable docker` so it does next time.                                                                                                                                            |
| The disk is filling up                                         | `docker system df` shows where. `docker image prune -f` removes old images. Old backups are removed automatically (14 daily and 8 weekly).                                                                                                                                                    |
| You forgot your password                                       | **There is no password-reset email in Ledge yet** (it needs an email service). Prevention: keep it in a password manager. If it happens, tell me and I will add a command-line reset script; your data is safe in the database in the meantime. This is logged in `docs/ideas.md`.            |

---

## 13. What protects you (a checklist)

- [x] No router ports open; the only way in is the outbound tunnel
- [x] Database port not published; the app port is bound to this machine only (`127.0.0.1`)
- [x] The app runs as a normal user inside its container, not as root
- [x] HTTPS everywhere (Cloudflare), secure `httpOnly` cookies, security headers (CSP, HSTS, no framing)
- [x] Sign-in and sign-up are rate limited, with real visitor addresses read from Cloudflare
- [x] Sign-ups closed after your account exists
- [x] Nightly backups, kept 14 daily and 8 weekly, with a restore you tested
- [ ] **You:** offsite copy of the backups set up and checked (step 9.2)
- [ ] **You:** updates applied now and then (step 10) and the server's own system updates (`sudo apt update && sudo apt upgrade`)

Keep your `.env` file safe: it holds the keys to your data. A copy in your password manager (as a secure note) is wise, because `BETTER_AUTH_SECRET` and `POSTGRES_PASSWORD` cannot be recovered if the server dies.

---

## 14. Removing Ledge completely

```bash
cd ~/ledge
docker compose down -v    # -v deletes the database. Only do this if you mean it.
cd ~ && rm -rf ledge
```

Then delete Ledge's **route** on your tunnel in the Cloudflare dashboard (and its DNS record if it is left behind). Keep the tunnel: your other sites use it.

---

## 15. FAQ: questions that came up during a real deployment

These are the questions that actually came up the first time Ledge was deployed on a home server that already ran other Cloudflare tunnels. They are in roughly the order you will meet them. Real hostnames and IDs are left out on purpose; where you see `<your-domain>` or `<tunnel-id>`, use your own.

### Deployment progress and what is still open

**I have not done step 9 (backups) yet. Am I unprotected?**

Partly. Step 9.1 needs nothing from you: the `backup` container writes a verified dump to `./backups` every night (14 daily, 8 weekly) as soon as Ledge is running. What is still open is the part only you can do:

- **9.2, an off-site copy.** The nightly dumps sit on the same disk as the database. If the disk dies, they die with it.
- **9.3, a restore test.** A backup you have never restored is a hope, not a backup.

It is fine to do these later, but do them before you rely on Ledge for data you cannot re-enter. Until then, check now and then that dumps are appearing: `ls -lh ~/Deployments/ledge/backups/daily` (or wherever you cloned it).

### Files and the first start

**I ran `cp .env.production.example .env` and nothing opened. Is that right?**

Yes. `cp` only copies the file; it never opens anything. And `ls` does not list files whose names start with a dot, so `.env` is invisible in a plain `ls`. Use:

```bash
ls -a            # shows .env
nano .env        # opens it for editing (Ctrl+O then Enter to save, Ctrl+X to quit)
```

**`docker compose logs migrate` shows only a few drizzle lines and no "done" message. Did it work?**

Those lines are normal: drizzle prints its connection details and stays quiet on success. A failure prints an error line (for example `password authentication failed` or `ECONNREFUSED`). To be sure, check the exit code and the app:

```bash
docker compose ps -a                      # migrate-1 should say Exited (0)
docker compose ps                         # db and app should say healthy
curl http://127.0.0.1:3000/api/health     # {"status":"ok"}
```

The app only starts after migrate succeeds, so a healthy app proves it worked. If migrate did fail, the usual cause is a wrong `POSTGRES_PASSWORD` in `.env` (see Troubleshooting).

**Two things already use ports on my server. Will Ledge clash?**

Ledge publishes only one port, `3000`, and only to the server itself (`127.0.0.1:3000`). If something else already holds 3000, `docker compose up` reports it. Change Ledge's port instead of the other app's: set `APP_PORT=3010` (any free number) in `.env`, run `docker compose up -d`, and use `http://localhost:3010` as the route's service URL. Find out what listens where with `sudo ss -tlnp`.

### The firewall

**`sudo ufw enable` warned that it "may disrupt existing ssh connections". Is it safe to answer `y`?**

Yes, after `sudo ufw allow OpenSSH` has printed `Rules updated`, and if SSH really listens on port 22 (the `OpenSSH` rule opens exactly that). Check before answering:

```bash
sudo ss -tlnp | grep sshd        # you want :22
```

If sshd is on another port, run `sudo ufw allow <port>/tcp` first. After enabling, run `sudo ufw status`, and test a **second** SSH login before closing the first window. Things that are not affected: SSH through a Cloudflare tunnel (cloudflared connects to the server's own `localhost`, which ufw always allows), the tunnel's outgoing connection, and Ledge (its port is bound to `127.0.0.1`). A service you reach directly over your home network on some port is blocked until you allow that port.

### Cloudflare tunnels

**Do I need a new tunnel for Ledge?**

No. One tunnel per machine, one route per app. Ledge becomes one more route (`ledge.<your-domain>` to `http://localhost:3000`) on the tunnel that already serves your other sites. Step 6 has the details and 6A shows how to remove tunnels you no longer need.

**I want to add the route in the dashboard but it says "This tunnel is locally managed. Routes are configured via the local configuration file and cannot be modified from the dashboard." What now?**

That message means the tunnel's connector was started with a config file, so the routes live in that file and the dashboard only displays them. Follow step 6.3: add the route to the file, create the DNS record, restart cloudflared. The dashboard list should then show the new route too.

**Where is the config file? I found `config.yml` in `~/.cloudflared` but I am not sure it is the one.**

Do not guess, and do not assume `~/.cloudflared`. The only reliable source is the **running process**:

```bash
ps aux | grep [c]loudflared            # look for  --config /path/to/file.yml
systemctl status cloudflared --no-pager
```

On the server this guide was tested on, the live service ran `/etc/cloudflared/config.yml`, while `~/.cloudflared/config.yml` was an unused leftover. Two clues give a stale file away: no running process names it, and the `credentials-file:` it points to does not exist in that folder (`ls ~/.cloudflared`). Edit the file the process uses, and take a backup first.

**Why are there several `cloudflared` processes, and what is the one owned by user `65532`?**

Each tunnel has its own connector, so several lines in `ps` are normal when you have several tunnels. A line owned by **root** with `--config /etc/cloudflared/<name>.yml` is a system service for one tunnel (see `systemctl list-units --type=service | grep cloudflared`). A line owned by **user 65532** with no `--config` is a connector running inside a **Docker container** and taking its tunnel token from an environment variable. That is how the `cloudflared` service in Ledge's own `docker-compose.yml` runs when started with `--profile tunnel`. To see which container it is:

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
```

On a machine that already has a tunnel, do not start Ledge's bundled connector: leave `TUNNEL_TOKEN` empty and never use `--profile tunnel` (step 6.5).

**What do the `ICMP proxy ... denied` warnings in the cloudflared log mean?**

Nothing you need to fix. They say cloudflared is not allowed to forward ping (ICMP) packets for private-network routing, which a tunnel that only publishes web sites and SSH never uses. The line that matters is `Registered tunnel connection`.

**Will restarting cloudflared break something?**

It drops that tunnel's sites and routes for a few seconds. If you are logged in over the tunnel's SSH address, your session drops too: reconnect and carry on. Other tunnels (their own services) are not touched. Before restarting, validate the file (`cloudflared tunnel --config <file> ingress validate`), so a typo cannot take every site down, and keep the `.bak` copy so you can put the old file back.

**Why does `cloudflared tunnel route dns` need `cert.pem`, and where does it look?**

The command talks to your Cloudflare account, and `cert.pem` (in the home folder of the user who ran `cloudflared tunnel login`, usually `~/.cloudflared/cert.pem`) is the login it uses. Run it as your normal user, **without `sudo`**, or it looks in root's home and cannot find it. If you have no `cert.pem`, add the record by hand in the dashboard: DNS, Add record, type `CNAME`, name `ledge`, target `<tunnel-id>.cfargotunnel.com`, proxied. Never paste `cert.pem` or the tunnel's `.json` credentials file anywhere: they are keys to your account and tunnel.

**What must match exactly between Ledge and the route?**

The address in `.env` (`BETTER_AUTH_URL=https://ledge.<your-domain>`, no slash at the end) and the hostname of the route. If they differ even slightly, the page loads but sign-in fails or logs you straight out. After changing `.env`, run `docker compose up -d`.

### Working in the terminal

**I pasted a command's output back into the terminal and got a wall of "command not found". Did I break anything?**

No. The shell tried to run the output text as commands and failed on each line. The commands in that paste were read-only. The habit that avoids it: copy **only the command**, never the `user@server:~$` prompt or the output under it, and run one block at a time. If you ever see a line like `sudo snap install ...` in such errors, that is only a suggestion from the shell; nothing was installed.

**Which of my own files should never be pasted into a chat, a ticket or git?**

`.env`, `cert.pem`, any tunnel `.json` credentials file, and any `TUNNEL_TOKEN`. Config files such as `config.yml` hold only tunnel IDs and paths, so they are safe to share for help.
