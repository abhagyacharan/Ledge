import "server-only";
import { addDaysIso, formatDueDate } from "@/lib/dates";
import { describeStored, isFrequentStored, parseRule, upcomingOccurrences } from "@/lib/recurrence";
import {
  getDueBetweenTasks,
  getOpenRepeatingTasks,
  getRepeatingTasks,
  type ViewTask,
} from "@/server/data/views";
import type { DateContext } from "./components/types";
import { groupUpcoming, mergeUpcoming, type Preview } from "./day-views";

/**
 * The days after today with their tasks and, for repeating tasks on a fixed schedule, a preview
 * on each later day they come back (CLAUDE.md §6.2). Used by Upcoming and the Overview's grid.
 * Frequent repeats (every day, every few days, several weekdays) are left out: they would fill
 * every day, so Upcoming lists each of them once in its Repeating card instead (O, 2026-11-22).
 */
export async function loadUpcomingDays(
  userId: string,
  ctx: DateContext,
  days: number,
): Promise<{ date: string; tasks: ViewTask[]; previews: Preview[] }[]> {
  const tomorrow = addDaysIso(ctx.today, 1);
  const last = addDaysIso(ctx.today, days);
  const [due, repeating] = await Promise.all([
    getDueBetweenTasks(userId, tomorrow, last),
    getRepeatingTasks(userId, last),
  ]);
  const tasks = due.filter((t) => !isFrequentStored(t.recurrenceRule));
  const real = groupUpcoming(tasks, ctx.today, days);
  const previews = new Map<string, Preview[]>();
  for (const task of repeating) {
    if (isFrequentStored(task.recurrenceRule)) continue;
    const rule = task.recurrenceRule ? parseRule(task.recurrenceRule) : null;
    if (!rule) continue;
    const repeatText = describeStored(
      task.recurrenceRule,
      task.recurrenceMode,
      task.recurrenceUntil,
      ctx.locale,
    );
    for (const date of upcomingOccurrences({
      rule,
      mode: task.recurrenceMode,
      dueDate: task.dueDate,
      until: task.recurrenceUntil,
      from: tomorrow,
      to: last,
    })) {
      previews.set(date, [
        ...(previews.get(date) ?? []),
        {
          taskId: task.id,
          title: task.title,
          repeatText: repeatText ?? "Repeats",
          dueTime: task.dueTime,
          listName: task.listName,
        },
      ]);
    }
  }
  return mergeUpcoming(real, previews);
}

export type RoutineSummary = {
  taskId: string;
  title: string;
  /** "Every day · no end date" or "Every day until 13 Dec". */
  repeatText: string;
  /** "Next: Today", "Next: Tomorrow", "Missed since Mon 16 Nov". */
  nextText: string;
  dueTime: string | null;
  listName: string;
  overdue: boolean;
};

/** Every open frequent repeat, once each, for the Repeating card in Upcoming. */
export async function loadRoutines(userId: string, ctx: DateContext): Promise<RoutineSummary[]> {
  const repeating = await getOpenRepeatingTasks(userId);
  return repeating
    .filter((t) => isFrequentStored(t.recurrenceRule) && t.dueDate)
    .map((t) => {
      const due = t.dueDate ?? ctx.today;
      const base =
        describeStored(t.recurrenceRule, t.recurrenceMode, t.recurrenceUntil, ctx.locale) ??
        "Repeats";
      const overdue = due < ctx.today;
      return {
        taskId: t.id,
        title: t.title,
        repeatText: t.recurrenceUntil ? base : `${base} · no end date`,
        nextText: overdue
          ? `Missed since ${formatDueDate(due, ctx.today, ctx.locale)}`
          : `Next: ${formatDueDate(due, ctx.today, ctx.locale)}`,
        dueTime: t.dueTime,
        listName: t.listName,
        overdue,
      };
    });
}

/** The ids of every open frequent repeat (so Today can tell which finished copies are routines). */
export async function loadRoutineIds(userId: string): Promise<Set<string>> {
  const repeating = await getOpenRepeatingTasks(userId);
  return new Set(repeating.filter((t) => isFrequentStored(t.recurrenceRule)).map((t) => t.id));
}
