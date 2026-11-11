import { CircleCheckBig } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/shell/empty-state";
import { formatDayHeading } from "@/lib/dates";
import { TaskDrawerHost } from "@/modules/todos/components/task-drawer-host";
import { TaskList } from "@/modules/todos/components/task-groups";
import { TaskGroup, TaskPanel } from "@/modules/todos/components/task-panel";
import { loadDateContext } from "@/modules/todos/date-context";
import { groupCompletedByDay } from "@/modules/todos/day-views";
import { getCompletedTasks } from "@/server/data/views";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Completed" };

const LIMIT = 200;

/** Finished tasks grouped by the day they were finished, newest first (CLAUDE.md §6.2). */
export default async function CompletedPage({ searchParams }: PageProps<"/completed">) {
  const { userId } = await requireUser();
  const [{ ctx, timeZone }, { task }, tasks] = await Promise.all([
    loadDateContext(userId),
    searchParams,
    getCompletedTasks(userId, LIMIT),
  ]);
  const days = groupCompletedByDay(tasks, timeZone);

  return (
    <>
      <TaskPanel
        id="completed"
        title="Completed"
        subtitle={
          tasks.length >= LIMIT
            ? `Your ${LIMIT} most recently finished tasks, newest first.`
            : "Finished tasks, newest first."
        }
      >
        {days.length === 0 ? (
          <EmptyState
            icon={CircleCheckBig}
            title="Nothing finished yet"
            hint="Tick a task off and it will appear here, grouped by the day you finished it."
          />
        ) : null}
        {days.map((day) => (
          <TaskGroup
            key={day.date}
            id={`done-${day.date}`}
            label={formatDayHeading(day.date, ctx.today, ctx.locale)}
            count={day.tasks.length}
          >
            <TaskList tasks={day.tasks} allTasks={[]} ctx={ctx} />
          </TaskGroup>
        ))}
      </TaskPanel>
      <TaskDrawerHost
        userId={userId}
        taskParam={typeof task === "string" ? task : undefined}
        ctx={ctx}
      />
    </>
  );
}
