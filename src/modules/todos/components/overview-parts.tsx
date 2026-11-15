import { Circle, Landmark, Repeat, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { daysBetween, formatRowDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { List } from "@/server/db/schema";
import type { ListProgress } from "@/server/data/views";
import { ListGlyph } from "../list-icons";

/**
 * Pieces of the Tasks overview (docs/new_design.md screen 2a). Server components: they only draw
 * what the page hands them.
 */

/**
 * The figures at the top (screens 2a and 6a): due today, overdue (tinted when there is any), the
 * next seven days (desktop) and done this week, whose tile carries the screen's one orange mark.
 */
export function OverviewTiles({
  dueToday,
  dueTodayTotal,
  overdue,
  overdueSince,
  nextSeven,
  doneThisWeek,
}: {
  dueToday: number;
  /** Everything due today, done or not: "2 of 3 left". */
  dueTodayTotal: number;
  overdue: number;
  /** "Wed": the oldest overdue day. */
  overdueSince: string | null;
  nextSeven: number;
  doneThisWeek: number;
}) {
  const tile =
    "relative flex min-h-[88px] flex-col justify-between overflow-hidden rounded-2xl border p-3.5 md:min-h-[104px] md:p-4";
  const plain = "border-dash-edge bg-dash-card shadow-(--dash-card-shadow)";
  const label = "text-[12px] leading-tight text-dash-ink-soft md:text-[13px]";
  const figure = "font-display text-[28px] leading-none font-semibold md:text-[32px]";
  const note = "ml-1.5 hidden font-sans text-[13px] font-normal text-dash-ink-soft md:inline";
  return (
    <dl className="grid grid-cols-3 gap-2.5 md:gap-3 lg:grid-cols-4">
      <div className={cn(tile, plain)}>
        <dt className={label}>Due today</dt>
        <dd className={figure}>
          {dueToday}
          {dueTodayTotal > dueToday ? <span className={note}>of {dueTodayTotal} left</span> : null}
        </dd>
      </div>
      <div
        className={cn(
          tile,
          overdue > 0 ? "border-transparent bg-dash-bad-bg text-dash-bad" : plain,
        )}
      >
        <dt
          className={cn(
            "inline-flex items-center gap-1 text-[12px] leading-tight md:text-[13px]",
            overdue > 0 ? "font-semibold" : "text-dash-ink-soft",
          )}
        >
          {overdue > 0 ? (
            <TriangleAlert aria-hidden className="size-3.5" strokeWidth={2.25} />
          ) : null}
          Overdue
        </dt>
        <dd className={figure}>
          {overdue}
          {overdue > 0 && overdueSince ? (
            <span className="ml-1.5 hidden font-sans text-[13px] font-medium md:inline">
              since {overdueSince}
            </span>
          ) : null}
        </dd>
      </div>
      <div className={cn(tile, plain, "hidden lg:flex")}>
        <dt className={label}>Next 7 days</dt>
        <dd className={figure}>{nextSeven}</dd>
      </div>
      <div className={cn(tile, plain)}>
        <dt className={label}>Done this week</dt>
        <dd className={figure}>{doneThisWeek}</dd>
        <span
          aria-hidden
          className="dash-hatch absolute inset-x-0 bottom-0 hidden h-1.5 md:block"
        />
      </div>
    </dl>
  );
}

/**
 * The next seven days as a strip: each cell is the weekday and a round count, and opens Upcoming at
 * that day. The busiest day is filled ink, the screen's one strong mark.
 */
export function WeekStrip({
  days,
  locale,
}: {
  days: { date: string; count: number }[];
  locale: string;
}) {
  const peak = Math.max(0, ...days.map((d) => d.count));
  const weekday = (iso: string, style: "short" | "long") =>
    new Intl.DateTimeFormat(locale, { weekday: style, timeZone: "UTC" }).format(
      new Date(`${iso}T00:00:00Z`),
    );
  return (
    <ol className="grid grid-cols-7 gap-1">
      {days.map((d) => {
        const busiest = peak > 0 && d.count === peak;
        return (
          <li key={d.date}>
            <Link
              href={`/upcoming#day-${d.date}`}
              aria-label={`${weekday(d.date, "long")}: ${d.count} ${d.count === 1 ? "task" : "tasks"}`}
              className="flex min-h-11 flex-col items-center gap-1.5 rounded-xl py-1 outline-none transition-colors duration-150 hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span aria-hidden className="font-mono text-[11px] font-medium text-dash-ink-soft">
                {weekday(d.date, "short")}
              </span>
              <span
                aria-hidden
                className={cn(
                  "grid size-8 place-items-center rounded-full font-mono text-[13px] font-medium",
                  busiest
                    ? "bg-dash-ink text-dash-card"
                    : d.count > 0
                      ? "bg-dash-well text-dash-ink"
                      : "border border-dash-edge text-dash-ink-soft",
                )}
              >
                {d.count}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Each list: its icon, name, "done/total" in mono, a progress bar and, for a goal, its target and
 * days left. Rows are separated by hairlines.
 */
export function ListsProgress({
  lists,
  progress,
  today,
  locale,
}: {
  lists: List[];
  progress: ListProgress[];
  today: string;
  locale: string;
}) {
  const byList = new Map(progress.map((p) => [p.listId, p]));
  return (
    <ul className="flex flex-col">
      {lists.map((list, i) => {
        const p = byList.get(list.id) ?? { open: 0, done: 0 };
        const total = p.open + p.done;
        const share = total === 0 ? 0 : p.done / total;
        const left = list.targetDate ? daysBetween(today, list.targetDate) : null;
        return (
          <li key={list.id} className={i > 0 ? "border-t border-dash-edge" : undefined}>
            <Link
              href={`/lists/${list.id}`}
              className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 outline-none transition-colors duration-150 hover:bg-dash-well/70 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-full bg-dash-well"
              >
                <ListGlyph icon={list.icon} className="size-[18px] text-dash-ink" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[15px] font-medium md:text-sm">{list.name}</span>
                  <span
                    aria-label={`${p.done} of ${total} done`}
                    className="shrink-0 font-mono text-xs font-medium text-dash-ink-soft"
                  >
                    {p.done}/{total}
                  </span>
                </span>
                <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-dash-track">
                  <span
                    className="block h-full origin-left rounded-full bg-dash-ink transition-transform duration-500 ease-snap"
                    style={{ transform: `scaleX(${share})` }}
                  />
                </span>
                {list.targetDate && left !== null ? (
                  <span className="text-xs text-dash-ink-soft">
                    Target {formatRowDay(list.targetDate, today, locale).replace(/^\S+ /, "")} ·{" "}
                    {left > 0
                      ? `${left} ${left === 1 ? "day" : "days"} left`
                      : left === 0
                        ? "due today"
                        : `${-left} ${left === -1 ? "day" : "days"} past`}
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export type GridDay = {
  date: string;
  items: { key: string; kind: "task" | "repeat" | "emi"; title: string; href: string }[];
};

const GRID_ICON = { task: Circle, repeat: Repeat, emi: Landmark } as const;

/**
 * The next fourteen days as two weeks of cells (docs/new_design.md screen 6a): each cell lists its
 * tasks (ring), repeat previews (repeat icon) and EMIs due (bank icon), or "Free". Desktop only.
 */
export function WeekGrid({
  days,
  today,
  locale,
}: {
  days: GridDay[];
  today: string;
  locale: string;
}) {
  const label = (iso: string) => formatRowDay(iso, today, locale).replace(/ \S+$/, "");
  return (
    <div>
      <ol className="grid grid-cols-7 gap-1.5">
        {days.map((d) => (
          <li
            key={d.date}
            aria-label={`${formatRowDay(d.date, today, locale)}: ${d.items.length === 0 ? "free" : `${d.items.length} things`}`}
            className="flex min-h-28 flex-col gap-1.5 rounded-xl bg-dash-well p-2"
          >
            <Link
              href={`/upcoming#day-${d.date}`}
              className="font-mono text-[11px] font-semibold text-dash-ink outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {label(d.date)}
            </Link>
            {d.items.length === 0 ? (
              <span className="text-[11px] text-dash-ink-soft">Free</span>
            ) : (
              <ul className="flex flex-col gap-1">
                {d.items.slice(0, 3).map((item) => {
                  const Icon = GRID_ICON[item.kind];
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        scroll={false}
                        className={cn(
                          "flex items-start gap-1 rounded text-[11px] leading-tight outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50",
                          item.kind === "task" ? "text-dash-ink" : "text-dash-ink-soft",
                        )}
                      >
                        <Icon aria-hidden className="mt-px size-3 shrink-0" />
                        <span className="line-clamp-2">{item.title}</span>
                      </Link>
                    </li>
                  );
                })}
                {d.items.length > 3 ? (
                  <li className="text-[11px] text-dash-ink-soft">+{d.items.length - 3} more</li>
                ) : null}
              </ul>
            )}
          </li>
        ))}
      </ol>
      <p aria-hidden className="mt-3 flex gap-4 text-xs text-dash-ink-soft">
        <span className="inline-flex items-center gap-1">
          <Circle className="size-3" /> Task
        </span>
        <span className="inline-flex items-center gap-1">
          <Repeat className="size-3" /> Repeat preview
        </span>
        <span className="inline-flex items-center gap-1">
          <Landmark className="size-3" /> EMI due
        </span>
      </p>
    </div>
  );
}
