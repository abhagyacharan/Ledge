# Phase 7: The expense tracker (your Google Sheet, built into Ledge)

**Status:** Done on 2026-11-11.

## What this phase is for

You kept your money in a Google Sheet called "Personal cash flow & expense dashboard". This phase builds the same thing inside Ledge, so your tasks and your money live in one private app, and so it can do a few things the sheet could not (Undo, Trash, search, repeating loan payments, a phone-friendly layout).

You asked for this **before** putting Ledge on the home server. So the order of the remaining work changed: the expense tracker is now Phase 7, then a visual redesign (Phase 8), then deployment and backup (Phase 9), then the extra to-do features (Phase 10). The old "empty placeholder for expenses" phase is gone, because the real thing replaces it.

## Where you find it

- In the side menu there is one new item, **Expenses**.
- Inside it, a row of tabs across the top: **Summary**, **Income**, **EMIs & loans**, **Expenses** and **Investments**. On a phone the row scrolls sideways inside its own strip, so the page itself never wobbles sideways.
- Under the tabs is a **period picker**: arrows for the previous and next month, a month menu (January to December, or "Whole year") and a year menu. The tabs share it, so if you pick September on the Summary and then open Income, you still see September. The choice is stored in the web address, so you can bookmark "March 2026" and it survives a reload.
- The command box (Ctrl+K) can jump straight to any of the five tabs.

You asked for four tabs. I made **five**, because you described EMIs and loans as having their own columns and their own tile. If you would rather have EMIs inside the Expenses tab, that is easy to change later.

## The Summary tab

For the month (or the whole year) you picked, it shows what your sheet showed:

1. **Total inflows.** All the income.
2. **Total EMIs & loans.** All the instalments due in that month. A small line underneath says how much is paid, how much is still to pay, and how many are delayed.
3. **Living expenses.** All the spending.
4. **Net savings.** Inflows, minus EMIs, minus expenses. If it is below zero it shows a minus sign **and the word "Overspent"**, so the meaning never depends on colour alone.
5. **Savings rate.** Net savings as a percentage of inflows, to one decimal place (for example 47.4%). With no income it shows "—" instead of a silly number.

Two extra tiles that the sheet did not have: **Invested** (money you put into investments that period) and **Left after investing** (net savings minus what you invested). Investments do not count as spending, so they never change net savings or the savings rate.

Below the tiles:

- **Expense breakdown by category.** Every category in a table with the amount, its share of the total, a small bar, and how many items. Categories with nothing spent stay in the list showing zero, like your sheet.
- **Annual cash flow trend, January to December.** One row per month (inflow, EMIs and debt, expenses, net savings, savings %) and a **Full year total** row. The month you picked is highlighted and also marked in words. Above the table is a small bar chart (inflow against outflow per month). The chart is only a picture for people who like pictures; the table says the same thing in words, and that is what a screen reader reads.
- If the period has nothing in it, a short message and an **Add income** button.

**Check against your sheet:** the demo data for the current month is set up to match your screenshot (₹28,000.00 in, ₹10,142.00 of EMIs, ₹4,600.00 of expenses, ₹13,258.00 net savings, 47.4% savings rate), and I looked at the real page to confirm those numbers appear. They do.

## The four entry tabs

Each of Income, EMIs & loans, Expenses and Investments shows the entries of the chosen period. On a computer they are a table; on a phone they are cards. Each has:

- the **total** for the period and the **number of entries** at the top,
- an **Add** button that opens a small form, and clicking a row opens the same form to **edit**,
- **Delete**, with an **Undo** message for 5 seconds. Deleted entries go to the **Trash**,
- a **category filter**, a **sort** (newest, oldest, biggest, smallest) and a **search box** over the name and notes. These are kept in the web address too,
- a friendly empty message with one action when there is nothing yet.

The fields, as you described them:

- **Income:** date, income stream (for example "Salary"), category, amount, notes.
- **EMIs & loans:** type (fixed EMI, loan repayment, credit card bill, other), due date, loan or debt name, lender, category, amount, status (**Scheduled**, **Paid** or **Delayed**), the date it was paid, notes. (You said "bonus type" for the first one; I took that to be a slip of the tongue for "type".)
  - A **Mark paid** button on each row sets it to paid today in one click.
  - A scheduled EMI whose due date has passed shows an **Overdue** label (words and an icon). Its saved status is not changed, so you stay in control of it.
  - When adding an EMI you can choose **"Repeat monthly for N more months"** (0 to 60). It then creates the whole series for you in one go, all as Scheduled. If a month has no 31st, it uses that month's last day, and the later months go back to the 31st.
- **Expenses:** date, item, category, payment method (UPI, cash, debit card, credit card, net banking, other), amount, notes. This tab also shows how much went through each payment method.
- **Investments:** you left these fields to me, so: date, investment name, type (mutual fund, stocks, fixed deposit, recurring deposit, retirement such as PPF, EPF or NPS, gold, crypto, real estate, other), platform (the broker or app), amount, notes. This tab shows the total by type.

The **categories** are fixed lists. The nine expense categories are the ones from your sheet (Housing & Utilities, Food & Groceries, Transportation, Healthcare, Dining & Entertainment, Shopping, Personal Care, Subscriptions & Tech, Miscellaneous). I chose the lists for income, EMIs and investments. Letting you add your own categories is parked in `docs/ideas.md`.

