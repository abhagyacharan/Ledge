import { CircleCheckBig, X } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { EmptyState } from "@/components/shell/empty-state";
import { formatDayHeading, isIsoDate } from "@/lib/dates";
import { TaskDrawerHost } from "@/modules/todos/components/task-drawer-host";
import { TaskList } from "@/modules/todos/components/task-groups";
import { TaskGroup, TaskPanel } from "@/modules/todos/components/task-panel";
import { loadDateContext } from "@/modules/todos/date-context";
import { groupCompletedByDay } from "@/modules/todos/day-views";
import { getCompletedTasks, getCompletedTasksOn } from "@/server/data/views";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Completed" };

const LIMIT = 200;

/**
 * Finished tasks grouped by the day they were finished, newest first (CLAUDE.md §6.2).
 * `?day=YYYY-MM-DD` shows one day only (the journal links here).
 */
export default async function CompletedPage({ searchParams }: PageProps<"/completed">) {
  const { userId } = await requireUser();
  const [{ ctx, timeZone }, params] = await Promise.all([loadDateContext(userId), searchParams]);
  const { task } = params;
  const day = typeof params.day === "string" && isIsoDate(params.day) ? params.day : null;
  const tasks = day
    ? await getCompletedTasksOn(userId, day, timeZone)
    : await getCompletedTasks(userId, LIMIT);
  const days = groupCompletedByDay(tasks, timeZone);

  return (
    <>
      <TaskPanel
        id="completed"
        title="Completed"
        subtitle={
          day
            ? `Finished on ${formatDayHeading(day, ctx.today, ctx.locale)}.`
            : tasks.length >= LIMIT
              ? `Your ${LIMIT} most recently finished tasks, newest first.`
              : "Finished tasks, newest first."
        }
        action={
          day ? (
            <Link
              href="/completed"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-dash-well px-3.5 text-[13px] font-medium text-dash-ink outline-none transition-colors duration-150 hover:bg-dash-edge focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-8"
            >
              <X aria-hidden className="size-3.5" />
              Show every day
            </Link>
          ) : undefined
        }
      >
        {days.length === 0 ? (
          <EmptyState
            icon={CircleCheckBig}
            title={day ? "Nothing finished that day" : "Nothing finished yet"}
            hint={
              day
                ? "Tasks you tick off on a day show up here and in that day's journal."
                : "Tick a task off and it will appear here, grouped by the day you finished it."
            }
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
