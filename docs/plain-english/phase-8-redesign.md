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

The same idea is the **logo**: the letter L standing on a double line. It was redrawn on 12 November 2026, after you chose it from four designs (option B, "the bottom line"):

- **What changed.** The old logo was drawn with thin strokes and was only a rough guide. The new one is built on a grid of 32 small squares. The stem of the L, both lines and both gaps are all exactly the same thickness, 4 squares. Because every edge falls on a square, the logo is sharp even at its smallest size: in a browser tab (16 pixels across) each line is exactly 2 pixels thick and nothing looks blurry. We checked this by drawing it and counting the pixels.
- **Where you see it.** In the side menu and on the sign-in page, the logo and the word "Ledge" are now drawn as one picture. The letters are the app's own heading font, turned into fixed shapes, so they always look the same. The L in the picture and the L in the word are the same height. The side-menu logo is sized so its lines are a whole number of pixels thick (3 pixels; 4 on the sign-in cover), which keeps it crisp.
- **The orange line, everywhere.** You asked for the version with the orange second line to be used everywhere, so it is: in the side menu, on the sign-in page, and in the browser tab and phone icons. The orange is part of the logo, so it is not counted as the one orange highlight each screen is allowed.
- **On a phone.** For a short while every phone page started with the logo at the top left. O found it took space without adding anything, so it was removed: phone pages now start with the page title. On the phone sign-in and sign-up pages, the logo now stands on its own above the form card: the app icon (a dark rounded square, the same picture as on your home screen) with "Ledge" written beside it (it was under it at first; O preferred them side by side). We chose a rounded square rather than a circle so it matches the home-screen icon.
- **Browser tab and phone icon.** The tab icon (the "favicon") is dark with an orange line on light browsers, and turns light (with a softer orange) when your browser is in dark mode, so it never disappears. Older browsers get a small dark square with the logo in it instead. If you add Ledge to an iPhone home screen, it shows the logo on the dark green-black, with the second line in orange.
- **The rules.** How to use the logo (space around it, smallest size, colours, what not to do) is written down in `docs/brand/usage.md`. All the logo files are in `public/brand/`.
- **Not done.** There is no install-as-an-app file (a "web app manifest") yet, so Android phones fall back to the iPhone icon or the tab icon when you add Ledge to the home screen.

## Screen by screen

- **Sign-in and sign-up.** On a computer, the left half is the "cover of the book": the logo, one sentence ("Your tasks and your money, in one book.") and a drawing of ruled lines ending in a double-underlined total. The right half is the form. On a phone, the cover shrinks to a slim green bar with the logo. The headings, labels, error messages and button words are exactly the same as before.
- **Side menu.** The dark green panel, the new logo, and a bright mint marker on the left edge of the page you are on.
- **To-do screens.** Bigger titles, the new colours, and priority colours that fit the palette: low is green, medium is a dark gold, high is red. (Priority is still also written in words, so colour is never the only clue.)
- **Expense screens.** The rainbow of tinted tiles (pink, green, orange, blue, purple) is gone. Tiles are calm paper cards; the one that matters, **Net savings**, is filled green (or red, with the word "Overspent", if you spent more than you earned). Table headings are small capitals in the mono font and amounts are right-aligned in columns. The chart uses the green for money in and the red for money out.
- **Everything else** (Trash, Settings, pop-up forms, the command box, the task panel) picks up the new colours automatically, because all colours now come from one list instead of being typed in many places.

## Where the colours live

All colours, the roundness of corners and the font names are set in one file, `src/app/globals.css`. To adjust the look later (for example a different green) you change a few values in that file and the whole app follows. This is what "design tokens" means (see the glossary).

## The second redesign: the whole app (2026-11-11)

After the Expense Tracker got its new look, you asked for the same care everywhere, and for the tasks part to be simpler. Before building, I asked you four questions; your answers decided what follows.

