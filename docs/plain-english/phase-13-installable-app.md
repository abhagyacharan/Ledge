# Phase 13: Installing Ledge on your phone

**Status:** built on 2026-11-21. Checked on this computer; not yet tried on your phone (that needs the real HTTPS address from your server).

## What this is

Ledge is a website. On a phone you can turn a website into something that looks and feels like an app: it gets its own icon on your home screen, opens full screen with no browser address bar, and shows up in the list of recent apps. This kind of "website that installs like an app" is called a **PWA** (progressive web app).

It is still the same Ledge. Same code, same server, same data. If you tick a task on your phone, you will see it ticked on the computer, because there is only one place where the data lives: your home server.

## Why not a "real" app from the app store?

A real phone app means building every screen a second time and also building a way for it to talk to the server. That is weeks of work, and every new feature afterwards has to be built twice. The installable web app gives you the daily-use feel for a fraction of that. If you later find something it cannot do (reminders, home-screen widgets, working with no internet), we can look at a real app then.

## What was already there

Before this phase, Ledge already had the little file that tells a phone its name and icon (the **manifest**) and the black home-screen icons.

## What was added

1. **A service worker.** This is a small helper script that the phone keeps in the background for a website. Ours does two things:
   - It remembers the app's fixed files (the pieces of code and icons that never change) so Ledge opens faster the second time.
   - If you open Ledge with no internet, it shows a simple "You are offline" page with a Try again button, instead of the browser's error.
2. **Long-press shortcuts.** On Android, pressing and holding the Ledge icon offers Tasks, Expense Tracker and Journal.
3. **iPhone settings.** A few lines so an iPhone opens Ledge full screen under the name "Ledge".
4. **Portrait only.** The installed app stays upright on phones.
5. **Two small server rules.** The helper script is never kept by the browser for long, so a new version is noticed straight away. And the helper script and the offline page can be fetched without being signed in, because the phone asks for them before you sign in.

## What it deliberately does NOT do

**It never saves your tasks, money or journal on the phone for offline use.** Ledge holds your finances and a private journal. If the phone kept copies of those pages, someone holding your unlocked phone could read them after you signed out, even with no internet. So the helper only keeps fixed files that contain no personal information. A test in the project checks this rule, so it cannot be broken by accident later.

The price: with no internet you cannot read or edit anything. You just see the offline page. Working offline and syncing later is a big project of its own and is parked.

## How to install it (once the app is on your server)

- **Android (Chrome):** open Ledge, tap the three dots menu, then "Install app" (or "Add to Home screen").
- **iPhone (Safari):** open Ledge, tap the Share button, then "Add to Home Screen".

It needs the HTTPS address from your Cloudflare Tunnel; phones will not install it from plain http. (It also does not turn on when you run Ledge on your computer for development, on purpose, so it cannot get in the way of testing.)

## Still to check

- Try the install on your own phone and tell me how it feels.
- The offline page test needs a real phone or a browser with the network switched off.
- The browser tests (Playwright) were not extended for this phase.
