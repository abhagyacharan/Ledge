# Prompt for Claude Design: the Ledge site

Paste everything under the line into Claude Design. Attach `design-system.md`, both HTML files (`Ledge Site 1.html`, `Ledge Site 2.html`), and the screenshots listed at the end of this file.

Fill the three placeholders first: `[SIGN-IN URL]`, `[GITHUB URL]`, `[YOUR NAME / PORTFOLIO URL]`.

---

## Brief

Design one long, responsive landing page for **Ledge, the everyday ledger**: a personal app that keeps tasks, money and a daily journal in one calm place, and lets you add things by typing or by voice. It is a showcase page for a real, working product, so every mockup must look like the actual app (the screenshots I attached are the truth).

I already made two drafts with you: **Site 1** and **Site 2** (attached). This version is a merge of the best parts of both, plus changes. Follow `design-system.md` for every colour, font, size and radius. Desktop at 1440px and phone at 390px both need to be designed with care; the phone version is not an afterthought.

## What the product is (use these facts, invent nothing else)

- **Tasks**: lists (a list can be a goal with a target date), due dates and times, priority, repeats, subtasks, Today, Upcoming, an Overview. Quick add understands "pay rent tomorrow 5pm #home p1" and shows chips (Tomorrow, 5:00 pm, Home, High) before saving.
- **Expense Tracker**: income, EMIs and loans, expenses and investments. Monthly and yearly Summary with net savings and savings rate, category breakdown, annual cash flow, PDF reports. Each expense can be marked Need or Want. Rupees with lakh grouping.
- **Journal**: one private page per day. The top of the page already lists the day's facts from Tasks and Money ("3 done · General 2, Health 1", "₹640 spent · about your usual"); each fact opens that screen. Optional mood (Rough, Low, Okay, Good, Great). Autosaves. Can be locked with a PIN.
- **Voice capture**: hold the round + button for half a second, a ring fills, then speak hands-free and press Done. Ledge shows what it understood as cards (new list, new task, expense, EMI paid) with "guessed" marks on fields it filled in itself; you check them and tap "Add 3". One Undo removes everything that command added. Nothing is saved without your tap. Real examples: "Spent 500 on petrol today." · "Paid the bike loan EMI of 7,000 today." · "Create a list called Photography and add two tasks: take 5 photos of the sun, and click 10 photos of the moon today."
- **Everywhere**: Home page with a greeting and what needs you today, Ctrl K command palette, keyboard shortcuts, Undo for 6 seconds after any delete, Trash keeps items 30 days, export everything (JSON, CSV, PDF), light and dark mode, works one-handed on a phone and keyboard-first on a laptop.

Do not show: ratings, user counts, testimonials, pricing, "free plan", team features, or "AI-powered" badges. Do not lead with self-hosting.

## Page structure (in this order)

### 1. Nav and hero (from Site 1, upgraded)

Keep Site 1's nav exactly in spirit: logo left, frosted pill of links in the centre (How it works, Voice, FAQ), ink "Log in" pill right. Keep the soft photo-backed hero with the big centred headline, short lead, one primary CTA and the small line under it.

Changes:

- Headline uses the type variation from Site 2: Bricolage 700 with one word in Instrument Serif italic or one word on the orange highlighter bar. Keep "One calm place to run your day." or offer two alternatives in the same style.
- Primary CTA is Site 2's style: ink pill with the orange arrow circle. Label "Open Ledge" → `[SIGN-IN URL]`. Secondary: "See how it works" (scrolls).
- Eyebrow chip: "Tasks, money and a journal. One private place." (no self-hosting wording).
- **The phone is interactive and shows four real screens, not one fake one**: Home, Tasks (Today), Expenses (Summary), Journal (a day page). The phone's own tab bar works: tapping a tab switches the screen with a short cross-fade. It auto-advances every 4.5 seconds until the visitor interacts. Below or beside the phone, show four small labelled dots or pills so it is obvious there is more to see.
- The two floating cards beside the phone change with the screen: Tasks → "Quick add understood" chips card; Expenses → the November inflows / EMIs / expenses / net savings card; Journal → the mood row and "Saved 9:52 pm"; Home → a toast "₹640 logged · Undo".
- Phone width (390px): the phone mockup becomes the focus, about 300px wide, centred, with the screen switcher as a row of pills above it (swipe left and right also switches). Floating cards hide or tuck under the phone as one card.

