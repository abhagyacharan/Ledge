# Claude Design prompt: Plans module (screens 8a to 8l)

Paste everything below the line into Claude Design, in the same project as `Ledge.dc.html` so it can reuse `LedgeSidebar`, `LedgeTabBar` and `LedgeTask`. Attach `docs/new_design.md` and `docs/plans-module-spec.md` if the project doesn't have them.

---

Design a new module for Ledge, my personal life app. It's called **Plans**, and it turns a goal into a plan of tasks. It has to look like it was always part of Ledge: use the existing design in `Ledge.dc.html` and the rules in `new_design.md` exactly. Don't invent a new style.

## The Ledge look (keep all of this)

- **Calm and neutral.**
  - Canvas `#eef0ec`, cards `#ffffff`, wells `#f4f4f2`, tracks `#dde1da`, edges `#e6e7e3`.
  - Ink `#111214` and soft `#5b5f66` for text.
  - Dark theme: canvas `#121514`, card `#1d211f`, well `#282d2a`, ink `#f2f4f1`.
- **One orange (`#f26b21`)**, and only for one highlight per screen, progress bars, the caret, done ticks and focus rings. Never orange text on white.
- **Type:**
  - Bricolage Grotesque 600 for page titles (32 on phone, 44 on desktop) and big figures.
  - Geist for body text and UI (15/500 rows, 13 meta, 12 labels).
  - IBM Plex Mono for dates, counts, keys, eyebrows and money.
- **Shapes:**
  - pills (999px) for buttons, chips and nav;
  - 24px radius for big cards and sheet tops, 16px for list cards and inputs, 14px for rows;
  - 1px edges, and a very soft shadow in light mode only.
- **Icons:** Lucide line icons only. No emoji, no illustrations, no gradients, no glass.
- **Buttons:**
  - primary is an ink pill with white text, 52px tall on phone;
  - secondary is a white card pill with a 1px edge;
  - single-choice chips are 44px, `--well` when unselected and an ink fill with a check icon when selected.
- **Words, not just colour:** state is always written out (Overdue, Draft, Done, High) with an icon. Copy is in sentence case, short and plain.
- **Touch targets** are at least 44px.
- **Layouts:**
  - Phone frames are 390×844, with a 60px top safe area and the floating 64px pill tab bar (Home, Tasks, Expenses, Journal) with the round + button on its right.
  - Desktop frames are 1440×900, with the 248px `LedgeSidebar` and a centred 760px column or a list-plus-detail split with a right pane of about 420px.
- **Motion:** quiet, 150 to 200ms.

## What Plans does

I type a goal in my own words, for example: "I want to start freelancing. I'm a beginner and have no idea what to do. People say it's more about sales than skills."

1. Ledge asks two fixed basics: plan length, and time I can give it.
2. It asks 3 to 6 questions written for my goal, one per screen.
3. It may ask up to 3 follow-ups.
4. It makes a plan: phases, tasks with dates, priorities, notes, subtasks and time estimates, one repeating practice task, milestones, and suggested resources.
5. I review the plan card by card, keeping or cutting each task, then add it.

The plan is saved and stays in a Plans home with its progress. Its tasks are ordinary Ledge tasks, so they also show in Today and Upcoming.

Use this sample data throughout:

- **Plan "Start freelancing":** 1 month, 30 min a day, 4 of 18 done, 24 days left.
- **Phases:**
  - Week 1 · Your offer
  - Week 2 · Portfolio
  - Weeks 3–4 · Outreach
- **Tasks:**
  - "Pick one offer you can sell" (Mon 24 Nov, High, about 45 min, 2 subtasks);
  - "Set your starter prices";
  - "Build two sample sites" (3 subtasks);
  - "Send 3 pitches every weekday" (repeats every weekday until 21 Dec);
  - milestone "Land a first paid client" (Sun 21 Dec).
- **Other plans:** "Photography" (8 of 12, 5 days left), a draft "Run a 5k" (question 3 of 5), and a done plan "Learn Spanish basics".

## Screens to draw (ids 8a to 8l, anchors in the file)

**8a Plans home, phone.**

