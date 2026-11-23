# Claude Design prompt: Settings redesign (screens 9a to 9p)

**Built 2026-11-23** from the screens O made with this brief, with O's changes: no tab bar on Settings on a phone, the Google button under the email form and black, the public-page link in the top right corner of desktop sign-in, and no "Unlock with my account password" switch. Details: `docs/decisions.md`, "Settings redesign".

Paste everything below the line into Claude Design, in the same project as `Ledge.dc.html`, so it can reuse `LedgeSidebar`, `LedgeTabBar` and the existing cards. Attach `docs/new_design.md` if the project doesn't have it. Once the screens are final, they get built from this file and the canvas.

---

Redesign the **Settings** area of Ledge, my personal life app. Today it's one long page of cards, with a small section nav at the top that only scrolls you down it. It feels clunky. You have to hunt for things, unrelated controls sit side by side, and the Journal lock lives on a separate page that feels bolted on.

I also need room for two new things:

- **Sign in with Google**, which is being added.
- **An optional profile picture.**

Use the existing design in `Ledge.dc.html` and the rules in `new_design.md` exactly. Don't invent a new style.

## The Ledge look (keep all of this)

- **Calm and neutral.**
  - Canvas `#eef0ec`, cards `#ffffff`, wells `#f4f4f2`, tracks `#dde1da`, edges `#e6e7e3`.
  - Ink `#111214`, and soft `#5b5f66` for secondary text.
  - Dark theme: canvas `#121514`, card `#1d211f`, well `#282d2a`, ink `#f2f4f1`.
  - Bad (destructive) uses the existing red tokens with a pale red background chip.
- **One orange (`#f26b21`).** Use it for one highlight per screen, focus rings, the caret, done ticks and progress. Never orange text on white. Settings should be quieter than anywhere else in the app.
- **Type:**
  - Bricolage Grotesque 600 for page titles (32 on phone, 44 on desktop).
  - Geist for body text and UI: 15/500 for rows, 13 for meta and helper lines, 12 for group labels.
  - IBM Plex Mono for dates, counts, version numbers, money and the rupee rate.
- **Shapes:**
  - Pills (999px) for buttons, chips and the nav.
  - A 24px radius for big cards and sheet tops, 16px for inputs and list cards, 14px for rows.
  - 1px edges, and a very soft shadow in light mode only.
- **Icons:** Lucide line icons only. No emoji, no illustrations, no gradients, no glass.
- **Buttons:**
  - Primary is an ink pill with white text, 52px tall on a phone.
  - Secondary is a card pill with a 1px edge.
  - Destructive is red text, or a red pill only on the final confirm.
- **Controls:**
  - Switches are 48×28, with an ink track when on and a grey track when off. Each one has a written "On" or "Off" beside it.
  - Single-choice rows show a small ink circle with a check when chosen. The Theme selector has no tick: the chosen option is the filled one.
