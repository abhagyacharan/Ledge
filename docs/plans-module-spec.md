# Plans module spec (planner, second version)

Drafted for O on 2026-11-23. **Status: built 2026-11-23 as Phase 15** (web first; phone polish and the e2e run to come). The screens are in `docs/plans designs/plans-screens.dc.html`. It replaces the one-page planner at `/plan` (Phase 14, `docs/planner-spec.md`) with a full module. O asked for this on 2026-11-23: plans that stay, a history of them, deeper questions, better review UX, resources, and a view of what the AI costs.

## What changes, in one paragraph

Today a plan is a one-off: you go to `/plan`, answer a few questions, add the tasks, and the plan itself is forgotten. Only its tasks remain. In this version, **Plans** is a module like Tasks or Journal. It has its own sidebar entry and a home page listing every plan you have made, with each plan's progress. A plan keeps your goal, your answers, its phases, its resources and its tasks. You can come back to a plan, add more tasks to it, reschedule it, archive it or delete it. Making a plan takes a few more steps than today. The questions are better: you can tap one answer, tap several, or type your own, and Ledge can ask one round of follow-ups. You review the plan one card at a time with arrow keys or swipes, so you don't scroll through a long page.

## 1. Where it lives

- **Sidebar:** "Plans" (line icon `Target`), after Journal. It is a single page, so the sidebar shows it as one plain link.
- **Module registry:** a new entry in `src/config/modules.ts` with `id: "plans"`, `route: "/plans"`, owning `/plans/**`.
- **Phone:** the tab bar holds Home and three pinned modules (Tasks, Expenses, Journal). Plans gets a tile on Home and an entry in the command palette. Whether Plans should replace a tab is open question 2.
- **Home:** one live hint, for example "Freelancing · 4 of 18 done · next: Write your pitch".
- **Command palette:** "Plans", "New plan", and each active plan by name.
- **Tasks header:** the sparkle button now opens **New plan** (`/plans/new`).
- **`/plan`** redirects to `/plans/new`, so old links keep working.

## 2. Screens

### 2a. Plans home (`/plans`)

- **Header:** "Plans", and a **+ New plan** button (`n` on a keyboard).
- **One card per plan**, newest active first:
  - the title ("Start freelancing");
  - the goal, shortened to one line;
  - a progress ring (done of total);
  - the next open task;
  - time left ("12 days left", or "Ended 3 days ago");
  - a status chip: Active, Draft, Done or Archived.
- **Drafts** are plans you started but never added. They show first, with a **Continue** button, so a half-made plan is never lost.
- **Filter chips:** Active · Drafts · Done · Archived.
- **Empty state:** "Plan a goal and Ledge turns it into tasks." with **New plan**.
- **Skeleton:** shown while loading.

### 2b. New plan (`/plans/new`, then `/plans/[id]/setup` once the draft exists)

This is a full page, not a dialog. Every step shows a progress bar and has **Back**. Every answer is saved to the draft as you go, so leaving and coming back resumes where you were.

1. **Goal.** "What do you want to do?" is a large box (5 to 1,000 characters), for example "I want to start freelancing. I'm a beginner and have no idea what to do. People say it's more about sales than skills." Three example chips sit under it, and you can also hold + and speak.
2. **Basics.** These two questions are always asked. The app asks them itself, so they cost nothing and are never skipped:
   - **Plan length:** 1 week, 2 weeks, 1 month, 3 months, or Pick a date (up to 6 months).
   - **Time you can give it:** 15 min a day, 30 min, 1 hour, 2+ hours, or Weekends only.
3. **Questions** are made for this goal by the AI: 3 to 6 of them, shown **one per screen** as "Question 2 of 5". There are four kinds:
   - **One choice:** "What kind of websites?" with SaaS, E-commerce, Landing pages and Portfolios.
   - **Several choices:** "Which of these have you done before?"
   - **A scale:** "How good are you at web design?" from 1 (Never tried) to 5 (I do it for a living).
   - **Short text:** "Anything you have already tried, or want to avoid?"

   Every choice question also has **Type my own** and **Skip**. On a keyboard, number keys pick an answer and Enter moves on.

