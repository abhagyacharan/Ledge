# Phase 14: The goal planner and voice in more languages

Built on 22 November 2026, at your request ("plan and implement"). Two features that both use Groq, the AI service already chosen for voice capture.

## 1. Plan a goal

**What it does.** You tell Ledge a goal in your own words, for example "Learn photography in 2 weeks, to a beginner level, practising every day". Ledge asks a few quick questions you answer by tapping, such as "What type of photography are you most interested in?" (People, Nature, Street, Vehicles, Food) and "How much time can you spend each day?". Then it shows a plan:

- a **new list** for the goal (you can rename it, or put the plan in a list you already have), with the plan's last day as the list's target date;
- **up to 20 tasks**, each with a date and a priority, in the order to do them, such as "Take 5 candid street portraits";
- daily practice as **one repeating task** that ends with the plan, such as "Practise shooting people for 30 minutes, every day until 5 Dec". It is never 14 copies.

You can change any task (its words, date, priority or repeat), remove one, or add your own. **Add all** saves the list and every task in one go. If anything goes wrong, nothing is saved. A message then says "Added 12 tasks to Photography", with an **Undo** button that takes the whole plan back.

**Where to find it.** The sparkle button at the top of the Tasks pages (on a computer it says "Plan a goal"), or "Plan a goal" in the command palette (Ctrl+K).

**Why it is built this way.**

- **You always review first.** The AI suggests; nothing is saved until you press Add all.
- **The app checks the AI's work.** Dates must be between today and 90 days ahead, there are at most 4 questions and 20 tasks, and a repeating task always has a start and an end. Anything the AI gets wrong is fixed or marked on the card for you to check.
- **It never lands in General by itself.** A goal gets its own list, unless one of your named lists is clearly about it. You can still choose General yourself.
- **Little leaves your server.** Only your goal, your answers, today's date and the names of your lists go to Groq. Never your tasks, your money or your journal.

**What was checked.** All automatic tests pass, including new ones for the plan rules, saving everything or nothing, Undo, and another person's lists being refused. In the browser it was tried with your real Groq key. The photography goal above gave two questions, then a 13-task plan in a new Photography list with daily practice as one repeat. Removing one task and pressing Add all created the list with 12 tasks. The first try put the plan in General and asked no questions; the instructions to the AI were fixed and it was tried again.

**Not checked yet:** your real phone, and the browser test written for it (the automatic browser tests have not been run).

## 2. Voice in your languages

**What changed.** Voice capture used to tell the speech service to expect English only. That is why Hindi came out written in English letters or half translated, and Telugu did not work. Now:

- **Settings → Preferences → "Languages I speak"** lets you pick from eleven languages: English, Hindi, Bengali, Marathi, Telugu, Tamil, Gujarati, Urdu, Kannada, Odia and Malayalam. English and Hindi are on to start.
- If you pick only English, the speech service is told "English", as before. If you pick one other language (with or without English), it is told that language. If you pick several, it works out the language itself, which also lets you mix them in one sentence.
- The AI that turns your words into tasks now knows you may speak any of these, or mix them. It knows Indian number words ("paanch sau" is 500, "dedh hazaar" is 1,500) and that "kal" means tomorrow or yesterday depending on the tense. Names of lists, shops and people are never translated.
- **"Write titles in"**: English (the default, so your lists stay in one language) or "As I said them", which keeps your own words in their own script.
- The words Ledge heard show in their own script on the review sheet, and Urdu reads right to left.

**Why no new service.** A speech service made for Indian languages could hear Telugu or Odia better, but it would mean a second company, a second key and a second bill. This first step uses only Groq. If some languages are heard badly, that is the next step (`docs/voice-multilingual-spec.md` lists the choices).

**What was checked.** Automatic tests for the language rules, the instructions to the AI, the new settings and the practice mode. In the browser, turning Telugu on in Settings was saved and still on after reloading.

**Not checked yet:** real speech in any language other than English. That needs your microphone and real sentences, ideally recorded by people who speak each language.
