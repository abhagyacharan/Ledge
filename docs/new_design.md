# Ledge UI: design spec and build plan

The source of truth for how Ledge looks and behaves. It builds on `uploads/design.md` ("dashboard cards") and records the decisions made in `Ledge.dc.html`. If the two files disagree, this one wins.

---

## 1. Principles

1. **Capture in seconds.** One + button is on every screen. It opens one sheet, and the type (Task, Expense, Income, EMI or loan, Investment) is the first row of that sheet.
2. **Calm by default.** Neutral surfaces. Orange marks one highlight per screen, bars and the text caret. There are no badges or red dots asking for attention.
3. **State is written out.** Overdue, Paid, Scheduled, Delayed, Overspent and priority always show a word and an icon. Colour only repeats what the words say.
4. **Exact money.** All figures use IBM Plex Mono with tabular numbers and lakh grouping (`₹1,23,456`). Negative amounts use a true minus sign (`−₹3,642`) and also carry a word ("Overspent").
5. **Nothing is lost.** Deleting moves the item to Trash and shows an Undo toast for 6 seconds. Only Empty trash and deleting a list that still has tasks ask to confirm.

---

## 2. Tokens

Define these as CSS custom properties on `:root` / `[data-theme]`. The theme setting maps System to `prefers-color-scheme`.

| Token                  | Light                          | Dark                  | Use                                                        |
| ---------------------- | ------------------------------ | --------------------- | ---------------------------------------------------------- |
| `--desk`               | `#d8dbd5`                      | `#080a09`             | Area behind the app frame (desktop only)                   |
| `--canvas`             | `#eef0ec`                      | `#121514`             | Page background                                            |
| `--card`               | `#ffffff`                      | `#1d211f`             | Cards, sheets, popovers                                    |
| `--well`               | `#f4f4f2`                      | `#282d2a`             | Inputs, icon circles, unselected chips, hover              |
| `--track`              | `#dde1da`                      | `#282d2a`             | Bar tracks, quiet tiles, skeletons                         |
| `--raised`             | `#ffffff`                      | `#3b423e`             | Selected segment, active nav pill                          |
| `--edge`               | `#e6e7e3`                      | `#ffffff1a`           | 1px dividers and outlines                                  |
| `--ink`                | `#111214`                      | `#f2f4f1`             | Primary text, primary buttons                              |
| `--soft`               | `#5b5f66`                      | `#aeb4ae`             | Secondary text and icons (passes 4.5:1)                    |
| `--on-ink`             | `#ffffff`                      | `#111214`             | Text on `--ink`                                            |
| `--accent`             | `#f26b21`                      | `#f58445`             | Caret, bars, one highlight per screen. Never used for text |
| `--good` / `--good-bg` | `#166534` / `#dcfce7`          | `#86efac` / `#14532d` | Paid, saved, done                                          |
| `--bad` / `--bad-bg`   | `#b42318` / `#fee4e2`          | `#fca5a5` / `#7f1d1d` | Overdue, high priority, Overspent, errors                  |
| `--warn` / `--warn-bg` | `#92400e` / `#fef3c7`          | `#fcd34d` / `#713f12` | Delayed, medium priority                                   |
| `--tint`               | `rgba(0,0,0,.15)`              | `rgba(0,0,0,.35)`     | Overlay behind sheets and modals                           |
| `--shadow`             | `0 1px 2px rgba(17,18,20,.06)` | `none`                | Card lift (light mode only)                                |

**Type**

| Role                                   | Font                | Size and weight                                                            |
| -------------------------------------- | ------------------- | -------------------------------------------------------------------------- |
| Display (greeting, page title)         | Bricolage Grotesque | 44/1.05 · 600 on desktop, 32/1.1 · 600 on phone, −0.01 to −0.02em tracking |
| Section title                          | Bricolage Grotesque | 28 · 600                                                                   |
| Big number (amount input, card figure) | Bricolage Grotesque | 52 · 600 (input), 30 · 600 (card)                                          |
| Body / UI                              | Geist               | 15 · 500 (rows), 14 (desktop body), 13 (meta), 12 (labels)                 |
| Money, dates, keys, eyebrows           | IBM Plex Mono       | 14 · 500 (amounts), 11–12 · 500 (eyebrows, kbd)                            |

