# Task reminders spec (phone notifications)

Status: **draft, not agreed.** Written 2026-11-23 after O asked for "reminders on phone as notifications for time limit". Nothing is built. The open questions in §12 go to O in chat first; the answers replace the "Proposed" lines below. Proposed as **Phase 16**.

This changes two lines in CLAUDE.md once O agrees: §1 lists "push or email notifications" as a non-goal and §6.2 marks reminders as P2. O asking for it counts as OK under §17.3; it is logged in `docs/decisions.md` when the spec is agreed.

## 1. Goal

A task with a due time can carry a reminder. At the reminder's time Ledge sends a notification to every phone (and computer) where O turned reminders on, even when Ledge is closed. Tapping it opens the task. On Android it also has **Done** and **Snooze** buttons.

Not part of this: email or SMS reminders, reminders for expenses or EMIs, location reminders, a daily digest (parked in `docs/ideas.md` if wanted later).

## 2. How it works (Web Push)

Ledge is already an installable web app (Phase 13, `docs/pwa-spec.md`) with a service worker (`public/sw.js`). Web Push is the standard way such an app gets notifications without a native app:

1. On a device, O turns on "Reminders on this device" in Settings. The browser asks for permission, then gives Ledge a **push subscription**: an address at the browser maker's push service (Google for Chrome on Android, Apple for iPhone, Mozilla for Firefox) plus two keys.
2. Ledge stores the subscription for that user and that device.
3. When a reminder is due, the server encrypts a small message with the device's keys and posts it to that address, signed with Ledge's own **VAPID** key pair (it proves the message comes from Ledge).
4. The push service wakes the phone's service worker, which shows the notification.

The push service only sees an encrypted blob, never the task title. The title is visible on the phone's screen when the notification arrives (see §12, question 7).

**iPhone:** web push works only for an app **added to the Home Screen**, on iOS or iPadOS **16.4 or later**, and the permission prompt must come from a tap. In Safari's normal tabs it is not available. Settings shows a short "Add Ledge to your Home Screen first" note on an iPhone that is not installed (checked with `navigator.standalone` / `display-mode: standalone`). iPhone notifications show no action buttons, so Done and Snooze are Android and desktop only; tapping still opens the task.

**Dependency:** `web-push` (npm, the package the Next.js PWA guide uses). It does two hard pieces of cryptography: the VAPID signature (ES256 JWT) and the message encryption (RFC 8291, aes128gcm). Writing those by hand is easy to get subtly wrong, and a mistake fails silently (the push service drops the message). It runs on the server only. The exact version is pinned at build time after checking its current release notes.

## 3. Reminder choices on a task

Proposed (§12, question 1):

- **None** (default for most tasks, §12 q2).
- **At due time.**
- **Before:** 5, 10, 15 or 30 minutes, 1 or 2 hours, 1 day before.
- **Custom:** a date and time of its own (floating, like due dates).

One reminder per task. A task with a date but no time can have a reminder; "at due time" then means a fixed morning time (proposed 09:00, §12 q3). Changing the task's due date or time moves its reminder with it (except a custom one).

Where it is set: a **Reminder** row in the task detail drawer under the due date, and in quick add's More options. Quick add text parsing (for example `!30m`) is not part of this phase.

A task's row shows a small bell when it has a reminder that has not fired yet.

## 4. Repeating tasks

Proposed (§12 q4): a reminder on a repeating task fires **on every round**, at the same offset from each new due date. Ticking a round, or the scheduler finding a round already done, moves the reminder to the next round. Routines (the Repeating card, §6.2) follow the same rule, which could mean one notification a day per routine; O may prefer routines never remind.

## 5. Defaults

Proposed (§12 q2): new tasks have **no reminder** unless O picks one. A Settings choice "Default reminder for tasks with a time" (None, At due time, 10 minutes before, …) fills the field when a time is added. Voice capture and the planner also respect it.

## 6. Quiet hours

