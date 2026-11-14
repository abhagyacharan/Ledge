# Work spec (daily briefings)

Drafted for O on 2026-11-14 from his description in chat. **Status: proposal. Nothing here is built, and it is not a phase in CLAUDE.md §14 yet.** It needs O's answers to the open questions at the end, and his go-ahead, before any code. It is the first feature that uses AI, which CLAUDE.md §1 lists as a non-goal until O picks a provider.

## What it is

A page called **Work**. You tell it what you are working on ("System design") and what you want (resources to learn from, news, or both). Every morning at a time you choose, it has a short briefing waiting: three to five real links, each with a one-line summary. Anything you like becomes a task with one tap.

It is also a cheap test of O's separate Odyssey idea: if the briefing gets opened every morning for a month, a bigger learning app is worth building. If not, little was spent.

## Topics

A topic is one thing you want briefings about.

| Field      | Rules                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------ |
| Name       | 1 to 80 characters. "System design".                                                                               |
| Focus      | Optional, up to 500 characters. What you want out of it: "Preparing for interviews; weak on databases".            |
| Wants      | **Resources**, **News**, or **Both**.                                                                              |
| Level      | Beginner, Intermediate or Advanced. Used for resources only.                                                       |
| How often  | Every day, weekdays, or weekly on a chosen weekday. Default: weekdays for News, weekly for Resources (see Limits). |
| Tasks list | The list that new tasks from this topic go to. Default General. "Create a list for this topic" makes one.          |
| Paused     | A paused topic keeps its history and gets no new briefings.                                                        |

- At most **5 active topics**. The cap keeps the page calm and the cost known.
- Topics can be created, edited, paused, reordered and deleted. Deleting a topic deletes its briefings, after a confirmation. Tasks already made from it stay.
- One **briefing time** for all topics, in Settings: default 09:00, in the user's timezone (`user_settings`).

## Briefings and items

A **briefing** is one topic's set of items for one day. A topic gets at most one scheduled briefing per day.

Each **item** has:

- a title and a link (opened in a new tab);
- the site it is from, and the publish date when known;
- a kind: article, video, course, paper, docs or news;
- a summary of one or two sentences;
- a "why this" line tied to your focus and level ("Covers database sharding, which you said is weak").

A briefing has **3 to 5 items**. Fewer is allowed. Zero is allowed: the card then says "Nothing new today" (a quiet day), which is honest and better than filler.

What each kind of want means:

- **Resources:** things worth studying at your level. Age does not matter. Never repeats a link it has shown before for this topic.
- **News:** published in the last 7 days. An item with no known publish date is dropped.

## What you can do with an item

- **Open** it.
- **Add to tasks.** Opens the existing quick-add sheet, already filled in:
  - title: the item's title;
  - notes: the summary and the link;
  - list: the topic's tasks list;
  - **no due date, no repeat, no priority.** You set them in the sheet if you want to, or leave them. The app never guesses them.
  - After saving, the item shows an "In Tasks" chip that opens the task (`?task=<id>`). If the task later goes to Trash, the chip goes away and Add to tasks returns.
- **Dismiss.** Hides the item, with an Undo toast.

Added and dismissed items from the last 30 days are fed back into the next briefing as "more like this" and "less like this". There is no other training.

## The page

Uses the dashboard look (`docs/design.md`).

- **Route:** `/work`. One entry in the sidebar, after Journal, from the module registry. It shows a small dot when there is an unread briefing.
- **Phones:** the tab bar is full at five tabs, so Work sits in the More sheet, above Trash (open question 3).
- **Welcome page:** a card "Today's briefing: 4 new on System design" that opens `/work`, only when there is something unread.
- **Layout:** topic chips across the top (All, then each topic). Under them, today's briefing as one card per topic, items as rows. Earlier days follow, folded, newest first ("Yesterday", "Wednesday · 11 Nov").
- **Header buttons:** "New topic", and "Refresh" on each topic card (see Limits).
- **Topic form:** the shared sheet (bottom sheet on phones), with the fields above.
- **No round + button** on this page.
- **States:**
  - No topics: "Tell Ledge what you are working on" and a New topic button.
  - Topic made, first briefing not due yet: "Your first briefing arrives at 9:00 am" and a "Get one now" button.
  - Generating: a skeleton card and "Finding today's items…".
  - Failed: "Could not get today's briefing" and "Try again". Never a blank card.
  - AI not set up on the server: the page explains which settings are missing; nothing else is shown.