### 2. The problem: Before and With Ledge (from Site 1, keep)

Keep the headline "Your life is in four places. None of them talk." (or similar) and the two side-by-side cards: **Before** (grey, tilted notification, broken spreadsheet with `#REF!`, abandoned notebook) and **With Ledge** (the journal page with facts, mood, a line of writing, "Saved"). Add a little orange: the eyebrow, and the arrow icons on the fact rows. Stack the two cards on phones, Before first.

### 3. How Ledge works (from Site 1, reworked)

Keep the dark rounded panel and, above all, **the square rounded feature boxes** with one piece of UI inside each. That is the part I like most. Make the section easier to follow:

- **One person, one day, four moments.** The steps follow a single Friday, so the same items reappear: what is added in step 1 is ticked in step 3, the ₹640 from step 2 shows in the journal facts in step 4. Each box gets a mono time as its eyebrow.
  1. **7:45 am · Add it in seconds.** Quick add with "pay rent tomorrow 5pm #home p1" and its chips, or the + button with the voice ring.
  2. **1:05 pm · Log it as you pay.** The amount sheet: ₹640, "Swiggy dinner", Dining and UPI chips, Want.
  3. **6:10 pm · Tick it off.** Today list with one task ticked and folding away, an overdue task saying "Overdue · 2 days" in words.
  4. **10:05 pm · The day adds itself up.** The journal page with the day's facts already filled in and one line written.
- Drop the "Make your account" step.
- Boxes are truly square (1:1) on desktop in a row of four, 28px radius; 2 × 2 on tablet; on phones a horizontal snap carousel with the step number visible, or a single column. Step numbers and times in orange.
- Short copy: a title of 3 to 5 words and one sentence each. Section subtitle: "Four moments. A few seconds each."

### 4. Say it, or type it (from Site 2, updated with voice)

Keep Site 2's black block with the copy on the left and the live demo card in the middle/right, and the serif-italic headline style. Update it so it covers both ways in:

- Headline: "Say it. Or _type_ it." (or "Type it the way you'd _say_ it." if that reads better with voice).
- A segmented switch on the demo card: **Speak** | **Type**.
  - **Speak** (default): the round + with the orange ring filling, "Listening…" with a level meter and a timer, then the transcript in grey ("Spent 500 on petrol today and paid the bike loan EMI") and the review cards: an Expense card (₹500, Petrol, Transportation, UPI, "guessed" mark on category) and an EMI-paid card (Bike loan, ₹7,000, Mark paid today). Footer: "Add 2" button and Cancel, then a toast "Added 1 expense and marked 1 EMI paid · Undo". Animate this as a short loop the visitor can replay; three example sentences as chips to try.
  - **Type**: Site 2's working quick-add parser with removable chips, as it is now.
- Left column: three short points: "Hold + for half a second", "Check the cards, then add", "One Undo takes it all back". Plus a line: "Nothing is saved until you tap Add."
- Phone: copy above, demo card below at full width.

### 5. In your pocket. At your desk. (from Site 2, toned down)

Keep the section, the headline and the layout of one large desktop screenshot plus one phone screenshot. **Tone the orange down**: use the deep orange gradient from the design system (`#cc420b` → `#a63409`) with cream text, inside a 40px rounded panel inset from the page edge, instead of flat bright orange. Also show a variant B on the peach wash (`#fde3d2`) with ink text so I can choose. Add three tiny facts under the screenshots in mono: "Ctrl K reaches everything" · "One thumb on a phone" · "Light and dark".

### 6. FAQ (from Site 1, keep)

Keep Site 1's separate white cards with the round icon button; when a question is open, its icon turns orange with a minus (from Site 2). Headline "Questions, answered." with Site 2's type variation. Questions:

1. Who is Ledge for?
2. Who can see my data? (only you; private by design)
3. Does voice capture listen all the time? (no: only after you hold +, audio is never stored, and nothing saves without your tap)
4. What if I delete something by mistake? (Undo for 6 seconds, Trash for 30 days)
5. Can I get my data out? (JSON, CSV, PDF)
6. Does it handle rupees properly? (lakh grouping, Indian dates, Monday weeks; changeable)
7. Can I lock my journal? (yes, an optional PIN)

