# Phase 12: Voice capture, in plain English

_Built on 2026-11-15. Tried with the real Groq key on 2026-11-16 (it works); not yet tried with a real phone microphone; see "What is not checked yet" at the end._

## What it is

Typing everything in is the main reason people give up on apps like this. Voice capture lets you say it instead.

- **On a phone:** press and **hold** the round **+** button. After a moment a sheet slides up and listens. Say something like "spent 500 on petrol today" or "create a list called Photography with two tasks, take 5 photos of the sun and click 10 photos of the moon today". **Let go** to finish. **Slide your finger down** before letting go to cancel. A normal quick tap on + still opens the usual add sheet.
- **On a computer:** press **v** (when you are not typing in a box), speak, then press **v** or **Enter** again to finish. There is also a small microphone button at the top of the Add a task and Log a transaction sheets, and "Speak to add" in the Ctrl K list.
- **No microphone, or rather type?** Every voice sheet has **Type instead**. You write the sentence the way you would say it, and the rest works the same.

## What happens after you speak

1. **The sound becomes words.** Your recording goes to Ledge's own server, which passes it to **Groq**, a company that runs AI models quickly. Groq's speech model, **Whisper**, writes down what you said (the **transcript**). Ledge gives Whisper a short list of words to spell right, such as your list names and the names you use most often for expenses.
2. **The words become a list of things to add.** A **language model** (an AI that understands sentences), also at Groq, reads the transcript together with today's date, your list names, the expense categories, payment methods and your unpaid EMIs. It answers in a strict, fixed format (a **structured output**), so the app always knows what it is getting.
3. **Ledge checks everything.** The AI only suggests. Ledge's own code checks every detail against your real data. A list name you said that does not exist becomes a new list. An amount it cannot read is flagged. A date more than a year away is ignored. An EMI it is not sure about (or whose amount is more than 1% off what you said) asks you to pick it.
4. **You check the cards.** The sheet shows one card for each thing: a task, a new list, an expense, income, an investment, or "EMI paid". Every field can be changed. Things the AI decided by itself, like the category or Need or Want, carry a small **guessed** mark, so you know what to glance at. Remove anything with ×. Anything it could not understand appears as a "Not understood" card, with a button to add those words as a task instead.
5. **Nothing is saved until you tap Add.** The button says how many things it will add. They are all saved together, or none at all if anything fails. A message at the bottom says what was added ("Added 2 tasks and 1 expense") with **Undo**, which takes the whole thing back, including putting an EMI back to unpaid.

When you do not say something, the usual default is used: tasks go to General with no date, money is dated today, the payment method is the one you used last (or UPI), and the category is the AI's best guess (Miscellaneous if it has none).

## Switching it on

The key goes in `.env` (the private settings file), **never** in `.env.example` or `.env.production.example`: those two are templates that are saved in git and shared, so a key there would be published.

Voice needs a **Groq API key** (a password-like code from your Groq account, at console.groq.com). It goes in the server's settings file (`.env`) as `GROQ_API_KEY`. Without a key, voice is simply off: the + button only taps, and no microphone buttons appear.

Once the key is there, **Settings > Preferences** has a **Voice capture** switch, so you can turn it off for yourself at any time.

The microphone only works over HTTPS (the padlock in the address bar), which your Cloudflare tunnel already gives you. The browser asks for permission the first time.

## Privacy

- Your recording goes from your phone to your own server, then to Groq. Ledge keeps it only in memory while it is being sent and never saves it.
- The words and the AI's answer are not saved either. Only the tasks and entries you add remain, exactly as if you had typed them.
- What Groq itself keeps is decided by Groq's own data policy. Read it before switching voice on.

## Limits and costs

- One recording can be up to a minute long.
- On Groq's **free plan**, each AI model can take 8,000 "tokens" (pieces of words) a minute. One command uses about 1,900, so about four commands a minute fit. Used one at a time that is plenty; if you speak many in a row you may see "Voice is busy right now" for up to a minute. A paid Groq plan raises the limit.
- Each person can make 20 voice requests a minute and 300 a day (the daily number can be changed with `VOICE_DAILY_LIMIT`). This stops a stuck button or a mistake from running up a bill.
- One command can hold up to 10 things. More than that, and it asks you to say the rest in a second go.
- Cost: speech-to-text is about $0.04 per hour of audio, with each request billed as at least 10 seconds, so roughly a hundredth of a rupee per command. The language model adds a similarly tiny amount.

## Trying it without a key

For testing there is a **fake mode**: `VOICE_FAKE=1` in the settings makes Ledge answer from simple built-in rules instead of calling Groq. It understands the example sentences above and simple variations, and is used by the automatic tests. It is not meant for real use.

## What is not checked yet

- **Real Groq calls: now checked (2026-11-16).** With your key, Whisper wrote down a test recording word for word, and the language model got your example sentences right. A short 60-sentence accuracy test from the plan is still to do.
- **A real microphone.** The browser used for checking blocks the microphone, so recording itself has not been tried; holding +, the "needs the microphone" message, typing instead, the review cards, saving and Undo were all checked. Please try holding + on your phone once it is deployed.
- **The browser tests** for voice were written but not run (pnpm is blocked on this computer).
- The test set of 60 or more real sentences from the plan (to measure how often the AI gets it right) needs the Groq key, so it is still to do.