**Spacing, radius and size**

- Spacing scale: 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 40, 56, 96 (px).
- Radius: 999px for pills, chips, buttons and nav items · 24px for big cards and sheet tops · 16px for list cards, inputs and tiles · 14px for rows and fields · 12px for palette rows · 50% for avatars and icon circles.
- Touch targets: at least 44px. Primary buttons are 52px tall on phone and 44px on desktop. Chips are 44px. List rows are at least 52px (tasks) or 60px (entries).
- Icons: Lucide, 16px in nav, 18px in icon circles, 12–14px inline with meta text. No emoji.

---

## 3. Layout and navigation

**Phone (< 768px)**

- Page padding is 16px with a 60px top safe area. Content leaves 120px of bottom padding so it clears the bar.
- Floating bar (`LedgeTabBar`): a 64px pill holding Home, Tasks, Expenses and Journal, each with an icon and a short label. A separate 56px round + button sits on the right. When a sheet is open, the + turns into ×.
- There is no More tab and no Search tab. Search, Trash, Settings and any future module are rows or tiles on Home. A new module adds a row there and can optionally be pinned to the bar (at most 3 pins).
- Detail screens push a full page. Capture, pickers and filters rise as bottom sheets.

**Tablet (768–1199px)**: collapsible sidebar with a single content column.

**Desktop (≥ 1200px)**

- `LedgeSidebar`, 248px: brand, Home, a "Modules" label, then each module with a chevron. The active module expands to show its sub-pages (and Lists for Tasks). Search (Ctrl K), Trash and Settings sit at the bottom, followed by the profile row with a theme toggle.
- The active item is a `--raised` pill with a 1px `--edge` ring. Other items use `--track` on hover.
- Content is centred with a 760px reading width, or uses a list + detail split: an open task, entry or the journal's day facts appear in a right pane (about 420px). URLs stay the same as on phone (`/tasks/t/:id`).

---

## 4. Components

| Component                     | File                   | Spec                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sidebar                       | `LedgeSidebar.dc.html` | Prop `active` is a path like `tasks/today`. Rows are 36px tall (the desktop pointer exception). Counts are shown in mono `--soft`                                                                                                                                                                                                                                         |
| Tab bar                       | `LedgeTabBar.dc.html`  | Props `active`, `open`. The active tab gets a `--well` fill and weight 600                                                                                                                                                                                                                                                                                                |
| Task row                      | `LedgeTask.dc.html`    | 44px hit area for the check. The ring is 1.5px `--soft`; high priority makes it 2px `--bad`, medium 2px `--warn`; a repeat preview has a dashed ring. Done shows an `--ink` fill, a check and a struck-through title. Meta row: Overdue (icon + "Overdue: 2 days", `--bad`, 600), due, repeat, flag + priority word, subtasks "2/5", list. Optional grip for manual order |
| Money entry row               | `LedgeEntry.dc.html`   | 40px icon circle, name, meta "Category · Method · Need", mono amount on the right, optional status pill (Paid / Scheduled / Overdue / Delayed, each with an icon)                                                                                                                                                                                                         |
| Card                          | none                   | `--card`, 24px radius and 24px padding for hubs and summaries; 16px radius and 4–16px padding for grouped rows. Rows are separated by 1px `--edge`                                                                                                                                                                                                                        |
| Primary button                | none                   | `--ink` fill with `--on-ink` text, 600 weight, pill shape. Secondary: `--card` fill with a 1px `--edge` ring. Tertiary: text only                                                                                                                                                                                                                                         |
| Chip (single choice)          | none                   | 44px pill. Unselected: `--well`. Selected: `--ink` fill plus a check icon, so the selection doesn't rely on colour                                                                                                                                                                                                                                                        |
| Removable chip (parsed token) | none                   | 1px `--edge` outline, an icon, the label, and a 28px × button that reads "Remove date" to screen readers                                                                                                                                                                                                                                                                  |
| Segmented control             | none                   | `--well` track with 4px padding. The selected segment is `--raised` with a check. Tapping the selected segment again clears it (Need/Want, mood)                                                                                                                                                                                                                          |
| Bottom sheet                  | none                   | `--card`, 24px top radius, 36×4 grab handle, `--tint` overlay. Esc or a downward swipe closes it                                                                                                                                                                                                                                                                          |
| Command palette               | none                   | 16px radius modal. 56px search field, then grouped results (Go to, Actions, Search everything) in 44px rows. Matches are highlighted with weight 600 and a 2px `--accent` underline                                                                                                                                                                                       |
| Toast (undo)                  | none                   | `--ink` pill at the bottom (above the bar on phone), with the message and an Undo action. 6 seconds, paused on hover or focus. `aria-live="polite"`                                                                                                                                                                                                                       |
| Kbd                           | none                   | Plex Mono 11px, 5–6px radius, `--well` fill                                                                                                                                                                                                                                                                                                                               |
| Status pill                   | none                   | 20px tall, 11px weight 600, icon + word on a `*-bg` fill                                                                                                                                                                                                                                                                                                                  |
| Progress bar                  | none                   | 6px `--track` track with an `--ink` fill. Use `--accent` only for the screen's one highlight                                                                                                                                                                                                                                                                              |
| Skeleton                      | none                   | `--track` blocks at the real sizes, pulsing with `breathe` 1.6s. Respect `prefers-reduced-motion`                                                                                                                                                                                                                                                                         |

