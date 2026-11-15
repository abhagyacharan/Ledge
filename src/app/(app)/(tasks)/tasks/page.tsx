import { CircleCheckBig, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SectionCard } from "@/components/dash/page-title";
import { EmptyState } from "@/components/shell/empty-state";
import { addDaysIso, formatRowDay, todayIn } from "@/lib/dates";
import { NewListButton } from "@/modules/todos/components/new-list-button";
import {
  ListsProgress,
  OverviewTiles,
  WeekGrid,
  WeekStrip,
  type GridDay,
} from "@/modules/todos/components/overview-parts";
import { QuickAddButton } from "@/modules/todos/components/quick-add-button";
import { TaskDrawerHost } from "@/modules/todos/components/task-drawer-host";
import { TaskList } from "@/modules/todos/components/task-groups";
import { TasksHeader } from "@/modules/todos/components/tasks-header";
import { loadDateContext } from "@/modules/todos/date-context";
import { countCompletedOn, groupUpcoming, splitToday, weekDates } from "@/modules/todos/day-views";
import { loadUpcomingDays } from "@/modules/todos/upcoming.server";
import { emisDueBetween } from "@/server/data/finance";
import { listLists } from "@/server/data/lists";
import {
  getCompletedTasks,
  getDueBetweenTasks,
  getDueByTasks,
  getListProgress,
} from "@/server/data/views";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Tasks" };

/** How many rows the Today and overdue card shows before pointing to Today. */
const TODAY_ROWS = 6;
const STRIP_DAYS = 7;
const GRID_DAYS = 14;

/** ISO week number (1 to 53) of a floating date. */
function isoWeekNumber(iso: string): number {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
}

/**
 * The Tasks overview (docs/new_design.md screen 2a): the view chips, three figures (due today,
 * overdue, done this week), today's and overdue tasks, the next seven days as a strip, and every
 * list with its progress.
 */
