import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/shell/empty-state";
import { addDaysIso, formatDayHeading } from "@/lib/dates";
import { describeStored, parseRule, upcomingOccurrences } from "@/lib/recurrence";
import { InlineAdd } from "@/modules/todos/components/inline-add";
import { RepeatPreview } from "@/modules/todos/components/repeat-preview";
import { QuickAddButton } from "@/modules/todos/components/quick-add-button";
import { TaskDrawerHost } from "@/modules/todos/components/task-drawer-host";
import { TaskList } from "@/modules/todos/components/task-groups";
import { TaskGroup, TaskPanel } from "@/modules/todos/components/task-panel";
import { loadDateContext } from "@/modules/todos/date-context";
import { groupUpcoming, mergeUpcoming, type Preview } from "@/modules/todos/day-views";
import { getInbox } from "@/server/data/lists";
import { getDueBetweenTasks, getRepeatingTasks } from "@/server/data/views";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Upcoming" };

const DAYS = 14;

/**
 * The next 14 days, one group per day; tasks without a date are left out (CLAUDE.md §6.2). A
 * repeating task also shows on each later day it comes back, as a preview, until its end date.
 */
export default async function UpcomingPage({ searchParams }: PageProps<"/upcoming">) {
  const { userId } = await requireUser();
  const [{ ctx }, { task }, inbox] = await Promise.all([
    loadDateContext(userId),
    searchParams,
    getInbox(userId),
  ]);
  const tomorrow = addDaysIso(ctx.today, 1);
  const last = addDaysIso(ctx.today, DAYS);
  const [tasks, repeating] = await Promise.all([
    getDueBetweenTasks(userId, tomorrow, last),
    getRepeatingTasks(userId, last),
  ]);
  const real = groupUpcoming(tasks, ctx.today, DAYS);
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
        { taskId: task.id, title: task.title, repeatText: repeatText ?? "Repeats" },
      ]);
    }
  }
  const days = mergeUpcoming(real, previews);

  return (
    <>
      <TaskPanel
        id="upcoming"
        title="Upcoming"
        subtitle={`The next ${DAYS} days. Tasks without a date are not shown.`}
      >
        {days.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nothing coming up"
            hint={`No tasks are due, and none of your repeating tasks come back, in the next ${DAYS} days.`}
            action={<QuickAddButton />}
          />
        ) : null}
        {days.map((day) => (
          <TaskGroup
            key={day.date}
            id={`day-${day.date}`}
            label={formatDayHeading(day.date, ctx.today, ctx.locale)}
            count={day.tasks.length + day.previews.length}
          >
            {day.tasks.length > 0 ? <TaskList tasks={day.tasks} allTasks={[]} ctx={ctx} /> : null}
            {day.previews.length > 0 ? (
              <ul aria-label="Repeating tasks coming back">
                {day.previews.map((p) => (
                  <RepeatPreview key={p.taskId} {...p} />
                ))}
              </ul>
            ) : null}
          </TaskGroup>
        ))}
        <InlineAdd listId={inbox.id} dueDate={tomorrow} label="Add a task for tomorrow" />
      </TaskPanel>
      <TaskDrawerHost
        userId={userId}
        taskParam={typeof task === "string" ? task : undefined}
        ctx={ctx}
      />
    </>
  );
}
