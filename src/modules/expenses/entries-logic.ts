import { percentOf } from "@/lib/money";
import type { EmiStatus } from "@/server/db/schema";
import type { EntrySort } from "./schema";

/**
 * Pure helpers for the entries tabs (Income, EMIs & loans, Expenses, Investments). No React, no
 * database: the list screen calls these, and the unit tests pin them down.
 */

/** How an EMI reads on screen. A scheduled EMI whose due date has passed is overdue. */
export type EmiState = "paid" | "delayed" | "overdue" | "scheduled";

export function emiState(
  entry: { status: EmiStatus | null; entryDate: string },
  today: string,
): EmiState {
  if (entry.status === "paid") return "paid";
  if (entry.status === "delayed") return "delayed";
  return entry.entryDate < today ? "overdue" : "scheduled";
}

export type DayGroup<T> = { date: string; totalMinor: number; entries: T[] };

/**
 * Splits a list that is already sorted by date into one group per day, keeping the order. Each
 * group carries its day's total so the list can show it beside the day heading.
 */
export function groupByDay<T extends { entryDate: string; amountMinor: number }>(
  entries: readonly T[],
): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  for (const entry of entries) {
    const last = groups.at(-1);
    if (last && last.date === entry.entryDate) {
      last.entries.push(entry);
      last.totalMinor += entry.amountMinor;
    } else {
      groups.push({ date: entry.entryDate, totalMinor: entry.amountMinor, entries: [entry] });
    }
  }
  return groups;
}

/** Day groups only help when the list runs in date order. */
export function groupsByDay(sort: EntrySort): boolean {
  return sort === "newest" || sort === "oldest";
}

/**
 * The category chips to offer: only the categories used in the period (in the fixed list's
 * order), plus the active one so it can always be seen and cleared.
 */
export function presentCategories(
  used: Iterable<string>,
  all: readonly string[],
  active: string | null,
): string[] {
  const keep = new Set(used);
  if (active) keep.add(active);
  return all.filter((c) => keep.has(c));
}

export type ShareRow = { label: string; amountMinor: number; percent: number | null };

/**
 * Turns totals into rows with their share of the whole, largest first. Past `max` rows the
 * smallest are folded into one "Everything else" row, so the overview stays short on a phone.
 */
export function shareRows(
  rows: readonly { label: string; amountMinor: number }[],
  max = 5,
): ShareRow[] {
  const sorted = rows
    .filter((r) => r.amountMinor > 0)
    .sort((a, b) => b.amountMinor - a.amountMinor);
  const whole = sorted.reduce((sum, r) => sum + r.amountMinor, 0);
  const shown =
    sorted.length > max
      ? [
          ...sorted.slice(0, max - 1),
          {
            label: "Everything else",
            amountMinor: sorted.slice(max - 1).reduce((sum, r) => sum + r.amountMinor, 0),
          },
        ]
      : sorted;
  return shown.map((r) => ({ ...r, percent: percentOf(r.amountMinor, whole) }));
}
