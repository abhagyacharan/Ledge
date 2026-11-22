# Voice capture spec

Written and approved on 2026-11-15 (O picked Groq, then said "start building"). **Built as Phase 12 (CLAUDE.md §14) the same day**, tested with fake mode; not yet tried with a real Groq key or a real microphone. The §13 questions use the recommendations until O answers. Two differences from the text below: saving is all or nothing by taking back what was written when a step fails, not one database transaction (the data functions each use their own connection); and the desktop mic button sits in the capture sheets' header. Anything beyond this file goes to `docs/ideas.md` first.

## 1. Why

Manual entry is the main reason people stop using trackers. Voice capture lets O hold the + button, say what happened, check what the app understood, and save it in one tap. It covers both Tasks and the Expense Tracker:

- "Create a task to make blueberry cheesecake."
- "Spent 500 on petrol today."
- "Paid the bike loan EMI of 7,000 today." (marks the existing EMI paid)
- "Create a list called Photography, and in it add two tasks: take 5 photos of the sun and click 10 photos of the moon today."
- "500 on Red Bull cans, UPI." (Food & Groceries, UPI, Want)

## 2. Principles

1. **Always review, never silent saving (v1).** The app shows what it understood as editable cards; nothing is written until O taps **Add all**. Speech and AI both make mistakes, and this is a money record.
2. **Defaults over questions.** A missing detail gets the same default the manual sheets use (§7). The app asks only when it cannot act safely, for example two EMIs both match "loan".
3. **Same rules as manual entry.** Every saved item goes through the existing server actions (`createTaskAction`, `createListAction`, `createEntryAction`, `markEmiPaidAction`), so Zod validation, ownership checks, Undo and Trash all apply unchanged.
4. **The AI proposes; the server decides.** The model only returns a plan. The server checks every field against the user's real data (list names, EMI ids, categories) before showing it, and checks again when saving.
5. **Private by default.** Audio is never stored. Transcripts are not stored either (§10). Voice can be switched off in Settings.
6. **It must never be the only way.** A failure at any step falls back to typing (the transcript goes into quick add or the expense sheet).

## 3. How it feels

### Phone

