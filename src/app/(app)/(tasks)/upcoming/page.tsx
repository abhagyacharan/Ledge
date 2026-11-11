import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/shell/empty-state";
import { addDaysIso, formatDayHeading } from "@/lib/dates";
import { InlineAdd } from "@/modules/todos/components/inline-add";
import { QuickAddButton } from "@/modules/todos/components/quick-add-button";
import { TaskDrawerHost } from "@/modules/todos/components/task-drawer-host";
import { TaskList } from "@/modules/todos/components/task-groups";
import { TaskGroup, TaskPanel } from "@/modules/todos/components/task-panel";
import { loadDateContext } from "@/modules/todos/date-context";
import { groupUpcoming } from "@/modules/todos/day-views";
import { getInbox } from "@/server/data/lists";
import { getDueBetweenTasks } from "@/server/data/views";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Upcoming" };

const DAYS = 14;

/** The next 14 days, one group per day; tasks without a date are left out (CLAUDE.md §6.2). */
export default async function UpcomingPage({ searchParams }: PageProps<"/upcoming">) {
  const { userId } = await requireUser();
  const [{ ctx }, { task }, inbox] = await Promise.all([
    loadDateContext(userId),
    searchParams,
    getInbox(userId),
  ]);
  const tomorrow = addDaysIso(ctx.today, 1);
  const tasks = await getDueBetweenTasks(userId, tomorrow, addDaysIso(ctx.today, DAYS));
  const days = groupUpcoming(tasks, ctx.today, DAYS);

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
            hint={`No tasks are due in the next ${DAYS} days.`}
            action={<QuickAddButton />}
          />
        ) : null}
        {days.map((day) => (
          <TaskGroup
            key={day.date}
            id={`day-${day.date}`}
            label={formatDayHeading(day.date, ctx.today, ctx.locale)}
            count={day.tasks.length}
          >
            <TaskList tasks={day.tasks} allTasks={[]} ctx={ctx} />
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
