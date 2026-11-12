import { AlertCircle, ArrowRight, CalendarDays, CircleCheckBig, Sun } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { StatTile } from "@/components/dash/stat-tile";
import { EmptyState } from "@/components/shell/empty-state";
import { addDaysIso, formatDayHeading, formatLongDate } from "@/lib/dates";
import { NewListButton } from "@/modules/todos/components/new-list-button";
import { ListsProgress, WeekBars } from "@/modules/todos/components/overview-parts";
import { QuickAddButton } from "@/modules/todos/components/quick-add-button";
import { TaskDrawerHost } from "@/modules/todos/components/task-drawer-host";
import { TaskList } from "@/modules/todos/components/task-groups";
import { TaskGroup, TaskPanel } from "@/modules/todos/components/task-panel";
import { loadDateContext } from "@/modules/todos/date-context";
import { countCompletedOn, groupUpcoming, splitToday, weekDates } from "@/modules/todos/day-views";
import { listLists } from "@/server/data/lists";
import {
  getCompletedTasks,
  getDueBetweenTasks,
  getDueByTasks,
  getListProgress,
} from "@/server/data/views";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Tasks" };

/** How many rows each card shows before pointing to the full view. */
const TODAY_ROWS = 6;
const SOON_ROWS = 6;
const SOON_DAYS = 7;

/**
 * The Tasks overview (docs/design.md §5f), the home of the Tasks section: four figures (due today,
 * overdue, the next seven days, done this week), what needs doing today, what is coming up,
 * every list with its progress, and this week's finished tasks day by day.
 */
