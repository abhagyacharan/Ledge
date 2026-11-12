import type { EmiStatus, EntryKind, SpendLabel } from "@/server/db/schema";

/**
 * The fixed lists the expense tracker offers (docs/expenses-spec.md). Categories are stored as
 * plain text, so custom categories can be added later without a database migration.
 */

export const INCOME_CATEGORIES = [
  "Salary",
  "Bonus",
  "Freelance",
  "Interest & dividends",
  "Rental income",
  "Gifts",
  "Refunds",
  "Other income",
] as const;

export const EMI_TYPES = ["Fixed EMI", "Loan repayment", "Credit card bill", "Other"] as const;

export const EMI_CATEGORIES = [
  "Home loan",
  "Vehicle loan",
  "Personal loan",
  "Education loan",
  "Credit card",
  "Other",
] as const;

export const EXPENSE_CATEGORIES = [
  "Housing & Utilities",
  "Food & Groceries",
  "Transportation",
  "Healthcare",
  "Dining & Entertainment",
  "Shopping",
  "Personal Care",
  "Subscriptions & Tech",
  "Miscellaneous",
] as const;

export const PAYMENT_METHODS = [
  "UPI",
  "Cash",
  "Debit card",
  "Credit card",
  "Net banking",
  "Other",
] as const;

export const INVESTMENT_TYPES = [
  "Mutual fund",
  "Stocks",
  "Fixed deposit",
  "Recurring deposit",
  "Retirement (PPF, EPF, NPS)",
  "Gold",
  "Crypto",
  "Real estate",
  "Other",
] as const;

export const CATEGORIES_BY_KIND: Record<EntryKind, readonly string[]> = {
  income: INCOME_CATEGORIES,
  emi: EMI_CATEGORIES,
  expense: EXPENSE_CATEGORIES,
  investment: INVESTMENT_TYPES,
};

export const KIND_LABELS: Record<EntryKind, { singular: string; plural: string; tab: string }> = {
  income: { singular: "income", plural: "income", tab: "Income" },
  emi: { singular: "EMI or loan payment", plural: "EMIs and loans", tab: "EMIs & loans" },
  expense: { singular: "expense", plural: "expenses", tab: "Expenses" },
  investment: { singular: "investment", plural: "investments", tab: "Investments" },
};

/** The route of each tab. */
export const KIND_ROUTES: Record<EntryKind, string> = {
  income: "/expenses/income",
  emi: "/expenses/emis",
  expense: "/expenses/spending",
  investment: "/expenses/investments",
};

export const EMI_STATUS_LABELS: Record<EmiStatus, string> = {
  scheduled: "Scheduled",
  paid: "Paid",
  delayed: "Delayed",
};

/** What the "category" column is called on each tab. */
export const CATEGORY_LABELS: Record<EntryKind, string> = {
  income: "Category",
  emi: "Category",
  expense: "Category",
  investment: "Type",
};

/** What the "title" column is called on each tab. */
export const TITLE_LABELS: Record<EntryKind, string> = {
  income: "Income stream",
  emi: "Loan or debt",
  expense: "Item",
  investment: "Investment",
};

export const DATE_LABELS: Record<EntryKind, string> = {
  income: "Date",
  emi: "Due date",
  expense: "Date",
  investment: "Date",
};

/** The need or want label's choices, in chip order (the database lists the same two). */
export const SPEND_LABEL_OPTIONS = ["need", "want"] as const satisfies readonly SpendLabel[];

/** How the optional need or want label reads in chips, rows and the journal. */
export const SPEND_LABEL_NAMES = {
  need: { one: "Need", plural: "Needs" },
  want: { one: "Want", plural: "Wants" },
} as const;
