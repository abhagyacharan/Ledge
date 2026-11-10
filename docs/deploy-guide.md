# Deploying Ledge to your home server with Cloudflare Tunnel

A step-by-step guide you can follow by hand. It assumes you are a bit rusty with servers, so every command is spelled out, with what it does and what you should see.

**Time needed:** about 1 hour the first time (most of it waiting for the first build and for Cloudflare).

**Honest note on testing:** the Docker pieces in this guide (build, start, health check, migrations, nightly backup, restore) were run end to end on a development machine. The Cloudflare steps were written from Cloudflare's current documentation but could not be run, because that needs your Cloudflare account and domain. Cloudflare renames menu items now and then. If a button is not where this guide says, the "If the screen looks different" box in step 6 tells you what to do.

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
 │  (the tunnel)       │                            from outside at all)        │
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
| `TUNNEL_TOKEN`       | Leave empty for now. You get it in step 6.                                                                                                       |
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

## 6. Connect Cloudflare Tunnel

### 6.1 Create the tunnel

1. Log in at https://dash.cloudflare.com.
2. In the left menu open **Networking** → **Tunnels** (it may be under "Zero Trust" → "Networks" → "Tunnels" in older layouts).
3. Click **Create a tunnel**. Choose **Cloudflared** if it asks which type.
4. Give it a name, for example `home-server`, and click **Save tunnel**.
5. The next screen offers install commands for different systems. Choose **Docker**. It shows a command like:

   ```
   docker run cloudflare/cloudflared:latest tunnel --no-autoupdate run --token eyJhIjoi...
   ```

6. **Do not run that command.** Our `docker-compose.yml` already starts cloudflared for you. You only need the **token**: the very long text after `--token`, starting with `eyJ`. Copy just that.

### 6.2 Put the token in `.env`

```bash
nano .env
```

Set `TUNNEL_TOKEN=` to the token you copied (no quotes, no spaces). Save and exit.

### 6.3 Publish Ledge under your domain name

Still in the Cloudflare tunnel screen (click **Next**, or open the tunnel and go to its **Routes** tab):

1. Click **Add route** (or **Add a public hostname**), then choose **Published application**.
2. **Subdomain:** `ledge` (or any word you like).
3. **Domain:** pick your domain from the list.
4. **Service type / URL:** `HTTP` and `app:3000`, so the **Service URL** is:

   ```
   http://app:3000
   ```

   Important: it is `app`, **not** `localhost`. The tunnel runs in its own container, and `app` is the name Docker gives to the Ledge container.

5. Save.

Your public address is now `https://ledge.yourdomain.com` (or whatever you chose). Cloudflare creates the DNS record for you automatically. Make sure it is the same address you wrote in `BETTER_AUTH_URL`.

> **If the screen looks different:** Cloudflare changes its menus often. What you need is always the same two things: (1) a tunnel, from which you can copy a token, and (2) a route from `your-subdomain.your-domain` to the service `http://app:3000`. Cloudflare's current instructions are at https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/

### 6.4 Start the tunnel

Back on the server, in `~/ledge`:

```bash
docker compose --profile tunnel up -d
```

Check it connected:

```bash
docker compose logs --tail 20 cloudflared
```

You should see lines saying it registered tunnel connections (for example "Registered tunnel connection"). In the Cloudflare dashboard, the tunnel status should change to **Healthy** within a minute.

### 6.5 Try it

On your phone (on mobile data, to prove it works from outside your home) or laptop, open `https://ledge.yourdomain.com`. You should see the Ledge sign-in page with a padlock.

Two more checks from any computer:

```bash
curl https://ledge.yourdomain.com/api/health
curl -sI https://ledge.yourdomain.com/sign-in | grep -i -E "content-security-policy|strict-transport|x-frame"
```

The first should print `{"status":"ok"}`. The second should print Ledge's security headers.