4. **Follow-ups.** This step is optional and happens at most once. After your answers, the AI can ask up to 3 more questions when an answer opens something up. For example: "You said sales feels hard. Have you ever pitched to a client?" If it has nothing to ask, the step is skipped.
5. **Making your plan.** A calm loading screen ("Shaping a 1-month plan around 30 minutes a day") takes about 2 to 5 seconds. If it fails, you get **Try again**, and every answer is kept.
6. **Review**, described in 2c.

### 2c. Review: one card at a time

At the top:

- the plan's **title** (you can edit it);
- one **summary line** ("Four weeks: offer and portfolio first, then outreach every weekday");
- the **phases** as a strip ("Week 1 · Your offer", "Week 2 · Portfolio", "Weeks 3–4 · Outreach"). Tapping a phase jumps to its first card.

There are two ways to look at the tasks. You switch with one toggle, and it remembers your choice.

- **Cards (the default on phones).** One task fills the card:
  - its title, phase, date, priority and repeat;
  - its notes (how to do it);
  - its subtasks;
  - a time estimate ("about 45 min").

  To act on a card:
  - **Keep** with → or a swipe right;
  - **Cut** with ← or a swipe left (or `x`);
  - **Edit** with `e` or a tap, which opens the fields in place.

  The counter reads "Card 4 of 18 · 3 cut". A **Cut (3)** tray at the bottom brings cut cards back. After the last card you see a summary ("15 tasks over 4 weeks, 2 repeating") and **Add plan**.

- **List (the default with a mouse).** The tasks are grouped by phase, one line each (tick, title, date, priority). Tapping a line opens it in place. Hovering shows a remove button.

Both views have **+ Add a task** at the end of each phase. **Add plan** (Ctrl+Enter) saves the plan, its list and every kept task in one go, all or nothing, with one Undo. It then opens the plan's page.

**Where the tasks go.** No list picker is needed. By default the plan makes its own list, named after the plan. An **Options** fold at the bottom has "Put the tasks in another list" for anyone who wants that. This fixes the "selecting a list is mandatory" feeling.

### 2d. A plan's page (`/plans/[id]`)

- **Header:**
  - the title;
  - the status;
  - progress (ring, "6 of 15 done", "12 days left");
  - a menu: Rename, Reschedule, Archive, Delete.
- **Phases**, each a section with its tasks. The task rows work as everywhere else: tick, open the drawer, Undo. You can work the plan from here or from Today.
- **Add more tasks** (AI). Ledge looks at what is done and what is still open in this plan and suggests the next steps. These go through the same review cards. This sends the plan's own task titles and their done state, never anything else.
- **Resources:** see §4.
- **What you told Ledge:** a fold with the goal and every question and answer. **Edit answers and remake** is for drafts only. For an active plan, "Add more tasks" is the way to change it.
- **Reschedule:** "Move every open task by [n] days", or "Spread the open tasks to a new end date". The code does this; no AI is used.
- **AI used for this plan:** "4 AI requests · 9,800 tokens · about $0.004 (₹0.30)". See §5.
- **Delete:** the plan goes to Trash, like tasks. A checkbox, "Also move its 15 tasks to Trash", is on by default. With it off, the tasks stay in their list and lose only the link to the plan. Restoring from Trash brings both back.

### 2e. When a plan ends

When every task is done, or the end date has passed and you tap **Mark done**, the plan becomes **Done**. It keeps its history, so the Plans home becomes a record of goals you finished.

## 3. Better plans (what the AI is asked for)

