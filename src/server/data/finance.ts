import "server-only";
import { and, asc, desc, eq, gte, ilike, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { emiSeriesDates } from "@/modules/expenses/emi-series";
import type { EntrySort } from "@/modules/expenses/schema";
import type { CategoryRow, MonthTotals } from "@/modules/expenses/summary";
import { db } from "@/server/db/client";
import {
  financeEntries,
  type EmiStatus,
  type EntryKind,
  type FinanceEntry,
} from "@/server/db/schema";

/**
 * Data functions for money entries (income, EMIs and loans, expenses, investments). Every function
 * takes the authenticated `userId` and filters by it (CLAUDE.md §5). Another user's entry looks
 * exactly like an entry that does not exist. Amounts are integer paise.
 */

export type EntryInput = {
  kind: EntryKind;
  entryDate: string;
  title: string;
  category: string;
  amountMinor: number;
  notes?: string | null;
  /** expenses */
  paymentMethod?: string | null;
  /** EMIs */
  lender?: string | null;
  emiType?: string | null;
  status?: EmiStatus | null;
  paidOn?: string | null;
  /** investments */
  platform?: string | null;
};

/** The columns to write for an entry. Columns that belong to other kinds are always cleared. */
function columnsFor(input: EntryInput) {
  const isEmi = input.kind === "emi";
  const status = isEmi ? (input.status ?? "scheduled") : null;
  return {
    kind: input.kind,
    entryDate: input.entryDate,
    title: input.title,
    category: input.category,
    amountMinor: input.amountMinor,
    notes: input.notes ?? null,
    paymentMethod: input.kind === "expense" ? (input.paymentMethod ?? null) : null,
    lender: isEmi ? (input.lender ?? null) : null,
    emiType: isEmi ? (input.emiType ?? null) : null,
    status,
    paidOn: isEmi && status === "paid" ? (input.paidOn ?? null) : null,
    platform: input.kind === "investment" ? (input.platform ?? null) : null,
  };
}

const live = (userId: string) =>
  and(eq(financeEntries.userId, userId), isNull(financeEntries.deletedAt));

const owned = (userId: string, id: string) => and(live(userId), eq(financeEntries.id, id));

export async function createEntry(userId: string, input: EntryInput): Promise<FinanceEntry> {
  const [row] = await db
    .insert(financeEntries)
    .values({ userId, ...columnsFor(input) })
    .returning();
  return row;
}

/**
 * Creates an EMI and, when `extraMonths` is above 0, the same EMI for each of the next months,
 * all in one statement. The first keeps the status given; the rest start as Scheduled.
 */
export async function createEmiSeries(
  userId: string,
  input: EntryInput,
  extraMonths: number,
): Promise<FinanceEntry[]> {
  if (input.kind !== "emi") throw new Error("createEmiSeries needs an EMI");
  const dates = emiSeriesDates(input.entryDate, extraMonths);
  return db
    .insert(financeEntries)
    .values(
      dates.map((entryDate, i) => ({
        userId,
        ...columnsFor(
          i === 0
            ? { ...input, entryDate }
            : { ...input, entryDate, status: "scheduled" as const, paidOn: null },
        ),
      })),
    )
    .returning();
}

export async function getEntry(userId: string, id: string): Promise<FinanceEntry | null> {
  const [row] = await db.select().from(financeEntries).where(owned(userId, id));
  return row ?? null;
}

/** Updates an entry. Returns null when it is not the user's or is not of the given kind. */
export async function updateEntry(
  userId: string,
  id: string,
  input: EntryInput,
): Promise<FinanceEntry | null> {
  const current = await getEntry(userId, id);
  if (!current || current.kind !== input.kind) return null;
  const [row] = await db
    .update(financeEntries)
    .set(columnsFor(input))
    .where(owned(userId, id))
    .returning();
  return row ?? null;
}

/** Marks an EMI paid on a date. Returns null when the entry is not one of the user's EMIs. */
export async function markEmiPaid(
  userId: string,
  id: string,
  paidOn: string,
): Promise<FinanceEntry | null> {
  const [row] = await db
    .update(financeEntries)
    .set({ status: "paid", paidOn })
    .where(and(owned(userId, id), eq(financeEntries.kind, "emi")))
    .returning();
  return row ?? null;
}

/** Moves an entry to Trash. */
export async function trashEntry(userId: string, id: string): Promise<boolean> {
  const rows = await db
    .update(financeEntries)
    .set({ deletedAt: new Date() })
    .where(owned(userId, id))
    .returning({ id: financeEntries.id });
  return rows.length > 0;
}

export async function restoreEntry(userId: string, id: string): Promise<boolean> {
  const rows = await db
    .update(financeEntries)
    .set({ deletedAt: null })
    .where(
      and(
        eq(financeEntries.userId, userId),
        eq(financeEntries.id, id),
        isNotNull(financeEntries.deletedAt),
      ),
    )
    .returning({ id: financeEntries.id });
  return rows.length > 0;
}

export type EntryFilters = { sort: EntrySort; category: string | null; q: string };

/** Escapes `%`, `_` and `\` so a search for "50%" matches the text "50%". */
function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/** Entries of one kind with an entry date from `from` to `to` (inclusive), filtered and sorted. */
export async function listEntries(
  userId: string,
  kind: EntryKind,
  range: { from: string; to: string },
  filters: EntryFilters,
): Promise<FinanceEntry[]> {
  const search = filters.q
    ? or(
        ilike(financeEntries.title, likePattern(filters.q)),
        ilike(financeEntries.notes, likePattern(filters.q)),
        ilike(financeEntries.lender, likePattern(filters.q)),
        ilike(financeEntries.platform, likePattern(filters.q)),
      )
    : undefined;
  const order = {
    newest: [desc(financeEntries.entryDate), desc(financeEntries.createdAt)],
    oldest: [asc(financeEntries.entryDate), asc(financeEntries.createdAt)],
    highest: [desc(financeEntries.amountMinor), desc(financeEntries.entryDate)],
    lowest: [asc(financeEntries.amountMinor), desc(financeEntries.entryDate)],
  }[filters.sort];
  return db
    .select()
    .from(financeEntries)
    .where(
      and(
        live(userId),
        eq(financeEntries.kind, kind),
        gte(financeEntries.entryDate, range.from),
        lte(financeEntries.entryDate, range.to),
        filters.category ? eq(financeEntries.category, filters.category) : undefined,
        search,
      ),
    )
    .orderBy(...order);
}

const total = sql<number>`sum(${financeEntries.amountMinor})`.mapWith(Number);
const rowCount = sql<number>`count(*)`.mapWith(Number);

/** Per-month totals of each kind for a calendar year (months with no entries are left out). */
export async function monthlyTotals(userId: string, year: number): Promise<MonthTotals[]> {
  const month = sql<number>`extract(month from ${financeEntries.entryDate})`.mapWith(Number);
  const rows = await db
    .select({ month, kind: financeEntries.kind, amount: total })
    .from(financeEntries)
    .where(
      and(
        live(userId),
        gte(financeEntries.entryDate, `${year}-01-01`),
        lte(financeEntries.entryDate, `${year}-12-31`),
      ),
    )
    .groupBy(month, financeEntries.kind);

  const byMonth = new Map<number, MonthTotals>();
  for (const r of rows) {
    const entry = byMonth.get(r.month) ?? {
      month: r.month,
      income: 0,
      emi: 0,
      expense: 0,
      investment: 0,
    };
    entry[r.kind] += r.amount;
    byMonth.set(r.month, entry);
  }
  return [...byMonth.values()];
}

/** Total and count per category for one kind in a period. */
export async function categoryTotals(
  userId: string,
  kind: EntryKind,
  range: { from: string; to: string },
): Promise<CategoryRow[]> {
  const rows = await db
    .select({ category: financeEntries.category, amountMinor: total, count: rowCount })
    .from(financeEntries)
    .where(
      and(
        live(userId),
        eq(financeEntries.kind, kind),
        gte(financeEntries.entryDate, range.from),
        lte(financeEntries.entryDate, range.to),
      ),
    )
    .groupBy(financeEntries.category);
  return rows;
}

/** Total and count per payment method for expenses in a period. */
export async function paymentMethodTotals(
  userId: string,
  range: { from: string; to: string },
): Promise<{ method: string; amountMinor: number; count: number }[]> {
  const method = sql<string>`coalesce(${financeEntries.paymentMethod}, 'Other')`;
  return db
    .select({ method, amountMinor: total, count: rowCount })
    .from(financeEntries)
    .where(
      and(
        live(userId),
        eq(financeEntries.kind, "expense"),
        gte(financeEntries.entryDate, range.from),
        lte(financeEntries.entryDate, range.to),
      ),
    )
    .groupBy(method)
    .orderBy(desc(total));
}

/** Total and count per status for EMIs due in a period. */
export async function emiStatusTotals(
  userId: string,
  range: { from: string; to: string },
): Promise<{ status: EmiStatus; amountMinor: number; count: number }[]> {
  const rows = await db
    .select({ status: financeEntries.status, amountMinor: total, count: rowCount })
    .from(financeEntries)
    .where(
      and(
        live(userId),
        eq(financeEntries.kind, "emi"),
        gte(financeEntries.entryDate, range.from),
        lte(financeEntries.entryDate, range.to),
      ),
    )
    .groupBy(financeEntries.status);
  return rows.flatMap((r) => (r.status ? [{ ...r, status: r.status }] : []));
}
