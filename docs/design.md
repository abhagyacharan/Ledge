# Ledge design language: "dashboard cards"

Source: the dashboard screenshot O supplied on 2026-11-11 (finance dashboard: greeting, balance card, four stat tiles, income chart, spending limit, recent activities). This file turns it into rules so every screen of Ledge can use the same look. The expense **Summary** is the first screen built in it; the other expense tabs and the task screens follow later (see "Rollout").

Not a copy: Ledge keeps its own data, its own navigation (green spine sidebar, Phase 8) and its accessibility rules. Where the screenshot conflicts with WCAG AA (white text on bright orange, pale chart colours), the rules below darken it.

## 1. What the screenshot says

1. **A calm, light canvas of rounded white cards.** Everything sits in a card with large radius and generous padding. Nothing is boxed twice with hard borders; separation comes from space, a very soft edge and a light grey inner panel.
2. **Cards inside cards.** A white card holds a light-grey "tile" or "well" (chart area, wallet row, table header, search box). Grey on white is the main depth cue.
3. **One loud colour.** A warm orange, used for exactly one highlighted tile, the bars that matter and the progress bar. Everything else is near-black ink, greys and tiny pastel pills.
4. **Big numbers, small labels.** Figures are large and medium weight; labels are small and grey; context ("This month") is smaller and lighter.
5. **Pills carry change.** A tiny pastel pill with an arrow and a percentage says whether something went up or down (green up, red down), next to a muted "This month".
6. **Black and orange charts.** Bars are solid near-black with an orange diagonal-hatched segment. Legend squares sit top right. Grid lines are faint and dashed or hairline; axis labels are small and grey.
7. **Quiet tables.** Header row in a grey rounded band, rows separated by hairlines, status shown as a coloured dot plus a word, actions as an ellipsis. A search pill and a filter pill sit top right.
8. **Black primary buttons, white secondary buttons**, both pill-shaped.

## 2. Tokens

All colours live as CSS variables under the `.dash` scope in `src/app/globals.css` (so this look can be applied screen by screen without touching the rest of the app yet). Dark values are under `.dark .dash`. When the rollout reaches the whole app, these become the global tokens.

| Token                    | Light                  | Dark                   | Use                                                              |
| ------------------------ | ---------------------- | ---------------------- | ---------------------------------------------------------------- |
| `--dash-card`            | `#ffffff`              | `#1d211f`              | Card background                                                  |
| `--dash-well`            | `#f4f4f2`              | `#282d2a`              | Tiles, chart wells, table header bands                           |
| `--dash-edge`            | `#ececea`              | `#ffffff1a`            | The soft card edge (1px) and hairlines                           |
| `--dash-track`           | `#dde1da`              | `#282d2a`              | The track behind pill tabs and the period picker (on the canvas) |
| `--dash-lift`            | short dark shadow      | `0 1px 2px` black 30%  | Lifts the chosen pill off its track                              |
| `--dash-card-shadow`     | faint 1px shadow       | none                   | Keeps white cards distinct from the canvas in light mode         |
| `--dash-raised`          | `#ffffff`              | `#3b423e`              | The chosen pill of a segmented control (tabs, EMI status)        |
| `--dash-ink`             | `#111214`              | `#f2f4f1`              | Figures, headings, black bars, primary button                    |
| `--dash-ink-soft`        | `#5b5f66`              | `#aeb4ae`              | Labels, captions, axis text (AA on card and well)                |
| `--dash-accent`          | `#f26b21`              | `#f58445`              | Decorative orange: hatched bars, progress, dots                  |
| `--dash-accent-from/-to` | `#cc420b` to `#a63409` | same                   | Highlighted tile gradient (white text passes AA, 4.8+)           |
| `--dash-good` / `-bg`    | `#166534` on `#dcfce7` | `#86efac` on `#14532d` | Up-is-good pill                                                  |
| `--dash-bad` / `-bg`     | `#b42318` on `#fee4e2` | `#fca5a5` on `#7f1d1d` | Down-is-bad pill                                                 |

Radius: card 24px (`rounded-3xl`), tile 20px (`rounded-[20px]`), chart well 20px, pill and button full. Elevation: none, or a 1px edge. No heavy shadows.

Spacing: card padding 24px (20px on phones), gap between cards 16px, gap inside a card 16px, tile padding 20px.

## 3. Type

Uses the faces from Phase 8 (do not add a new one):

