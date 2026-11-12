# Expense tracker spec (Phase 7)

Written 2026-11-10 from O's description and a screenshot of O's Google Sheet. O asked for the same functionality as the sheet, with the design left to us and "better where we can". Where O left a choice open, the choice below is ours and is logged in `docs/decisions.md`.

## Where it lives

- One **Expenses** entry in the sidebar (under "Modules"), at `/expenses`.
- Inside it, a **horizontal tab bar** at the top (scrolls sideways on a phone):
  **Summary · Income · EMIs & loans · Expenses · Investments**
  (O described EMIs & loans as its own tab with its own columns and its own tile on the summary, so it gets its own tab: five tabs, not four. Merging it into Expenses later is easy.)
- Routes: `/expenses` (Summary), `/expenses/income`, `/expenses/emis`, `/expenses/spending`, `/expenses/investments`.
- Under the tab bar, a **period picker** shared by every tab: previous and next month arrows, a month menu (January to December, or "Whole year") and a year menu. It lives in the URL (`?y=2026&m=11`, `m=all` for the whole year), so it can be bookmarked and survives a reload. The default is the current month in the user's timezone.

## Money

- Stored as **integer minor units** (paise for INR) in a `bigint` column, never as decimals (CLAUDE.md §7).
- `src/lib/money.ts`: `formatMoney(minor, currency, locale)` (default INR, `en-IN`, so `₹28,000.00` and lakh grouping `₹1,23,456.00`), `parseMoney(text)` (accepts `1234`, `1,234.5`, `₹ 1,23,456.78`; rejects negatives, more than two decimals, letters, empty, and anything above ₹1,000,000,000), and small helpers (`addMinor`, percentage as a whole number of basis points).
- Currency and locale come from the user's settings (already stored: `INR`, `en-IN`).

## Data model

One table, `finance_entries`, holds all four kinds. Common columns, plus a few columns that only one kind uses. CHECK constraints make a row of the wrong shape impossible.

| Column                                                    | Meaning                                                                                                                                  |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `id`, `user_id`, `created_at`, `updated_at`, `deleted_at` | as everywhere (soft delete, owner, cascade)                                                                                              |
| `kind`                                                    | `income`, `emi`, `expense` or `investment`                                                                                               |
| `entry_date`                                              | the date used to place the row in a month: income received, **EMI due date**, expense date, investment date (floating date, no timezone) |
| `title`                                                   | income stream / loan or debt name / expense item / investment name (1 to 200 characters)                                                 |
| `category`                                                | one of the fixed lists below for that kind                                                                                               |
| `amount_minor`                                            | integer paise, greater than 0                                                                                                            |
| `notes`                                                   | optional, up to 1000 characters                                                                                                          |
| `payment_method`                                          | expenses only                                                                                                                            |
| `spend_label`                                             | expenses only, optional: `need` or `want` (2026-11-12, for the journal; see `docs/journal-spec.md`)                                      |
| `lender`, `emi_type`, `status`, `paid_on`                 | EMIs only. `status` is `scheduled`, `paid` or `delayed`; `paid_on` is set only when paid                                                 |
| `platform`                                                | investments only (the broker or app)                                                                                                     |

Indexes: `(user_id, kind, entry_date)` where not deleted; `(user_id, deleted_at)`.

O's sheet column "date" on the EMI tab is covered by `paid_on` (the date it was actually paid); the month an EMI belongs to is its due date.

## Fixed lists (stored as text, so custom categories can come later without a migration)

- **Income categories:** Salary, Bonus, Freelance, Interest & dividends, Rental income, Gifts, Refunds, Other income.
- **EMI types:** Fixed EMI, Loan repayment, Credit card bill, Other. **EMI categories:** Home loan, Vehicle loan, Personal loan, Education loan, Credit card, Other.
- **Expense categories** (from the sheet): Housing & Utilities, Food & Groceries, Transportation, Healthcare, Dining & Entertainment, Shopping, Personal Care, Subscriptions & Tech, Miscellaneous. **Payment methods:** UPI, Cash, Debit card, Credit card, Net banking, Other.
- **Investment types:** Mutual fund, Stocks, Fixed deposit, Recurring deposit, Retirement (PPF, EPF, NPS), Gold, Crypto, Real estate, Other.

## Summary tab (what the sheet shows, plus a little more)

For the chosen period (a month, or the whole year):

