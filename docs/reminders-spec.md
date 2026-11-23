# Task reminders spec (phone notifications)

Status: **agreed with O on 2026-11-24** (every proposal in §12 accepted). Written 2026-11-23 after O asked for "reminders on phone as notifications for time limit". Built as **Phase 16** with the build-feature workflow (§13).

This changes two lines in CLAUDE.md: §1 lists "push or email notifications" as a non-goal and §6.2 marks reminders as P2. O asking for it counts as OK under §17.3; it is logged in `docs/decisions.md`.

## 1. Goal

A task with a due date can carry a reminder. At the reminder's time Ledge sends a notification to every phone (and computer) where O turned reminders on, even when Ledge is closed. Tapping it opens the task. On Android and desktop it also has **Done** and **Snooze** buttons.

Not part of this: email or SMS reminders, reminders for expenses or EMIs, location reminders, a daily digest, overdue nudges.

## 2. How it works (Web Push)

Ledge is already an installable web app (Phase 13, `docs/pwa-spec.md`) with a service worker (`public/sw.js`). Web Push is the standard way such an app gets notifications without a native app:

1. On a device, O turns on "Reminders on this device" in Settings. The browser asks for permission, then gives Ledge a **push subscription**: an address at the browser maker's push service (Google for Chrome on Android, Apple for iPhone, Mozilla for Firefox) plus two keys.
2. Ledge stores the subscription for that user and that device.
3. When a reminder is due, the server encrypts a small message with the device's keys and posts it to that address, signed with Ledge's own **VAPID** key pair (it proves the message comes from Ledge).
4. The push service wakes the phone's service worker, which shows the notification.

The push service only sees an encrypted blob, never the task title. The title is visible on the phone's screen when the notification arrives (O chose this, §12 q7).

**iPhone:** web push works only for an app **added to the Home Screen**, on iOS or iPadOS **16.4 or later**, and the permission prompt must come from a tap. In Safari's normal tabs it is not available. Settings shows a short "Add Ledge to your Home Screen first" note on an iPhone that is not installed (checked with `navigator.standalone` / `display-mode: standalone`). iPhone notifications show no action buttons, so Done and Snooze are Android and desktop only; tapping still opens the task.

**Dependency:** `web-push` (npm, the package the Next.js PWA guide uses). It does two hard pieces of cryptography: the VAPID signature (ES256 JWT) and the message encryption (RFC 8291, aes128gcm). Writing those by hand is easy to get subtly wrong, and a mistake fails silently (the push service drops the message). It runs on the server only. The exact version is pinned after checking its current release.

## 3. Reminder choices on a task

- **None.**
- **At due time.**
- **Before:** 5, 10, 15 or 30 minutes, 1 or 2 hours, 1 day before.
- **Custom:** a date and time of its own (floating, like due dates).

One reminder per task. A task with a date but no time can have a reminder; its "due time" is then the **morning time** from Settings (default 09:00). Changing the task's due date or time moves its reminder with it (except a custom one), because the reminder stores an offset, not a moment (§9).

Where it is set: a **Reminder** row in the task detail drawer under the due date, and in quick add's More options. Quick add text parsing (for example `!30m`) is not part of this phase.

A task's row shows a small bell icon when it has a reminder (set, or from the default) for a date that has not passed.

## 4. Repeating tasks

A reminder on a repeating task fires **on every round**, routines included, at the same offset from each round's due date. When a round is ticked the task's due date moves on, so the reminder is armed again for the new date by itself (§9). A custom reminder on a repeating task fires once.

## 5. Defaults

New tasks have **no reminder** unless O picks one. Settings has "Default reminder for tasks with a time" (None, At due time, or one of the "before" choices). It applies to tasks **with a due time** that were **created after the default was last changed** and have no reminder of their own; picking None on such a task turns it off for that task. This covers voice capture and the planner too, with no change to them. Tasks with a date but no time never get the default.

## 6. Quiet hours

Optional, off by default: a start and end time in O's timezone (for example 23:00 to 07:00, which may cross midnight). A reminder that falls inside the window waits and is sent when it ends, with "Held during quiet hours" in its text.

## 7. What a notification shows and does

- **Title:** the task title. **Body:** "Due 5:00 pm · Home" (time and list; "Due today · Home" without a time), "Overdue since 5:00 pm · Home" for a late send, plus "Held during quiet hours" when it waited.
- **Tap:** opens Ledge at the task (`/today?task=<id>`), focusing an open Ledge window if there is one.
- **Done** (Android, desktop): ticks the task from the service worker with a `POST` to Ledge, without opening the app (a repeating task moves to its next round, as when ticked in the app). The notification is replaced by "Marked done" for a moment. If the device is signed out it opens the app instead.
- **Snooze** (Android, desktop): sends the same reminder again in **10 minutes**.
- Notifications for the same task replace each other (`tag` = task id), so a snoozed reminder never stacks.

