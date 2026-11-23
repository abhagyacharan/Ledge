# Phase 15: Plans

Built on 23 November 2026, at your request, from the screens you drew in Claude Design (8a to 8n). It replaces the one-page planner from Phase 14. That page's old address, `/plan`, now opens the new one.

## What it is

Plans is a module of its own, like Tasks or Journal. It sits in the sidebar after Journal, with a small number showing how many plans are active. You describe a goal in your own words. Ledge asks you a few questions, then drafts a plan of dated tasks. You keep or cut each task before anything is saved. Unlike the old planner, **a plan stays**. It has its own page and its own history, and you can come back to it, add to it, move it, finish it or delete it.

## Making a plan

1. **Your goal.** You write it in a big box, for example "I want to start freelancing. I'm a beginner and have no idea what to do. People say it's more about sales than skills." You can also tap **Speak your goal** and say it out loud. Three example goals are there if you want a start.
2. **Two basics.** How long the plan should run (1 week, 2 weeks, 1 month, 3 months, or a date you pick, up to 6 months away) and how much time you can give it (15 minutes a day up to 2+ hours, or weekends only). Ledge asks these itself, so they cost nothing. A line underneath adds up the hours, for example "About 15 hours in all, Mon 23 Nov to Tue 22 Dec."
3. **Questions written for your goal.** Usually 3 to 6, **one per screen**. There are four kinds:
   - pick one answer (it moves on by itself after you tap);
   - pick several;
   - a 1 to 5 scale, such as "How confident are you in the core skills?";
   - a sentence or two of your own.

   Every question has **Type my own** and **Skip**. Tapping **Type my own** turns that row into the box itself: you type straight into it, and it grows downwards as you write instead of scrolling sideways. It has a microphone, so you can say your answer instead, and the questions that ask for a sentence have a **Speak it** button too. On a keyboard, the number keys pick an answer and Enter moves on. On the 1 to 5 scale, the number you pick simply changes colour.

4. **Follow-ups**, sometimes. If one of your answers leaves a real gap, Ledge asks up to 3 more questions, where you can always pick **several** answers, and says why: "Because you want to avoid cold calls and need a target audience". This happens at most once per plan. If Ledge has nothing to ask, the step is skipped.
5. **Making your plan.** This takes about 10 to 20 seconds. You can leave the page; the plan waits in Drafts. If it fails, your answers are kept and **Try again** sends them again.
6. **Review.** See the next section.

Everything is saved as you go. A half-made plan shows on the Plans page as a draft, for example "Draft · question 3 of 5", with **Continue** to pick up where you stopped.

## Reviewing a plan

The plan comes in **phases**, such as "Week 1 · Define offer and pricing" and "Week 4 · Outreach and pitch". Each task has a date, a priority, a time estimate ("about 30 min") and a line on how to do it and why. Some tasks have small steps under them (subtasks). Daily practice is one repeating task, never 20 copies. One to three tasks are **milestones**, the checkpoints the plan builds towards, such as "Land your first client".

Ledge writes the plan itself. It never gives you a task like "make a checklist" or "plan your next steps": if a checklist would help, its items are written into the task as small steps. Every task names the real topic ("Read about the CAP theorem", not "study system design"). The plan covers your whole goal, not only where it starts, and fills the time you gave it (about 15 to 20 tasks for a month, 25 to 30 for three months). Only about one task in four is marked High, so High still means something.

When you edit a task, the date, priority, time, repeat and phase are small buttons that open a tidy menu.

There are two ways to go through it, and Ledge remembers which one you used:

- **Cards.** One task at a time, filling the card. → (or a swipe right) keeps it. ← or X (or a swipe left) cuts it. E edits it in place. Each keep or cut shows a message with **Undo**. Cut cards go to a **Cut** tray, where you can bring any of them back. **Skip to summary** jumps to the end.
- **List**, the default on a computer. Every task on one line, grouped by phase, with a summary panel on the right. J and K move up and down, X cuts, E edits. A cut task stays in its place, crossed out, so bringing it back is right there.

At the end, **Add plan** (or Ctrl+Enter) saves the plan and every task you kept, all at once. If anything goes wrong, nothing is saved. A message says "Added 13 tasks to …", with **Undo**, which takes the whole plan back to the review. Above the button, **Create a new list?** is on to start with: the tasks go into a new list, and you can change its name. Turn it off and you pick one of your lists instead.

## A plan's page

- The plan's progress ("0 of 13 done · 29 days left"), its dates, and how much time a day it expects.
- Its tasks, phase by phase. These are your real tasks, the same ones that show in Today and Upcoming. You tick them, open them and undo them exactly as you do in Tasks. On a computer, finished tasks fold away under each phase, so the next step stays near the top. When you open a task, its panel shows which plan and phase it belongs to, and links back.
- **Add more tasks.** Ledge looks at what you have done and suggests next steps. You review them the same way.
- **Resources.** Books, courses, video channels, communities and tools that could help, each with a line on why. Ledge **never shows a web link the AI wrote**, because AI tools make up addresses. Instead, each resource has a **Search** button that opens a web search, or a YouTube search for a channel. You can mark one as used, remove it, or add your own, with a link you paste in yourself.
- **What you told Ledge.** Your goal and every answer, kept with the plan.
- **AI used for this plan.** For example "3 requests · 5,802 tokens · about $0.002 (₹0.18)".
- **The ⋯ menu:**
  - **Rename.**
  - **Reschedule:** move every open task by a number of days, or spread them to a new end date. It shows how the first and last dates will move before anything changes.
  - **Mark done.**
  - **Archive:** hides the plan and leaves its tasks alone, with Undo.
  - **Delete:** the plan goes to Trash for 30 days. A box, ticked by default, moves its tasks to Trash too.

  A finished plan says "Nicely done" and offers **Plan what's next**.

## The Plans page, Home and Trash

- **Plans** lists every plan as a card: a progress ring, the next task, the days left, and on a computer one line per phase. The filters are Active, Drafts, Done and Archived.
- **Home** has a Plans card showing the most recent plan and its next step.
- **Trash** shows deleted plans, which you can restore or delete forever.

## What the AI costs, and where to see it

Every request Ledge makes to Groq, for voice or for plans, is now counted. Only the numbers are stored (how many words-pieces, called tokens, went each way, and seconds of audio), never what you said or typed.

**Settings → AI usage** shows this month and last month, split into Voice and Planner, with an estimated cost in dollars and rupees. Groq bills in dollars. You can change the rupee rate under Preferences ("Rupees to the dollar", ₹85 to start). On Groq's free plan you are not charged at all; the figure is what the same use would cost on the paid plan.

The real freelancing plan made while testing cost **about $0.003, well under one rupee**. That covered the questions, the follow-ups, the plan itself and one round of "Add more tasks".

## What was checked

- All automatic tests pass (733), including new ones for:
  - the plan rules;
  - saving everything or nothing, and Undo;
  - deleting and restoring;
  - drafts picking up where they stopped;
  - the cost maths;
  - another person's plans being refused.
- In the browser, at computer size, in dark and light, with your real Groq key, the whole journey was tried:
  - goal, basics, all four kinds of question and two follow-ups;
  - the list and card reviews with the keyboard, then Add plan;
  - the plan page, resources and Add more tasks;
  - the reschedule preview, the Plans page, the Home card and the AI usage card in Settings.

## Not done yet

- **Phone polish.** It works at phone size, but it hasn't been tuned or tried on your phone. You asked for the computer version first.
- **The automatic browser test** for plans is written but not run (the browser tests are not run on this machine at the moment).
- Swiping cards has only been built, not tried with a finger.
