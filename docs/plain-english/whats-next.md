# What comes next (the plan after deployment)

Written on 2026-11-13. **Nothing on this page is built yet.** It is the order you chose for the big changes, with honest notes on what each one involves. The fuller, more technical version is in [`docs/ideas.md`](../ideas.md).

## Why wait until the app is on your server

You will use Ledge mostly on your phone. Once it runs on your home server, you can open the real thing on your real phone and see each change as it is made. That is a much better test than a narrow browser window on a computer.

## The order

1. **Fix small bugs** you notice while using it.
2. **Put it on the home server by hand**, following the [deploy guide](../deploy-guide.md), and check it works.
3. **Automatic updates.** After this, saving a change to GitHub is enough: the server fetches it and restarts the app by itself.
4. **The glass look.** A new appearance. No new functions.
5. **Smarter search.**
6. **A phone app.**
7. **Open source.** Make the code public and let other people use and improve it.

Each of the big ones (4, 5 and 6) is finished and working on the server before the next one starts.

## 3. Automatic updates

**What it is.** Today, updating the server means logging in to it and typing commands. The technical name for doing this automatically is CI/CD (see the [glossary](glossary.md)).

**The catch.** Your server is hidden from the internet on purpose. Only the app is reachable, through the Cloudflare Tunnel. So GitHub cannot reach in and tell the server to update.

**The way round it.** The server asks GitHub instead. A small helper program on the server stays connected to GitHub and, when you push a change, it downloads the new code and rebuilds the app. Before that, GitHub can run the automatic checks, so a broken change never reaches your server.

**Kept safe.** Database changes still run as their own careful step, and a backup should be taken before any update that changes the database.

## 4. The glass look

**What it is.** Panels that look like frosted glass: slightly see-through, with whatever is behind them blurred. Apple calls its newest version "liquid glass". The general style is called glassmorphism.

**The tool you found.** A "skill" from the skills.sh website (`liquid-glass-design`). A skill is a set of written instructions that Claude follows. It has not been installed or read yet. Two checks come first: read what it tells Claude to do (it was written by a stranger), and check that it is meant for websites. If it is written for iPhone apps made with Apple's own tools, it can give ideas but cannot be applied directly to Ledge. The fallback is building the glass look by our own rules, which is well understood.

**What can go wrong, and how to avoid it.**

- **Hard-to-read text.** Words on a see-through panel can lose contrast. Each panel needs enough tint that text stays readable in light and dark mode. The automatic accessibility check stays in charge.
- **A slow phone.** Blurring is heavy work for a phone, especially while scrolling. The plan is to use glass on a few fixed parts (the bottom bar, the slide-up sheets, headers, cards), not on every row of a long list.
- **Nothing to blur.** Glass over a plain white page just looks grey. It needs some colour behind it, which is a design choice of its own.
- **People who turn effects off.** Phones have settings for less transparency and less motion. Ledge must show solid panels for them.

**How to try it without risk.** Do it as a separate copy of the code (a branch), on one or two screens first. Look at it on your phone. Then decide whether to continue.

## 5. Smarter search

**How search works today.** It is not brute force, at least not for tasks.

- **Tasks:** the database keeps a prepared index of the words in every task, like the index at the back of a book. Looking something up is quick even with hundreds of thousands of tasks.
- **Expense entries:** a simpler "does this text contain these letters" check that reads through your entries one by one. That is fine for several thousand entries.
- **Journal:** not searched yet.

**An honest point.** One person's data, even after many years, is small for a database. Search will not become slow. What today's search cannot do is understand **meaning**. Searching "doctor" will not find "dentist appointment". And it cannot answer a **question** such as "how much did I spend eating out in March?". Those are the real reasons for this change.

**The two ideas.**

- **Vector search.** A language model turns each task, entry or journal page into a list of numbers that captures its meaning. Texts with similar meanings get similar numbers. Search then finds things that mean the same, not only things spelled the same. Ledge's existing database can store these numbers with an add-on called pgvector, so no second database is needed.
- **RAG.** Short for "retrieval-augmented generation". First find the most relevant pieces of your data, then hand them to a language model and let it write an answer in sentences.

**Suggested steps.**

1. Give expense entries and journal pages the same fast word index tasks have, and make search forgive typos. No AI needed. Small job.
2. Add search by meaning. Medium job.
3. Add a question box that answers and shows which entries it used. Big job. For money questions the database must do the adding up, because language models make arithmetic mistakes.

**The decision that must come first.** Which language model does the work?

- **One running on your home server:** nothing leaves your house. It needs a reasonably strong machine, and it is slower and less clever.
- **One on the internet (for example Claude):** better and faster, costs a little each time, but your tasks, spending and journal text are sent to that company to be processed.

This is the same choice that is holding back the journal's AI ideas. Until you choose, AI features stay off the list.

## 6. A phone app

**The good news.** Your data lives in one place: the database on your home server. The website is only a window onto it. A phone app would be a second window onto the same data. So the two can never disagree, and there is no second database to build. It can all stay in this one project.

**Three ways to do it, smallest first.**

1. **Make the website installable** (called a PWA). You tap "Add to Home screen" once. After that Ledge has its own icon, opens full screen with no browser bars, and sits among your apps. It works on Android and iPhone. It is the same code, so every update to the server is instantly an update to the app. A few days of work at most. It will not be in the app stores, and it needs a connection to your server to work.
2. **Wrap the website in a store app.** A thin shell that opens the site, so it can be listed in the Play Store. Apple often rejects such shells and charges a yearly fee.
3. **Build a true phone app.** A second front end made of real phone parts. It can live in this project next to the website and share some code. But the server would need a new doorway for apps to talk to (an API), a different way of signing in, and every screen would be built a second time. That is weeks of work, and every future feature is then built twice.

**The hard part is working offline.** Apps like Notion let you make changes with no signal and merge them later. That needs a copy of the data on the phone and careful rules for when the phone and the server disagree. It is a large project on its own. While online, the installable website already behaves like "one session on phone and web" today.

**Recommendation.** Do the first way soon after deployment. It is small, and it makes daily use and testing on the phone nicer. Use it for a while. Build the true app only if something specific is missing, such as offline use, home-screen widgets or notifications.

## 7. Open source

Before the code is made public: check that no passwords, secrets or personal details are anywhere in the project's saved history, pick a licence (the legal note saying what others may do with the code), and tidy the instructions for strangers.

Letting other people have accounts on your server is a bigger step. It needs email (to confirm addresses and reset passwords), privacy wording, and backups that now hold other people's finances. That needs your decision first.

## What is not decided

- Where the two unfinished extras (export your data, select many tasks at once) fit in this order.
- Which language model to use for smarter search.
- Glass by the skill you found, or by our own rules.
- Whether the phone app stops at the installable website.
- The licence.