| Today                            | This version                                                                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Up to 20 flat tasks              | 2 to 6 **phases**, each with dates and up to 8 tasks (30 at most in all)                                                                  |
| One line of notes                | Notes of up to 400 characters: **how** to do the task, and **why** it matters for the goal                                                |
| No subtasks                      | Up to 5 subtasks on a task, where the task has steps ("Build the portfolio site": pick 3 projects, write case studies, deploy)            |
| No size                          | A **time estimate** (5 to 240 minutes), fitted to the time you said you have. It is stored as a short line at the top of the task's notes |
| Repeats: daily, weekdays, weekly | The same, with an end date                                                                                                                |
| Nothing for checkpoints          | 1 to 3 **milestones** (high priority, for example "Send 10 pitches", "Land a first paid client"), so progress means something             |

The prompt is told to:

- put the advice the goal mentions first. For freelancing that means the sales side: offer, pricing, outreach and follow-ups, not only skills;
- fit each day to the time given;
- keep practice as one repeating task.

The code still enforces every limit (`docs/planner-spec.md` "Rules the code enforces", with the new caps above).

**Data model for tasks:**

- `tasks.plan_id`: nullable, foreign key, set to null when the plan is deleted forever.
- `tasks.plan_phase`: short text, nullable.

Tasks stay ordinary tasks in an ordinary list, so Today, Upcoming, search and export all keep working unchanged.

## 4. Resources

This comes in two stages, and O picks how far to go (open question 1).

**Stage 1, built with this version, free.** The plan reply gets 3 to 8 resources: name, kind (Book, Course, Video channel, Community, Tool, Article) and one line on why it helps. Language models make up web addresses, so **Ledge never shows a link the AI wrote**. Each resource instead gets a **Search** button. For a video channel it opens a YouTube search; for anything else, a web search for the name. You can tick a resource as used, remove it, or paste your own link. It costs nothing extra, because it is part of the plan request.

**Stage 2, later, small extra cost.** A **Find links** button uses Groq's built-in web search, which runs on the same Groq account as the rest of the AI. It looks up each resource and returns real, checked addresses. Groq lists basic web search at **$5 per 1,000 searches** ($0.005 each) and advanced search at $8 per 1,000, on top of the tokens. A plan with 5 resources therefore costs about $0.03 (₹2.50) per tap, and only when you tap it. It needs Groq's `compound` model rather than the usual one. Whether that model's replies can be held to the strict format Ledge uses has **not been checked**, which is why this is stage 2.

## 5. What it costs, and showing it

**Measured on 2026-11-22.** Yesterday's real run with your key used the questions step (443 tokens in, 236 out) and the plan step (681 in, 1,133 out): about **1,100 tokens in and 1,400 out per plan**.

At Groq's listed prices for `openai/gpt-oss-120b`, $0.15 per million tokens in and $0.60 per million out, that is **about $0.001 per plan (under ₹0.10)**. Voice capture costs about the same per command, plus $0.04 per hour of speech for Whisper.

**On Groq's free plan this costs nothing.** The figures are what the same use would cost on the paid plan. The free plan's real limit is speed: the code comments note 8,000 tokens a minute for this model.

**This version's estimate.** Basics are free, then come questions, follow-ups, the plan with phases, subtasks and resources, and sometimes "Add more tasks". That is about 4,000 tokens in and 5,000 out per plan, so **about $0.004 (₹0.30)**. A plan a day for a year is about $1.50.

**Risk on the free plan.** A big plan reply of about 5,000 tokens, sent shortly after the questions, can pass the 8,000-a-minute limit. Ledge then shows "Ledge is busy right now. Try again in a minute." Ledge will wait for the time Groq gives and retry once by itself before showing that message. If it still happens often, the fix is the paid Developer plan, which is where the costs above apply.

**Showing it in the app:**