Proposed (§12 q5): an optional window (for example 23:00 to 07:00, in O's timezone). A reminder that falls inside it waits and is sent when the window ends, with "(held during quiet hours)" in its text. Off by default.

## 7. What a notification shows and does

- **Title:** the task title. **Body:** "Due 5:00 pm · Home" (time and list), or "Overdue since …" for a late send.
- **Tap:** opens Ledge at the task (`/today?task=<id>`), focusing an open Ledge window if there is one.
- **Done** (Android, desktop): ticks the task from the service worker with a `POST` to Ledge, without opening the app; the notification is replaced by "Marked done" for a moment. If O is signed out on that device it opens the app instead.
- **Snooze** (Android, desktop): sends the same reminder again later. Proposed: 10 minutes (§12 q6; or a choice of 10 min, 1 hour, tomorrow morning, which needs the app to open).
- Notifications for the same task replace each other (`tag` = task id), so a snoozed reminder never stacks.

## 8. Devices and privacy

- One push subscription row per browser per device, linked to the **sign-in session** that created it. Signing out on that device, "Sign out" on it from Settings › Sign-in & security, or the session ending deletes the subscription, so a signed-out phone stops getting task titles. A session lasts 30 days from last use, so a phone unused for a month stops getting reminders until O signs in again.
- A subscription the push service reports gone (`404` or `410`) is deleted at once; one that fails 5 times in a row is deleted too.
- Settings lists the devices with reminders on ("Chrome on Android", from the user agent, like the device list) with Turn off for each, and **Send a test notification**.
- Deleting the account removes subscriptions and reminders (cascade). Export (JSON) includes the reminder settings on tasks but never the subscription keys.
- The notification text is the only thing that leaves the server, encrypted. Nothing about the task is stored by the service worker.

## 9. Sending on time: the scheduler

The app runs as one `app` container (Docker Compose on O's home server). Three ways to wake up and send due reminders:

| Option                                         | For                                                                                | Against                                                                                    |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **A. In-app timer** (Next.js `instrumentation.ts` `register()`, Node runtime only, every 30 s) | No new container, no secret route, same code and env as the app; restarts with it | Sends nothing while the app is down (true of every option, since the data is in the same stack); two app copies would both run it (handled by the claim below) |
| B. Sidecar container running a small script    | Separate from web traffic                                                          | A second image or entrypoint, duplicate env, more to deploy and keep in step               |
| C. Cron (e.g. the backup container) calling a protected `/api/reminders/run` | Simple to trigger                                                                  | A shared secret to manage, a public route to protect, 1-minute granularity at best        |

**Proposed: A.** The tick:

1. Finds reminder rows with `fire_at <= now()` that are not sent, whose task is open, not in Trash and not deleted.
2. **Claims** each with `UPDATE … SET sent_at = now() WHERE id = … AND sent_at IS NULL RETURNING`, so a second process, a restart or an overlapping tick can never send twice.
3. Sends to each of the user's subscriptions in parallel (with a timeout), then deletes dead ones.
4. For a repeating task, computes the next round's `fire_at` when the round moves on.

**Late sends:** if the server was down, a reminder up to **6 hours** late is still sent, marked "Overdue since …"; an older one is skipped and marked as missed (§12 q8). Push messages get a **TTL** of one hour, so a phone that is off does not get a pile of stale reminders when it comes back.

In development the timer runs too (one dev server); tests call the tick function directly with a fixed clock.

## 10. Time zones

Due dates and times are floating (CLAUDE.md §6.3). The reminder's moment is worked out **when it is saved** into a UTC `fire_at`, using the user's `timezone` setting and date-fns (the same helpers as Today), and recomputed when:

- the task's due date, due time, or reminder changes;
- a repeating task moves to its next round;
- O changes the timezone in Settings (every future reminder is recomputed).

Daylight-saving cases (a time that does not exist or happens twice) follow the existing date helpers and get unit tests. Asia/Kolkata has no DST, but other users may.

## 11. Build plan (Phase 16)

**16.A Foundations**

- Env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (a `mailto:` or `https:` contact the push services can use). No keys: reminders are off and their settings are hidden. The public key reaches the browser from the server at run time, not through `NEXT_PUBLIC_*`, so one Docker image works with any keys. A script `push:keys` prints a fresh key pair.
- Migration: `push_subscriptions` (user, session, endpoint unique, keys, device label, failure count, last success), `user_settings` gains `reminders_default`, `quiet_start`, `quiet_end`.
- Service worker: `push`, `notificationclick` and `notificationclose` handlers. The worker registers in development too when `VAPID_PUBLIC_KEY` is set (so localhost can be tried), with its caching left off in development.
- Settings › **Notifications** (new section): Reminders on this device, iPhone install note, permission-denied help, device list, Send a test notification.

**16.B Reminders on tasks**

- Migration: `task_reminders` (user, task, kind, offset minutes, custom date and time, `fire_at`, `sent_at`, `snoozed_until`), one per task; ownership through the same composite foreign key as tasks.
- Pure `reminder-time.ts` (fire time from due date and time, offset, timezone, quiet hours; next round) with unit tests incl. DST and month-end.
- Drawer and quick add Reminder field, bell on rows, default from Settings.
- Server actions with `requireUser`, Zod and ownership; integration test that user B cannot read or set reminders on A's tasks or subscribe to A's account.

**16.C Scheduler and actions**

- `src/server/reminders.ts` tick (claim, send, prune), started from `src/instrumentation.ts`.
- `POST /api/reminders/[taskId]/done` and `/snooze` (session cookie, ownership, Zod), used by the service worker.
- Repeating tasks, quiet hours, late sends.

**16.D Hardening and docs**

- Error states (permission denied, keys missing, a device that stopped responding), loading skeleton for the section.
- CLAUDE.md §1, §4, §6.2, §11, §14; `.env.example`, `.env.production.example`, `docker-compose.yml`, README, `docs/decisions.md`, `docs/plain-english/phase-16-reminders.md`, glossary (push, VAPID, service worker events).
- Tried on localhost in Chrome (desktop) with real pushes; O tries it on his phone over the tunnel (Android, and iPhone installed).

Exit: a task with a reminder makes a notification arrive on time on a phone with Ledge closed; Done and Snooze work on Android; a signed-out device gets nothing; another user cannot touch the reminders; the §15 definition of done holds.

## 12. Open questions for O

1. **Choices per task:** At due time, a fixed list of "before" times (5, 10, 15, 30 min, 1 h, 2 h, 1 day), and a custom date and time. Is that the right list? One reminder per task, or allow two (for example 1 day before and at the time)?
2. **Default:** no reminder unless picked, with a Settings default for tasks that get a time? Or every task with a time reminds at its time automatically?
3. **Tasks with a date but no time:** remind at a fixed morning time (09:00, changeable in Settings), or no reminders without a time?
4. **Repeating tasks:** remind on every round? Should routines (daily and similar) remind too, or only weekly and longer repeats?
5. **Quiet hours:** want them? If yes, hold reminders until the window ends (proposed), or send them silently?
6. **Notification buttons:** tap opens the task; Done ticks it; Snooze waits 10 minutes. Is 10 minutes right, or a choice (10 min, 1 hour, tomorrow morning)?
7. **Lock screen:** show the task title on the notification (proposed), or a plain "You have a reminder" for privacy?
8. **Missed while the server was down:** send up to 6 hours late marked overdue, skip older ones. OK?
9. **Overdue nudges:** none (proposed), or one more notification if a task is still open some time after its due time?
