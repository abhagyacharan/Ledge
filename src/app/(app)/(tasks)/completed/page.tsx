import { CalendarDays, CircleCheckBig, X } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { EmptyState } from "@/components/shell/empty-state";
import { formatRowDay, isIsoDate } from "@/lib/dates";
import { TaskDrawerHost } from "@/modules/todos/components/task-drawer-host";
import { TaskList } from "@/modules/todos/components/task-groups";
import { PageTitle, SectionCard } from "@/components/dash/page-title";
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
  const shortDay = (date: string) => formatRowDay(date, ctx.today, ctx.locale).replace(/^\S+ /, "");

  const longDay = (date: string) =>
    new Intl.DateTimeFormat(ctx.locale, {
      weekday: "long",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(`${date}T00:00:00Z`));

  return (
    <>
      <PageTitle
        // Narrowed to a day, the way back is the Journal page you came from (screen 2g).
        back={
          day
            ? { href: `/journal?d=${day}`, label: `Journal, ${shortDay(day)}` }
            : { href: "/tasks", label: "Tasks" }
        }
        backAlways={day !== null}
        title="Completed"
        meta={
          day
            ? undefined
            : tasks.length >= LIMIT
              ? `Your ${LIMIT} most recent, newest first`
              : `${tasks.length} finished, newest first`
        }
      />
      {day ? (
        <div className="-mt-1 mb-4 flex flex-wrap items-center gap-2">
          <Link
            href="/completed"
            aria-label={`Showing ${longDay(day)} only. Remove the day filter.`}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-dash-ink pr-3 pl-4 text-[14px] font-semibold text-dash-card outline-none focus-visible:shadow-[0_0_0_2px_var(--background),0_0_0_4px_var(--dash-ink)] md:h-10"
          >
            <CalendarDays aria-hidden className="size-4" />
            {formatRowDay(day, ctx.today, ctx.locale)}
            <X aria-hidden className="size-4" />
          </Link>
          <Link
            href="/completed"
            className="inline-flex h-11 items-center rounded-full px-3 text-[14px] font-medium text-dash-ink-soft outline-none hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50 md:h-10"
          >
            Show all days
          </Link>
        </div>
      ) : null}
      <div className="flex flex-col gap-3 md:gap-4">
        {days.length === 0 ? (
          <SectionCard
            id="completed-empty"
            heading={day ? longDay(day) : "Completed"}
            className="pb-4"
          >
            <EmptyState
              icon={CircleCheckBig}
              title={day ? "A rest day." : "Nothing finished yet"}
              hint={
                day
                  ? "Nothing was ticked off that day."
                  : "Tick a task off and it will appear here, grouped by the day you finished it."
              }
            />
          </SectionCard>
        ) : null}
        {days.map((group) => (
          <SectionCard
            key={group.date}
            id={`done-${group.date}`}
            heading={longDay(group.date)}
            aside={
              <span className="font-mono text-xs font-medium text-dash-ink-soft">
                {group.tasks.length} done
              </span>
            }
          >
            <TaskList tasks={group.tasks} allTasks={[]} ctx={ctx} />
          </SectionCard>
        ))}
        <p className="px-1 text-[13px] text-dash-ink-soft">
          Tap a check to mark the task open again. Undo is offered for a few seconds.
        </p>
      </div>
      <TaskDrawerHost
        userId={userId}
        taskParam={typeof task === "string" ? task : undefined}
        ctx={ctx}
      />
    </>
  );
}
