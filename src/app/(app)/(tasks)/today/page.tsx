import { CircleCheckBig, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { PageTitle, SectionCard } from "@/components/dash/page-title";
import { EmptyState } from "@/components/shell/empty-state";
import { formatRowDay, todayIn } from "@/lib/dates";
import { InlineAdd } from "@/modules/todos/components/inline-add";
import { QuickAddButton } from "@/modules/todos/components/quick-add-button";
import { TaskDrawerHost } from "@/modules/todos/components/task-drawer-host";
import { TaskList } from "@/modules/todos/components/task-groups";
import { loadDateContext } from "@/modules/todos/date-context";
import { RepeatingCard } from "@/modules/todos/components/repeating-card";
import {
  byTimeThenPriority,
  countCompletedOn,
  isRoutine,
  onePerRepeat,
  splitToday,
  weekDates,
} from "@/modules/todos/day-views";
import { loadRoutineIds } from "@/modules/todos/upcoming.server";
import { getInbox } from "@/server/data/lists";
import { getCompletedTasks, getDueByTasks } from "@/server/data/views";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Today" };

/**
 * Today (docs/new_design.md screen 2b, CLAUDE.md §6.2): the overdue card first, then today's
 * tasks by time and then priority. Tasks ticked off today stay in place, struck through, so the
 * day reads as a record and not a list that empties itself. Frequent repeats (every day, every
 * few days, several weekdays) sit in their own Repeating card under them (O, 2026-11-22), so
 * routines never bury one-off tasks.
 */
export default async function TodayPage({ searchParams }: PageProps<"/today">) {
  const { userId } = await requireUser();
  const [{ ctx, timeZone }, { task }, inbox] = await Promise.all([
    loadDateContext(userId),
    searchParams,
    getInbox(userId),
  ]);
  const [tasks, completed, routineIds] = await Promise.all([
    getDueByTasks(userId, ctx.today),
    getCompletedTasks(userId, 500),
    loadRoutineIds(userId),
  ]);
  const routine = (t: (typeof tasks)[number]) => isRoutine(t, routineIds);
  const split = splitToday(tasks, ctx);
  const overdue = split.overdue.filter((t) => !routine(t));
  const today = split.today.filter((t) => !routine(t));
  const doneToday = countCompletedOn(completed, [ctx.today], timeZone)[0]?.count ?? 0;
  const doneThisWeek = countCompletedOn(
    completed,
    weekDates(ctx.today, ctx.weekStartsOn),
    timeZone,
  ).reduce((n, d) => n + d.count, 0);
  // Finished today and due today: they stay on the page, struck through.
  const finished = completed.filter(
    (t) =>
      t.dueDate === ctx.today &&
      t.completedAt !== null &&
      todayIn(timeZone, t.completedAt) === ctx.today,
  );
  const todayRows = onePerRepeat([...today, ...finished.filter((t) => !routine(t))]).sort(
    byTimeThenPriority,
  );
  // The Repeating card: routines due today or missed, and those already ticked off today (even a
  // missed one, whose finished copy keeps its old date).
  const routineRows = onePerRepeat([
    ...[...split.overdue, ...split.today].filter(routine),
    ...completed.filter(
      (t) => t.completedAt !== null && todayIn(timeZone, t.completedAt) === ctx.today && routine(t),
    ),
  ]).sort(byTimeThenPriority);
  const routinesDone = routineRows.filter((t) => t.status === "done").length;
  const empty = overdue.length === 0 && today.length === 0;
  const finishedOneOffs = todayRows.length - today.length;

  return (
    <>
      <PageTitle
        back={{ href: "/tasks", label: "Tasks" }}
        title="Today"
        meta={`${formatRowDay(ctx.today, ctx.today, ctx.locale)} · ${today.length} today · ${doneThisWeek} done this week`}
      />
      <div className="flex flex-col gap-3 md:gap-4">
        {overdue.length > 0 ? (
          <SectionCard
            id="overdue-heading"
            tone="bad"
            heading={
              <>
                <TriangleAlert aria-hidden className="size-3.5" strokeWidth={2.25} />
                Overdue · {overdue.length}
              </>
            }
          >
            <TaskList tasks={overdue} allTasks={[]} ctx={ctx} />
          </SectionCard>
        ) : null}
        <SectionCard id="today-heading" heading={`Today · ${today.length}`}>
          {empty && finishedOneOffs === 0 ? (
            <EmptyState
              icon={CircleCheckBig}
              title="All caught up."
              hint={
                doneToday > 0
                  ? `You finished ${doneToday} ${doneToday === 1 ? "task" : "tasks"} today.`
                  : routineRows.length > 0
                    ? "Nothing else is due today. Your repeating tasks are below."
                    : "Tasks due today, and anything overdue, show up here."
              }
              action={<QuickAddButton />}
            />
          ) : (
            <TaskList tasks={todayRows} allTasks={[]} ctx={ctx} />
          )}
          <div className="mt-1 border-t border-dash-edge">
            <InlineAdd listId={inbox.id} dueDate={ctx.today} label="Add to Today" />
          </div>
        </SectionCard>
        {routineRows.length > 0 ? (
          <RepeatingCard id="repeating-heading" done={routinesDone} total={routineRows.length}>
            <TaskList tasks={routineRows} allTasks={[]} ctx={ctx} />
          </RepeatingCard>
        ) : null}
      </div>
      <TaskDrawerHost
        userId={userId}
        taskParam={typeof task === "string" ? task : undefined}
        ctx={ctx}
      />
    </>
  );
}