- **A new table, `ai_usage`:** one row per AI request with the user, the feature (`voice_transcribe`, `voice_understand`, `plan_questions`, `plan_followups`, `plan_make`, `plan_more`, `plan_links`), the model, tokens in and out, seconds of audio, web searches, the plan (if any), and the time. Groq already returns these numbers with every reply; today they are only printed in development. No words, goals or audio are stored, only the counts.
- **Prices in code:** a small table in `src/server/ai-prices.ts`, with the date the prices were checked. The cost is always worked out from the tokens, so a price change never rewrites history. It is shown in dollars (Groq bills in dollars), with rupees beside it at a rate saved in Settings (default ₹85).
- **Settings, "AI usage" card:** this month and last month, requests and tokens by feature, an estimated cost, and a note: "On Groq's free plan you are not charged; this is what it would cost on the paid plan."
- **On each plan's page:** that plan's requests and estimated cost (2d).

## 6. Data

New table `plans`:

| Column                                      | Notes                                                                             |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| `id`, `user_id`, `created_at`, `updated_at` | As every table (`user_id` indexed, cascade delete)                                |
| `title`                                     | 1 to 80 characters                                                                |
| `goal`                                      | The words you typed, up to 1,000 characters                                       |
| `status`                                    | `draft`, `active`, `done` or `archived`                                           |
| `step`                                      | For drafts: `basics`, `questions`, `followups` or `review`                        |
| `start_date`, `end_date`                    | Floating dates, like due dates                                                    |
| `basics`                                    | jsonb: `{ length, minutesPerDay }`                                                |
| `questions`, `answers`                      | jsonb: what was asked and what you answered, both rounds                          |
| `draft`                                     | jsonb: the unsaved review (cards, cuts, edits) while a draft; cleared on Add plan |
| `summary`, `phases`, `resources`            | text, jsonb, jsonb                                                                |
| `list_id`                                   | The list it made or used, nullable (set null when the list is deleted)            |
| `deleted_at`                                | Trash, same 30-day clean-up as tasks                                              |

New columns: `tasks.plan_id` and `tasks.plan_phase` (§3). New tables: `ai_usage` (§5), and `user_settings.usd_to_inr` (integer paise per dollar, default 8,500).

Rules, as everywhere:

- Every data function takes `userId`.
- Every action uses `guarded()` with Zod.
- An ownership test proves user B cannot see, change or delete user A's plans or usage.

## 7. Privacy

This is the same as today, with one addition. What goes to Groq:

- the goal;
- the basics and the answers;
- today's date;
- the names of your lists;
- for "Add more tasks", the titles and done state of **that plan's** tasks.

It never includes other tasks, money or journal text. The `ai_usage` table stores counts only.

## 8. Build order

Each stage is usable alone, has its own tests, and meets §15 done.

- **P.1 Module and history:**
  - the `plans`, `tasks.plan_id` and `plan_phase` columns;
  - the registry entry, Plans home, a plan's page with live tasks, and the Home hint;
  - today's flow saves a plan; `/plan` redirects; delete and archive;
  - the list picker becomes optional.