- **Figures** (tile numbers, balance): Bricolage Grotesque, 30 to 36px, weight 500 to 600, tabular numerals.
- **Card titles**: Geist 16px, weight 600, `--dash-ink`. Subtitle 13px `--dash-ink-soft`.
- **Labels and captions**: Geist 13px (labels) and 12px (captions), `--dash-ink-soft`.
- **Table figures and dates**: IBM Plex Mono 13px, right aligned, tabular.
- **Column heads**: Geist 12px, weight 500, `--dash-ink-soft`, sentence case (not the shouting capitals of Phase 8, which belong to the old look).

## 4. Components (in `src/components/dash/`)

| Component    | What it is                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DashCard`   | White card: optional title, subtitle and right-side action, then content. Renders a labelled `<section>` with an `<h3>`.                                                                                                                                                                                                                                                                           |
| `StatTile`   | A grey well tile: label top left, icon in a white circle top right, big figure, a delta pill with muted context, optional extra lines. `highlight` makes it the orange gradient tile (white text, translucent white pill). Parent is a `<dl>`.                                                                                                                                                     |
| `DeltaPill`  | Arrow plus percentage. Colour says good or bad (it depends on the metric: more income is good, more spending is bad), the arrow says up or down, and screen-reader text says it in words. Never colour alone.                                                                                                                                                                                      |
| Chart well   | Grey well with legend top right, faint horizontal grid lines with small axis labels (compact money, e.g. `50k`), and bars. Bars are hidden from screen readers; the matching table is the accessible version.                                                                                                                                                                                      |
| Bars         | One bar per month with two rounded bars stacked inside it and a 2px gap, as in the screenshot: money in (solid `--dash-ink`, bottom) and money out, EMIs plus expenses (orange diagonal hatch `.dash-hatch`, top). At most 24px wide, 8px between bars; the total height is the sum, so it moves with both. Nothing sits behind a bar: the selected month is shown only by its month label in ink. |
| Table card   | A `DashCard` holding a table: header band in `--dash-well` with rounded ends, hairline row separators, figures in Plex Mono, a totals row with the double rule from Phase 8 (the one signature kept). Wraps in a focusable scroll region on narrow screens.                                                                                                                                        |
| Progress bar | Track in `--dash-well`, fill in `--dash-accent`, remaining part hatched, the percentage as text beside it (used in the breakdown).                                                                                                                                                                                                                                                                 |
| Buttons      | `DashButton` (`src/components/dash/dash-button.tsx`). Primary: pill, `--dash-ink` background, white text. Secondary: pill, white with an edge. Also `well`, `ghost` and `danger`. All press to scale 0.97; 44px tall on phones, 36px with a mouse.                                                                                                                                                 |
| Sheet        | `Sheet`, `SheetHeader`, `SheetBody`, `SheetFooter` (`sheet.tsx`, Base UI Drawer). Phones: bottom sheet, 24px top corners, grab handle, swipe down to close, keyboard aware, at most 92% of the screen. Mouse: a 28rem panel from the right. 400ms (phone) or 300ms (desktop) on `--ease-sheet`. It carries `.dash` itself because it is portalled.                                                 |
| Chips        | Filters and choices. Unselected: `--dash-well`; selected: `--dash-ink` with white text. In forms they are real radio buttons. A segmented variant (a well holding a white selected pill) is used for short exclusive sets such as EMI status.                                                                                                                                                      |
| Skeleton     | `.dash-skeleton`: a well-coloured block that breathes (opacity 1 to 0.55 over 1.6s). Skeletons copy the real layout's geometry (`src/modules/expenses/components/skeletons.tsx`).                                                                                                                                                                                                                  |

## 5. Layout of the expense Summary (first screen in this language)

Four blocks, two rows, on a 12-column grid at desktop width (`xl`), one column on phones and tablets:

```
+------------------------+--------------------------------------+
| 1. Four stat tiles     | 2. Annual cash flow (bar chart only) |
|    Income | EMIs       |    one stacked bar per month         |
|    Expenses | Savings* |                                      |
+------------------------+--------------------------------------+
| 3. Expense breakdown   | 4. Annual cash flow details (table,  |
|    (table, share bars) |    January to December + full year)  |
+------------------------+--------------------------------------+
  * Savings is the highlighted orange tile
