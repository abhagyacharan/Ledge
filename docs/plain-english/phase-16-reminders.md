# Phase 16: Task reminders on your phone

**Status:** built on 24 November 2026. Checked on this computer (the settings page, setting a reminder, the bell, Done and Snooze). A real notification arriving has not been seen yet: the browser inside the Claude app refuses notifications, and your phone needs the server's real HTTPS address and the keys (below).

## What this is

A task can now carry a reminder. At the time you chose, a notification pops up on your phone (and on any computer where you turned reminders on), even when Ledge is closed. Tapping it opens the task.

## How you use it

1. Open **Settings › Notifications** on your phone and turn on **Reminders on this device**. Your phone asks whether Ledge may send notifications; say yes.
   - **iPhone:** this only works once Ledge is on your Home Screen (Share › Add to Home Screen) and the phone runs iOS 16.4 or newer. Apple does not allow notifications from a normal Safari tab.
2. Tap **Send a test notification** to check it works.
3. Open a task and pick a **Reminder** under its due date: at the due time, 5, 10, 15 or 30 minutes before, 1 or 2 hours before, a day before, or a time of your own (Custom, then Set reminder). Quick add has the same choice under More options.
4. A small bell on the task's row tells you it has a reminder.

## The rules you agreed

- **One reminder per task.** If you move the task's date or time, the reminder moves with it (a Custom one stays where you put it).
- **No reminder unless you pick one.** In Settings you can choose a default reminder. It applies to tasks with a time that you create after choosing it, including ones added by voice or the planner. A task can still say None.
- **Tasks with a date but no time** remind at a morning time, 9:00 unless you change it in Settings.
- **Repeating tasks** remind on every round, daily routines too, if they have a reminder.
- **Quiet hours** (optional): reminders that fall inside them wait until the window ends and say "Held during quiet hours".
- **The notification shows the task's title.** On Android and on a computer it has two buttons: **Done** ticks the task without opening Ledge, **Snooze 10 min** brings it back ten minutes later. iPhones show no buttons; tapping opens the task.
- **If the server was off**, a reminder up to 6 hours late is still sent and says "Overdue since …"; older ones are skipped.

## How it works, in plain words

- When you turn reminders on, your phone gives Ledge a private address (a **push subscription**). Ledge keeps one per browser per device.
- Every 30 seconds the server looks for reminders whose time has come. It works the time out fresh each time from the task's date and your timezone, so changing a date or your timezone just works.
- Before sending, it marks the reminder as sent in the database in a way that only one check can win, so a reminder never arrives twice even if the server restarts.
- The message goes through Google's, Apple's or Mozilla's push service, encrypted so they cannot read it. Your server proves it is really Ledge with a pair of **VAPID keys**.
- The little helper script on your phone (the service worker from Phase 13) shows the notification and handles Done and Snooze. It still never stores pages or your data.

## Safety and privacy

- A device's reminders are tied to its sign-in. Sign out on that phone, or sign it out from Settings › Sign-in & security, and it stops getting task titles.
- Ledge only sends to the real push services (Google, Apple, Mozilla, Microsoft). This stops anyone with an account from using "Send a test notification" to poke at addresses on your home network.
- Done and Snooze only work from Ledge itself, for your own tasks, and only for the round the notification was about (an old notification cannot tick a later round).
- Deleting your account deletes the subscriptions and reminders. The JSON export includes your reminders but not the devices' private addresses.

## What you need to do on the server

1. Run `pnpm push:keys` once (or `docker compose run --rm app node node_modules/web-push/src/cli.js generate-vapid-keys`).
2. Put the two keys in the server's `.env` as `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT=mailto:` followed by your email.
3. Redeploy. Without the keys, reminders stay hidden everywhere.

## Not done or not checked yet

- A real notification on your Android phone (Done, Snooze) and on an installed iPhone.
- An automated browser test (e2e) for reminders.
- Plan pages do not show the bell; duplicating a task does not copy its subtasks' reminders.