1. **Hold the round + button** for half a second (`HOLD_MS` in `voice-events.ts`, O's choice 2026-11-16; it was 400 ms and stopped when you let go, then two seconds). A ring grows around it while you hold; when the time is up the phone vibrates once (Android only; iPhones do not allow it on the web) and the **voice sheet** rises: a large live level meter, "Listening…", a running timer and the hint "You can let go. Press Done when you're finished". **Listening is hands-free from then on**: lift your finger, put the phone down, and speak. It keeps going until you press **Done** (or 60 seconds pass). The button uses `touch-action: none`, so a finger drifting while you hold is not taken for a scroll.
2. **A normal tap** on + still opens the capture sheet, exactly as today.
3. **Press Done** to stop. The sheet shows "Understanding…" with the transcript appearing first (about 0.5 s), then the cards (target: under 2.5 s from letting go for a 10-second clip).
4. **To cancel,** close the sheet (the × or swipe it down); nothing is sent. (There is no slide-to-cancel any more.)
5. Recording stops by itself after **60 seconds**.

### Desktop and keyboard

- A **microphone button** in the capture sheet header (beside the type row) and in quick add: click to start, click again to stop.
- **`v`** (outside text fields) starts recording; `v` or `Enter` stops; `Esc` cancels. Listed in `?` help and the command palette ("Speak to add").
- Holding the + button with a mouse also works, but is not the main way in.

### Type instead

The voice sheet has a **Type instead** link. It opens the same flow with a text box: what O types is sent to the understanding step (§6) with no audio at all. This is also the fix-up path: the transcript in the review sheet is editable, and **Try again** re-reads the edited text.

## 4. The review sheet

After the understanding step the voice sheet turns into a list of **cards**, one per action, in the order spoken:

| Card                          | Shows                                                                | Editable in place                                        |
| ----------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------- |
| New list                      | Icon, name                                                           | Name                                                     |
| New task                      | Title, list, due date and time, priority, repeat                     | Every field (tapping opens the existing task fields)     |
| Expense / Income / Investment | Big amount, title, category chip, paid-with chip, Need or Want, date | Every field (tapping opens the expense sheet pre-filled) |
| EMI paid                      | Loan name, amount, due date, "Mark paid on Today"                    | Which EMI (a picker of unpaid EMIs), paid-on date        |
| Not understood                | The words it could not use, and why                                  | "Add as a task" or remove                                |

- Each card has a remove (×) button and a small "guessed" mark on fields the AI filled in by itself (category, Need or Want), so O knows what to check. Fields O actually said have no mark.
- A task whose list is a new list from the same command shows that list's name with a "new" tag.
- The transcript sits above the cards in grey, editable, with **Try again**.
- The footer: **Add all** (primary, with the count: "Add 3") and **Cancel**. After saving, one toast: "Added 2 tasks and 1 expense" with **Undo** (6 seconds), which removes everything that command created and un-marks any EMI it marked paid.
- If every card was removed, the footer offers **Close**.

## 5. Speech to text (Groq Whisper)

- **Endpoint:** `POST https://api.groq.com/openai/v1/audio/transcriptions` (OpenAI-compatible, multipart form).
- **Model:** `whisper-large-v3-turbo` by default ($0.04 per hour of audio, billed at least 10 seconds per request, so about $0.0001 per command). `whisper-large-v3` ($0.111 per hour) is the fallback if the eval (§11) shows turbo mishears Indian English or amounts.
- **Parameters:** `language: "en"` (O speaks English with Indian names and words; to revisit if he wants Hindi or Hinglish), `temperature: 0`, `response_format: "json"`, and a `prompt` (max 224 tokens) listing words Whisper should spell right: O's list names, "EMI", "UPI", "Swiggy", "Zomato", "rupees", "lakh", common merchant names from his past entries (top 20 titles).
- **Audio:** recorded in the browser with `MediaRecorder` (Opus in WebM on Android Chrome, AAC in MP4 on iPhone Safari; Groq accepts both). Mono. Max 60 s, which is well under Groq's 25 MB limit. Clips under 0.6 s or with no sound above the noise floor are rejected on the phone ("Didn't catch that") and never sent.
- **Where it runs:** the browser sends audio to Ledge's own server (`POST /api/voice/transcribe`), which forwards it to Groq. The API key never reaches the browser, and the browser makes no third-party requests (so the CSP stays as it is).

## 6. Understanding (Groq language model)

### The call

- **Endpoint:** `POST https://api.groq.com/openai/v1/chat/completions`.
- **Model:** `openai/gpt-oss-120b` by default, `openai/gpt-oss-20b` as the cheaper option if the eval shows it is as accurate. Both support Groq's **strict structured outputs** (`response_format: { type: "json_schema", json_schema: { name, strict: true, schema } }`), which guarantees the reply matches the schema. (Groq does not allow tools or streaming together with structured outputs, so this is one plain request, not a tool loop.)
- **Model ids, prices and limits change**: they live in env vars (§9), and the eval decides between them.

### What the model is given

A fixed system prompt (instructions plus the schema rules), then a context block built fresh for each request:

- today's date, weekday and O's timezone (`Asia/Kolkata`), and his week start;
- currency (INR) and locale;
- his list names (not ids), including General;
- the category lists, payment methods and investment types from `src/modules/expenses/categories.ts`;
- his unpaid EMIs: a short reference (`E1`, `E2`, ...), loan name, category, amount and due date (the server maps references back to real ids; the model never sees ids);
- the transcript.

No past entries, journal text or notes are sent.

### What it returns

One JSON object, `{ "actions": [...] }`, where each action is one of these (strict mode: every field present, `null` when not said):

| `type`          | Fields                                                                                                                                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create_list`   | `ref` (e.g. `L1`, so tasks in the same command can point at it), `name`                                                                                                                                                     |
| `create_task`   | `title`, `list` (existing list name, a `ref` from `create_list`, or `null` for General), `dueDate` (ISO or null), `dueTime` (HH:MM or null), `priority` (`none`/`low`/`medium`/`high`), `notes` (or null)                   |
| `log_entry`     | `kind` (`expense`/`income`/`investment`), `amount` (string, major units, e.g. `"7000"`, `"499.50"`), `title`, `category`, `paymentMethod` (or null), `spendLabel` (`need`/`want`/null, expenses only), `date` (ISO or null) |
| `mark_emi_paid` | `emi` (a reference such as `E2`, or null when none matched), `amount` (as heard, for checking), `paidOn` (ISO or null)                                                                                                      |
| `unclear`       | `text` (the words), `reason` (short)                                                                                                                                                                                        |

Each `category`, `spendLabel` and `paymentMethod` also carries `guessed: true|false` so the review sheet can mark guesses (§4).

### What the server does with it (the resolver)

Pure, tested code in `src/modules/voice/resolve.ts`:

- Validates the reply with Zod (shared schema, `src/modules/voice/schema.ts`). A reply that fails becomes one `unclear` card holding the whole transcript.
- **Amounts:** parsed with `src/lib/money.ts` into paise; must be above 0 and under ₹1 crore, or the card shows an error to fix.
- **Dates:** must be valid ISO dates within a year either side of today; otherwise the default (§7). Tasks may be in the future; money entries in the future are allowed but flagged ("This is in the future").
- **Lists:** matched to O's lists by name, ignoring case and accents. An unknown name that was not created in the same command becomes a `create_list` card plus the task (shown as "new", so O can remove it and pick an existing list instead).
- **Categories and methods:** must be one of the fixed values; an unknown one falls back to the default and is marked guessed.
- **EMIs:** the reference must be one of the EMIs sent in the context. If the model returned null, or the amount differs from the EMI's by more than 1%, the card asks O to pick the EMI.
- **Currency words:** O said "$500" in his example. Ledge has one currency per user, so amounts are always saved in O's currency; when a foreign currency word was heard, the card notes "Heard 'dollars', saved as ₹".
- Caps a command at **10 actions**; more becomes an `unclear` card ("Too many things at once; try in parts").

## 7. Defaults when something is not said

| Field                | Default                                                                    |
| -------------------- | -------------------------------------------------------------------------- |
| Task list            | General                                                                    |
| Task due date / time | None (the task goes to General with no date)                               |
| Task priority        | None                                                                       |
| Money date           | Today                                                                      |
| Expense category     | The model's best guess; Miscellaneous if it has none                       |
| Paid with            | The last method used for that kind (the sheet's existing memory), else UPI |
| Need or want         | The model's guess (marked guessed), or empty                               |
| Income category      | The model's guess, else Other income                                       |
| Investment type      | The model's guess, else Other                                              |
| EMI paid on          | Today                                                                      |

## 8. Scope

**In v1:** new tasks (title, list, due date and time, priority, notes), new lists, expenses, income, investments, marking an existing unpaid EMI as paid, several actions in one command, review and edit, Undo, Type instead, desktop button and `v` shortcut, Settings switch.

**Not in v1** (parked in `docs/ideas.md`, each needs O's go-ahead): completing, editing, moving or deleting existing tasks by voice; adding new EMIs or EMI series; recurring tasks; journal dictation; questions ("how much did I spend on food?"); auto-saving without review; Hindi or Hinglish tuning; running Whisper on the home server; voice on the lock screen or as a phone shortcut (needs the PWA).

## 9. Technical design

### New files

```
src/modules/voice/
  schema.ts            # Zod: model reply, resolved plan, apply input (shared client/server)
  json-schema.ts       # the strict JSON schema sent to Groq (generated from schema.ts, tested to match)
  prompt.ts            # system prompt text + context builder (pure, tested)
  resolve.ts           # model reply -> resolved plan against the user's data (pure, tested)
  actions.ts           # applyVoicePlanAction: guarded(), one transaction, returns created ids for Undo
  components/          # voice sheet, recorder hook, level meter, review cards, mic button
src/server/groq.ts     # tiny fetch client: transcribe(), parse(); Zod-validated responses, timeouts, typed errors
src/app/api/voice/transcribe/route.ts   # POST audio -> transcript
src/app/api/voice/understand/route.ts   # POST transcript -> resolved plan
```

- **No new dependency.** Groq's API is OpenAI-compatible and small; `fetch` plus Zod covers it (CLAUDE.md §2 item 5). `MediaRecorder` and `navigator.vibrate` are browser built-ins.
- **Two routes, not one**, so the transcript appears before the cards and Try again / Type instead reuse `understand` without audio.
- Both routes: `requireUser()`, the Settings switch, Zod on input, a **per-user rate limit** (20 requests per minute, 30 per day since 2026-11-23, configurable), body limit (audio 2 MB, text 2,000 characters), a 15-second timeout to Groq, and typed errors (`{ ok: false, error }`) instead of throws. They never log audio, transcripts or request bodies.
- **Saving** is a server action, `applyVoicePlanAction`, which re-validates the plan, re-checks ownership of every list and EMI, writes everything in **one transaction** (all or nothing), and returns the ids it created and the EMIs it marked, for Undo. Undo uses the existing trash and un-mark logic.
- The FAB gains a long-press handler (pointer events: `pointerdown` starts a 400 ms timer; `pointerup` before it fires = tap; movement over 10 px or `pointercancel` = cancel), shared by phone and mouse.

### Settings and env

- **Settings, Preferences:** "Voice capture" switch (on by default once built) with one line: "Your voice is sent to Groq to be turned into text and understood. Ledge keeps neither the audio nor the words." Stored in `user_settings` (new column `voice_enabled`, migration).
- **Env** (`.env.example`, `.env.production.example`, README, CLAUDE.md §11):
  - `GROQ_API_KEY`: no key means voice is off everywhere and the mic buttons are hidden.
  - `GROQ_TRANSCRIBE_MODEL` (default `whisper-large-v3-turbo`)
  - `GROQ_PARSE_MODEL` (default `openai/gpt-oss-120b`)
  - `VOICE_DAILY_LIMIT` (default 30 since 2026-11-23; was 300)

### Security headers

`next.config.ts` currently sends `Permissions-Policy: microphone=()`, which blocks the microphone. It becomes `microphone=(self)`. The microphone works only over HTTPS, which the Cloudflare tunnel gives (and on `localhost` for development). The CSP does not change, since the browser only talks to Ledge.

## 10. Privacy

- Audio goes from the phone to Ledge's server and on to Groq; it is held in memory only for the request and never written to disk or the database.
- The transcript and the model's reply are not stored. Only the saved tasks and entries remain, as if typed.
- What Groq keeps is set by Groq's own data policy; O should read it and choose the account settings he is comfortable with before switching voice on. This file does not make claims about it.
- If Ledge is opened to other people later (CLAUDE.md §16 Q3), the Settings line and a privacy page must say this plainly, and voice should be off by default for them.

## 11. Testing

- **Unit (Vitest):** `prompt.ts` context builder, `resolve.ts` (amounts, dates, list matching, new-list references, EMI matching and the 1% check, defaults, caps, currency notes, bad replies), `json-schema.ts` matches `schema.ts`, the long-press timing logic.
- **Integration (real test database, Groq stubbed at `src/server/groq.ts`):** `applyVoicePlanAction` writes everything or nothing, ownership (user B's list or EMI ids are refused), Undo removes exactly what was created, rate limit and Settings switch are enforced.
- **E2E (Playwright, `VOICE_FAKE=1` returns fixture transcripts and plans instead of calling Groq):** hold to record and review on the phone project; edit a card and Add all; Undo; Type instead; mic denied state; desktop `v` shortcut; axe audit of the voice sheet in both themes.
- **Eval set** (`tests/voice/eval.json`, run by hand with `pnpm voice:eval`, which calls the real Groq API and costs a few cents): at least 60 commands with the expected plan, covering O's examples, Indian amounts ("seven thousand", "1.5 lakh", "₹499"), relative dates ("tomorrow", "next Friday", "on the 5th"), several actions in one command, merchant names, need-or-want guesses, EMI matching, and things it should mark unclear. It runs on text first (to judge the language model), then on recorded clips of O speaking (to judge Whisper). **Bar to ship:** at least 90% of commands produce the expected plan with no edits, and no command ever produces a wrong amount without a visible error.

## 12. Phase plan

Proposed as **Phase 12: Voice capture**, after O's go-ahead on this file. Each step ends with `typecheck`, `lint` and `test` passing, the plain-English docs updated, and §15 done for what it adds. Rough effort is in focused days.

### 12.0 Decide (O)

- [ ] O approves this spec, or marks what to change
- [ ] O creates a Groq account and API key, reads Groq's data policy, and puts `GROQ_API_KEY` in the local `.env` (and later on the server)
- [ ] O answers the open questions in §13

Exit: spec approved, key available locally.

### 12.1 Foundations (about 0.5 day)

- [ ] `src/server/groq.ts` with `transcribe()` and `parse()`, Zod-checked responses, timeouts, typed errors; unit tests with recorded responses
- [ ] Env vars, `.env` examples, README, CLAUDE.md §11
- [ ] `user_settings.voice_enabled` migration and the Settings switch with its privacy line
- [ ] `Permissions-Policy: microphone=(self)`
- [ ] Per-user rate limiter for the voice routes

Exit: a script can send a sample clip and a sample sentence to Groq through the server code and get validated results.

### 12.2 Understanding (about 1 day)

- [ ] `schema.ts`, `json-schema.ts`, `prompt.ts`, `resolve.ts` with full unit tests
- [ ] `POST /api/voice/understand`
- [ ] Eval set (text part, 60+ commands) and `pnpm voice:eval`; pick `gpt-oss-120b` or `gpt-oss-20b` on the results

Exit: the text eval meets the §11 bar.

### 12.3 Recording (about 1 day)

- [ ] Recorder hook (`MediaRecorder`, level meter, 60 s cap, silence check, iPhone and Android formats)
- [ ] Long-press on the + button (phone and mouse), voice sheet states (listening, cancel by sliding, understanding, errors)
- [ ] `POST /api/voice/transcribe` with the Whisper vocabulary prompt
- [ ] Desktop mic button and the `v` shortcut; Type instead

Exit: on O's phone over the tunnel, holding +, speaking and letting go shows the right transcript; the clip eval meets the §11 bar.

### 12.4 Review and save (about 1 day)

- [ ] Review cards for every action type, inline edits, guessed marks, remove, the EMI picker
- [ ] `applyVoicePlanAction` (one transaction, ownership re-check) and the combined Undo toast
- [ ] Integration tests (all or nothing, ownership, Undo)

Exit: all five example commands in §1 go from voice to saved items correctly, and Undo reverses each.

### 12.5 Hardening and polish (about 0.5 to 1 day)

- [ ] Every error state from §14 designed and tested; offline handling
- [ ] Accessibility: the sheet announces each state, keyboard-only use, reduced motion for the level meter, 44 px targets
- [ ] E2E with `VOICE_FAKE`, axe in both themes, phone and desktop
- [ ] Docs: `docs/decisions.md`, README (Groq key, cost, privacy), plain-English `phase-12-voice.md` and glossary (speech-to-text, transcript, language model, structured output)

Exit: §15 definition of done holds; O has used it on his phone for a day.

**Total: about 4 to 5 focused days** after 12.0.

### 12.6 Later (not v1, each needs O's go-ahead)

Voice for existing tasks (complete, reschedule, move), new EMIs and series, recurring tasks, journal dictation, spoken questions about spending, auto-save for simple single entries once the eval shows it is safe, Hinglish, Whisper on the home server.

## 13. Open questions for O

1. **Always review**, or later allow auto-save for a single simple expense? (Recommendation: always review in v1.)
2. **Language:** English only (`language: "en"`), or let Whisper detect Hindi and Hinglish too?
3. **New lists from voice:** create them straight away in the plan (current design), or ask "Create list Photography?" first?
4. **Daily cap:** is 300 requests a day right?
5. **Desktop shortcut:** is `v` free in your muscle memory, or would you prefer another key?

## 14. Errors and edge cases

| Situation                                | What O sees                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Microphone permission denied             | "Ledge needs the microphone for voice. Allow it in your browser settings." with **Type instead** |
| No `GROQ_API_KEY`, or voice switched off | The long-press does nothing; mic buttons hidden                                                  |
| Clip too short or silent                 | "Didn't catch that. Hold the button and speak." (nothing sent)                                   |
| Offline                                  | "You're offline. Type instead?" (nothing sent)                                                   |
| Groq slow (over 15 s) or down            | "Voice is unavailable right now." The transcript, if it came back, is kept for Type instead      |
| Rate limit reached                       | "That's a lot of voice today. Try again later or type it."                                       |
| Nothing usable understood                | One Not understood card with "Add as a task"                                                     |
| An EMI not found or ambiguous            | The card asks O to pick from unpaid EMIs                                                         |
| Save fails                               | Nothing is written (one transaction); the cards stay so O can retry                              |
| O closes the sheet mid-way               | Recording and requests are cancelled; nothing saved                                              |