- **Keyboard:** rows are reachable by Tab and `j`/`k`; `Enter` opens the link; `a` adds to tasks; `Esc` closes the sheet. Added to the `?` help.
- **No push or email.** Notifications are a non-goal (CLAUDE.md §1). The briefing waits for you; it does not ping you.

## How a briefing is made

1. **A worker wakes every 15 minutes.** It is a small extra container in `docker-compose.yml`, built like the `migrate` one, that runs a script against the database. It has no web address, so nothing new is exposed to the internet.
2. **It finds topics that are due:** active, scheduled for today (in the user's timezone), the briefing time has passed, and no briefing exists for today. A unique rule on (topic, day) stops two runs from making the same briefing.
3. **It builds the request** from the topic name, focus, wants and level, plus the titles shown in the last 14 days (to avoid) and the recent added and dismissed titles (to steer).
4. **A language model with a web search tool** finds candidates and returns them in a fixed shape. The model is given no other tools and no user data.
5. **The code checks every item** before saving it:
   - the shape is validated with Zod; anything malformed is dropped;
   - the link must be one the search tool actually returned, not one the model wrote from memory;
   - the link is fetched once to confirm the page exists (see Security);
   - the link is tidied (tracking parts removed) and compared with every link this topic has shown before; repeats are dropped;
   - news older than 7 days, or with no date, is dropped.
6. **What is left is saved** as the day's briefing. If nothing is left, it is saved as a quiet day.
7. **If the run fails** (provider down, timeout), later wake-ups retry, up to 3 times that day. After that the briefing is marked failed and "Try again" is offered.

Missed days are not made up later. If the server was off at 9:00, the briefing is made when it comes back, that same day only.

## Limits and honest expectations

- **Slow topics run dry.** "System design" has little real news in a day, and a resources list is finite. That is why Resources defaults to weekly, and why quiet days exist.
- **A checked link is not a checked summary.** The code proves the page exists. The summary is the model's reading of it and can be wrong.
- **Refresh:** at most 3 manual refreshes per topic per day. A refresh adds new items to today's briefing; it does not replace it.
- **Cost:** every run is logged with its token counts. A monthly cap (an env setting) stops all runs when reached, and the page says so. The real price per briefing is unknown until a provider is chosen and it is measured.
- **History:** briefings are kept 90 days, then deleted by the worker. The list of links already shown is kept, so old items never come back.

## Data

All tables have `id`, `created_at`, `updated_at`, and `user_id` (indexed, cascade delete). Every data function takes `userId`.

- `work_topics`: `name`, `focus`, `wants` (`resources`|`news`|`both`), `level`, `cadence` (`daily`|`weekdays`|`weekly`), `weekday` (only with weekly), `list_id` (the tasks list; falls back to General if that list is deleted), `is_paused`, `position` (fractional index).
- `work_briefings`: `topic_id`, `run_date` (floating day), `status` (`pending`|`ready`|`quiet`|`failed`), `attempts`, `error`, `read_at`, `tokens_in`, `tokens_out`, `model`. Unique on `(topic_id, run_date)`.
- `work_items`: `briefing_id`, `title`, `url`, `source`, `published_on`, `kind`, `summary`, `reason`, `task_id` (nullable, set null if the task is deleted forever), `dismissed_at`, `position`.
- `work_seen`: `topic_id`, `url_hash`. Unique together. Never pruned while the topic exists.
- `user_settings.briefing_time` (time, default `09:00`).

Checks in the database: lengths, the allowed values above, `weekday` only with weekly cadence.

## Security and privacy

- **What leaves the server:** the topic name, focus, wants, level, and titles of earlier items. **Never** tasks, money or journal text. The Settings page says this in plain words next to the feature.
- **Web content is untrusted.** Pages found by search can contain text written to trick a model (prompt injection). So: the model has no tools beyond search, its output is treated as data, validated, and shown as plain text. Nothing it returns can change data or run anything.
- **The link check is a server fetching an address someone else chose.** It allows only `http` and `https`, refuses private and local addresses (including after redirects), has a short timeout and a size limit, and reads nothing beyond the status and the page title.
- **Links** open with `rel="noopener noreferrer"`. No remote images or thumbnails, so the existing Content Security Policy stays as it is.
- **The API key** lives only in the server's `.env`. It is never sent to the browser or logged.
- **Ownership:** an integration test proves another user cannot read, change, refresh or delete your topics, briefings or items, and cannot attach an item to their own task.
- **Rate limits** on refresh and on topic creation.

## Settings (env)

New, all optional. With no key set, the Work page shows its "not set up" state and the worker does nothing.

```
AI_PROVIDER=            # which provider (open question 1)
AI_API_KEY=
AI_MODEL=
WORK_MONTHLY_TOKEN_CAP= # all runs stop above this
```

## Code layout

- `src/modules/work/`: `components/`, `actions.ts`, `schema.ts` (Zod, shared with the worker), and pure, tested files: `due.ts` (which topics are due, by timezone), `urls.ts` (tidy and hash a link), `prompt.ts` (build the request), `filter.ts` (the checks in step 5).
- `src/server/data/work.ts`: data functions.
- `src/server/ai/`: one small interface, `findItems(request)`, with one real provider behind it and a fake one for tests. Swapping the provider touches one file.
- `scripts/work-worker.ts`: the loop the container runs.
- One entry in `src/config/modules.ts`. The shell is not edited, apart from the unread dot and the More sheet row on phones.

## Tests

- **Unit:** due logic (timezones, weekdays, weekly, day boundaries), link tidying and hashing, the item checks (bad shape, unknown link, repeat, stale news), the request builder, the address rules for the link check.
- **Integration (real database, fake provider):** topic CRUD, the 5-topic cap, one briefing per topic per day under two simultaneous runs, retries then failed, add to tasks links the item and the task, ownership.
- **E2E (fake provider):** create a topic, get a briefing, add an item to tasks, see it in the list.
- **Quality check, by hand:** a script that runs a few fixed topics against the real provider and prints the items, so a change of prompt or model can be compared before and after. Not part of `pnpm test` (it costs money and its output varies).

## Build order

Each slice is usable on its own and meets CLAUDE.md §15.

1. Topics and the page with the fake provider (tables, CRUD, sheet, states).
2. The real provider, the item checks, and "Get one now".
3. Add to tasks and Dismiss.
4. The worker container and the briefing time.
5. Unread dot, welcome card, 90-day clean-up, cost cap.

## Not in this version (parked in `docs/ideas.md`)

- Push or email when a briefing is ready.
- The app choosing a due date or repeat for a task.
- Chatting with a briefing, or asking follow-up questions.
- A learning path: ordered lessons, progress and levels over time. This is the Odyssey idea.
- Your own sources (RSS feeds, chosen sites), thumbnails, saving an item without making a task.
- More than one provider at once, or a model running on the home server.

## Open questions for O

1. **Provider and model.** The feature needs a model that can search the web. Which provider, and is a monthly bill for it acceptable? Prices must be checked at that point, not assumed.
2. **The name.** "Work" could be read as "my job". Alternatives: Briefing, Learn, Feed. This spec uses Work, as O said it.
3. **Phones.** In the More sheet (proposed), or should Work replace one of the five tabs?
4. **Is the home server on at the briefing time every day?** If it sleeps, the briefing arrives when it wakes.
5. **A sixth container** (the worker) on the home server: fine?
6. **Lifting the non-goal.** Building this means changing "AI features" in CLAUDE.md §1 from a non-goal to "this one feature". That needs O's explicit OK.