**The two main parts are now equal.** The side menu (on a computer or tablet) has two sections: **Expense Tracker** first, then **Tasks**. Each opens to show its pages; Tasks also shows your lists. Search, Trash and Settings sit at the bottom with your name. The menu is light now, matching the rest, instead of the dark green panel.

**On a phone there is a bar at the bottom**, like a native app: Expense Tracker, Tasks and More. More opens a sheet with Search, Trash, Settings, your lists, the light/dark switch and Sign out. The old menu button at the top is gone.

**One round + button.** It looks and sits the same everywhere (just above the bottom bar on a phone). On Expense Tracker pages it asks what you want to log; everywhere else it opens Add a task. On a phone, Add a task (and every other small form) slides up from the bottom.

**Inbox is gone; General and the Overview took its place.** Every task still has to live in a list, so the old Inbox list is now called **General** (your existing one was renamed automatically). The menu's first Tasks page is the **Overview**: how many tasks are due today, how many are late, how many are coming in the next 7 days and how many you finished this week; then what needs doing today, what is coming up, every list with a bar showing how much is done, and a small chart of tasks finished each day this week.

**Tags and sections were removed** (your choice), to keep things simple. Lists and priorities do the grouping now. Nothing was deleted from the database: the old tag and section records are just no longer used.

**Every Tasks page has the same top:** the word Tasks, the pages as pill tabs (Overview, Today, Upcoming, All tasks, Completed; icons on a phone), and on the right a **Lists** button that jumps to any list, and Search. Each page is one clean card; a list page starts with a card showing the list's emoji, name, goal date and a bar of how much is done. Rows no longer have lines between them, and the round tick box is red for high priority and amber for medium, so urgent things stand out before you read them.

What was checked: unit and database tests, the browser tests (including the accessibility inspector in light and dark on every page, the new menu, the More sheet and quick add, and the phone tap-size rules), and I looked at the Overview, a list, the More sheet and quick add on a phone-sized screen and a computer screen. Not checked: a real phone in your hand, and a real screen reader.

## Final touches before deployment (2026-11-11)

- **Light mode fixed.** In light mode the rounded bar behind the tabs was the same grey as the page, so the tabs looked like loose buttons. It now has its own darker shade, the chosen tab has a soft shadow that lifts it, and cards have a hairline edge and the faintest shadow, so everything stands out from the background. The light background now has a faint green tint, like a pale echo of the dark theme. Dark mode did not change.
- **Overview figures.** The four figures on the Tasks Overview (due today, overdue, next 7 days, done this week) are now four separate cards with bigger numbers and smaller corners, without the extra box and padding around them.
- **The Lists button next to Search is gone** from the Tasks pages. Your lists are in the side menu, the More sheet on a phone, and the Overview.
- **More space in the side menu**, so a selected item no longer touches the one next to it.
- **No colour emojis.** Lists now use simple black-and-white line icons (a house, a briefcase, a book and so on), chosen in the list form. Your existing lists were switched to matching icons automatically, and General has no special icon.
- **Search finds everything.** The search page (side menu, the More sheet on a phone, or the / key) now looks in your expense entries too: names, notes, lenders, platforms and categories. Tapping an entry opens its tab and month, already filtered to it.
- **A new sign-in page.** The left half is the dark cover; the right half is a soft, grainy blend of greens and oranges that is different every time you open the page, with the form on a white card on top. On a phone the colours fill the screen behind the card.

## Small changes (2026-11-12)