### 7. Footer (Site 2's big wordmark + Site 1's curved dark panel)

Best of both:

- Use Site 1's dark panel with the large rounded top corners (40px), inset 12px from the sides.
- Inside it, at the **top**, replace the "Start tonight. Thank yourself tomorrow." headline with Site 2's giant "Ledge." wordmark (Bricolage 700, the full container width, orange full stop). It must sit **fully inside the panel, above the links, never clipped by or running under the bottom edge.**
- Under the wordmark: one line ("The everyday ledger.") and the CTA pair (Open Ledge, Log in).
- Then a thin divider and the footer row: logo tile, small columns of links (Product: Tasks, Expenses, Journal, Voice · Site: How it works, FAQ · Elsewhere: GitHub `[GITHUB URL]`, `[YOUR NAME / PORTFOLIO URL]`), and "© 2026 · Built by `[YOUR NAME]`".
- Do not reuse Site 1's footer content (the fake "Good evening, Aditi" card and the "Free to start" line).
- Phone: the wordmark still spans the width (about 28vw), links stack in two columns.

## Things to drop from both drafts

Site 1's "Why not a to-do app and a spreadsheet?" comparison and the screenshot strip; Site 2's ruled-paper background and red margin lines, the marquee, "Three books. One ledger.", "A day, added up." and "Built on four promises." (unless one of them is needed to explain the product, then ask me).

## Deliverables

1. The full page, desktop 1440px and phone 390px, light theme.
2. The dark-theme version of the hero and one feature section, to prove the tokens flip.
3. The hero phone and the voice demo working (clickable), even if the other mockups are static.
4. Section 5 in both orange variants.

Keep the HTML clean and token-based (CSS variables from `design-system.md`, no hard-coded colours), because I will rebuild the page by hand in Next.js afterwards.

---

## Screenshots to attach

**From the real app** (phone screenshots at 390px wide, desktop at 1440px, light mode unless noted). These are what Claude Design copies the mockups from:

1. Phone: Home (greeting, task sentence, the tiles).
2. Phone: Tasks → Today, with an overdue task, a task with subtasks and a ticked one.
3. Phone: Expense Tracker → Summary for a month (tiles, net savings, breakdown).
4. Phone: Journal day page with facts, mood and some writing.
5. Phone: quick add with "pay rent tomorrow 5pm #home p1" typed, chips showing.
6. Phone: the transaction sheet with an amount, category, paid-with and Need/Want.
7. Phone: voice sheet while listening (ring, level meter, timer).
8. Phone: voice review cards (an expense card and an EMI card) with the "Add 2" footer.
9. Phone: the Undo toast after adding.
10. Desktop: Expense Summary with the annual cash-flow chart.
11. Desktop: a Tasks list with the task detail pane open beside it.
12. One phone screen in dark mode (Home or Journal).

**From the drafts and the reference** (already saved in `docs/site designs/refs/`, desktop 1440px). Attach them with these one-line captions:

| File                                | Caption to give Claude Design                                                    |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `site1-01-hero.png`                 | Keep this nav and hero layout; the phone becomes four interactive screens        |
| `site1-02-before-with.png`          | Keep Before / With Ledge as is, with a little more orange                        |
| `site1-03-how-it-works.png`         | Keep the dark panel and square boxes; rework the steps into one day              |
| `site1-04-faq.png`                  | Keep this FAQ card style                                                         |
| `site1-05-footer.png`               | Keep this curved dark panel, not its content                                     |
| `site2-01-hero-type-variation.png`  | Use this headline type mix (Bricolage 700 + serif italic) and this CTA button    |
| `site2-02-type-it-block.png`        | Keep this black block; add the Speak / Type switch and the voice review cards    |
| `site2-03-pocket-desk.png`          | Keep this section, with deep orange or peach instead of bright orange            |
| `site2-04-footer.png`               | Move the giant "Ledge." up into the curved panel, replacing "Start tonight…"     |
| `backdoor-how-it-works-1.jpg`, `-2` | Reference: one story told across four boxes; copy the coherence, not the colours |