- Title "Plans" and a "+ New plan" pill.
- Filter chips: Active, Drafts, Done, Archived.
- Draft cards come first, with a dashed edge, "Draft · question 3 of 5" and a Continue button.
- Each plan card has a progress ring (the screen's one orange), the title, "4 of 18 · 24 days left" in mono, and "Next: Write your pitch".
- At the bottom, a quiet line: "AI this month: 9 requests · about $0.01".

**8b Plans home, desktop.**

- Plans appears in the sidebar after Journal and is active.
- The same content as 8a in a two-column card grid.

**8c New plan, step 1: goal.**

- A large borderless text area ("What do you want to do?") with a character count.
- Three example chips under it.
- A small "Hold + to speak" hint.
- Primary button "Next". A thin progress bar at the top.

**8d Step 2: basics.**

- Two groups of 44px chips:
  - Plan length: 1 week, 2 weeks, 1 month, 3 months, Pick a date;
  - Time you can give it: 15 min a day, 30 min, 1 hour, 2+ hours, Weekends only.
- Back and Next.

**8e Step 3: questions, one per screen.** Show the four question kinds as four phone frames side by side. Each has "Question 2 of 5" in mono, the progress bar, Back, Skip, Next, and a "Type my own" row.

- One choice: "What kind of websites?" with SaaS, E-commerce, Landing pages, Portfolios.
- Several choices, with checks.
- A 1 to 5 scale: "How good are you at web design?", labelled "Never tried" and "For a living".
- Short text: "Anything you've tried or want to avoid?"

**8f Step 4: follow-ups.**

- One question with a small eyebrow, "Because you said sales feels hard": "Have you ever pitched to a client?"

**8g Making your plan.**

- A calm loading state: "Shaping a 1-month plan around 30 minutes a day".
- Skeleton cards at their real sizes.
- No spinner and no fun illustration.
- Also show the error version: an alert icon, "Ledge couldn't make a plan right now. Your answers are kept." and Try again.

**8h Review, card by card, phone.** This is the most important screen.

- **Top:**
  - the editable plan title;
  - one summary line ("Four weeks: your offer first, then outreach every weekday");
  - the phases as a strip of chips, with the current phase selected.
- **The card**, large and centred:
  - title, phase, date, priority (word + icon), repeat;
  - "about 45 min" in mono;
  - two or three lines of how-to notes;
  - subtasks as small unticked rows.
- **Counter:** "Card 4 of 18 · 3 cut" in mono.
- **Under the card, three pills:** Cut (←), Edit (e), Keep (→).
- **Bottom:** a "Cut (3)" tray chip that opens the cut cards to bring back.
- **Gesture states:** show a second frame mid-swipe left, with the card tilted slightly and a "Cut" word appearing, and a third frame mid-swipe right showing "Keep".
- **The last frame:** the summary, "15 tasks over 4 weeks, 2 repeating", a primary "Add plan" button, and an Options fold containing "Put the tasks in another list".

**8i Review, desktop, list view.**

- A segmented control switches between Cards and List.
- Tasks are grouped by phase, one line each (ring, title, date in mono, priority).
- One row is open in place for editing, and another shows a hover remove button.
- "+ Add a task" sits at the end of each phase.
- On the right, a sticky panel with the summary, the counts and "Add plan" with its Ctrl+Enter key hint.
- Keyboard hints (← → x e) are shown as Kbd chips.

**8j A plan's page, phone.**

- **Header:** title, an Active status pill, a progress bar (orange), "4 of 18 done · 24 days left", and a ⋯ menu.
- **Phases** as sections of `LedgeTask` rows, some done.
- **"Add more tasks" card:** "Ledge suggests next steps from what you've done."
- **Resources:** rows with a kind icon (Book, Course, Video channel, Community, Tool), the name, a one-line reason and a "Search" pill. There are no fake links, so show no URLs.
- **"What you told Ledge":** a fold with the goal and the questions and answers.
- **At the bottom:** "AI used for this plan: 4 requests · 9,800 tokens · about $0.004 (₹0.30)".

**8k A plan's page, desktop.**

- The plan page in the centre column.
- The open task's detail in the right pane, as on Tasks screen 2h.

**8l Plan menus and states.** Draw four phone states:

- **The ⋯ menu as a bottom sheet:** Rename, Reschedule, Archive, Delete.
- **The Reschedule sheet:** "Move every open task by [n] days" or "Spread to a new end date".
- **The Delete confirmation:** a checkbox "Also move its 15 tasks to Trash", checked.
- **Empty and done:**
  - the Plans home empty state: "Plan a goal and Ledge turns it into tasks." with New plan;
  - a done plan's header with a Done pill and "Finished 21 Dec".

## Also

- **Settings, AI usage card** (desktop and phone):
  - this month and last month;
  - requests and tokens by feature (Voice, Planner) in a small table with mono numbers;
  - an estimated cost in $ and ₹;
  - the note "On Groq's free plan you're not charged. This is what it would cost on the paid plan."
- **Home:** add a Plans tile on phone Home and one live hint, "Freelancing · 4 of 18 done · next: Write your pitch".
- **Dark mode:** every screen works in both themes. Pin 8h and 8j to dark as extra frames.
- **Accessibility:** visible focus rings, a 44px minimum target, and state never shown by colour alone. Card review must work by keyboard (← → x e Enter) and by swipe, and with reduced motion the cards cross-fade instead of sliding.

When you're done, list any decision you made that isn't in this brief, so I can carry it into the spec.