- **State in words:** every state is written out (Connected, Not set, On, Saved, Couldn't save), never shown by colour alone.
- **Copy:** sentence case, short and plain.
- **Touch targets:** at least 44px.
- **Frames:**
  - Phone: 390×844, with a 60px top safe area and the floating 64px pill tab bar (Home, Tasks, Expenses, Journal) with the round + button to its right.
  - Desktop: 1440×900, with the 248px `LedgeSidebar`.
- **Motion:** quiet, 150 to 200ms. Panels cross-fade; they don't slide in from far away.

## The new structure

Settings becomes **one place with separate sections**. You see one section at a time instead of one long scroll.

**Desktop:**

- Next to the app sidebar sits a settings column, about 240px wide, with the title "Settings" and a vertical list of sections. Each section has an icon and a label.
- The chosen section is highlighted as a well-coloured pill. Its content shows in a centred column of about 640px to the right.
- Each section has its own address (for example `/settings/account`), so the back button and links work.
- `/settings` itself opens Account.

**Phone:**

- `/settings` is a settings home with the sections as grouped rows, iOS-style but in the Ledge look.
- At the top, a profile card shows the photo or initials, the name and the email. Tapping it opens Account.
- Each row has an icon, a label, a short live summary on the right ("System", "On", "Google and password", "₹84 this month") and a chevron.
- Tapping a row opens that section as its own screen, with a "‹ Settings" back link above a 32px title.

**Sections, in this order and in three groups:**

| Group      | Section            | Holds                                                                                                    |
| ---------- | ------------------ | -------------------------------------------------------------------------------------------------------- |
| You        | Account            | Photo, name, email                                                                                       |
| You        | Sign-in & security | Sign-in methods (Google, password), devices, sign out everywhere                                         |
| App        | Appearance & time  | Theme (System, Light, Dark), timezone, week starts on, currency and locale (shown, fixed for now)        |
| App        | Voice & AI         | Voice capture switch with its privacy line, languages I speak, write titles in, AI usage, the rupee rate |
| App        | Journal lock       | Everything from today's separate Journal lock page, now a normal section                                 |
| App        | Tasks              | Archived lists (restore or delete), and a link to Trash                                                  |
| Your data  | Reports & export   | Expense breakdown PDF, Cash flow PDF (with a month pill), Export everything (JSON), Export tasks (CSV)   |
| Your data  | Delete account     | Kept on its own, at the bottom, in red                                                                   |
| (no group) | About              | Version, a short line about Ledge, the link to the public page; a small footer row, not a card           |

On a phone, Sign out is a plain full-width row at the very bottom of the settings home. On desktop it sits at the bottom of the settings column.

## Sample data (use it throughout)

- **Name:** Sam Rao
- **Email:** sam@example.com
- **Initials fallback:** "SR" on the well colour
- **Google account:** sam@example.com, connected 12 Nov 2026
- **Timezone:** Asia/Kolkata (IST)
- **Week starts on:** Monday
- **Currency:** INR, locale en-IN
- **Voice:** On. Languages: English, Hindi, Telugu. Write titles in English.
- **AI usage this month:** 142 voice requests, 6 plans made, about ₹84 (rate ₹84.20 per US dollar)
- **Journal lock:** On, 4-digit PIN, "Lock again: when I leave the Journal"
- **Devices:**
  - This device: Chrome on Windows, active now
  - Pixel 8: Ledge app, 2 hours ago
  - Safari on iPad: 5 days ago
- **Archived lists:**
  - "Wedding prep" (14 tasks)
  - "Old reading list" (3 tasks)

## Profile picture (new)

The picture is optional. Without one, everyone sees initials on the well colour, as today. The same avatar appears in the sidebar account row, the phone settings home and Account.

In Account, the avatar is 96px and has a small "Edit" pill. The pill opens a menu with:

- **Upload a photo** (JPEG, PNG or WebP, up to 5 MB).
- **Use my Google photo** (only when Google is connected).
- **Remove photo** (only when there is one), with an Undo toast.

Choosing a file opens a **crop sheet**:

- A square crop with a circular preview mask.
- A zoom slider.
- Drag to move the picture.
- "Save photo" (primary) and "Cancel".

Show these states:

- Uploading, with the avatar dimmed and a thin progress ring.
- Saved.
- Too large, as an inline error under the avatar: "That photo is over 5 MB. Try a smaller one."
- Wrong type.

## Sign-in & security (new, the most important section)

An account can sign in with **Google**, a **password**, or **both**. Design all three cases.

**Sign-in methods card.** One row per method, each with an icon, a name, a status line and an action.

- **Google**
  - Connected: "Connected as sam@example.com", with a "Disconnect" button.
  - Not connected: "Not connected", with a "Connect Google" button.
- **Password**
  - Set: "Set · last changed 3 Nov 2026", with "Change password".
  - Not set (a Google-only account): "Not set", with "Set a password".
- A one-line helper under the card: "You need at least one way to sign in. Ledge never sees your Google password."

**Rules the design must show:**

- **You can't remove your last method.** When Google is the only one, Disconnect is disabled. A line beside it explains why and links to "Set a password first".
- **A Google-only account needs a password for some features.** The Journal lock and unlocking the journal with your account password both need one. Wherever those appear, show a calm notice: "You signed up with Google, so this account has no password yet. The lock needs one in case you forget the PIN." Add a "Set a password" link.
- **Connect Google can fail.** Design an inline error for when that Google account already belongs to another Ledge account: "That Google account is already used by another Ledge account."

**Sheets to design** (right side on desktop, bottom sheet on a phone):

- **Set a password:** new password and confirm, the 10-character minimum shown as a live check, and "Set password".
- **Change password:** current, new and confirm, plus a "Sign out other devices" checkbox, on by default.
- **Disconnect Google:** a confirm stating which account, and that you'll sign in with your password from now on.

**Devices card:**

- One row per active sign-in, with a device or browser icon, a name, a place-free description ("Chrome on Windows") and last active time in mono.
- "This device" gets a chip.
- Every other row has a "Sign out" button.
- Under the list, a "Sign out everywhere else" secondary button.
- A small note: "Other devices notice within 5 minutes."

## Delete account

Delete account gets its own section.

1. It starts with a short plain list of what goes: tasks, lists, money entries, journal pages, plans, photo. It also suggests "Export everything first", with a link to the export.
2. The confirm asks you to type **delete my ledge**.
3. Then it confirms who you are:
   - With a password, you enter it.
   - A Google-only account gets "Confirm with Google" instead, which re-checks the Google sign-in.
4. The final button is a red pill: "Delete my account forever".

Design both the password and the Google-only versions.

## Saving and feedback

- **Everything autosaves; there is no Save button,** except in sheets.
- A changed row shows a small "Saved" with a check in mono for about 2 seconds, right-aligned in that row, then it fades.
- A failure shows "Couldn't save. Try again." inline in red, and the control goes back to its old value.
- **Loading:** each section has a skeleton of its own rows (grey well bars at the real row heights, with no layout shift).
- **Empty states:**
  - Archived lists: "No archived lists. Lists you archive wait here."
  - Devices with only this one: "Only this device is signed in."

## Screens to produce

Phone in light, unless marked otherwise.

| #   | Screen                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------- |
| 9a  | Phone settings home (profile card, grouped rows with live summaries, Sign out row); also in dark              |
| 9b  | Desktop Settings, Account section open (settings column + content); also in dark                              |
| 9c  | Account on phone: avatar with initials, name field, email (read-only, with "Signed in with Google" when true) |
| 9d  | Photo menu and crop sheet (phone), plus the uploading and too-large states                                    |
| 9e  | Desktop Sign-in & security, with **both** methods connected, and the devices list                             |
| 9f  | Sign-in & security, **Google only** (password Not set, Disconnect disabled with its reason); phone            |
| 9g  | Sign-in & security, **password only** (Connect Google), plus the "already used" error; phone                  |
| 9h  | Set a password sheet and Change password sheet (desktop right sheet)                                          |
| 9i  | Disconnect Google confirm (phone bottom sheet)                                                                |
| 9j  | Appearance & time (theme without a tick, timezone picker, week start, fixed currency and locale); desktop     |
| 9k  | Voice & AI (switch, language chips, titles language, AI usage card, rupee rate field); phone                  |
| 9l  | Journal lock as a section: on, Change PIN, Lock again choices; plus the Google-only "set a password" notice   |
| 9m  | Tasks (archived lists with Restore and Delete; empty state) and Reports & export; desktop                     |
| 9n  | Delete account: password version and Google-only version (phone)                                              |
| 9o  | Saving feedback (Saved, Couldn't save) and a section skeleton                                                 |
| 9p  | Sign-in page with "Continue with Google" above the email form, and sign-up the same; phone and desktop        |

## Don't

- Don't use tabs across the top on desktop. Use the settings column.
- Don't show the long single page or any "jump to" links.
- Don't add settings that aren't listed above: no notifications, no language of the app, no billing, no teams.
- Don't show Google's own branded button styling beyond the standard "G" mark. The button stays a Ledge secondary pill with that mark.