```

Columns (of 12): every block is 6 wide, so each row is 50/50. The four tiles stretch to fill their card evenly (two rows of two). The chart stretches to the height of its row. This arrangement was tried the other way round (chart narrow, table wide) and O preferred this one. The period picker and the tab bar stay above, unchanged.

The four tiles: **Total inflows**, **Total EMIs & loans** (with paid, to pay and delayed lines), **Living expenses**, **Net savings** (highlighted; it also carries the savings rate, how much was invested and what is left after investing, so nothing from the old tiles is lost). Each tile shows a delta pill against the previous month (not shown in "Whole year" view, where there is nothing fair to compare to).

## 5b. Layout of the entry tabs (Income, EMIs & loans, Expenses, Investments)

Three blocks. Phones and tablets get one column in this order: overview, list, breakdown (so the list starts high). At `xl`: the overview (4 columns) above the breakdown (4 columns) on the left, and the list (8 columns) on the right spanning both rows.

- **Overview card:** "Spent in November 2026" (13px, soft), the total (Bricolage 34px; the digits roll when it changes), the entry count, and the Add button (full width on phones and in the side column, right-aligned between `sm` and `xl`).
- **List card:** a search pill (well) and a sort pill (white with an edge) on one row; category chips below, scrolling sideways with faded edges; then the rows. A row is a 40px icon circle (well), the name (14px medium) over one meta line (13px soft, truncated), and the amount (Plex Mono) on the right; EMI rows add a status pill under the amount. Rows are fully clickable (they open the sheet); on `md+` a ghost `⋯` appears on hover or focus. Expenses group by day with the day's total. Rows fold in and out over 220ms on `--ease-snap`.
- **Breakdown card:** share rows (label, amount, percent, and a 6px flat orange bar grown with `scaleX`) or, for EMIs, the paid-so-far progress bar (orange fill, hatched rest) with paid, to-pay and delayed lines.

## 5c. The expense header and the Log a transaction button

- **Header:** the page title, then one row (from `lg`; stacked below) with the tabs on the left and the period on the right.
- **Tabs:** a well-coloured pill track holding five links. The chosen one is a `--dash-raised` pill with a hairline shadow that slides to the next tab (spring, 350ms, no bounce). 44px tall on phones, 36px with a mouse. On a phone the track scrolls sideways and keeps the chosen tab centred.
- **Period:** one well pill: round previous and next buttons around a button showing a calendar icon, the period ("November 2026") and a chevron. It opens a 19.5rem card: year stepper, a 3 by 4 grid of short month names (chosen month filled ink; an orange dot marks the current month), then Whole year and This month.
- **Log a transaction:** a 56px ink circle bottom right (52px with a mouse), clear of the phone's home bar. It opens a menu above itself (scaling from the button): a small "Log a transaction" label, then Income, Expense, EMI or loan and Investment, each a 40px icon circle with the name and a one-line hint. The plus rotates into a cross while the menu is open. Choosing opens the add sheet for that kind.
- **Summary chart:** on screens from `md` each month is a button; pointing or keyboard focus shows a dark tooltip (month, in, out, net) above the bar and fades the other months to 35%; clicking opens that month. On phones the chart is a picture only.

## 5d. Phone rules (below `sm`, 640px)

- Cards: 14px radius (`rounded-2xl`), 16px side padding, 20px top and bottom. No grey tiles inside cards on a phone.
- Summary figures: a statement of rows. Row = label (14px, soft) on the left; change pill then figure (Bricolage 17px) on the right; everything on one centre line; 14px above and below; a hairline under each row. Net savings is the last row as an orange band with 12px corners and 14px side padding. Supporting lines are hidden.
- Tabs: five equal icon-only cells (Lucide line icons at 18px, stroke 1.75) filling the track; the chosen one is the raised pill.
- Chart: 12px padding and 12px corners for the well, 4px bar gaps, one-letter month labels below 440px.

## 5e. App shell (navigation and the + button)

- **Sidebar (tablet and up):** the soft grey canvas with a hairline right edge. The brand, then one section per module from the registry: Expense Tracker, then Tasks. Each section is a row (icon and name) with a chevron that shows or hides its views; it opens itself when you are inside it. Tasks also shows "Lists" with a + and each list (emoji or icon). At the bottom: Search, Trash, Settings, then the account (initial in an ink circle, name, email, theme button) and Sign out. The current page is a white raised pill with a hairline ring, the same mark as the pill tabs (`NavRow`).
- **Bottom tab bar (phones):** a solid bar (no blur) with Expense Tracker, Tasks and More; each tab is an icon over a 11px label, the current one has its icon in a raised pill. More opens a sheet with Search tasks, Trash, Settings, the lists, the account, the theme and Sign out. The bar respects the home indicator.
- **The + button:** a 56px ink circle (52px with a mouse), bottom right, 76px up on phones so it clears the tab bar. Log a transaction on Expense Tracker pages, Add a task elsewhere. The plus turns into a cross while its menu or form is open.
- **Dialogs:** 16px corners and a soft shadow on desktop; on phones every dialog is a bottom sheet (24px top corners, slides up on the sheet curve, at most 92% of the screen).

## 5f. Tasks

- **Header:** "Tasks", then one row with the pill tabs (Overview, Today, Upcoming, All tasks, Completed; icons only on phones) and, on the right, a well pill holding the Lists picker (popover: each list, a check on the current one, New list) and Search.
- **Overview:** four figures in the stat tiles (Due today is the orange one; phones show them as statement rows), then two columns from `lg`: Today and Coming up (7 cols), Lists with progress and This week bars (5 cols).
- **Views and lists:** each is one card (`TaskPanel`) with group headings (`TaskGroup`: label left, count right, Overdue in red with its word) and an inline "Add a task" row at the bottom. A list page starts with a header card: emoji in a well, the name (Bricolage 24px), description, goal date and a done/total bar, with the options menu.
- **Task row:** a 20px round checkbox in a 44px target (ring red for high priority, amber for medium), the title (15px on phones, 14px on desktop) and one 12px line: due (red with "Overdue:" when late), repeat, priority, subtasks, list. No dividers; a soft grey under the pointer. In manual order a grip appears on hover (always on touch).

## 5g. Sign in and sign up

- Wide screens: the cover panel on the left is always the dark green-black (`#121514`, light text, green kicker). The right side is a grainy gradient: five soft blobs (three orange, two green) at random places over a green-to-orange wash at a random angle, blurred, with fine monochrome grain on top. It is generated on the server for each visit, so no two loads match. The form sits on a solid white card (24px corners, deep soft shadow).
- Phones: the gradient fills the screen behind the card; the brand moves to the top of the card.