- **Simpler side menu.** "Expense Tracker" and "Tasks" in the side menu used to be two things side by side: the name (which opened the page) and a small arrow (which opened the list of pages under it). It was easy to hit the wrong one. Now the whole row is one button: click it once to show the pages under it, click again to hide them. It never takes you anywhere by itself; the pages under it (Summary, Overview and so on) do that. (For a short while, opening it also jumped to the first page. O tried it and preferred choosing the page himself, so that was undone.)
- **A place for the blog.** There was briefly a "Blog" item in the side menu and a Blog tab on a phone, between Tasks and Search, opening a page that said "Coming soon". Later the same day it was replaced by the Journal, which is real (see `phase-11-journal.md`). To make five tabs fit on a phone, the Expense Tracker tab is labelled "Expenses" there.
- **The pointing hand.** When the mouse is over anything you can click (a button, a menu item, a row that opens a form, the month arrows, the theme switch, Sign out), the cursor turns into a pointing hand, so you can tell at a glance what is clickable. The styling tool the app uses (Tailwind) shows a plain arrow on buttons by default; one rule now changes that for the whole app. Buttons that are switched off keep the arrow.
- **Calmer quick add.** The first box in "Add a task" now just says "What needs doing?". You can still type things like "tomorrow 5pm" or "p1" and the app still understands them; the hint simply no longer spells it out. When you pick a priority (None, Low, Medium, High), the white highlight now glides to your choice instead of jumping.
- **A clearer cover on the sign-in page.** On a computer, the dark left half of the sign-in page used to say "Private and self-hosted" and "Ledge runs on your own server". That is true for O today, but O wants other people to use Ledge one day, on his server, so for them it would not be "their own server". The left half now says what Ledge is: "The everyday ledger. One book for the things you keep track of." A line explains the name (from ledger, the book where you write things down so nothing slips). Underneath, where the faint lines of a page used to be, there is a short contents page, like the first page of a book: Tasks, Expense Tracker and Journal are marked Ready, and Reminders and Health are Later. (Blog was on the list at first; O replaced it with a journal, which was built the same day and is now Ready.) "Later" means planned, not promised. The short description browsers and search engines show for the site changed to match.
- **Lists have a home in Tasks on a phone.** Your lists used to sit inside the "More" sheet on a phone, mixed in with Trash, Settings and Sign out, which is not where you would look for them. Now every Tasks page on a phone has a "Lists" button at the top right. Tapping it opens a short menu with all your lists and "New list", and the page behind goes soft and blurry so the menu stands out; tap outside it to close it. When you are inside a list, the button tells screen readers which one ("Lists, now showing Work"). The More sheet now only has Trash, Settings, your account, the light/dark switch and Sign out. On a computer nothing changed: the lists stay in the side menu.
- **Tidier figures on a phone.** At the top of the Expense Summary and the Tasks overview there are four figures, one per row. The orange one used to be a smaller rounded box inside the card, and there was extra empty space under the last row. Now the four rows are exactly the same height and use the same text, and the orange row is simply coloured in from edge to edge: the last row (Net savings) on the Summary, the first row (Due today) on Tasks.
- **Summary figures as separate cards on a computer.** The four figures at the top left of the Expense Summary used to sit together inside one big box. Now each is a card of its own, still two by two, like the four figures on the Tasks overview.
- **Tasks comes first, and a welcome page.** The side menu and the phone tab bar now list Tasks first, then the Expense Tracker, then the Journal. After you sign in, you land on a short welcome page instead of going straight to Tasks. It says "Welcome back" with your first name and asks whether you want to add a task or update your expenses. The Tasks button takes you to the Tasks overview with the "Add a task" box already open; the Expenses button takes you to the Expense Summary with the "Log a transaction" menu already open. Either way you can start typing straight away.
- **Search moved down on phones.** On a phone, Search used to be a round button at the top right of the Tasks and Expenses pages, out of reach of your thumb. It is now a tab in the bar at the bottom, and the top-right button only appears on tablets and computers. Search is no longer in the "More" sheet, so it is in one place only.

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

Later tweaks to the Summary: both rows are split 50/50; the four tiles grow to fill their block evenly; the yearly table no longer has the Savings % column or the "Selected" label (the chosen month is still tinted, and screen readers are still told); and the share bars in the expense breakdown are one flat light orange.
