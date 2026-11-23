import { addDaysIso, daysBetween } from "@/lib/dates";

/**
 * Rescheduling a plan (docs/plans-module-spec.md §2d): done by code, never by the AI. Both modes
 * are one date mapping applied to every open task's due date and repeat end, and to the phases.
 * Nothing ever lands before today. Pure, so it is unit tested.
 */

export type Schedule = { mode: "shift"; days: number } | { mode: "spread"; endDate: string };

export type DateMapper = (date: string) => string;

/**
 * Builds the mapping from the old dates to the new ones.
 *  - shift: every date moves by `days` (never before today);
 *  - spread: dates from today to the old end are stretched or squeezed in proportion onto today to
 *    the new end, keeping their order. Dates before today become today; dates after the old end
 *    become the new end.
 * `oldEnd` is the plan's end date before the change (null: treated as today).
 */
export function makeDateMapper(
  schedule: Schedule,
  today: string,
  oldEnd: string | null,
): DateMapper {
  if (schedule.mode === "shift") {
    return (date) => {
      const moved = addDaysIso(date, schedule.days);
      return moved < today ? today : moved;
    };
  }
  const newSpan = Math.max(0, daysBetween(today, schedule.endDate));
  const oldSpan = Math.max(0, oldEnd ? daysBetween(today, oldEnd) : 0);
  return (date) => {
    const offset = daysBetween(today, date);
    if (offset <= 0) return today;
    if (oldSpan === 0 || offset >= oldSpan) return addDaysIso(today, newSpan);
    return addDaysIso(today, Math.round((offset / oldSpan) * newSpan));
  };
}

export type ReschedulableTask = {
  id: string;
  dueDate: string | null;
  recurrenceUntil: string | null;
};

export type TaskDatePatch = { id: string; dueDate: string; recurrenceUntil: string | null };

/** The new dates for the open, dated tasks. A repeat's end never falls before its first date. */
export function rescheduleTasks(tasks: ReschedulableTask[], map: DateMapper): TaskDatePatch[] {
  const patches: TaskDatePatch[] = [];
  for (const task of tasks) {
    if (!task.dueDate) continue;
    const dueDate = map(task.dueDate);
    let recurrenceUntil = task.recurrenceUntil ? map(task.recurrenceUntil) : null;
    if (recurrenceUntil && recurrenceUntil < dueDate) recurrenceUntil = dueDate;
    patches.push({ id: task.id, dueDate, recurrenceUntil });
  }
  return patches;
}

/** The plan's new end date: the old one moved (shift) or the one asked for (spread). */
export function newEndDate(
  schedule: Schedule,
  today: string,
  oldEnd: string | null,
): string | null {
  if (schedule.mode === "spread") return schedule.endDate;
  if (!oldEnd) return null;
  return makeDateMapper(schedule, today, oldEnd)(oldEnd);
}
