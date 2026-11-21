import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/shell/empty-state";
import { addDaysIso, formatRowDay } from "@/lib/dates";
import { InlineAdd } from "@/modules/todos/components/inline-add";
import { RepeatPreview } from "@/modules/todos/components/repeat-preview";
import { RepeatingCard } from "@/modules/todos/components/repeating-card";
import { RoutineRow } from "@/modules/todos/components/routine-row";
import { QuickAddButton } from "@/modules/todos/components/quick-add-button";
import { TaskDrawerHost } from "@/modules/todos/components/task-drawer-host";
import { TaskList } from "@/modules/todos/components/task-groups";
import { PageTitle, SectionCard } from "@/components/dash/page-title";
import { loadDateContext } from "@/modules/todos/date-context";
import { loadRoutines, loadUpcomingDays } from "@/modules/todos/upcoming.server";
import { getInbox } from "@/server/data/lists";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Upcoming" };

const DAYS = 14;

/**
 * The next 14 days, one group per day; tasks without a date are left out (CLAUDE.md §6.2). A
 * weekly, monthly or yearly repeat also shows on each later day it comes back, as a preview, until
 * its end date. Frequent repeats (every day, every few days, several weekdays) are listed once in
 * a Repeating card at the top instead of on every day (O, 2026-11-22).
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
  const [days, routines] = await Promise.all([
    loadUpcomingDays(userId, ctx, DAYS),
    loadRoutines(userId, ctx),
  ]);

  const dayName = (date: string) =>
    date === tomorrow
      ? "Tomorrow"
      : new Intl.DateTimeFormat(ctx.locale, { weekday: "long", timeZone: "UTC" }).format(
          new Date(`${date}T00:00:00Z`),
        );
  const shortDay = (date: string) => formatRowDay(date, ctx.today, ctx.locale).replace(/^\S+ /, "");

  return (
    <>
      <PageTitle
        back={{ href: "/tasks", label: "Tasks" }}
        title="Upcoming"
        meta={`Next ${DAYS} days · ${tomorrow.slice(0, 7) === last.slice(0, 7) ? shortDay(tomorrow).split(" ")[0] : shortDay(tomorrow)} to ${shortDay(last)}`}
      />
      <div className="flex flex-col gap-3 md:gap-4">
        {routines.length > 0 ? (
          <RepeatingCard id="repeating-heading" total={routines.length}>
            <ul aria-label="Repeating tasks">
              {routines.map((r) => (
                <RoutineRow key={r.taskId} {...r} locale={ctx.locale} />
              ))}
            </ul>
          </RepeatingCard>
        ) : null}
        {days.length === 0 ? (
          <SectionCard id="upcoming-empty" heading="Next 14 days" className="pb-4">
            <EmptyState
              icon={CalendarDays}
              title="A clear two weeks."
              hint={
                routines.length > 0
                  ? `Only your repeating tasks, above, in the next ${DAYS} days. Undated tasks are left out.`
                  : `No tasks are due, and none of your repeating tasks come back, in the next ${DAYS} days. Undated tasks are left out.`
              }
              action={<QuickAddButton />}
            />
          </SectionCard>
        ) : null}
        {days.map((day) => (
          <SectionCard
            key={day.date}
            id={`day-${day.date}`}
            className="scroll-mt-6"
            heading={
              <>
                {dayName(day.date)}{" "}
                <span className="font-normal text-dash-ink-soft">
                  {day.date === tomorrow
                    ? formatRowDay(day.date, ctx.today, ctx.locale)
                    : shortDay(day.date)}
                </span>
              </>
            }
          >
            {day.tasks.length > 0 ? (
              <TaskList tasks={day.tasks} allTasks={[]} ctx={ctx} timeOnly />
            ) : null}
            {day.previews.length > 0 ? (
              <ul aria-label="Repeating tasks coming back">
                {day.previews.map((p) => (
                  <RepeatPreview
                    key={p.taskId}
                    taskId={p.taskId}
                    title={p.title}
                    dueTime={p.dueTime}
                    listName={p.listName}
                    locale={ctx.locale}
                  />
                ))}
              </ul>
            ) : null}
          </SectionCard>
        ))}
        <div className="rounded-2xl border border-dash-edge bg-dash-card px-4 shadow-(--dash-card-shadow) md:px-5">
          <InlineAdd listId={inbox.id} dueDate={tomorrow} label="Add a task for tomorrow" />
        </div>
      </div>
      <TaskDrawerHost
        userId={userId}
        taskParam={typeof task === "string" ? task : undefined}
        ctx={ctx}
      />
    </>
  );
}