## 8. Devices and privacy

- One push subscription row per browser per device, linked to the **sign-in session** that created it (foreign key, cascade). Signing out on that device, "Sign out" on it from Settings › Sign-in & security, or the session ending deletes the subscription (an expired session that is still in the table is ignored by the sender), so a signed-out phone stops getting task titles. A session lasts 30 days from last use, so a phone unused for a month stops getting reminders until O signs in again.
- A subscription the push service reports gone (`404` or `410`) is deleted at once; one that fails 5 times in a row is deleted too.
- Settings lists the devices with reminders on ("Chrome on Android", from the user agent, like the device list) with Turn off for each, and **Send a test notification**.
- Deleting the account removes subscriptions and reminders (cascade). Export (JSON) includes the reminders and reminder settings but never the subscription keys or endpoints.
- The notification text is the only thing that leaves the server, encrypted. Nothing about the task is stored by the service worker.

## 9. Sending on time: the scheduler

Options considered (the app runs as one `app` container in Docker Compose on O's home server):

| Option                                                                                         | For                                                                               | Against                                                                                                                   |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **A. In-app timer** (Next.js `instrumentation.ts` `register()`, Node runtime only, every 30 s) | No new container, no secret route, same code and env as the app; restarts with it | Sends nothing while the app is down (true of every option); two app copies would both run it (handled by the claim below) |
| B. Sidecar container running a small script                                                    | Separate from web traffic                                                         | A second image or entrypoint, duplicate env, more to deploy and keep in step                                              |
| C. Cron (e.g. the backup container) calling a protected `/api/reminders/run`                   | Simple to trigger                                                                 | A shared secret to manage, a public route to protect, 1-minute granularity at best                                        |

**Chosen: A.**

**The moment is worked out on every tick, not stored.** A reminder row stores what O chose (kind, offset, or a custom floating date and time). Each tick (every 30 seconds):

1. Loads open, not-deleted tasks that have a reminder row (other than None) or qualify for the default (§5), whose due date (or custom date) is within two days either side of today in UTC, for users with at least one live subscription, with each user's timezone, morning time and quiet hours.
2. Works out each reminder's moment in UTC from the floating date and time, the user's timezone (date-fns helpers, the same as Today), the offset, and quiet hours (pure code in `reminder-time.ts`, unit tested incl. DST gaps and overlaps, month-end and windows that cross midnight).
3. Gives the round a **key**: the task id, its due date and time, and the reminder choice. A reminder is due when its moment has passed and the stored `sent_key` differs from the key. Moving the due date, a repeating task moving to its next round, a new choice, or a timezone change all change the key or the moment, so the reminder re-arms with no hook in any write path (voice, planner, reschedule, restore included).
4. **Claims** it with `UPDATE task_reminders SET sent_key = $key … WHERE … AND sent_key IS DISTINCT FROM $key RETURNING` (for a default reminder, which has no row yet, an `INSERT … ON CONFLICT DO UPDATE … WHERE` of the same shape), so a second process, a restart or an overlapping tick never sends twice.
5. Sends to each of the user's live subscriptions in parallel (with a timeout), then deletes dead ones.

**Snooze** sets `snoozed_until` (now + 10 minutes) and remembers the round it was for (`snoozed_key`); the tick sends it once it is due and clears it with the same kind of claim, but drops it without sending if the round has changed since (the task was ticked, moved, or finished). A snooze that lands in quiet hours waits for them to end. (Added after the review, 2026-11-24.)

**The service worker's routes** (`/api/reminders/<id>/done`, `/snooze`, `/subscription`) sit outside the proxy, so a signed-out call gets 401 JSON. They refuse anything not from Ledge itself (`Sec-Fetch-Site: same-origin`, or an Origin equal to `BETTER_AUTH_URL`) with 403. A notification carries its round (`round`, the due date); Done or Snooze for a round that has moved on gets 409 and opens the app. Two Done presses at once finish one round only (the due date moves only if it is still the old one). `pushsubscriptionchange` saves a browser's new address through `/subscription`.

**Late sends:** a moment up to **6 hours** late is still sent, marked "Overdue since …"; an older one is marked sent without a notification. A moment that was already past when the reminder or the task was last changed (for example "10 minutes before" set on a task due in 5 minutes) is sent at once, since O just asked for it, unless it is more than 6 hours old. Push messages get a **TTL** of one hour and urgency high, so a phone that is off does not get a pile of stale reminders when it comes back.

In development the timer runs too (one dev server); tests call the tick function directly with a fixed clock.

## 10. Time zones

Due dates and times are floating (CLAUDE.md §6.3). Because the moment is worked out on each tick (§9) from the user's current `timezone`, changing the timezone in Settings moves every future reminder with no extra step. Daylight-saving cases (a time that does not exist or happens twice) follow the existing date helpers and get unit tests. Asia/Kolkata has no DST, but other users may.

## 11. Data

- Push endpoints are accepted only on the real push services (`fcm.googleapis.com`, `*.push.apple.com`, `updates.push.services.mozilla.com`, `*.notify.windows.com`; https, default port, no IP address), so an account cannot make the server call other addresses. The device list sends the page ids and names only, never endpoints.
- `push_subscriptions`: `id`, `user_id` (FK cascade), `session_id` (FK to `session`, cascade), `endpoint` (unique), `p256dh`, `auth`, `device_label`, `failures` (int, default 0), `last_success_at`, `created_at`, `updated_at`.
- `task_reminders`: `id`, `user_id`, `task_id` (unique; composite FK `(task_id, user_id)` to `tasks (id, user_id)`, cascade), `kind` (`none` | `at_due` | `before` | `custom`), `offset_minutes` (only with `before`; one of 5, 10, 15, 30, 60, 120, 1440), `custom_date` and `custom_time` (only with `custom`), `sent_key` (text, null), `snoozed_until` (timestamptz, null), `snoozed_key` (text, null; migration 0019), `created_at`, `updated_at`; CHECK constraints for each kind's columns.
- `user_settings` gains `reminder_default` (text: `none`, `at_due` or `before:<minutes>`; default `none`), `reminder_default_since` (timestamptz), `reminder_morning_time` (time, default `09:00`), `quiet_start` and `quiet_end` (time, both null or both set).
- Env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (a `mailto:` or `https:` contact for the push services). Without them reminders are off and their settings are hidden. The public key reaches the browser from the server at run time, not through `NEXT_PUBLIC_*`, so one Docker image works with any keys. `push:keys` prints a fresh pair.

## 12. Questions for O (answered 2026-11-24: every proposal)

1. **Choices per task:** At due time, 5, 10, 15, 30 min, 1 h, 2 h, 1 day before, or a custom time; one reminder per task. **Yes.**
2. **Default:** none unless picked, with a Settings default for tasks that get a time. **Yes.**
3. **Date but no time:** remind at a morning time (09:00, changeable). **Yes.**
4. **Repeating tasks:** every round, routines included. **Yes.**
5. **Quiet hours:** optional; hold reminders until the window ends. **Yes.**
6. **Buttons:** tap opens, Done ticks, Snooze 10 minutes. **Yes.**
7. **Lock screen:** show the task title. **Yes.**
8. **Missed while down:** up to 6 hours late, marked overdue; skip older. **Yes.**
9. **Overdue nudges:** none. **Yes.**

## 13. Build plan

Contracts shared by the packages:

- **Push payload** (JSON, encrypted by `web-push`): `{ "type": "reminder", "taskId", "title", "body", "url", "tag", "late": boolean }` or `{ "type": "test", "title", "body", "url": "/settings/notifications" }`.
- **Service worker routes:** `POST /api/reminders/<taskId>/done` and `POST /api/reminders/<taskId>/snooze`, same-origin with the session cookie; `200 {"ok":true}`, `401` when signed out, `404` for a task that is not the user's.
- **Server helpers from wp1:** `src/server/push.ts` (`pushConfigured()`, `vapidPublicKey()`, `sendPush(subscription, payload)` returning `"ok" | "gone" | "failed"`, and `sendToUser(userId, payload)` that records success and failures and prunes dead rows) and `src/server/data/reminders.ts` (every function takes `userId`).

### wp1: data, env and push sender

Model: sonnet
Depends on: none
Files: `src/server/db/schema/push-subscriptions.ts`, `src/server/db/schema/task-reminders.ts`, `src/server/db/schema/user-settings.ts`, `src/server/db/schema/index.ts`, migration `0018_reminders` (generated) and its meta, `src/server/env.ts`, `src/server/push.ts`, `src/server/data/reminders.ts`, `src/modules/reminders/schema.ts`, `src/server/data/export.ts`, `package.json` and `pnpm-lock.yaml` (add `web-push` and `@types/web-push`, script `push:keys`), `.env.example`, `.env.production.example`, `docker-compose.yml`, `tests/integration/reminders-data.test.ts`, `src/modules/reminders/schema.test.ts`
Do: §11 tables and settings columns with CHECK constraints; Zod schemas for a reminder choice, settings and a subscription (endpoint must be https); data functions: get, set and clear a task's reminder (ownership through the task), save a subscription for a user and session (upsert by endpoint, moving it to this user and session), list a user's live subscriptions (session not expired), delete one by id for the user, the reminder settings read and write (`reminder_default_since` set whenever the default changes); `push.ts` per the contracts with `web-push`, TTL 3600, urgency high, 10 s timeout, failures counted, deleted at 5 or on 404/410; export includes reminders and settings, never endpoints or keys.
Done when: migration applies on a fresh DB; integration tests prove user B cannot read, set or clear A's reminders, cannot delete A's subscriptions, and that deleting a session deletes its subscriptions; `sendToUser` prunes on 410 (with `web-push` mocked); typecheck, lint and tests pass.
Out of scope: scheduler, UI, service worker, API routes.

### wp2: scheduler and the service-worker routes

Model: opus (time logic and claims)
Depends on: wp1
Files: `src/modules/reminders/reminder-time.ts` and `.test.ts`, `src/server/reminders.ts` (tick), `src/instrumentation.ts`, `src/app/api/reminders/[taskId]/done/route.ts`, `src/app/api/reminders/[taskId]/snooze/route.ts`, `tests/integration/reminders-tick.test.ts`, `src/proxy.ts` and `src/proxy.test.ts` only if `/api/reminders` needs to pass the proxy
Do: §9 and §10: pure moment, quiet-hours and key logic; the tick (load, compute, claim, send via `sendToUser`, snooze, late rules) with an injectable clock; start it from `register()` in the Node runtime only, once per process, never in tests; Done uses the existing completion path (repeating tasks advance); Snooze sets `snoozed_until`; both check the session and ownership, Zod on the id.
Done when: unit tests for moments (at due, before, custom, date-only morning time, DST gap and overlap in a DST zone, month-end, quiet window across midnight); integration tests with a fixed clock: sends once across two ticks and two concurrent ticks, re-arms after the due date moves and after a repeating round, default applies only to tasks created after `reminder_default_since`, None stops the default, 6-hour late rule, snooze sends again after 10 minutes, nothing sent to an expired session, Done and Snooze refuse another user's task; typecheck, lint and tests pass.
Out of scope: Settings UI, task UI, service worker.

### wp3: Settings › Notifications and the service worker

Model: sonnet
Depends on: wp1
Files: `public/sw.js`, `src/components/service-worker-register.tsx`, `src/modules/account/sections.ts`, `src/modules/account/components/notifications-section.tsx` (new), `src/modules/reminders/notification-actions.ts` (new: subscribe, unsubscribe, test, settings), `src/modules/reminders/components/*` (new client pieces), `src/app/(app)/settings/notifications/page.tsx` and `loading.tsx`, `src/modules/account/components/settings-home.tsx` (the row and its summary)
Do: §2, §5, §6, §7 and §8 UI: Reminders on this device (permission, subscribe with the server's public key, save; off unsubscribes and deletes), iPhone install note, permission-denied help, keys-missing state (section hidden), device list with Turn off, Send a test notification, default reminder, morning time, quiet hours; the worker's `push`, `notificationclick` (open or focus `url`; Done and Snooze actions call the routes, with "Marked done" and opening the app on `401`) and `pushsubscriptionchange` (re-subscribe and save when possible); register the worker in development too when push is configured, with its caching off there (`/sw.js?dev=1`); keep the worker's privacy rule (never cache pages or data). Follows the Settings building blocks (`ui.tsx`, autosave with Saved).
Done when: the section works at desktop and phone width in light and dark, by keyboard, with loading and error states; a test notification arrives in Chrome on localhost; typecheck, lint and tests pass (unit test for any pure helper).
Out of scope: scheduler, task drawer, quick add.

### wp4: reminder on tasks (drawer, quick add, bell)

Model: sonnet
Depends on: wp1
Files: `src/modules/todos/components/reminder-field.tsx` (new), `task-drawer.tsx`, `task-panel.tsx`, `quick-add.tsx`, `task-row.tsx`, `routine-row.tsx`, `types.ts`, `src/modules/todos/actions/tasks.ts`, `src/server/data/tasks.ts` (duplicate copies the reminder; detail includes it), `src/server/data/views.ts` (rows carry `hasReminder`), related tests
Do: §3 and §5 in the task UI: a Reminder row under the due date (None, At due time, the before choices, Custom with date and time; disabled with a hint when the task has no date; shows "From your default" when the default applies), the same in quick add's More options, the bell on rows, actions with `guarded()`, Zod and ownership; hidden entirely when push is not configured.
Done when: setting, changing and clearing a reminder works in the drawer and quick add on desktop and phone, light and dark, by keyboard; duplicate copies it; integration test for the actions' ownership; typecheck, lint and tests pass.
Out of scope: Settings, scheduler, service worker.

Order: wp1 alone in this checkout and committed; then wp2, wp3 and wp4 at the same time in separate worktrees (no shared files). Docs (CLAUDE.md, decisions, plain-English, README) are written by the orchestrator at the end.
