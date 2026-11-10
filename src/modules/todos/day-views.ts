import { addDaysIso, isOverdue, todayIn, type IsoDate } from "@/lib/dates";
import { compareTime, type DateInfo } from "./view-logic";

/**
 * Pure logic for the date-based views: Today (overdue first), Upcoming (next 14 days, by day)
 * and Completed (by day finished). Works on any tasks with the fields below.
 */

type DatedTask = {
  priority: number;
  dueDate: IsoDate | null;
  dueTime: string | null;
  position: string;
};

const byString = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Earlier time first (tasks with no time after timed ones), then higher priority, then manual order. */
function byTimeThenPriority<T extends DatedTask>(a: T, b: T): number {
  return (
    compareTime(a.dueTime, b.dueTime) || b.priority - a.priority || byString(a.position, b.position)
  );
}

/**
 * Splits open tasks that are due today or earlier into the overdue block and the today block
 * (CLAUDE.md §6.2). Overdue: older dates first. Today: by time, then priority.
 * A task due today whose time has passed counts as overdue, matching the label on its row.
 */
export function splitToday<T extends DatedTask>(
  tasks: T[],
  info: DateInfo,
): { overdue: T[]; today: T[] } {
  const overdue: T[] = [];
  const today: T[] = [];
  for (const t of tasks) {
    if (t.dueDate === null || t.dueDate > info.today) continue;
    (isOverdue(t, info.today, info.timeNow) ? overdue : today).push(t);
  }
  overdue.sort((a, b) => byString(a.dueDate ?? "", b.dueDate ?? "") || byTimeThenPriority(a, b));
  today.sort(byTimeThenPriority);
  return { overdue, today };
}

export type DayGroup<T> = { date: IsoDate; tasks: T[] };

/**
 * Tasks due in the next `days` days after today (tomorrow through today + days), grouped by day,
 * earliest day first. Undated tasks and today's or overdue tasks are left out.
 */
export function groupUpcoming<T extends DatedTask>(
  tasks: T[],
  today: IsoDate,
  days = 14,
): DayGroup<T>[] {
  const first = addDaysIso(today, 1);
  const last = addDaysIso(today, days);
  const byDay = new Map<IsoDate, T[]>();
  for (const t of tasks) {
    if (t.dueDate === null || t.dueDate < first || t.dueDate > last) continue;
    byDay.set(t.dueDate, [...(byDay.get(t.dueDate) ?? []), t]);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => byString(a, b))
    .map(([date, list]) => ({ date, tasks: list.sort(byTimeThenPriority) }));
}

/**
 * Finished tasks grouped by the day they were finished in the user's timezone, newest day first
 * and newest task first inside a day.
 */
export function groupCompletedByDay<T extends { completedAt: Date | null }>(
  tasks: T[],
  timeZone: string,
): DayGroup<T>[] {
  const byDay = new Map<IsoDate, T[]>();
  for (const t of tasks) {
    if (!t.completedAt) continue;
    const day = todayIn(timeZone, t.completedAt);
    byDay.set(day, [...(byDay.get(day) ?? []), t]);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => byString(b, a))
    .map(([date, list]) => ({
      date,
      tasks: list.sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0)),
    }));
}