export default async function TasksOverviewPage({ searchParams }: PageProps<"/tasks">) {
  const { userId } = await requireUser();
  const [{ ctx, timeZone }, { task }] = await Promise.all([loadDateContext(userId), searchParams]);
  const week = weekDates(ctx.today, ctx.weekStartsOn);
  const [due, soon, completed, lists, progress] = await Promise.all([
    getDueByTasks(userId, ctx.today),
    getDueBetweenTasks(userId, addDaysIso(ctx.today, 1), addDaysIso(ctx.today, SOON_DAYS)),
    getCompletedTasks(userId, 500),
    listLists(userId),
    getListProgress(userId),
  ]);

  const { overdue, today } = splitToday(due, ctx);
  const upcoming = groupUpcoming(soon, ctx.today, SOON_DAYS);
  const upcomingCount = upcoming.reduce((n, d) => n + d.tasks.length, 0);
  const doneByDay = countCompletedOn(completed, week, timeZone);
  const doneThisWeek = doneByDay.reduce((n, d) => n + d.count, 0);
  const highToday = today.filter((t) => t.priority === 3).length;

  // Today's card: overdue first, then today, capped so the page stays calm.
  const shownOverdue = overdue.slice(0, TODAY_ROWS);
  const shownToday = today.slice(0, Math.max(0, TODAY_ROWS - shownOverdue.length));
  const hiddenToday = overdue.length + today.length - shownOverdue.length - shownToday.length;

  // The first few upcoming tasks, still grouped by day.
  const shownSoon = upcoming
    .map((day, i) => {
      const before = upcoming.slice(0, i).reduce((n, d) => n + d.tasks.length, 0);
      return { ...day, tasks: day.tasks.slice(0, Math.max(0, SOON_ROWS - before)) };
    })
    .filter((day) => day.tasks.length > 0);

  return (
    <div className="flex flex-col gap-4">
      <TaskPanel
        id="glance"
        title={`Your tasks on ${formatLongDate(ctx.today, ctx.locale)}`}
        hideTitle
        // Phones: one card of four equal rows, edge to edge. Wider: no outer box, each figure is
        // its own card.
        className="max-sm:overflow-hidden max-sm:p-0 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none md:p-0"
      >
        <dl className="flex flex-col sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <StatTile
            label="Due today"
            value={String(today.length)}
            icon={Sun}
            highlight
            variant="card"
          >
            <Note onAccent>{highToday > 0 ? `${highToday} high priority` : "Plan the day"}</Note>
          </StatTile>
          <StatTile
            label="Overdue"
            value={String(overdue.length)}
            icon={AlertCircle}
            variant="card"
          >
            <Note>{overdue.length > 0 ? "Pick these up first" : "Nothing late"}</Note>
          </StatTile>
          <StatTile
            label="Next 7 days"
            value={String(upcomingCount)}
            icon={CalendarDays}
            variant="card"
          >
            <Note>Due after today</Note>
          </StatTile>
          <StatTile
            label="Done this week"
            value={String(doneThisWeek)}
            icon={CircleCheckBig}
            variant="card"
          >
            <Note>Since {formatDayHeading(week[0], ctx.today, ctx.locale).split(" · ")[0]}</Note>
          </StatTile>
        </dl>
      </TaskPanel>

      <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-7">
          <TaskPanel
            id="overview-today"
            title="Today"
            subtitle={formatLongDate(ctx.today, ctx.locale)}
            action={<MoreLink href="/today" label="Open Today" />}
          >
            {overdue.length + today.length === 0 ? (
              <EmptyState
                icon={Sun}
                title="Nothing due today"
                hint="You're clear. Add something, or look at what's coming up."
                action={<QuickAddButton />}
              />
            ) : null}
            {shownOverdue.length > 0 ? (
              <TaskGroup id="ov-overdue" label="Overdue" count={overdue.length} tone="bad">
                <TaskList tasks={shownOverdue} allTasks={[]} ctx={ctx} />
              </TaskGroup>
            ) : null}
            {shownToday.length > 0 ? (
              <TaskGroup id="ov-today" label="Today" count={today.length}>
                <TaskList tasks={shownToday} allTasks={[]} ctx={ctx} />
              </TaskGroup>
            ) : null}
            {hiddenToday > 0 ? (
              <p className="mt-2 text-[13px] text-dash-ink-soft">
                And {hiddenToday} more in{" "}
                <Link
                  href="/today"
                  className="font-medium text-dash-ink underline underline-offset-4"
                >
                  Today
                </Link>
                .
              </p>
            ) : null}
          </TaskPanel>

          <TaskPanel
            id="overview-soon"
            title="Coming up"
            subtitle={`The next ${SOON_DAYS} days`}
            action={<MoreLink href="/upcoming" label="Open Upcoming" />}
          >
            {shownSoon.length === 0 ? (
              <p className="py-4 text-sm text-dash-ink-soft">Nothing due in the next week.</p>
            ) : null}
            {shownSoon.map((day) => (
              <TaskGroup
                key={day.date}
                id={`ov-day-${day.date}`}
                label={formatDayHeading(day.date, ctx.today, ctx.locale)}
                count={upcoming.find((d) => d.date === day.date)?.tasks.length ?? day.tasks.length}
              >
                <TaskList tasks={day.tasks} allTasks={[]} ctx={ctx} />
              </TaskGroup>
            ))}
          </TaskPanel>
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:col-span-5">
          <TaskPanel id="overview-lists" title="Lists" action={<NewListButton />}>
            <ListsProgress lists={lists} progress={progress} />
          </TaskPanel>

          <TaskPanel
            id="overview-week"
            title="This week"
            subtitle={`${doneThisWeek} ${doneThisWeek === 1 ? "task" : "tasks"} finished`}
            action={<MoreLink href="/completed" label="Open Completed" />}
          >
            <WeekBars days={doneByDay} today={ctx.today} locale={ctx.locale} />
          </TaskPanel>
        </div>
      </div>

      <TaskDrawerHost
        userId={userId}
        taskParam={typeof task === "string" ? task : undefined}
        ctx={ctx}
      />
    </div>
  );
}

function Note({ children, onAccent = false }: { children: ReactNode; onAccent?: boolean }) {
  return (
    <span className={`hidden text-xs sm:inline ${onAccent ? "text-white" : "text-dash-ink-soft"}`}>
      {children}
    </span>
  );
}

/** A quiet "open the full view" link in a card's corner (44px tall on phones). */
function MoreLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="-my-2 inline-flex h-11 items-center gap-1 rounded-full px-3 text-[13px] font-medium text-dash-ink-soft outline-none transition-colors duration-150 hover:bg-dash-well hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9"
    >
      {label}
      <ArrowRight aria-hidden className="size-3.5" />
    </Link>
  );
}
