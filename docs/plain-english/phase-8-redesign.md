# Phase 8: The redesign (a new look, the same app)

**Status:** Done on 2026-11-11.

## What this phase is for

Until now Ledge looked like the standard, plain grey starter style that many apps share. It worked well but it looked like nobody had chosen anything. You asked for a redesign using Anthropic's front-end design guidance, so this phase gives Ledge a look of its own.

**Nothing about how Ledge works was changed.** Same screens, same buttons, same words on the buttons, same shortcuts, same data. Only colours, fonts, spacing and a few shapes changed. That is also why the automatic tests could stay exactly as they were and still pass.

## The idea: an account book

Ledge's name sounds like "ledger", the book where accountants keep what comes in and what goes out. Your app keeps tasks and money together, so the look borrows from a well-kept account book:

- **Paper.** The page is a pale green-grey, like ledger paper, instead of white. (Not the cream colour many "designed" sites use.)
- **Ink.** Text is a very dark green-black rather than pure black. It is easier on the eyes.
- **Ledger green.** One calm green is the colour of buttons, links you can act on, and the highlighted tile. Having one action colour makes the screen easier to read.
- **Margin red.** Ledgers draw their margin in red. Here red is kept for things that need attention: overdue tasks, money going out, deleting. Because it is rare, it stands out when it appears.
- **The spine.** The side menu is a dark cloth-green panel, like the spine of a bound book, in both light and dark mode. It frames the page and makes it clear where you are.
- **Dark mode** is a deep ink-green night version with a mint accent.

## The fonts (three, each with one job)

A font is the style of the letters. Ledge now uses three:

- **Geist** for ordinary text (unchanged), because it is quiet and easy to read.
- **Bricolage Grotesque** for page titles and the big money figures on the summary. It has a little character, so titles feel chosen. It is used sparingly.
- **IBM Plex Mono** for money in tables, dates and the small capital-letter column heads. A "mono" font gives every digit the same width, so amounts line up in neat columns like a cash book.

## The signature: the double line

When an accountant writes the final total, they draw **one line above it and two lines under it**. It means "this is the bottom line". Ledge uses that mark, and only where it is true:

- under **Net savings** on the summary,
- under the totals at the bottom of the expense breakdown and the yearly table.

The same idea is the **logo**: the letter L standing on a double line. You will also see it in the browser tab.

## Screen by screen

- **Sign-in and sign-up.** On a computer, the left half is the "cover of the book": the logo, one sentence ("Your tasks and your money, in one book.") and a drawing of ruled lines ending in a double-underlined total. The right half is the form. On a phone, the cover shrinks to a slim green bar with the logo. The headings, labels, error messages and button words are exactly the same as before.
- **Side menu.** The dark green panel, the new logo, and a bright mint marker on the left edge of the page you are on.
- **To-do screens.** Bigger titles, the new colours, and priority colours that fit the palette: low is green, medium is a dark gold, high is red. (Priority is still also written in words, so colour is never the only clue.)
- **Expense screens.** The rainbow of tinted tiles (pink, green, orange, blue, purple) is gone. Tiles are calm paper cards; the one that matters, **Net savings**, is filled green (or red, with the word "Overspent", if you spent more than you earned). Table headings are small capitals in the mono font and amounts are right-aligned in columns. The chart uses the green for money in and the red for money out.
- **Everything else** (Trash, Settings, pop-up forms, the command box, the task panel) picks up the new colours automatically, because all colours now come from one list instead of being typed in many places.

## Where the colours live

All colours, the roundness of corners and the font names are set in one file, `src/app/globals.css`. To adjust the look later (for example a different green) you change a few values in that file and the whole app follows. This is what "design tokens" means (see the glossary).

## Decisions in plain words

- **One action colour.** Fewer colours means less to decode. Green means "act or good", red means "look here".
- **The side menu stays dark even in light mode.** It gives the app a strong frame and a clear "you are here" without adding decoration.
- **Fonts are downloaded when the app is built, not when you use it.** The finished app serves them itself, so it makes no request to Google while you use it. Building the app needs an internet connection.
- **The mark of the double line is used only for real totals,** so that it keeps its meaning.

## How you can see it working

1. Run `pnpm dev`, open `http://localhost:3000` and sign out to see the sign-in cover. Make the window narrow to see the phone version.
2. Open **Today**, then **Expenses**. Check both light and dark (change your computer's setting, or use the theme button in the side menu).
3. Look at the **Net savings** tile and the bottom rows of the two tables for the double line.
4. Run `pnpm test:e2e`: the accessibility inspector and the phone-size checks run on every screen in both themes.

## What was checked, and what was not

Checked:

- The accessibility inspector (colour contrast included) and the phone-size rules pass on every screen in light and dark, with the new colours, without changing the tests.
- I looked at the sign-in page (computer and phone sizes), Today and Expenses in the browser myself.

Not checked:

- This is a matter of taste. **Please look at it and tell me what you would change**: the green, the spine, the fonts and the sign-in cover are all easy to adjust.
- I did not redo a screen-reader pass or test on a real phone.
- Some less-visited screens (Settings, Trash, the task panel, pop-up forms) were checked by the automatic tests but not studied one by one for visual polish.

## Update 2026-11-11: the dashboard look, starting with the expense Summary

After the first redesign you sent a screenshot of a finance dashboard you liked (white rounded cards, grey tiles, black and orange bars) and asked for the expense Summary to look like it. This is the first screen in a **second design language**, written down in [docs/design.md](../design.md) so every other screen can follow later.

What the Summary looks like now: four blocks.

1. **Top left: four tiles.** Total inflows, Total EMIs & loans, Living expenses, and **Net savings as the one orange tile**. Each shows a small pill with how it changed **compared with last month** (for example "up 12.0%"). Green means a good change (more income, less spending) and red a bad one; the arrow and the words say up or down, so colour is never the only clue. The savings tile also holds the savings rate and the invested and left-after-investing amounts, so nothing from the old extra tiles was lost. In "Whole year" view there is no comparison pill, because there is nothing fair to compare to.
2. **Top right: the annual cash flow bar chart** (the chart only). Each month is one bar with two parts stacked inside it: black is money in, orange hatched is money out (EMIs and expenses), so the bar rises and falls with both. The corners are rounded and there is a thin gap between the two parts. with faint dashed grid lines and short money labels on the side (such as 40K). The chosen month is highlighted.
3. **Bottom left: expense breakdown by category**, as before, with orange hatched share bars.
4. **Bottom right: the January to December details table** with the full-year total.

On a phone the four blocks stack in one column. Light and dark both work. The orange is a deeper shade where white text sits on it, so the text stays readable (a rule from the accessibility check). The new colours are only used inside the Summary for now, so nothing else changed. The other expense tabs and the to-do screens will be moved to this look later, when you ask.

Checked: the accessibility inspector (including colour contrast) in light and dark, the phone-size rules, and all expense browser tests (updated for the new tiles). Not checked: how it looks on a real phone.
