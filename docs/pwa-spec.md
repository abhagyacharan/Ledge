# Installable web app (PWA) spec

Status: approved by O in chat on 2026-11-21 ("spec the PWA and start building"). Built as Phase 13.

## Goal

"Add to Home screen" gives Ledge its own icon, a window with no browser bars, and its own entry in the app switcher, on Android and iPhone. The website and the app are the same code, the same server and the same data, so they cannot drift apart. No second project, no second backend.

## What already existed

- `src/app/manifest.ts`: name, icons (192, 512, maskable), `display: standalone`, colours.
- `viewportFit: "cover"` and safe-area padding in the shell.
- Tap highlight off, `touch-action: manipulation` (globals.css).

## What this phase adds

1. **A service worker** (`public/sw.js`) that:
   - caches **static files only** (`/_next/static/*`, `/icons/*`, fonts), so the app shell opens faster;
   - never caches pages, Server Action calls, `/api/*` or anything with your data;
   - when the network is down and you open or reload a page, shows a small **offline page** (`public/offline.html`) instead of the browser's error.
2. **Registration** (`ServiceWorkerRegister`, production only) so development hot reload is not affected.
3. **Manifest extras**: `orientation: portrait-primary`, `categories`, and long-press **shortcuts** (Tasks, Expense Tracker, Journal).
4. **iPhone metadata**: `appleWebApp` (capable, title) so iOS opens it full screen with the right name.
5. **Headers and proxy**: `/sw.js` is served with `Cache-Control: no-cache` (so updates are picked up) and the proxy lets `/sw.js` and `/offline.html` through signed out (the phone fetches them without your cookies).

## Privacy rule (why only static files)

Ledge holds finances and a private journal. A cached page would stay on the phone after you sign out, and anyone holding the phone could open it offline. So nothing that comes from the database is ever stored by the worker. Offline reading and offline editing are **not** part of this phase.

## Non-goals (parked)

- Offline reading or editing, background sync (needs a local copy of the data and conflict rules; its own project).
- Push notifications, widgets, share sheet (the reasons to move to a native app later; see `docs/ideas.md` item 6).
- App store listing.

## Updates

The worker file's bytes change per release (it carries a `CACHE_VERSION`). The browser checks `/sw.js` on every launch (no-cache header); a new version installs, takes over at once (`skipWaiting` and `clients.claim`) and deletes old caches. Hashed files under `/_next/static` never change under the same name, so stale files cannot be served.

## Exit criteria

- Lighthouse-style checks: manifest valid, worker registered, installable over HTTPS.
- Offline: with the network off, opening any page shows the offline page; reconnecting and tapping Try again loads the app.
- Signed out and signed in: no page or API response is found in Cache Storage.
- `typecheck`, `lint`, `test` pass; the proxy test covers `/sw.js` and `/offline.html`.
- O tries "Add to Home screen" on his phone over the tunnel (not verifiable from this machine).