1. **Five tiles**, same meaning as the sheet:
   - **Total inflows**: sum of income.
   - **Total EMIs & loans**: sum of EMIs whose due date is in the period, whatever their status (it is a fixed obligation). A small line says how much is paid and how much is still to pay, and how many are delayed.
   - **Living expenses**: sum of expenses.
   - **Net savings** = inflows − EMIs − expenses. Negative values show a minus sign and the words "Overspent" (never colour alone).
   - **Savings rate** = net savings ÷ inflows, one decimal (47.4%). Shows "—" when there is no income.
2. **Second row (new):** **Invested** in the period, and **Left after investing** = net savings − invested.
3. **Expense breakdown by category:** every expense category with period spend, % of total, a bar for the visual share, and item count, plus a total row. Categories with no spending stay in the list (as in the sheet) and show zero.
4. **Annual cash flow trend, January to December:** a table with total inflow, EMI & debt, expenses, net savings and savings % per month, a **Full year total** row, and the selected month highlighted (marked with text as well as colour). A simple bar chart above it (inflow against outflow per month) repeats the table for people who like pictures; the table is the accessible version.
5. **Empty state** when the period has no entries: one sentence and an "Add income" button.

## Download as PDF (2026-11-12)

- **Expense breakdown by category** for a month or a whole year: `GET /api/export/expense-breakdown?y=2026&m=11` (`m=all` for the year). Every category is listed, with items, amount spent, % of total and a share bar, then the total.
- **Annual cash flow trend** for a year: `GET /api/export/cash-flow?y=2026`. January to December with inflows, EMIs and loans, expenses, invested and net savings, the full-year row and the savings rate.
- Reached from a download button on each card (the period on screen) and from Settings, Expense Tracker (any period). A period with no entries gives the full sheet with zeros.
- Amounts are printed without a symbol and the subtitle names the currency ("amounts in INR"), because the PDF's built-in fonts have no rupee sign.
- Both routes call `requireUser()`, validate the query with Zod (400 otherwise), read only that user's entries, and are never cached.

## The four entry tabs

Each tab shows the entries of the chosen period as a table on a computer and as cards on a phone, newest first, with:

- a **total for the period** and the **entry count** at the top,
- **Add** (a dialog) and **Edit** (click a row), **Delete** with an **Undo** toast (no confirmation question: Undo and Trash make it safe, as with tasks),
- a **category filter**, a **sort** (newest, oldest, amount high to low, amount low to high) and a text **search** over title and notes, all kept in the URL,
- on the Expenses tab, **Any / Needs / Wants** chips (`?label=`) once any expense in the period has a label,
- a **single day** (`?day=YYYY-MM-DD`, which the journal links to), shown as a chip you tap to go back to the whole period,
- a designed empty state.

Fields:

- **Income:** date, income stream, category, amount, notes.
- **EMIs & loans:** type, due date, loan or debt name, lender, category, amount, status, paid on (appears when status is Paid and defaults to today), notes. Choosing Paid fills "paid on". A **Mark paid** shortcut sits on each row. A scheduled EMI whose due date has passed shows an **Overdue** label (text and icon), without changing its stored status. On creation, **Repeat monthly for N more months** (0 to 60) creates the whole series at once as Scheduled entries (a month with no 31st uses the last day).
- **Expenses:** date, item, category, payment method, need or want (optional; tap the chosen chip again to clear it), amount, notes. The tab also shows a spend-by-payment-method line.
- **Investments:** date, investment name, type, platform, amount, notes. The tab shows a total by type.

Deleting moves an entry to **Trash** (the same Trash screen, 30 days, restore or delete forever, clean-up included).

## Seed data

`pnpm db:seed` also creates finance data for the demo user: this month matches O's sheet (salary and bonus ₹28,000; EMIs ₹10,142 across a few loans, some paid; expenses ₹4,000 transport and ₹600 subscriptions), plus a few earlier months so the annual trend is not empty, and some investments. Groceries and transport are labelled Need, dining out and subscriptions Want.

## Out of scope for now (parked in `docs/ideas.md`)

Custom categories, monthly budgets per category, recurring income and expenses, import from bank or UPI statements, charts beyond the one bar chart, investment current value and returns, multi-currency, a blog.

## Test plan

- Unit: money formatting and parsing (lakh grouping, rounding refusals, edges), summary maths (savings rate, negative savings, whole year, empty), month and year range helpers, EMI repeat dates (month ends, leap years), Zod schemas per kind.
- Integration (real database): create, edit, soft delete, restore, delete forever for each kind; database CHECKs reject malformed rows; period and year totals; the 30-day clean-up; **ownership** (another user cannot read, edit, delete, restore or count my entries).
- End to end: add one entry of each kind and see the summary change; change the period; edit; delete and Undo; phone width; accessibility audit of every new screen in light and dark.
