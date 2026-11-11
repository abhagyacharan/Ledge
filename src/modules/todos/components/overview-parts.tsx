import Link from "next/link";
import { cn } from "@/lib/utils";
import type { List } from "@/server/db/schema";
import type { ListProgress } from "@/server/data/views";
import { ListGlyph } from "../list-icons";

/**
 * Pieces of the Tasks overview (docs/design.md §5f). Server components: they only draw what the
 * page hands them.
 */

/** Each list with how many tasks are open and a bar for how much is done. */
export function ListsProgress({ lists, progress }: { lists: List[]; progress: ListProgress[] }) {
  const byList = new Map(progress.map((p) => [p.listId, p]));
  return (
    <ul className="-mx-2 flex flex-col">
      {lists.map((list) => {
        const p = byList.get(list.id) ?? { open: 0, done: 0 };
        const total = p.open + p.done;
        const share = total === 0 ? 0 : p.done / total;
        return (
          <li key={list.id}>
            <Link
              href={`/lists/${list.id}`}
              className="flex items-center gap-3 rounded-xl px-2 py-2.5 outline-none transition-colors duration-150 hover:bg-dash-well/70 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-full bg-dash-well"
              >
                <ListGlyph icon={list.icon} className="size-[18px] text-dash-ink" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium">{list.name}</span>
                  <span className="shrink-0 text-xs text-dash-ink-soft">
                    {p.open === 0 ? "All done" : `${p.open} open`}
                  </span>
                </span>
                <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-dash-well">
                  <span
                    className="block h-full origin-left rounded-full bg-dash-ink transition-transform duration-500 ease-snap"
                    style={{ transform: `scaleX(${share})` }}
                  />
                </span>
                <span className="sr-only">
                  {p.done} of {total} done
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Tasks finished on each day of this week, as seven small bars (today's is ink, the rest grey,
 * days still to come are empty). Each bar says its number in words for screen readers.
 */
export function WeekBars({
  days,
  today,
  locale,
}: {
  days: { date: string; count: number }[];
  today: string;
  locale: string;
}) {
  const peak = Math.max(1, ...days.map((d) => d.count));
  const weekday = (iso: string, style: "narrow" | "long") =>
    new Intl.DateTimeFormat(locale, { weekday: style, timeZone: "UTC" }).format(
      new Date(`${iso}T00:00:00Z`),
    );
  return (
    <ol className="grid h-36 grid-cols-7 items-end gap-2 rounded-xl bg-dash-well p-3">
      {days.map((d) => {
        const future = d.date > today;
        const isToday = d.date === today;
        return (
          <li
            key={d.date}
            className="flex h-full flex-col items-center justify-end gap-2"
            aria-label={`${weekday(d.date, "long")}: ${d.count} ${d.count === 1 ? "task" : "tasks"} done`}
          >
            <span aria-hidden className="figures text-[11px] text-dash-ink-soft">
              {future || d.count === 0 ? "" : d.count}
            </span>
            <span
              aria-hidden
              className={cn(
                "w-full max-w-6 rounded-md transition-[height] duration-500 ease-snap",
                future ? "bg-transparent" : isToday ? "bg-dash-ink" : "bg-dash-ink/25",
              )}
              style={{ height: future ? 0 : `${Math.max(6, (d.count / peak) * 100)}%` }}
            />
            <span
              aria-hidden
              className={cn(
                "text-[11px]",
                isToday ? "font-semibold text-dash-ink" : "text-dash-ink-soft",
              )}
            >
              {weekday(d.date, "narrow")}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