## 6. Accessibility rules that override the screenshot

- Text on the orange tile must pass 4.5 to 1: use the darker gradient above, never the bright `#f26b21` behind text. The bright orange is for fills that carry no text.
- Pills, deltas, status and "selected" must not rely on colour: arrow and words always, sr-only phrases for screen readers.
- Charts are `aria-hidden` and always have the table next to them.
- Tap targets are at least 44px on phones; scroll regions are focusable.
- Both themes are first-class; every token has a dark value, and the axe audit runs on both.

## 7. Rollout

1. **Expense Summary** (this change): `DashCard`, `StatTile`, `DeltaPill`, chart and table restyle, scoped `.dash` tokens.
2. Other expense tabs (Income, EMIs & loans, Expenses, Investments), the expense header and the Log a transaction button: **done 2026-11-11** (§5c) (§5b): overview, list and breakdown cards, chips, the sheet, skeletons.
3. Task screens and the app shell: **done 2026-11-11** (§5e, §5f). The dashboard tokens are now the global tokens, the paper-and-ledger palette is retired, and O chose a light sidebar instead of the green spine.
4. Each step ships with the axe and phone-width checks passing in light and dark.

## 9. Motion

- Two curves: `--ease-snap` (`cubic-bezier(0.23, 1, 0.32, 1)`) for UI and `--ease-sheet` (`cubic-bezier(0.32, 0.72, 0, 1)`) for sheets. Never ease-in.
- Press feedback 150ms; chips and colours 150ms; rows 220ms; sheets 300 to 400ms; bars 500ms, with transforms only.
- What moves: the sheet, rows being added or removed, the tab underline sliding, totals rolling, and the dim of a view while the next period loads (after 150ms, so fast loads never blink). Nothing else animates, and keyboard actions never animate.
- `prefers-reduced-motion` turns every transition off (global rule in `globals.css`; NumberFlow honours it too).

## 8. Do and do not

- **Icons, never colour emojis.** Anything that would be an emoji (list icons, decorations) is a minimal black-and-white line icon from Lucide at stroke 1.75 to 1.85. Lists choose from `src/modules/todos/list-icons.ts`. (O, 2026-11-11.)
- Light mode needs its own care: things on the canvas (tracks, cards) use `--dash-track`, `--dash-lift` and `--dash-card-shadow`, never a well colour that matches the canvas.

- Do keep one highlighted orange tile per screen at most.
- Do use cards inside cards sparingly: white card, grey well, nothing deeper.
- Do let numbers be the biggest thing in a card.
- Do not add gradients, shadows or glassy effects beyond the highlighted tile.
- Do not use orange for text on white (contrast). Use ink, with orange only as a dot, bar or fill.
- Do not mix this look with the old ledger look inside one card.