export default async function TasksOverviewPage({ searchParams }: PageProps<"/tasks">) {
  const { userId } = await requireUser();
  const [{ ctx, timeZone }, { task }] = await Promise.all([loadDateContext(userId), searchParams]);
  const week = weekDates(ctx.today, ctx.weekStartsOn);
  const [due, soon, completed, lists, progress, gridDays, emis] = await Promise.all([
    getDueByTasks(userId, ctx.today),
    getDueBetweenTasks(userId, addDaysIso(ctx.today, 1), addDaysIso(ctx.today, STRIP_DAYS)),
    getCompletedTasks(userId, 500),
    listLists(userId),
    getListProgress(userId),
    loadUpcomingDays(userId, ctx, GRID_DAYS),
    emisDueBetween(userId, addDaysIso(ctx.today, 1), addDaysIso(ctx.today, GRID_DAYS)),
  ]);

  const { overdue, today } = splitToday(due, ctx);
  const upcoming = groupUpcoming(soon, ctx.today, STRIP_DAYS);
  const strip = Array.from({ length: STRIP_DAYS }, (_, i) => {
    const date = addDaysIso(ctx.today, i + 1);
    return { date, count: upcoming.find((d) => d.date === date)?.tasks.length ?? 0 };
  });
  const doneThisWeek = countCompletedOn(completed, week, timeZone).reduce((n, d) => n + d.count, 0);
  const weekStart = week[0] ?? ctx.today;
  const doneWeek = completed.filter(
    (t) => t.completedAt !== null && todayIn(timeZone, t.completedAt) >= weekStart,
  );
  const doneTodayDue = completed.filter(
    (t) =>
      t.dueDate === ctx.today &&
      t.completedAt !== null &&
      todayIn(timeZone, t.completedAt) === ctx.today,
  ).length;
  const nextSeven = strip.reduce((n, d) => n + d.count, 0);
  const oldest = overdue[0]?.dueDate ?? null;
  const overdueSince = oldest
    ? new Intl.DateTimeFormat(ctx.locale, { weekday: "short", timeZone: "UTC" }).format(
        new Date(`${oldest}T00:00:00Z`),
      )
    : null;
  const eyebrow = `${formatRowDay(ctx.today, ctx.today, ctx.locale)} · week ${isoWeekNumber(ctx.today)}`;

  // The desktop grid: fourteen days of tasks, repeat previews and EMIs due.
  const grid: GridDay[] = Array.from({ length: GRID_DAYS }, (_, i) => {
    const date = addDaysIso(ctx.today, i + 1);
    const day = gridDays.find((d) => d.date === date);
    return {
      date,
      items: [
        ...(day?.tasks ?? []).map((t) => ({
          key: `t-${t.id}`,
          kind: "task" as const,
          title: t.title,
          href: `/tasks?task=${t.id}`,
        })),
        ...(day?.previews ?? []).map((p) => ({
          key: `r-${p.taskId}`,
          kind: "repeat" as const,
          title: p.title,
          href: `/tasks?task=${p.taskId}`,
        })),
        ...emis
          .filter((e) => e.entryDate === date)
          .map((e) => ({
            key: `e-${e.id}`,
            kind: "emi" as const,
            title: `${e.title} due`,
            href: `/expenses/emis?y=${date.slice(0, 4)}&m=${Number(date.slice(5, 7))}`,
          })),
      ],
    };
  });

  // Overdue first, then today, capped so the page stays calm.
  const rows = [...overdue, ...today];
  const shown = rows.slice(0, TODAY_ROWS);
  const hidden = rows.length - shown.length;

  return (
    <>
      <TasksHeader todayCount={rows.length} eyebrow={eyebrow} />
      <div className="flex flex-col gap-3 md:gap-4">
        <OverviewTiles
          dueToday={today.length}
          dueTodayTotal={today.length + doneTodayDue}
          overdue={overdue.length}
          overdueSince={overdueSince}
          nextSeven={nextSeven}
          doneThisWeek={doneThisWeek}
        />

        <div className="grid gap-3 md:gap-4 lg:grid-cols-12 lg:items-start">
          <div className="flex min-w-0 flex-col gap-3 md:gap-4 lg:col-span-7">
            <SectionCard
              id="overview-today"
              heading={overdue.length > 0 ? "Today and overdue" : "Today"}
              aside={<SeeAll href="/today" label="Open Today" />}
            >
              {rows.length === 0 ? (
                <EmptyState
                  icon={CircleCheckBig}
                  compact
                  title="All caught up."
                  hint={
                    strip[0] && strip[0].count > 0
                      ? `Nothing left for today. Tomorrow has ${strip[0].count} ${strip[0].count === 1 ? "task" : "tasks"}.`
                      : "Nothing left for today."
                  }
                  action={<QuickAddButton />}
                />
              ) : (
                <TaskList tasks={shown} allTasks={[]} ctx={ctx} />
              )}
              {hidden > 0 ? (
                <p className="pb-2 text-[13px] text-dash-ink-soft">
                  {overdue.length > TODAY_ROWS ? (
                    <TriangleAlert aria-hidden className="mr-1 inline size-3.5 text-dash-bad" />
                  ) : null}
                  And {hidden} more in{" "}
                  <Link
                    href="/today"
                    className="font-medium text-dash-ink underline underline-offset-4"
                  >
                    Today
                  </Link>
                  .
                </p>
              ) : null}
            </SectionCard>

            <SectionCard
              id="overview-week"
              heading="Next 7 days"
              aside={<SeeAll href="/upcoming" label="Open Upcoming" />}
              className="pb-3"
            >
              <div className="lg:hidden">
                <WeekStrip days={strip} locale={ctx.locale} />
              </div>
              <div className="hidden lg:block">
                <WeekGrid days={grid} today={ctx.today} locale={ctx.locale} />
              </div>
            </SectionCard>
          </div>

          <div className="flex min-w-0 flex-col gap-3 md:gap-4 lg:col-span-5">
            <SectionCard id="overview-lists" heading="Lists" aside={<NewListButton />}>
              <ListsProgress
                lists={lists}
                progress={progress}
                today={ctx.today}
                locale={ctx.locale}
              />
            </SectionCard>

            {doneWeek.length > 0 ? (
              <SectionCard
                id="overview-done"
                heading={`Done this week · ${doneWeek.length}`}
                aside={<SeeAll href="/completed" label="Completed" />}
                className="hidden lg:block"
              >
                <TaskList tasks={doneWeek.slice(0, 5)} allTasks={[]} ctx={ctx} />
              </SectionCard>
            ) : null}
          </div>
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

/** A quiet link in a card's corner, 44px tall on phones. */
function SeeAll({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="-my-2 -mr-2 inline-flex h-11 items-center rounded-full px-2.5 text-[13px] font-semibold text-dash-ink outline-none transition-colors duration-150 hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9"
    >
      {label}
    </Link>
  );
}
