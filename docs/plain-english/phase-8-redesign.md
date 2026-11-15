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
- **Adding a task looks like logging a transaction.** The "Add a task" box used to pop up in the middle of the screen. It now slides in from the right (from the bottom on a phone), exactly like the panel for logging a transaction, with the "Add task" button fixed at the bottom of the panel.
- **Blur instead of dark.** When one of these side panels is open, the page behind it is now softly blurred with only a light tint, instead of being darkened. You can still see where you are, but it is clearly in the background.
- **No more jumping tabs in Tasks.** The Overview page was wider than Today, Upcoming, All tasks and Completed, so the row of tabs at the top moved sideways whenever you switched between them. Every Tasks page now has the same width, so the tabs stay exactly where they are. It is a comfortable column in the middle of the screen (at first it took the Overview's full width, which made the boxes too wide), with the round Search button at its right end.
- **A cleaner Journal header.** The Journal no longer has a Search button or the round + button (which added a task, not a journal entry). The day picker now sits on its own at the right. The round + button is also gone from Search, Settings and Trash, where adding a task does not belong; it stays on the Tasks pages and the welcome page, and pressing q still opens "Add a task" anywhere.
- **Lists can fold away.** In the side menu on a computer, the "Lists" heading under Tasks is now a button with a small arrow. Click it to hide or show your lists. The + for making a new list only appears while the lists are showing. Lists start open, and open by themselves when you go to one of them.
- **Search moved down on phones.** On a phone, Search used to be a round button at the top right of the Tasks and Expenses pages, out of reach of your thumb. It is now a tab in the bar at the bottom, and the top-right button only appears on tablets and computers. Search is no longer in the "More" sheet, so it is in one place only.

## Phone fixes (2026-11-13)

You tried the app on your phone and asked for these. All are done and checked on a phone-sized screen.

- **The keyboard no longer pops up by itself.** Before, opening "Add a task", an expense or income form, the new-list box or the Search page jumped straight to typing, and the keyboard covered half the screen. Now the form or page simply appears. Tap a box when you want to type. On a computer with a mouse nothing changed: the cursor still starts in the first box. Ledge decides this by asking whether the main way of pointing is a finger (a phone or tablet) or a mouse.
- **Blur behind the Log a transaction menu.** The page behind it now goes soft and a little darker, like when you open More. The menu and the round button stay sharp. The task details panel, the new-list box and the confirm boxes got the same stronger blur.
- **The Ledge mark replaces the More icon** on the phone's bottom bar: the L in light on dark or dark on light, with its orange line. The word under it still says More.
- **The app name in Settings.** Settings now starts with a card showing the Ledge logo and name and a one-line description.
- **A shorter "Nothing due today" box** on the Tasks overview on a phone.
- **Is the phone slower than the computer? Probably, and mostly for reasons that are not bugs.** On your computer the app and its database are on the same machine, so every tap is answered instantly. On your phone each tap travels to your home server and back, and many screens ask the server for fresh data every time. Phones also draw blur and shadows more slowly than a PC. One small saving was made: the settings are no longer fetched twice for the same page. A bigger saving was added at your OK: Ledge now remembers who you are for up to 5 minutes (in a locked, tamper-proof note kept in your browser), so most taps skip the sign-in check against the database. The catch: if you sign out on one device, another device can stay signed in for up to 5 minutes. Signing out on the same device is instant. The best way to find the real cause is to try the same tap over home Wi-Fi and over mobile data.

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

## The new Home page (2026-11-15)

You drew a new look for the whole app with Claude Design and wrote it up as a new design spec, now saved as [docs/new_design.md](../new_design.md) (draft; it becomes final later). The first screen built from it is **Home**.

- **Home is a real page now.** It shows today's date, a greeting that follows the time of day ("Good afternoon, Aditi"), and one sentence about your tasks, such as "Two tasks left today. One from Wednesday is still open." Under that are two buttons: **Add a task** opens quick add, and **Log a transaction** opens the expense form right there, without leaving Home.
- **One row per part of the app, with a live hint.** Tasks says how many are due today and, in red with a warning icon, how many are overdue. Expense Tracker says how much you have spent this month. Journal says "Not written today", or "Written today, 7:10 am" with a tick. A part of the app added later gets its own row automatically.
- **On a computer** the three parts are three cards with a big figure each, the buttons show their keys (Q and T), and a "Jump to anything" button opens the command palette (Ctrl K). Pressing T on Home logs a transaction.
- **The phone bar changed.** It now holds Home, Tasks, Expenses and Journal. The round + button sits next to the bar on the same line instead of floating above it, and it is there on every page (Expense pages log a transaction, everywhere else it adds a task). The Search and More tabs are gone: Search, Trash and Settings are three tiles at the bottom of Home, the round Search button at the top of the Tasks and Expenses pages now shows on phones too, and tapping your initial at the top of Home opens Settings.
- **Settings gained a Theme row**, because the light/dark switch used to live in the More sheet. Sign out is in Settings as before.
- **The side menu on a computer** now starts with Home, then a small "Modules" label above Tasks, Expense Tracker and Journal. Search shows its Ctrl K shortcut.

Checked: type checks, lint, formatting and all 471 unit and database tests (including new ones for the greeting and the task sentence). **Not checked yet:** how it looks in a browser. The development server that was already running had crashed, and I was not allowed to stop it, so the page has not been looked at on a phone-sized or computer screen. The browser tests (including the updated phone test) have not run either, because they start through pnpm, which this computer blocks.

## Tasks, Expense Tracker and Journal in the new look (2026-11-15)

**Tasks.** The Tasks page now opens with the view buttons as a row of rounded chips (Overview, Today with its count, Upcoming, All tasks, Completed), then three small figures (due today, overdue in red when there is any, done this week), a card of today's and overdue tasks, a strip of the next seven days with a count for each (tap a day to jump to it in Upcoming) and your lists with "done of total" and a bar. Today, Upcoming, All tasks and Completed each have a big title and, on a phone, a "‹ Tasks" link back. Each group is its own card. A late task now says "Overdue: 2 days" with a warning sign, and the list shows with a folder icon. Tasks you tick off today stay on the Today page, crossed out, so you can see what you did.

**A task's details** are now a tidy card of rows: List, Due, Time, Repeat and Priority (four buttons: None, Low, Medium, High). Subtasks and notes have their own cards, and at the bottom are **Duplicate** (new: a copy with its subtasks), **Move** and **Delete**. The due date picker has quick choices with the day they land on, a box where you can type "16 nov" or "next fri", a month calendar and a time. The repeat picker is a set of buttons (Daily, Weekdays, Weekly, Monthly, Yearly, Every N…), the weekdays as round buttons, whether the next date follows the schedule or counts from when you finish, and when it ends.

**Lists** show their icon, name and description, a progress card with an orange bar and the goal date, and the sort and filter choices as a row of chips that say what they are set to ("Sort: Manual"). Deleting a list that still has tasks now offers two ways: delete the list and its tasks, or move the tasks to General first. An empty list is deleted straight away, with Undo.

**Expense Tracker.** On a phone the Summary is written like a sum: money in, minus EMIs and loans, minus living expenses, a double line, then what you saved (or "Overspent") with the savings rate and how it changed from last month. Under that are two small figures for what you invested and what is left, then "Where it went" (every category with a bar), then the year's cash flow with a "Show as table" switch. On a computer the top is five figures in a row with savings in orange. The other areas (Income, EMIs and loans, Expenses, Investments) show their total under the title, a coloured bar of how it splits, and the list; unpaid EMIs have a black "Mark paid" button. Amounts that are whole rupees no longer show ".00". A day with no spending, opened from the Journal, says "No-spend day. Nothing went out. Nicely done."

**Journal.** The page no longer has a "Journal" title: the day with its arrows sits at the top, then "Today" or "Yesterday" with the save status ("Saved 9:48 pm", or "Not saved" with a Retry button). The day's facts are one card with a Fold button; once you start writing they fold into one line. Mood is five words (Rough, Low, Okay, Good, Great); tap the chosen one again to clear it. You write straight on the page, in bigger text, with no box around it. A counter appears near the 20,000-character limit.

Checked: type checks, lint, formatting and all 475 unit and database tests (4 new ones for Duplicate and for moving a list's tasks to General). I looked at every changed screen in a browser at phone and computer size. **Not checked:** the browser tests did not run (they start through pnpm, which this computer blocks); I updated several of them for the new wording without running them. **Not done yet** from the mockups: a task opening in a fixed side panel on a computer (it still slides in from the right), each month's savings inside the period picker, swiping rows, and the table layout of expense entries on a computer.

## Search, Trash, Settings and the rest (2026-11-15)

**Search** has the box at the top with a clear button and Cancel (back to Home). Results come in two cards, Tasks and Money, with chips to show only one kind. The words you searched for are bold and underlined in orange. If a task or entry matched only because of its notes, a short piece of the note is shown. Before you type, it lists your recent searches (kept only on that device). When nothing matches it says so and offers to open Trash.

**Trash** lists everything you deleted, newest first. Each row says what it is, where it came from, when you deleted it and the day it will be removed for good (in amber when that is less than a week away). Tap a row for Restore and Delete forever. "Empty trash" sits at the top right and asks first.

**Settings** has your name and email, then **Preferences**: light, dark or system theme, your time zone and whether the week starts on Monday or Sunday. Currency and number style are shown but can't be changed yet, because changing them would mislabel amounts you already entered. **Reports and your data** has the two PDF reports for any month and two new downloads: **everything** as one JSON file (tasks, lists, money, journal, settings) and your **tasks as a spreadsheet** (CSV). **Security** has **Sign out everywhere** (signs out every phone and computer, this one included; others notice within 5 minutes) and **Delete account**, which only turns on after you type "delete my ledge" and then erases everything, skipping Trash. On a computer a small list on the left jumps between the sections.

**Signing in.** If you try too many times, the page now tells you the time you can try again and keeps the button off until then. A wrong password says "That email and password don't match", without saying whether the email exists. While you create a password, a line shows how many characters you have so far and turns green with a tick at 10. When new accounts are switched off, the sign-up page says so with a lock and a button back to sign in.

**Tasks on a computer.** The Overview has a date and week line, an "Add a task" field (press Q), four figures (including the next 7 days), a two-week grid showing each day's tasks, repeating tasks and EMI payments, and a "Done this week" card. A task you open now sits in a panel beside the list instead of covering it, and its row stays highlighted; choosing another row swaps it. **All tasks** is a table (task, list, due, details, priority) with a quick filter by title.

**Income and Investments on a phone.** Income shows how it changed from last month, each category with its amount and share, and a line naming the categories with nothing this month. Investments shows two small figures (net savings and what is left after investing), a bar split by type, and buttons to filter by type.

Checked: type checks, lint, formatting and all 485 unit and database tests (new ones for the search highlighting, the spreadsheet file and time zones). I looked at each changed screen in a browser. **Not checked:** the browser tests did not run (pnpm is blocked on this computer); a few were updated for the new wording without running.

## Going through the whole app (2026-11-15)

I went through every screen on a phone, a tablet and a computer, in light and dark, and fixed what felt uneven.

- **One way to add things.** The round + and the buttons on Home now open the same sheet everywhere. Its first row lets you pick what you are adding: a task, an expense, income, an EMI or loan, or an investment. Switching between them is one tap, from any page. On the Expense Tracker the + opens straight onto the kind of the page you are on (Income on the Income page, and so on); the small menu it used to show first is gone. The sheet remembers the category and payment method you used last, and has "Save and add another".
- **Quick add is simpler.** One box: type "pay rent tomorrow 5pm #home p1" and it shows what it understood as small chips you can remove. The other fields are under "More options". After you add a task, the sheet says "Added … to Home" with an Undo button, right there.
- **Messages at the bottom** (like "Completed" with Undo) are now a dark rounded strip in the middle, above the bar on a phone, and stay for 6 seconds.
- **Trash on a computer** is a table with Restore and Delete forever on every row, and chips to show only tasks, lists or money. Restoring now tells you where the item went, with a View button. A task whose list is also in Trash used to come back invisible; now it goes to General.
- **The way back always makes sense.** If you open a day's spending from the Journal, the back link says "Journal, 10 Nov", and "Log for this day" starts the entry on that day.
- **Ctrl K** opens a bigger, clearer list of places and actions, with "Search everything" for what you typed.
- **Loading placeholders** now have the same shapes as the new screens, so nothing jumps when a page arrives.

Checked: type checks, lint, formatting and all 486 unit and database tests (one new one for restoring into General, which found the bug above). **Not checked:** the browser tests did not run (pnpm is blocked on this computer); I updated them for the new sheet, palette and messages without running them.

## A little orange (2026-11-15)

The app was almost all black, white and grey. Now the orange from the logo shows up in a few small places, about a twentieth of what you see, so it feels like Ledge without getting loud:

- The round **+** button is orange on a computer or tablet. On a phone it stays white (dark in dark mode), like the bar of tabs beside it.
- On a computer, the icon of the page you are on is orange in the sidebar. On a phone, the bottom bar does not use orange: the tab you are on shows a solid (filled-in) version of its icon, and the others show outlines.
- Ticking a task fills its circle orange.
- The blinking text cursor, highlighted text and the outline that shows where the keyboard is (the "focus ring") are orange.
- Underlined links have an orange underline.
- **Undo** in the messages at the bottom is orange.
- On the Expense Tracker summary, the double line above Net savings is orange, like the line under the L in the logo.
- In Ctrl K the highlighted row's icon is orange, and on Home a section's round icon turns orange when you point at it.

Orange is never used for text on a white background, because it is too pale to read there. Checked: type checks, lint, formatting and all 486 unit and database tests; looked at on a phone and a computer, light and dark. **Not checked:** the browser tests (pnpm is blocked on this computer).

## The expense sheet, tidied (2026-11-15)

- After you tap "6 more" to see every category, a **Show less** button at the end folds the list back.
- The ways you paid (UPI, cash, cards and so on) sit in **one row you swipe sideways**, under the heading "Paid with".
- **Need or want** and the **day** now sit side by side on one line. The day shows as "Today, 13 Nov"; tap it to pick another day from your phone's calendar. Tap Need or Want again to clear it, since it is optional.

Only the expense sheet changed; income, EMIs and investments keep their date box with the Today and Yesterday buttons. Checked on a phone in light and dark. The browser tests were updated for the new "Paid with" heading but not run (pnpm is blocked on this computer).

## Adding a task: two buttons (2026-11-15)

The Add a task sheet now ends like the expense sheet, with two buttons. **Save task** adds it and closes the sheet; a message at the bottom says where it went, with Undo. **Save and add another** adds it and leaves the sheet open for the next one. Pressing Enter in the box still works like Save and add another.
