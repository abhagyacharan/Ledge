# Phase 11: The journal

**Status:** built on 2026-11-12 and checked by hand in a browser. The automatic browser tests for it are written but have not run yet, because the tool that starts them (pnpm) is blocked on this computer by a Windows security setting.

## What it is, in one paragraph

The journal is a private diary with one page per day. At the top of each page, Ledge shows a few plain facts about that day, taken from your tasks and your money: how many tasks you finished, how much you spent, what slipped, and, on days that had any, money that came in or was saved. Each fact opens the matching screen, already narrowed to that day. Below the facts you can pick a mood and write. There is no artificial intelligence (AI) in it yet. You chose to start with plain facts and add AI later.

## Why it exists

You first asked for a blog. A blog is public and a journal is private, so we talked about how the two fit together. The plan we chose: write privately first, and later add a way to turn a chosen entry into a separate public post. The private page never becomes public by accident. The journal is useful on its own and needs nothing public, so it was built first. It took the Blog placeholder's place in the side menu and on the phone's bottom bar.

## How it works, piece by piece

### One page per day

- Each date has exactly one page. Write in the morning, come back in the evening, and you are adding to the same page.
- You can open any earlier day, but not a future one: there is nothing to write about tomorrow yet. If someone types a future date into the address, Ledge shows today instead, and the server refuses to save a page for the future.
- The page is plain text, up to 20,000 characters (about 15 printed pages). A small counter appears only when you are close to the limit. There is no formatting toolbar; a "rich-text editor" was ruled out for this version to keep things simple.
- **It saves by itself (autosave).** Your words save a moment after you stop typing, when you click away, when you pick a mood, and when you move to another day. A line under the box says "Saving…" and then "Saved · 8:42 pm". If the internet drops, it says the page is not saved yet and tries again as you keep typing. Closing the browser tab with unsaved words asks you first.
- If you delete every word and clear the mood, the page is removed completely rather than kept as an empty page.

### Mood

Five small faces, from Rough to Great. Picking one is optional. Tap the chosen face again to clear it.

### Choosing a day

The pill at the top works like the month picker in Expenses, but one day at a time:

- **Arrows.** They move back or forward one day. "Forward" stops at today.
- **The pill.** It shows "Today · 12 Nov", "Yesterday · 11 Nov" or the weekday. Tapping it opens a month of days:
  - a small dot under a day means you wrote on that day;
  - today is shown in orange;
  - future days are greyed out.
- **The month name.** Tapping it switches to the twelve months, so you can jump far back quickly.
- **Today.** This button brings you back to today.

### The facts at the top

| Fact               | What it says on a busy day                                                                    | What it says on a quiet day                                                   | Tapping it opens                            |
| ------------------ | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------- |
| Tasks done         | "4 done", and the lists they came from                                                        | "Nothing ticked off yet" (today) or "A rest day"                              | Completed tasks, that day only              |
| Money spent        | "₹1,240 spent", how much was on wants, the main category, and how it compares to a usual day  | "Nothing spent yet" (today) or "No-spend day. Nothing went out. Nicely done." | The Expenses tab, that day only             |
| Slipped            | "2 slipped" (tasks due that day still not done), or "2 still open" while today is still going | "All caught up", "Nothing slipped" or "Nothing due"                           | Today, where overdue tasks are listed first |
| Money in and saved | "₹5,000 invested", "₹50,000 came in" or "₹12,000 EMI due"                                     | not shown at all                                                              | The matching Expenses tab, that day only    |

A few details:

- **"A usual day"** means your average daily spending over the 30 days before. Within a quarter either way counts as "about your usual".
- **The main category** ("mostly Eating out") is named only when it is at least half of the day's spending.
- **Why the money card hides on quiet days:** you said you do not invest every day. A message every day saying "you did not invest" would nag, so that card only appears on days that had income, an EMI or an investment. The other three always appear. On quiet days they use friendly words and a green icon instead of a bare zero.
- **Folding.** As soon as you start writing, the facts fold into one line, for example "4 done · ₹1,240 spent · 2 slipped". That keeps the page calm and leaves room to write. Tap the line to open the facts again, or use "Fold away" to fold them yourself.
- **Layout.** On a phone the facts are one card of rows. On a computer they are tiles side by side.

### Need or want on expenses

When you add or edit an expense, there is a new, optional choice: **Need** or **Want**. It looks like the category and payment method choices. Tap the chosen one again to clear it. The label shows on the expense's line ("Food & Groceries · UPI · Need"). The Expenses tab gets "Any / Needs / Wants" buttons once any expense in the month has a label. The journal uses it to say things like "₹900 on wants". The demo account's groceries and transport are marked Need, and dining out and subscriptions Want.

### One day at a time in Expenses and Completed

So that the journal's facts can open "just that day", two screens learned to show a single day:

- **Expenses tabs.** A dark chip shows the day; tap it to see the whole month again. On a day with no spending, the Expenses tab now says "A no-spend day" instead of "No entries match these filters".
- **Completed tasks.** It says "Finished on Tuesday · 10 Nov" and has a "Show every day" button.

## Privacy

The journal is the most personal thing in Ledge.

- **Only you can see it.** Every way of reading or saving a page checks that it belongs to the person signed in. Automatic tests prove that another account can neither read, list, overwrite nor delete your pages.
- **Where it is kept.** Pages live in the same database as everything else and are included in the nightly backups. Like the rest of the data, they are stored as plain text, not scrambled. That is fine while only you use the server. It matters more if other people use Ledge one day, because they would be trusting your server with their diaries.

## What was checked

- **Automatic tests (all pass, 452 in total).** They cover the wording of every fact on busy and quiet days, the calendar maths (leap years, month lengths, weeks starting on Monday or Sunday), the rules on what a page may contain, saving and deleting pages, privacy between two accounts, counting tasks by your own timezone (a task finished at 11:30 pm counts for that day), the money adding-up, and the rule that only expenses can be marked Need or Want.
- **By hand in a browser.** On a computer and on a phone-sized screen, in light and dark:
  - the facts and how they fold;
  - typing and seeing "Saved";
  - the mood surviving a reload;
  - the day picker with its dots;
  - the facts opening the right day in Expenses;
  - the Need/Want choice in the expense form.
- **Not yet run.** The automatic browser tests for the journal (written in `tests/e2e/journal.spec.ts`), and the updated side-menu, phone and accessibility tests. They need pnpm, which Windows is currently blocking.

## Not in this version (saved in `docs/ideas.md`)

- **AI ideas:** a short AI reflection on your day, a weekly AI look-back, AI questions to answer, and an AI first draft. These wait until you choose which AI service to use. One option sends the day's data to an outside company; the other runs on your own server but writes less well.
- **"On this day":** the same date a month and a year ago.
- **A weekly review page.**
- **Posting an entry as a public blog post.** This would copy the entry into a separate post, so the private page never changes.
- **Journal pages in search and in the data export.**

## Decisions in plain words

- The journal replaced the Blog placeholder. A blog may come later as "post this entry".
- One page per day, editable all day and on any past day.
- Plain facts now, AI later.
- The money card hides on days with nothing to show; the others always show, with kind words on quiet days.
- Need · Want is the only spending label, and it is optional.
- Showing one day in Expenses is a filter on top of the chosen month, so the month picker and the PDF reports did not change.
