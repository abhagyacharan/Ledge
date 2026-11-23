# The new Settings (23 November 2026)

You drew a new Settings in Claude Design (screens 9a to 9p) and asked for it to be built, with three changes of your own. This page explains what changed, why, and what was not checked. The technical notes are in `docs/decisions.md` (23 November 2026, "Settings redesign") and the brief you gave Claude Design is in `docs/settings-design-prompt.md`.

## Why it changed

The old Settings was one long page of cards. You had to scroll and hunt, unrelated switches sat side by side, and the Journal lock lived on a separate page that felt bolted on. There was also no room for two new things: signing in with Google, and a profile picture.

## How it is laid out now

Settings now shows **one section at a time**. Each section has its own web address, so the Back button and links work.

- **On a computer**, a column beside the main sidebar lists the sections in three groups. The chosen one is highlighted. Clicking Settings opens **Account** first. About and Sign out sit at the bottom of the column.
- **On a phone**, Settings opens a **settings home**: a card with your photo (or initials), name and email at the top, then the sections as rows. Each row shows a short live summary on the right, such as "Google and password", "System", "₹84 this month" or "Off". Tapping a row opens that section as its own screen, with "‹ Settings" to go back.
- **No tab bar on Settings on a phone** (your change). The floating bar and the round + button are hidden on every Settings screen. The settings home has "‹ Home" at the top to leave.

The sections:

| Group     | Section            | What it holds                                                                          |
| --------- | ------------------ | -------------------------------------------------------------------------------------- |
| You       | Account            | Your photo, your name, your email                                                      |
| You       | Sign-in & security | How you sign in (Google, password), the devices signed in                              |
| App       | Appearance & time  | Light, dark or system theme, your time zone, the first day of the week                 |
| App       | Voice & AI         | The voice switch, the languages you speak, AI usage and the rupee rate                 |
| App       | Journal lock       | Everything that used to be on its own page                                             |
| App       | Tasks              | Archived lists (bring back or delete), and the way to Trash                            |
| Your data | Reports & export   | The two money PDFs for a month you pick, and the two exports so you can leave any time |
| Your data | Delete account     | Kept on its own, in red                                                                |
| (none)    | About              | Ledge's version, one line about it, and a link to the public page                      |

## Saving

There is no Save button except inside the slide-up sheets. When you change something, it saves by itself and a small **"Saved"** with a tick shows in that row for about 2 seconds. If saving fails, the control goes back to how it was and **"Couldn't save"** appears with **Try again**.

While a section loads, grey bars sit where its rows will be, at the same heights, so nothing jumps when the content arrives.

## Account and the profile picture

- The picture is **optional**. Without one you see your initials, as before. The same picture shows in Settings and in the sidebar.
- **Edit** under the picture offers **Upload a photo** (JPEG, PNG or WebP, up to 5 MB), **Use my Google photo** (only when Google is connected), and **Remove photo** (only when there is one; it has an Undo).
- After you pick a photo, a **crop sheet** opens: a square with a round preview. Drag to move the photo, use the slider or the + and − buttons to zoom, then **Save photo**.
- **Where it is kept:** in the database, as you chose. Before sending, your browser cuts the square and shrinks it to 256 by 256 pixels, so each photo is only a few tens of kilobytes. Keeping it in the database means the nightly backup and a restore carry it with everything else, with no new folder on the server.
- **Safety:** the server looks at the photo's first few bytes to check it really is a picture, whatever the file is called. Only you can load your own photo. Pages never load anything from Google: "Use my Google photo" copies the picture once, on the server.
- After **Remove photo**, the picture is kept for 10 minutes so Undo can bring it back, then the regular hourly clean-up erases it.
- Your **name** saves when you leave the field. Your **email** is shown but can't be changed here, because you sign in with it. It looks like a label, not a field, with a small lock.

## Sign-in & security

- **Sign-in methods** shows one row each for **Google** and **Password**, with the state in words and one button:
  - Google: "Connected as …" with **Disconnect**, or "Not connected" with **Connect Google**. Connecting only works with a Google account that has the same email. If that Google account already belongs to another Ledge account, a red line says so.
  - Password: "Set · last changed …" with **Change password**, or "Not set" with **Set a password**.
- **You can't remove your last way in.** If Google is your only way to sign in, Disconnect is greyed out, with the reason under it and a link to set a password first.
- **Change password** (new): your current password, the new one twice, and **Sign out other devices**, ticked by default. Before, the only way was Forgot password? on the sign-in page.
- **Disconnect Google** asks you to confirm in a sheet, then you sign in with your email and password from then on. It has no Undo: undoing it would mean keeping Google's keys around after you asked to remove them.
- **Devices** lists every place you're signed in, named by browser and system ("Chrome on Windows"), never by location. Your current device has a "This device" label. Each other device has **Sign out**, and **Sign out everywhere else** ends all the others while keeping you signed in here. Other devices notice within 5 minutes. With only one device, the page says "Only this device is signed in."
- **"Last active" is approximate.** Ledge only learns that a device was used when its sign-in is refreshed, which happens about once a day of use.

## Journal lock

Everything from the old Journal lock page is now a normal section: the switch, the PIN length with **Change PIN**, and when it locks again. Your design had a switch called "Unlock with my account password". **It was left out, as you chose**: turned off, a forgotten PIN would lock the journal for good. The section says instead that the account password always unlocks it. If your account was made with Google and has no password yet, a calm note explains that the lock needs one and links to Sign-in & security.

## Delete account

The section lists what goes (tasks, lists, money entries, journal pages, plans, photo) and suggests **Export everything first**. Then:

1. Type **delete my ledge**.
2. Prove it's you: your **password**, or, for an account made with Google and no password, **Confirm with Google**. That sends you to Google to sign in again and back here; it counts for 10 minutes.
3. The red **Delete my account forever** button turns on.

Before, only the typed phrase was needed. Now someone who finds your phone unlocked can't delete everything without your password.

## Sign in and Create account (your changes)

- The **Google button now sits under the email form**, after a thin "or" line, instead of above it.
- It is **black** with Google's four-colour G, like most apps: **Continue with Google** on Sign in, **Sign up with Google** on Create account.
- The titles are now "Sign in to Ledge" and "Create your account", and the link under the card reads "New to Ledge? Create an account".
- **"See what Ledge does"**, the link to the public page, now sits in the **top right corner** of the right-hand side on a computer, like a website's menu link. That keeps it apart from "New to Ledge? Create an account" inside the card. On a phone it stays under the card.

## What was checked, and what was not

- **Automatic tests:** typecheck and lint are clean, and all 779 automatic tests pass. That includes new tests for device sign-outs (you can't sign out someone else's device or your own current one), Disconnect Google refusing when it's your only way in, Delete account needing the right password or a fresh Google sign-in, photos being checked by their bytes, and removed photos waiting for Undo before being erased.
- **Checked by hand in the browser** with a throwaway account (deleted afterwards): sign-in and sign-up on a computer and a phone; the Settings column and each section on a computer in light mode; the settings home, Account, Sign-in & security and Delete account on a phone in dark mode, with no tab bar, no + button and nothing wider than the screen; uploading, cropping, removing and undoing a photo; renaming; changing the password (a wrong current password is refused); the "already used" Google message; a switch showing "Saved"; and deleting the account (a wrong password is refused).
- **Not checked:** a real Google sign-in, Connect Google, Use my Google photo and Confirm with Google (they need your Google client values); a real phone; and the browser-clicking tests (Playwright), which were updated for the new Settings but not run.
