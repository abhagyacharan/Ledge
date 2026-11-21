# Multilingual voice spec

Drafted for O on 2026-11-22. **Status: future idea. Nothing here is built and it is not a phase yet.** It builds on voice capture (Phase 12, `docs/voice-spec.md`) and needs O's answers to the open questions at the end, and his go-ahead, before any code.

## What it is

Speak to Ledge in the language you think in. You can use Hindi, Telugu, English or any of the ten languages below, and you can mix them in one sentence the way people really talk: "kal subah gym jaana hai, and 450 on lunch, Swiggy lo". Ledge still makes the right tasks and entries, and you review them before anything is saved, as today.

## Why it is not good enough today

Voice capture sends every recording to Whisper with the language fixed to English (`language: "en"` in `src/server/groq.ts`, decided in `docs/voice-spec.md` §5). So:

- Hindi speech is forced into English letters ("kal doodh lena"), or half translated, depending on how Whisper guesses.
- Telugu, Tamil and the rest come out as nonsense English words, so the understanding step has nothing to work with.
- The understanding step (`src/modules/voice/prompt.ts`) was written and tested only with English sentences.

When it works in Hindi, it is luck: the language model happens to read the romanised Hindi.

## The languages

The ten most spoken Indian languages, plus English. This list is a proposal; open question 2 asks O to confirm or change it.

| Language  | Script       | Notes                                            |
| --------- | ------------ | ------------------------------------------------ |
| Hindi     | Devanagari   | Often mixed with English (Hinglish)              |
| Bengali   | Bengali      |                                                  |
| Marathi   | Devanagari   |                                                  |
| Telugu    | Telugu       | Often mixed with English and Hindi (O speaks it) |
| Tamil     | Tamil        |                                                  |
| Gujarati  | Gujarati     |                                                  |
| Urdu      | Perso-Arabic | Spoken much like Hindi; written right to left    |
| Kannada   | Kannada      |                                                  |
| Odia      | Odia         |                                                  |
| Malayalam | Malayalam    |                                                  |
| English   | Latin        | Indian English, as today                         |

Punjabi is the next one in line and can be added the same way.

## How it should behave

1. **Any of the chosen languages, and mixes of them, in one recording.** No switch to press before speaking. Settings has "Languages I speak" (default: English and Hindi), which tells the speech step what to expect.
2. **Numbers and money in every language.** "paanch sau", "ఐదు వందలు", "1.5 lakh", "dedh hazaar", "₹499" and "four ninety-nine" all become the right amount. A wrong amount must never be saved without a visible flag, the same rule as today.
3. **Dates in every language.** "kal" (which can mean tomorrow or yesterday: the tense of the sentence decides, and an unclear one is marked to check), "parso", "రేపు", "next Friday", "on the 5th".
4. **Titles in the language you choose.** Settings: "Write titles in English" (default, so search and lists stay one language) or "Keep my words". With English, "दूध लेना" becomes "Buy milk". With "Keep my words" it stays as spoken, in its own script.
5. **Names stay names.** List names, merchants ("Swiggy", "DMart") and people's names are never translated.
6. **The review sheet shows what was heard**, in the script it was spoken in, under the plan, so a wrong hearing is easy to spot. Each card works as today.
7. **Type instead** accepts the same mixed text, in any script or in English letters.

## Two steps, and the choices for each

The pipeline stays the same: speech to text, then text to a plan, then review. Each step needs a model that is good at Indian languages and at mixing them.

### Speech to text

| Option                                         | For                                                                         | Against                                                                                |
| ---------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **A. Whisper on Groq, language left open**     | No new provider; a few lines of change; good for Hindi and English          | Weaker on Telugu, Tamil, Odia and others; mixed sentences often come out in one script |
| **B. An Indian speech service**                | Made for Indian languages and code-mixing; some can return English directly | A second provider, key and bill; prices and limits need checking at the time           |
| **C. An open Indian model on the home server** | Audio never leaves the house; no per-use cost                               | Needs a strong machine (likely a GPU); more to run and update                          |

Option B is the likely answer for ten languages. Candidates to compare when this is picked up: Sarvam AI's speech models, AI4Bharat's open IndicConformer models (also the route for option C), and Google Cloud's speech models. None of their current prices, limits or exact language lists have been checked for this spec; that is the first job of step M.0.

O has built multilingual voice in an earlier project (open question 1): reusing what worked there is the fastest path.

### Text to a plan

The Groq language model stays, with a rewritten prompt:

- It is told the transcript may be in any of the chosen languages, in any script, mixed.
- It gets examples in each language (a few per language, chosen from the eval set).
- It returns the same strict JSON plan as today. Titles follow the "Write titles in" setting.
- If the chosen model does poorly on a language in the eval, the fallback is a larger model for that call only.

The resolver (`src/modules/voice/resolve.ts`) does not change: amounts, dates and list matching are still checked in code, not trusted from the model.

## Settings and data

- `user_settings.voice_languages` (text array, default `{en,hi}`), shown as chips in Settings under the voice switch.
- `user_settings.voice_title_language` (`english` | `as_spoken`, default `english`).
- New env (only for option B): the provider's key and model name. Voice still works in English alone without it.
- Nothing else is stored. Recordings are still thrown away after the speech step.

## Privacy

The same as today, said again in Settings: audio and the transcript go to the speech provider and to Groq, and nothing else does. With option B there is a second company in that list, and Settings names it. Option C keeps audio at home.

## Testing

- **Unit:** the Indian number words in every language (a shared table, tested), "kal" by tense, the prompt builder per language.
- **Eval set** (extends `tests/voice/eval.json`): at least 20 commands per language and 40 mixed ones (Hinglish, Telugu with English, Telugu with Hindi), each with the expected plan. Run first as text, then as clips recorded by native speakers (O for Telugu, Hindi and English; others as he can find them).
- **Bar to ship a language:** 85% of its commands give the expected plan with no edits, and no wrong amount without a flag. A language that misses the bar stays out of the Settings list.
- **Fake mode** (`VOICE_FAKE=1`) learns a few Hindi and Telugu sentences, so e2e tests run without any provider.

## Build order

- **M.0 Decide (O):** the open questions below; pick the speech option after comparing them on 30 recorded clips.
- **M.1 Quick win:** stop forcing English on Whisper for users who choose Hindi; prompt and eval for Hindi and Hinglish. Usable alone.
- **M.2 Speech provider** (if B or C): client, env, Settings chips, fall back to Whisper for English.
- **M.3 Understanding:** the multilingual prompt, number and date words, title language setting.
- **M.4 Eval and tune** per language; drop any that miss the bar.
- **M.5 Docs and polish:** review sheet shows the heard text in its script, Urdu right to left, plain-English docs.

## Not in this version

- Spoken replies from Ledge, or reading entries aloud.
- Translating existing tasks or entries.
- The app itself in other languages (i18n stays a non-goal, CLAUDE.md §1).
- Journal dictation (parked in `docs/ideas.md` with the other voice later items).

## Open questions for O

1. **Your earlier project:** which speech service or model did it use, and how did it handle mixed sentences? If it worked well, that is the first candidate.
2. **The languages:** the ten above plus English, or a different set? Which matter most to you first?
3. **Titles:** written in English by default, or kept as spoken?
4. **A second provider:** is a separate speech service and bill acceptable, or should it stay on Groq (option A) or at home (option C)?
5. **Native speakers for testing:** who can record clips for the languages you do not speak?