---

## 5. Patterns

**Capture sheet (+ / Q / T)**

- It opens on the type that fits where you are: Tasks opens Task, Expense Tracker opens Expense, Home opens the last type used.
- Money: the amount is focused first with a numeric keypad, then the item name. Category and payment method default to the last ones used. Need/Want can be cleared. The date defaults to today. Notes are collapsed. Buttons: "Save expense" and "Save and add another".
- Task: a free-text field with live parsing (`tomorrow`, `5pm`, `#list`, `p1–p3`). Each part it understands becomes a removable chip under "Understood as", and removing a chip puts those words back into the title. After saving, the sheet stays open and shows "Added X to List · Undo".

**Undo**: every destructive action shows a toast, and the item goes to Trash for 30 days.

**Period navigation (Expense Tracker)**: a pill with ‹ Nov 2026 › opens a picker containing a year stepper, a 12-month grid and a "Whole year" option. Narrowing to a single day shows a removable "13 Nov ×" chip next to the period, which is the obvious way back.

**Summary as a sum**: Inflows, then − EMIs & loans, then − Living expenses, then a double rule, then Net savings (or "Overspent" with `−₹`), then Savings rate ("—" when there is no income). Invested and "Left after investing" follow, then the change against the previous period, written as a word and an arrow icon.

**Annual cash flow**: paired bars per month (inflow vs outflow) with the selected month in bold. Bars link to their month. A "Show as table" toggle switches to a real `<table>` with a full-year total row. Both the breakdown and the cash flow have a PDF download.

**Journal page**: facts sit above the writing and fold into a one-line summary once writing starts, with a "Show facts" button to bring them back. Mood is a five-step segmented control (Rough, Low, Okay, Good, Great) that can be cleared. The writing area is a borderless textarea in 18/1.7 Geist, max 20,000 characters, with a counter after 18,000. Save status is shown top right: "Saving…", "Saved 7:10 am" (check icon) or "Not saved · Retry" (alert icon, `--bad`).

**Encouraging empty wording**: "No-spend day. Nothing went out. Nicely done." · "A rest day." · "All caught up."

**Errors**: shown inline next to the field or card, with an alert icon, a plain sentence and a Retry button. Sign-in errors never reveal whether an email exists ("That email and password don't match").

---

## 6. Accessibility checklist

- All text is 4.5:1 against its background. Never use `--accent` for text.
- Every state has a word and an icon. Priority uses a flag icon and a word as well as the ring colour.
- Targets are at least 44px on touch. Focus ring: `0 0 0 2px var(--canvas), 0 0 0 4px var(--ink)`.
- Keyboard: Ctrl/Cmd K, Q, T, /, ?, J/K, Enter, X, E, Esc, then G followed by I/T/U. Suppress single-key shortcuts while a text field has focus.
- Sheets and modals trap focus and return it to whatever opened them. Choice chips use `role="radiogroup"` and toasts use `aria-live`.

---

## 7. Implementation plan

**Phase 0: foundation (1–2 days)**