- **P.2 Cost tracking:** `ai_usage` rows from voice and the planner, the price table, the Settings card, the per-plan line, and the one retry after a rate limit.
- **P.3 Deeper questions:** basics, one question per screen, the four kinds, Type my own, the follow-up round, drafts that resume.
- **P.4 Richer plans and the new review:** phases, subtasks, estimates, milestones, the card-by-card review with keys and swipes, the cut tray, and list view.
- **P.5 Living plans:** Add more tasks, Reschedule, Done, and resources stage 1.
- **P.6 (later, O's call):** resources stage 2 with real links from web search.

## 9. Tests

- **Unit:**
  - the resolver with the new caps (phases, subtasks, estimates, milestones);
  - the reschedule maths (shift, spread);
  - the price maths;
  - the follow-up limit;
  - the resource search links (a link the AI wrote is never used).
- **Integration:**
  - plans CRUD;
  - Add plan all or nothing, and Undo;
  - deleting with and without its tasks, and restoring from Trash;
  - drafts resuming;
  - usage rows written for each request;
  - ownership of plans and usage.
- **E2E (fake mode):** a new plan from start to end with keyboard-only card review, the plan on the Plans home, ticking a task on the plan page, and deleting it.

## 10. Not in this version

- A plan that changes itself when tasks slip. "Reschedule" is manual.
- Reminders.
- Sharing a plan.
- Plans for money goals, such as saving ₹1 lakh. That links to Expenses and needs its own spec.
- Templates.
- Web search during plan making (only the stage 2 button).

## 11. Build plan (2026-11-23, Phase 15)

O said to build the whole feature ("all the functionality we discussed"), using his Claude Design screens (8a to 8l) as reference. The work is planned by Opus and coded by Sonnet subagents. It is web first: phone frames are followed where they are cheap, but the phone polish comes after. The two open questions take their recommended defaults until O says otherwise: the plan gets its own list, with "another list" under Options, and costs show in dollars and rupees at ₹85.

| Stage | What                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Who              | Depends on |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------- |
| 15.A  | **Data and usage.** Migration 0015 adds the `plans` table (§6, plus `list_created` and `trashed_task_ids`), `tasks.plan_id` and `tasks.plan_phase`, the `ai_usage` table, and `user_settings.usd_to_inr`. Then `src/server/data/plans.ts` (list with progress, get, drafts, activate, rename, status, reschedule, trash, restore, delete forever), `src/server/data/ai-usage.ts`, `src/server/ai-prices.ts`, usage recorded from `groq.ts` for voice and the planner, plans in Trash and the 30-day purge, plans in the JSON export | Sonnet (backend) | none       |
| 15.B  | **Planner engine v2.** Schemas for the basics, the four question kinds, follow-ups, and a plan with phases, subtasks, estimates, milestones and resources. Prompts, resolver caps, fake mode, one retry after a rate limit. Server actions: create or update a draft, save answers, ask questions, ask follow-ups, make the plan, save the review, Add plan (all or nothing, with subtasks, `plan_id` and phase), Undo, Add more tasks, reschedule, rename, archive, done, delete and restore                                       | Sonnet (backend) | 15.A       |
| 15.C  | **Module shell and pages.** The registry entry and sidebar link, Plans home (8a, 8b), a plan's page (8j, 8k: phases of live task rows, resources with Search buttons, "What you told Ledge", the AI line, menus and sheets from 8l), the `/plan` redirect, palette entries, the Tasks header link, the Home tile and hint, the Settings AI usage card, and Plans set to Ready on the sign-in contents                                                                                                                               | Sonnet (UI)      | 15.B       |
| 15.D  | **New plan flow and review.** `/plans/new` and `/plans/[id]/setup`: goal (8c), basics (8d), questions one per screen (8e), follow-ups (8f), making and error (8g), the card-by-card review with keys, swipes and the cut tray (8h), the list review with its side panel (8i), and the same review reused by Add more tasks                                                                                                                                                                                                          | Sonnet (UI)      | 15.B       |
| 15.E  | **Check and document.** Review both UIs together, typecheck, lint, all tests, the browser at desktop size in light and dark (keyboard review included), then CLAUDE.md, decisions, plain-English docs                                                                                                                                                                                                                                                                                                                               | Opus             | 15.C, 15.D |

15.C and 15.D run at the same time because they touch different files. Both read the 15.B actions and types, and change nothing in them without saying so.

The existing `/plan` code (`src/modules/planner`) is the starting point and is reworked in place, not copied. The redirect keeps old links working.

## Answered by O (2026-11-23)

- **Go-ahead:** build, starting with P.1. **On hold until O is happy with the screens** he is drawing in Claude Design (prompt: `docs/plans-design-prompt.md`).
- **Resources:** stage 1 (Search buttons) with this version; real links later.
- **Follow-ups:** one round of up to 3 follow-up questions, asked only when an answer opens something up.
- **Phone:** build and try it on the web first; the phone layout and the tab bar question come after everything else is done.

## Open questions for O

1. **The plan's own list:** a plan always makes its own list, with "another list" tucked under Options. Or should it be able to share a list such as "Work"?
2. **Rupee rate:** show costs in both dollars and rupees, at a rate you set (default ₹85)?