**Make it start by itself after a power cut or reboot.** The containers have `restart: unless-stopped`, so Docker brings them back when the server reboots, as long as Docker starts at boot (step 2.2). Test it once: `sudo reboot`, wait two minutes, and open the address again.

---

## 7. Create your account, then close sign-ups

1. Open your address, click **Create an account**, and sign up with your email and a strong password (at least 10 characters). Store it in your password manager.
2. You land in an empty Inbox. Your account is the only one that exists.
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

| I want to...                     | Command                                                                     |
| -------------------------------- | --------------------------------------------------------------------------- |
| See what is running              | `docker compose ps`                                                         |
| Watch the app's log              | `docker compose logs -f app` (stop watching with `Ctrl+C`)                  |
| Restart the app                  | `docker compose restart app`                                                |
| Apply a changed `.env`           | `docker compose up -d`                                                      |
| Stop everything (data is kept)   | `docker compose --profile tunnel down`                                      |
| Start everything again           | `docker compose --profile tunnel up -d`                                     |
| See how much disk Docker uses    | `docker system df`                                                          |
| Make a backup now                | `docker compose run --rm --entrypoint "sh /backup.sh once" backup`          |
| Open a database prompt (to look) | `docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'` |

> **Never run `docker compose down -v`.** The `-v` also deletes the database volume, which is your data. Plain `down` is safe.

---

## 12. Troubleshooting

| What you see                                                   | Likely cause and fix                                                                                                                                                                                                                                                               |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker compose up` says `set POSTGRES_PASSWORD in .env`       | The `.env` file is missing, empty, or you are not in `~/ledge`. Run `ls -a` and check for `.env`.                                                                                                                                                                                  |
| The build fails while downloading                              | No internet from the server, or a temporary outage. Check with `curl -I https://registry.npmjs.org` and try again.                                                                                                                                                                 |
| `migrate` fails (check `docker compose logs migrate`)          | Usually a wrong password: `POSTGRES_PASSWORD` was changed after the database was first created. The database keeps the first password. Put the original back, or (only if you have no data yet) remove the volume: `docker compose down -v` and start again.                       |
| `app` never becomes healthy                                    | Read `docker compose logs --tail 80 app`. A message starting "Invalid environment" lists the bad setting (a short `BETTER_AUTH_SECRET`, a `BETTER_AUTH_URL` that is not a full address).                                                                                           |
| Cloudflare shows **502 Bad Gateway** or "tunnel down"          | The app is not healthy yet, or the route points to the wrong place. The Service URL must be exactly `http://app:3000`. Check `docker compose ps` and `docker compose logs cloudflared`.                                                                                            |
| The tunnel container keeps restarting                          | `TUNNEL_TOKEN` is empty or wrong, or has a stray space or quote. Copy the token again.                                                                                                                                                                                             |
| The page loads but sign-in fails or you are signed out at once | `BETTER_AUTH_URL` is not exactly the address in your browser. Fix `.env`, then `docker compose up -d`.                                                                                                                                                                             |
| "Too many attempts. Wait a minute"                             | The rate limit allows 5 sign-in attempts a minute per visitor. Wait a minute.                                                                                                                                                                                                      |
| The site stopped working after a power cut                     | Check `docker compose ps`. If Docker itself did not start: `sudo systemctl start docker`, and `sudo systemctl enable docker` so it does next time.                                                                                                                                 |
| The disk is filling up                                         | `docker system df` shows where. `docker image prune -f` removes old images. Old backups are removed automatically (14 daily and 8 weekly).                                                                                                                                         |
| You forgot your password                                       | **There is no password-reset email in Ledge yet** (it needs an email service). Prevention: keep it in a password manager. If it happens, tell me and I will add a command-line reset script; your data is safe in the database in the meantime. This is logged in `docs/ideas.md`. |

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
docker compose --profile tunnel down -v    # -v deletes the database. Only do this if you mean it.
cd ~ && rm -rf ledge
```

Then delete the tunnel and the route in the Cloudflare dashboard.
