import "server-only";
import { and, asc, eq, gte, isNull, lt, lte, sql } from "drizzle-orm";
import type { DayFactsInput } from "@/modules/journal/day-facts";
import { addDaysIso } from "@/lib/dates";
import { db } from "@/server/db/client";
import {
  financeEntries,
  journalEntries,
  lists,
  tasks,
  type JournalEntry,
} from "@/server/db/schema";

/**
 * Data functions for the journal (docs/journal-spec.md). Every function takes the authenticated
 * `userId` and filters by it (CLAUDE.md §5); another user's page looks like a page that does not
 * exist. Dates are floating days in the user's timezone.
 */

export async function getJournalEntry(userId: string, date: string): Promise<JournalEntry | null> {
  const [row] = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.userId, userId), eq(journalEntries.entryDate, date)));
  return row ?? null;
}

/**
 * Saves the page for one day: creates it, or updates the one already there. A page with no words
 * and no mood is removed, so clearing everything leaves no empty page (and no dot in the calendar).
 */
export async function saveJournalEntry(
  userId: string,
  date: string,
  input: { body: string; mood: number | null },
): Promise<JournalEntry | null> {
  if (input.body.trim() === "" && input.mood === null) {
    await db
      .delete(journalEntries)
      .where(and(eq(journalEntries.userId, userId), eq(journalEntries.entryDate, date)));
    return null;
  }
  const [row] = await db
    .insert(journalEntries)
    .values({ userId, entryDate: date, body: input.body, mood: input.mood })
    .onConflictDoUpdate({
      target: [journalEntries.userId, journalEntries.entryDate],
      set: { body: input.body, mood: input.mood, updatedAt: new Date() },
    })
    .returning();
  return row ?? null;
}

/** The days from `from` to `to` (inclusive) that have a page, oldest first. */
export async function getJournalDates(userId: string, from: string, to: string): Promise<string[]> {
  const rows = await db
    .select({ date: journalEntries.entryDate })
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.userId, userId),
        gte(journalEntries.entryDate, from),
        lte(journalEntries.entryDate, to),
      ),
    )
    .orderBy(asc(journalEntries.entryDate));
  return rows.map((r) => r.date);
}

/** How many days before the journal day count towards "your usual" daily spending. */
export const USUAL_SPEND_DAYS = 30;

/**
 * The raw figures behind the facts strip for one day: tasks finished that day (by the user's
 * timezone), tasks that were due that day, and that day's money entries. Turning them into words
 * is pure code in `modules/journal/day-facts.ts`.
 */
export async function getDayFactsInput(
  userId: string,
  date: string,
  timeZone: string,
): Promise<DayFactsInput> {
  const visibleTask = and(
    eq(tasks.userId, userId),
    isNull(tasks.deletedAt),
    isNull(lists.deletedAt),
    eq(lists.isArchived, false),
  );
  const listJoin = and(eq(lists.id, tasks.listId), eq(lists.userId, userId));
  const count = sql<number>`count(*)`.mapWith(Number);
  const sum = sql<number>`coalesce(sum(${financeEntries.amountMinor}), 0)`.mapWith(Number);
  const liveEntry = and(eq(financeEntries.userId, userId), isNull(financeEntries.deletedAt));
  const usualFrom = addDaysIso(date, -USUAL_SPEND_DAYS);

  const [doneByList, due, money, expenses, usual] = await Promise.all([
    db
      .select({ list: lists.name, count })
      .from(tasks)
      .innerJoin(lists, listJoin)
      .where(
        and(
          visibleTask,
          eq(tasks.status, "done"),
          sql`(${tasks.completedAt} at time zone ${timeZone})::date = ${date}`,
        ),
      )
      .groupBy(lists.name)
      .orderBy(sql`count(*) desc`, asc(lists.name)),
    db
      .select({
        total: count,
        open: sql<number>`count(*) filter (where ${tasks.status} = 'open')`.mapWith(Number),
      })
      .from(tasks)
      .innerJoin(lists, listJoin)
      .where(and(visibleTask, eq(tasks.dueDate, date))),
    db
      .select({ kind: financeEntries.kind, amount: sum })
      .from(financeEntries)
      .where(and(liveEntry, eq(financeEntries.entryDate, date)))
      .groupBy(financeEntries.kind),
    db
      .select({
        category: financeEntries.category,
        label: financeEntries.spendLabel,
        amount: sum,
      })
      .from(financeEntries)
      .where(and(liveEntry, eq(financeEntries.kind, "expense"), eq(financeEntries.entryDate, date)))
      .groupBy(financeEntries.category, financeEntries.spendLabel),
    db
      .select({ amount: sum })
      .from(financeEntries)
      .where(
        and(
          liveEntry,
          eq(financeEntries.kind, "expense"),
          gte(financeEntries.entryDate, usualFrom),
          lt(financeEntries.entryDate, date),
        ),
      ),
  ]);

  const byKind = (kind: string) => money.find((m) => m.kind === kind)?.amount ?? 0;
  return {
    doneByList: doneByList.map((r) => ({ list: r.list, count: r.count })),
    dueTotal: due[0]?.total ?? 0,
    dueOpen: due[0]?.open ?? 0,
    expenses: expenses.map((e) => ({
      category: e.category,
      label: e.label,
      amountMinor: e.amount,
    })),
    usualDailySpendMinor: Math.round((usual[0]?.amount ?? 0) / USUAL_SPEND_DAYS),
    incomeMinor: byKind("income"),
    emiMinor: byKind("emi"),
    investedMinor: byKind("investment"),
  };
}
