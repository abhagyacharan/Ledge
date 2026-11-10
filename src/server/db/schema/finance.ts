import { sql } from "drizzle-orm";
import { bigint, check, date, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./_columns";
import { user } from "./auth";

export const ENTRY_KINDS = ["income", "emi", "expense", "investment"] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

export const EMI_STATUSES = ["scheduled", "paid", "delayed"] as const;
export type EmiStatus = (typeof EMI_STATUSES)[number];

/** Largest amount in minor units (one billion major units of a two-decimal currency). */
export const MAX_AMOUNT_MINOR = 100_000_000_000;

/**
 * Every money entry in one table (docs/expenses-spec.md): income, EMIs and loans, expenses and
 * investments. A few columns belong to one kind only; the CHECK constraints below make a row of
 * the wrong shape impossible. Amounts are integer minor units (paise), never decimals.
 */
export const financeEntries = pgTable(
  "finance_entries",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ENTRY_KINDS }).notNull(),
    /**
     * The date that places the row in a month: income received, EMI due date, expense date,
     * investment date. A floating date (no timezone), like task due dates.
     */
    entryDate: date("entry_date", { mode: "string" }).notNull(),
    /** Income stream, loan or debt name, expense item, or investment name. */
    title: text("title").notNull(),
    category: text("category").notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    notes: text("notes"),
    /** Expenses only. */
    paymentMethod: text("payment_method"),
    /** EMIs only. */
    lender: text("lender"),
    emiType: text("emi_type"),
    status: text("status", { enum: EMI_STATUSES }),
    paidOn: date("paid_on", { mode: "string" }),
    /** Investments only: the broker or app. */
    platform: text("platform"),
    /** Soft delete: set means the entry is in Trash. */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("finance_entries_user_kind_date_idx")
      .on(t.userId, t.kind, t.entryDate)
      .where(sql`${t.deletedAt} is null`),
    index("finance_entries_user_deleted_idx").on(t.userId, t.deletedAt),
    check(
      "finance_entries_kind_check",
      sql`${t.kind} in ('income', 'emi', 'expense', 'investment')`,
    ),
    check("finance_entries_title_check", sql`char_length(${t.title}) between 1 and 200`),
    check("finance_entries_category_check", sql`char_length(${t.category}) between 1 and 60`),
    check(
      "finance_entries_amount_check",
      sql`${t.amountMinor} > 0 and ${t.amountMinor} <= ${sql.raw(String(MAX_AMOUNT_MINOR))}`,
    ),
    check(
      "finance_entries_notes_check",
      sql`${t.notes} is null or char_length(${t.notes}) <= 1000`,
    ),
    // Columns that belong to one kind must be empty on every other kind.
    check(
      "finance_entries_payment_method_only_expense_check",
      sql`${t.kind} = 'expense' or ${t.paymentMethod} is null`,
    ),
    check(
      "finance_entries_emi_columns_only_emi_check",
      sql`${t.kind} = 'emi' or (${t.lender} is null and ${t.emiType} is null and ${t.status} is null and ${t.paidOn} is null)`,
    ),
    check(
      "finance_entries_platform_only_investment_check",
      sql`${t.kind} = 'investment' or ${t.platform} is null`,
    ),
    // An EMI always has a status, and "paid on" only makes sense when it is paid.
    check(
      "finance_entries_emi_has_status_check",
      sql`${t.kind} <> 'emi' or ${t.status} is not null`,
    ),
    check(
      "finance_entries_paid_on_needs_paid_check",
      sql`${t.paidOn} is null or ${t.status} = 'paid'`,
    ),
  ],
);

export type FinanceEntry = typeof financeEntries.$inferSelect;
export type NewFinanceEntry = typeof financeEntries.$inferInsert;
