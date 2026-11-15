import "server-only";
import { addDaysIso } from "@/lib/dates";
import { describeStored, parseRule, upcomingOccurrences } from "@/lib/recurrence";
import { getDueBetweenTasks, getRepeatingTasks, type ViewTask } from "@/server/data/views";
import type { DateContext } from "./components/types";
import { groupUpcoming, mergeUpcoming, type Preview } from "./day-views";

/**
 * The days after today with their tasks and, for repeating tasks on a fixed schedule, a preview
 * on each later day they come back (CLAUDE.md §6.2). Used by Upcoming and the Overview's grid.
 */
export async function loadUpcomingDays(
  userId: string,
  ctx: DateContext,
  days: number,
): Promise<{ date: string; tasks: ViewTask[]; previews: Preview[] }[]> {
  const tomorrow = addDaysIso(ctx.today, 1);
  const last = addDaysIso(ctx.today, days);
  const [tasks, repeating] = await Promise.all([
    getDueBetweenTasks(userId, tomorrow, last),
    getRepeatingTasks(userId, last),
  ]);
  const real = groupUpcoming(tasks, ctx.today, days);
  const previews = new Map<string, Preview[]>();
  for (const task of repeating) {
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
