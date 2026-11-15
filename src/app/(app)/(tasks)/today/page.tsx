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
import {
  byTimeThenPriority,
  countCompletedOn,
  splitToday,
  weekDates,
} from "@/modules/todos/day-views";
import { getInbox } from "@/server/data/lists";
import { getCompletedTasks, getDueByTasks } from "@/server/data/views";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Today" };

/**
 * Today (docs/new_design.md screen 2b, CLAUDE.md §6.2): the overdue card first, then today's
 * tasks by time and then priority. Tasks ticked off today stay in place, struck through, so the
 * day reads as a record and not a list that empties itself.
 */
export default async function TodayPage({ searchParams }: PageProps<"/today">) {
  const { userId } = await requireUser();
  const [{ ctx, timeZone }, { task }, inbox] = await Promise.all([
    loadDateContext(userId),
    searchParams,
    getInbox(userId),
  ]);
  const [tasks, completed] = await Promise.all([
    getDueByTasks(userId, ctx.today),
    getCompletedTasks(userId, 500),
  ]);
  const { overdue, today } = splitToday(tasks, ctx);
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
  const todayRows = [...today, ...finished].sort(byTimeThenPriority);
  const empty = overdue.length === 0 && today.length === 0;

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
          {empty && finished.length === 0 ? (
            <EmptyState
              icon={CircleCheckBig}
              title="All caught up."
              hint={
                doneToday > 0
                  ? `You finished ${doneToday} ${doneToday === 1 ? "task" : "tasks"} today.`
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
      </div>
      <TaskDrawerHost
        userId={userId}
        taskParam={typeof task === "string" ? task : undefined}
        ctx={ctx}
      />
    </>
  );
}