1. Add the tokens to `theme.css`, set up `[data-theme]` switching (System, Light, Dark) and self-host the three fonts.
2. Write `formatINR()` with `Intl.NumberFormat('en-IN')` and store amounts as integer paise. Write `formatDate()` for "13 Nov" and "5:00 pm" with Monday week start, using the user's timezone.
3. Install `lucide` icons.

**Phase 1: shell (2 days)** 4. App frame: sidebar at 1200px and wider, tab bar + FAB below that. Driven by a module registry (`{id, label, icon, routes, hint()}`) so new modules plug in. 5. Global systems: toast/undo queue, bottom sheet / modal primitive, command palette, shortcut manager, and a Trash service with soft delete (`deleted_at`).

**Phase 2: primitives (2–3 days)** 6. Button, Chip, Segmented, Input, Kbd, StatusPill, Progress, Skeleton, EmptyState, ErrorInline. 7. TaskRow and EntryRow, matching the `.dc.html` references.

**Phase 3: Home and capture (3 days)** 8. Home with live hints. CaptureSheet with the type switcher. Natural-language parser (chrono-node or similar, plus `#list` / `p1–3`) with removable chips.

**Phase 4: Tasks (5–7 days)** 9. Overview, Today, Upcoming (14 days, repeat previews), All, Completed (with day filter), and list pages (drag reorder, saved sort/group/filter settings per list). 10. Task detail: autosave with a 600ms debounce, its own URL, a split pane on desktop. Due date picker and repeat editor.

**Phase 5: Expense Tracker (5–7 days)** 11. Period model and picker, Summary maths (pure functions, unit tested), category breakdown that includes zero rows, annual cash flow chart and table. 12. Four entry areas with search, filter, sort and day narrowing. Mark-paid on EMIs and repeating EMIs (up to 60 months). PDF export generated on the server.

**Phase 6: Journal (3 days)** 13. Day page, day picker with entry markers (days with entries get a dot and their accessible label says "has entry"), fact aggregation endpoint, folding facts, mood, autosave status.

**Phase 7: app-wide (3–4 days)** 14. Search (grouped and highlighted), Trash (restore, delete forever, empty with confirm), Settings (preferences, exports, sign out everywhere, typed delete confirmation), and auth (sign in, sign up, rate limit, sign-ups closed).

**Phase 8: polish (2 days)** 15. Empty, loading and error states on every view. Dark mode QA. Keyboard and screen-reader pass. Reduced motion.

---

## 8. Screen inventory (`Ledge.dc.html`)

Each id is an anchor in the file (`Ledge.dc.html#2d`). Phone frames are 390×844; desktop frames are 1440×900. Every screen works in both themes through the Theme tweak; 1b and 4b are also pinned to dark.

**1. Home and capture**

- 1a Home, phone · 1b Home, dark, evening
- 1c Log a transaction sheet · 1d Quick add with parsed chips
- 1e Home, desktop · 1f Command palette and keyboard shortcuts

**2. Tasks**

- 2a Overview · 2b Today · 2c Upcoming, with repeat previews
- 2d Task detail · 2e Due date sheet · 2f Repeat sheet
- 2g Completed, filtered to one day from the Journal
- 2h List page with task detail pane, desktop
- 2i Empty, loading and error states

**3. Expense Tracker**

- 3a Summary · 3b Expenses · 3c EMIs & loans, with Mark paid
- 3d Period picker · 3e No-spend day, narrowed from the Journal
- 3f Summary, desktop, with annual cash flow chart and table
- 3g Expenses, desktop

**4. Journal**

- 4a Day page with facts · 4b Writing with facts folded, dark
- 4c Day picker with entry markers · 4d Journal, desktop
- 4e Autosave, quiet-day, loading and error states

**5. App-wide**

- 5a Search results · 5b Search initial and no-results states
- 5c Trash · 5d Sign in · 5e Sign-in errors (too many attempts, sign-ups closed)
- 5f Settings, desktop · 5g Sign in, desktop

Shared components live in `LedgeSidebar`, `LedgeTabBar`, `LedgeTask` and `LedgeEntry` (`.dc.html`). Open them alongside `Ledge.dc.html` while building the matching parts of the app.

**Not yet drawn:** Overview, Today, Upcoming and All tasks on desktop; the Income and Investments areas; the Settings and Trash phone layouts; the sign-up form. Build them from sections 4–5 of this file.
