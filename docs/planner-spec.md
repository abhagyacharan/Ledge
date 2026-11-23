# AI planner spec (goal to tasks)

> **Replaced on 2026-11-23** by the Plans module (`docs/plans-module-spec.md`, Phase 15). `/plan` now redirects to `/plans/new`. Kept as history.

Decided with O on 2026-11-22 ("plan and implement"), from the parked idea in `docs/ideas.md`. Uses Groq, already chosen for voice capture (`docs/voice-spec.md`). O's request counts as the go-ahead to lift the §1 non-goal for this one feature.

## What it is

You describe a goal in plain words: "learn photography in 2 weeks, to a beginner level, practising every day". Ledge asks a few quick questions with answers to tap, then proposes a plan: a new list for the goal, with tasks that have dates and priorities, and daily practice as a repeating task. You edit, remove or add tasks, then add them all at once. One Undo takes the whole plan back.

## The flow (one page, `/plan`)

1. **Goal.** A text box, "What do you want to do?" (5 to 500 characters), with an example under it. Button: **Next**.
2. **Questions.** Ledge asks 1 to 4 questions, each with 2 to 5 answers to tap, plus "Something else" with a small text box. One answer per question. Button: **Make my plan**. "Skip questions" makes the plan from the goal alone.
3. **Review.** The plan as cards, in the review look of voice capture:
   - **List:** a new list named for the goal (editable), with a target date = the plan's last date. Or "Add to an existing list" (a picker of your lists).
   - **Tasks** (up to 20): title, date (or none), priority, repeat (None, Every day, Weekdays, Every week), and repeat end. Each card can be edited or removed. **Add a task** adds an empty card.
   - A short line from Ledge on how the plan is shaped ("Two weeks: basics first, then a portrait every day").
4. **Add all.** Saves the list and every task at once, or nothing if any part fails. A toast says "Added 9 tasks to Photography" with **Undo**, and a button opens the list.

"Start over" is on every step. Going back from the review keeps the answers.

## Rules the code enforces (not trusted from the model)

- At most 4 questions, 5 answers each; at most 20 tasks; titles 1 to 200 characters, notes up to 1,000.
- Dates from today to 90 days ahead; anything outside is cleared and the card is marked to check.
- A repeat needs a date (a repeating task without one gets today). The repeat end must be on or after the date; it defaults to the plan's last date, so practice does not repeat forever. Repeats become the stored rules (`FREQ=DAILY`, `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR`, weekly on the date's weekday) with `fixed` mode.
- Priority is none, low, medium or high.
- The list name is 1 to 60 characters; an existing list must be the user's own.
- Every server action calls `requireUser`, validates with Zod and returns a typed result.

## What the model is given and returns

- **Given:** today's date and weekday, the timezone, the goal, the answers (as question and answer text), and the names of the user's lists (so it can suggest one). **Never** existing tasks, money or journal text.
- **Questions step:** strict JSON: `{ questions: [{ id, text, options: [string] }] }`. Questions help scope the plan (which kind, how much time a day, current level, by when if not said). It asks none when the goal is already clear.
- **Plan step:** strict JSON: `{ listName, summary, tasks: [{ title, notes, dueDate, priority, repeat, repeatUntil }] }`. Concrete, doable tasks ("Take 5 candid portraits on the street"), not vague ones ("Get better"). Daily practice is one repeating task, not 14 copies.
- Both calls use Groq's strict structured outputs (`completeJson` in `src/server/groq.ts`), the same model as voice (`GROQ_PARSE_MODEL`).

## Availability, limits, privacy

- Needs `GROQ_API_KEY` (the same key as voice). Without it, `/plan` explains that and links to nothing else. `VOICE_FAKE=1` makes it answer from built-in rules (tests and trials).
- Shares voice's per-user rate limit (20 a minute, 30 a day since 2026-11-23).
- Errors keep what you typed: "Ledge couldn't make a plan right now. Try again." with **Try again**.
- Only the goal, the answers, today's date and list names go to Groq.

## Where it is reached

- **Plan a goal** button in the Tasks Overview header (beside the existing actions).
- The command palette: "Plan a goal".
- Not in the phone tab bar.

## Technical design

- `src/modules/planner/`: `schema.ts` (Zod for model replies, the editable plan and the save input), `json-schema.ts` (strict schemas), `prompt.ts` (system prompts and user message, pure), `resolve.ts` (model reply to an editable plan, with the rules above; pure), `fake.ts` (deterministic questions and plan), `actions.ts` (server actions: ask questions, make plan, apply plan, undo plan), `components/` (the page's client component and the cards).
- `src/server/planner.ts`: admits the user (key, rate limit), calls Groq or the fake, resolves.
- `src/app/(app)/plan/page.tsx` and `loading.tsx`.
- Saving reuses `createList`, `createTask`, and the take-back-on-failure pattern of `src/modules/voice/actions.ts`; Undo trashes and deletes forever what the plan made.

## Tests

- **Unit:** resolve (caps, date clamping, repeat to rule, default repeat end, unknown list), prompt builders, fake replies.
- **Integration:** apply plan (list and tasks created with the right fields and rules), all or nothing on failure, undo, another user's list refused, ownership.
- **E2E** (fake mode): goal, questions, review, edit a card, add all, see the list. Written; run when the suite runs.

## Not in this version

A plan that adjusts itself as tasks slip; suggesting learning resources (the Work page idea, `docs/work-spec.md`); voice input on the planner; subtasks in plans; plans for money goals.