## How money is handled (so the numbers are always exact)

- Money is stored as a **whole number of paise** (₹28,000.00 is stored as 2800000). Computers make tiny rounding mistakes with decimals ("0.1 + 0.2" is not exactly 0.3), which is unacceptable for money. Whole numbers cannot do that.
- Percentages (the savings rate) are worked out with whole-number maths too, never with decimals.
- Amounts are shown the Indian way, with lakh grouping: `₹1,23,456.00`. The currency and style come from your Settings (rupees and Indian style by default).
- When you type an amount, Ledge accepts `1234`, `1,234.5` or `₹ 1,23,456.78`. It refuses negatives, more than two decimal places, letters, an empty box, zero, and anything above ₹1,000,000,000 (a typo guard), each with a clear message.

## What changed underneath

- **One new table** in the database, `finance_entries`, holds all four kinds of entry. They share almost all their columns, so one table means Trash, ownership checks and clean-up work once instead of four times. A few columns are used by only one kind (for example "lender" only for EMIs). The database itself rejects a row of the wrong shape (an income entry with a lender, an unpaid EMI with a "paid on" date, an amount of zero), so even a bug in the app could not save one.
- **Your entries are yours alone.** Every function that reads or changes money first checks which user is asking and only touches that user's rows, exactly like the task code. A test creates two users and proves user B cannot see, change, delete, restore or count user A's entries.
- **Trash covers money too.** Deleting an entry hides it for 30 days, the Trash page lists it with the tasks (restore, delete forever), and the automatic clean-up erases old ones.
- **The "do it safely" wrapper is now shared.** The small piece of code that checks you are signed in, checks the information, and returns a tidy success-or-error answer was moved out of the to-do code so the expense code uses the very same one.
- **The demo data** (`pnpm db:seed`) now also creates 81 money entries: this month matching your sheet, a few earlier months so the yearly trend has a shape, loans with different statuses, and some investments.

## Things the checks found and fixed

The automatic accessibility inspector and the phone-size checks (both from Phase 6) were run on all five new screens in light and dark, and on the four "add" forms. They found and I fixed:

- Grey caption text on the pink-tinted tile was a shade too faint (contrast 4.3 to 1; the minimum is 4.5). Captions are darker now.
- The tiles were built in a way that confuses screen readers (a list of "term and meaning" with a stray paragraph inside). Rebuilt.
- The **Mark paid** button's hidden name did not start with its visible words, so voice control saying "click Mark paid" would not find it. Fixed (same lesson as Trash's "Delete forever").
- On a phone, the two wide tables on the Summary stretched the whole page 246 pixels sideways. Now they scroll inside their own box and the page stays put.
- The period arrows could use the old address if you clicked twice quickly. The label now changes instantly and the second click moves on from there.
- A harmless but untidy warning from the form's drop-down boxes (they started "empty" and became "filled") was cleaned up.

## Decisions in plain words

- **One table for all four kinds.** Simple, and everything that already protects tasks protects money.
- **EMIs count in the month they are due, whatever their status.** A loan instalment is owed either way. The EMI tile still tells you how much is paid and how much is left.
- **Investments are not spending.** Putting money into a fund is saving, not losing; so it has its own tiles and does not reduce your savings rate.
- **Fixed categories for now.** Cleaner data today; your own categories can come later without redoing the database.
- **Delete has Undo instead of a question.** The same as tasks: one click, a 5-second Undo, and 30 days in the Trash.

## How you can see it working

1. Run `pnpm db:seed`, then `pnpm dev`, sign in as `demo@ledge.test` (password `demo-password-123`) and open **Expenses**. The current month shows your sheet's numbers.
2. Use the arrows and menus to move to earlier months and to "Whole year". Watch the table and the bar chart.
3. On **EMIs & loans**, press **Mark paid** on a scheduled loan and watch the summary tile change. Add a new EMI with "Repeat monthly for 3 more months".
4. Delete an expense, press **Undo**; delete it again and find it in **Trash**.
5. Shrink the window to phone width and try the tabs, the cards and the add form.
6. Run `pnpm test` and `pnpm test:e2e`.

## What was checked, and what was not

Checked:

- **361 unit and integration tests and 74 browser tests pass** (the browser tests run in two sizes, computer and phone).
- The money helpers, the summary maths, the EMI repeat dates and the form rules have their own tests (lakh grouping, rounding refusals, month ends, leap years, negative savings, empty periods, whole year).
- Tests against a real database cover create, edit, delete, restore and delete forever for each kind, the database refusing malformed rows, period totals, the 30-day clean-up and **ownership**.
- Browser tests add one entry of each kind and watch the summary follow, change the period, edit, delete and Undo, run the accessibility inspector on every new screen in light and dark, and run the phone-size rules on every new screen and on the add form.
- I opened the Summary in a real browser and compared it to your sheet.

Not checked or not built:

- **A real screen reader** and **a real phone** have not been used on these screens (same limit as before).
- **Not built (on purpose, parked in `docs/ideas.md`):** your own categories, monthly budgets, automatic recurring income and expenses, import from bank or UPI statements, investment value and returns, several currencies, more charts, exporting the money data (that joins the "export" feature in Phase 10).
- The look is functional and consistent with the rest of Ledge. The visual redesign you asked for is Phase 8.
