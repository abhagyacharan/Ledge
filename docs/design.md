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

| Token                    | Light                  | Dark                   | Use                                                    |
| ------------------------ | ---------------------- | ---------------------- | ------------------------------------------------------ |
| `--dash-card`            | `#ffffff`              | `#1d211f`              | Card background                                        |
| `--dash-well`            | `#f4f4f2`              | `#282d2a`              | Tiles, chart wells, table header bands                 |
| `--dash-edge`            | `#ececea`              | `#ffffff1a`            | The soft card edge (1px) and hairlines                 |
| `--dash-ink`             | `#111214`              | `#f2f4f1`              | Figures, headings, black bars, primary button          |
| `--dash-ink-soft`        | `#5b5f66`              | `#aeb4ae`              | Labels, captions, axis text (AA on card and well)      |
| `--dash-accent`          | `#f26b21`              | `#f58445`              | Decorative orange: hatched bars, progress, dots        |
| `--dash-accent-from/-to` | `#cc420b` to `#a63409` | same                   | Highlighted tile gradient (white text passes AA, 4.8+) |
| `--dash-good` / `-bg`    | `#166534` on `#dcfce7` | `#86efac` on `#14532d` | Up-is-good pill                                        |
| `--dash-bad` / `-bg`     | `#b42318` on `#fee4e2` | `#fca5a5` on `#7f1d1d` | Down-is-bad pill                                       |

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

| Component    | What it is                                                                                                                                                                                                                                                                                                                              |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DashCard`   | White card: optional title, subtitle and right-side action, then content. Renders a labelled `<section>` with an `<h3>`.                                                                                                                                                                                                                |
| `StatTile`   | A grey well tile: label top left, icon in a white circle top right, big figure, a delta pill with muted context, optional extra lines. `highlight` makes it the orange gradient tile (white text, translucent white pill). Parent is a `<dl>`.                                                                                          |
| `DeltaPill`  | Arrow plus percentage. Colour says good or bad (it depends on the metric: more income is good, more spending is bad), the arrow says up or down, and screen-reader text says it in words. Never colour alone.                                                                                                                           |
| Chart well   | Grey well with legend top right, faint horizontal grid lines with small axis labels (compact money, e.g. `50k`), and bars. Bars are hidden from screen readers; the matching table is the accessible version.                                                                                                                           |
| Bars         | One bar per month with two bars stacked inside it, as in the screenshot: money in (solid `--dash-ink`, bottom) and money out, EMIs plus expenses (orange diagonal hatch `.dash-hatch`, top). The bar's height is the sum, so it moves with both. The selected month gets a slightly lighter well behind it plus its month label in ink. |
| Table card   | A `DashCard` holding a table: header band in `--dash-well` with rounded ends, hairline row separators, figures in Plex Mono, a totals row with the double rule from Phase 8 (the one signature kept). Wraps in a focusable scroll region on narrow screens.                                                                             |
| Progress bar | Track in `--dash-well`, fill in `--dash-accent`, remaining part hatched, the percentage as text beside it (used in the breakdown).                                                                                                                                                                                                      |
| Buttons      | Primary: pill, `--dash-ink` background, white text. Secondary: pill, white with an edge.                                                                                                                                                                                                                                                |

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

Columns (of 12): tiles 5 and chart 7 on the first row; breakdown 5 and details table 7 on the second. The chart stretches to the height of its row. This arrangement was tried the other way round (chart narrow, table wide) and O preferred this one. The period picker and the tab bar stay above, unchanged.

The four tiles: **Total inflows**, **Total EMIs & loans** (with paid, to pay and delayed lines), **Living expenses**, **Net savings** (highlighted; it also carries the savings rate, how much was invested and what is left after investing, so nothing from the old tiles is lost). Each tile shows a delta pill against the previous month (not shown in "Whole year" view, where there is nothing fair to compare to).

## 6. Accessibility rules that override the screenshot

- Text on the orange tile must pass 4.5 to 1: use the darker gradient above, never the bright `#f26b21` behind text. The bright orange is for fills that carry no text.
- Pills, deltas, status and "selected" must not rely on colour: arrow and words always, sr-only phrases for screen readers.
- Charts are `aria-hidden` and always have the table next to them.
- Tap targets are at least 44px on phones; scroll regions are focusable.
- Both themes are first-class; every token has a dark value, and the axe audit runs on both.

## 7. Rollout

1. **Expense Summary** (this change): `DashCard`, `StatTile`, `DeltaPill`, chart and table restyle, scoped `.dash` tokens.
2. Other expense tabs (Income, EMIs & loans, Expenses, Investments): entries tables as table cards, add buttons as black pills, filter and search as pills.
3. Task screens and the app shell: promote the `.dash` tokens to the global tokens, then retire the Phase 8 paper-and-ledger palette where it conflicts. The green spine sidebar stays unless O decides otherwise.
4. Each step ships with the axe and phone-width checks passing in light and dark.

## 8. Do and do not

- Do keep one highlighted orange tile per screen at most.
- Do use cards inside cards sparingly: white card, grey well, nothing deeper.
- Do let numbers be the biggest thing in a card.
- Do not add gradients, shadows or glassy effects beyond the highlighted tile.
- Do not use orange for text on white (contrast). Use ink, with orange only as a dot, bar or fill.
- Do not mix this look with the old ledger look inside one card.
