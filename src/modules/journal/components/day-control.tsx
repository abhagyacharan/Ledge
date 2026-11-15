"use client";

import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover } from "radix-ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { addDaysIso, formatDayHeading, formatLongDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { MONTH_NAMES } from "@/modules/expenses/periods";
import { journalMonthDatesAction } from "../actions";
import { monthGrid, monthOf, shiftMonth, weekdayInitials, type Month } from "../calendar";

const MIN_YEAR = 2000;

function RoundButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-11 shrink-0 place-items-center rounded-full border border-dash-edge bg-dash-card text-dash-ink shadow-(--dash-card-shadow) outline-none transition-[transform,background-color] duration-150 ease-snap hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95 disabled:pointer-events-none disabled:opacity-40 md:size-9"
    >
      {children}
    </button>
  );
}

const monthKey = (m: Month) => `${m.year}-${m.month}`;
const dayHref = (day: string, today: string) => (day === today ? "/journal" : `/journal?d=${day}`);

/**
 * The journal's day control (docs/journal-spec.md): the Expenses period pill, one day at a time.
 * The arrows step a day; the pill opens a month of days (a dot marks each day with a page), and
 * tapping the month name switches to the month grid, as in Expenses. No days after today.
 */
export function DayControl({
  day,
  today,
  weekStartsOn,
  locale,
  marked,
}: {
  day: string;
  today: string;
  weekStartsOn: number;
  locale: string;
  /** Days of the chosen day's month that have a page. */
  marked: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"days" | "months">("days");
  const [viewMonth, setViewMonth] = useState<Month>(monthOf(day));
  const [viewYear, setViewYear] = useState(monthOf(day).year);
  // Dots for other months, fetched when shown. The page's own month comes from `marked`, so it
  // always reflects the latest save.
  const [dots, setDots] = useState<Record<string, string[]>>({});
  const pageMonth = monthKey(monthOf(day));

  // Fetch the dots for a month the first time it is shown.
  useEffect(() => {
    if (!open) return;
    const key = monthKey(viewMonth);
    if (key === pageMonth || dots[key]) return;
    let live = true;
    void journalMonthDatesAction(viewMonth).then((result) => {
      if (live && result.ok) setDots((d) => ({ ...d, [key]: result.data }));
    });
    return () => {
      live = false;
    };
  }, [open, viewMonth, dots, pageMonth]);

  function go(next: string) {
    setOpen(false);
    startTransition(() => router.push(dayHref(next, today), { scroll: false }));
  }

  const todayMonth = monthOf(today);
  const atLatestMonth = viewMonth.year === todayMonth.year && viewMonth.month === todayMonth.month;
  const grid = monthGrid(viewMonth, weekStartsOn);
  const shownMonth = monthKey(viewMonth);
  const marks = new Set(shownMonth === pageMonth ? marked : (dots[shownMonth] ?? []));
  const label = formatDayHeading(day, today, locale);
  // "Thu, 12 Nov" on the phone top bar (screen 4a).
  const shortLabel = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));

  return (
    <div
      role="group"
      aria-label="Day"
      aria-busy={pending || undefined}
      className="flex w-full items-center justify-between gap-2 md:w-auto md:justify-start"
    >
      <RoundButton label="Previous day" onClick={() => go(addDaysIso(day, -1))}>
        <ChevronLeft className="size-4" />
      </RoundButton>

      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          if (next) {
            setView("days");
            setViewMonth(monthOf(day));
            setViewYear(monthOf(day).year);
          }
          setOpen(next);
        }}
      >
        <Popover.Trigger className="group flex h-11 min-w-0 items-center justify-center gap-2 rounded-full px-3 text-[15px] font-semibold text-dash-ink outline-none transition-colors duration-150 hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=open]:bg-dash-well md:order-last md:text-sm md:font-medium md:text-dash-ink-soft">
          <span className="sr-only">Choose a day: </span>
          <span className="truncate tabular-nums md:hidden">{shortLabel}</span>
          <span className="hidden md:inline">Jump to a day</span>
          <CalendarDays aria-hidden className="size-4 text-dash-ink-soft" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={8}
            collisionPadding={16}
            aria-label="Choose a day"
            className="dash z-50 w-[min(22rem,calc(100vw-2rem))] origin-(--radix-popover-content-transform-origin) rounded-2xl border border-dash-edge bg-dash-card p-3 text-dash-ink shadow-[0_24px_48px_-16px_rgb(0_0_0/0.3)] outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:duration-100 data-[state=open]:duration-150"
          >
            {view === "days" ? (
              <>
                <div className="flex items-center justify-between">
                  <RoundButton
                    label="Previous month"
                    disabled={viewMonth.year <= MIN_YEAR && viewMonth.month === 1}
                    onClick={() => setViewMonth((m) => shiftMonth(m, -1))}
                  >
                    <ChevronLeft className="size-4" />
                  </RoundButton>
                  <button
                    type="button"
                    onClick={() => {
                      setViewYear(viewMonth.year);
                      setView("months");
                    }}
                    aria-label={`${MONTH_NAMES[viewMonth.month - 1]} ${viewMonth.year}. Choose a month`}
                    className="flex h-11 items-center gap-1.5 rounded-full px-3 font-display text-lg font-semibold tabular-nums outline-none transition-colors duration-150 hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9"
                  >
                    <span aria-live="polite">
                      {MONTH_NAMES[viewMonth.month - 1]} {viewMonth.year}
                    </span>
                    <ChevronDown aria-hidden className="size-4 text-dash-ink-soft" />
                  </button>
                  <RoundButton
                    label="Next month"
                    disabled={atLatestMonth}
                    onClick={() => setViewMonth((m) => shiftMonth(m, 1))}
                  >
                    <ChevronRight className="size-4" />
                  </RoundButton>
                </div>

                <div className="mt-2 grid grid-cols-7 gap-0.5 text-center">
                  {weekdayInitials(weekStartsOn).map((w, i) => (
                    <span
                      key={i}
                      aria-hidden
                      className="py-1 font-mono text-[11px] text-dash-ink-soft"
                    >
                      {w}
                    </span>
                  ))}
                  {Array.from({ length: grid.leading }, (_, i) => (
                    <span key={`blank-${i}`} aria-hidden />
                  ))}
                  {grid.days.map((d) => {
                    const selected = d === day;
                    const isToday = d === today;
                    const future = d > today;
                    const hasPage = marks.has(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={future}
                        aria-pressed={selected}
                        aria-current={isToday ? "date" : undefined}
                        onClick={() => go(d)}
                        className={cn(
                          "relative mx-auto grid size-10 place-items-center rounded-full text-sm tabular-nums outline-none transition-[transform,background-color,color] duration-150 ease-snap focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95 disabled:pointer-events-none disabled:text-dash-ink-soft/45",
                          selected
                            ? "bg-dash-ink font-semibold text-dash-card"
                            : "text-dash-ink hover:bg-dash-well",
                          isToday && !selected && "border-2 border-dash-ink font-semibold",
                        )}
                      >
                        <span aria-hidden>{Number(d.slice(8))}</span>
                        <span className="sr-only">
                          {formatLongDate(d, locale)}
                          {isToday ? " (today)" : ""}
                          {hasPage ? ", has entry" : ""}
                        </span>
                        {hasPage ? (
                          <span
                            aria-hidden
                            className={cn(
                              "absolute -bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full",
                              "bg-dash-accent",
                            )}
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <RoundButton
                    label="Previous year"
                    disabled={viewYear <= MIN_YEAR}
                    onClick={() => setViewYear((y) => y - 1)}
                  >
                    <ChevronLeft className="size-4" />
                  </RoundButton>
                  <span
                    className="font-display text-lg font-semibold tabular-nums"
                    aria-live="polite"
                  >
                    {viewYear}
                  </span>
                  <RoundButton
                    label="Next year"
                    disabled={viewYear >= todayMonth.year}
                    onClick={() => setViewYear((y) => y + 1)}
                  >
                    <ChevronRight className="size-4" />
                  </RoundButton>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1">
                  {MONTH_NAMES.map((name, i) => {
                    const month = i + 1;
                    const shown = viewMonth.year === viewYear && viewMonth.month === month;
                    const current = todayMonth.year === viewYear && todayMonth.month === month;
                    const future =
                      viewYear > todayMonth.year ||
                      (viewYear === todayMonth.year && month > todayMonth.month);
                    return (
                      <button
                        key={name}
                        type="button"
                        disabled={future}
                        aria-pressed={shown}
                        onClick={() => {
                          setViewMonth({ year: viewYear, month });
                          setView("days");
                        }}
                        className={cn(
                          "relative h-11 rounded-2xl text-sm outline-none transition-[transform,background-color,color] duration-150 ease-snap focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95 disabled:pointer-events-none disabled:text-dash-ink-soft/45",
                          shown
                            ? "bg-dash-ink font-medium text-dash-card"
                            : "text-dash-ink hover:bg-dash-well",
                        )}
                      >
                        <span aria-hidden>{name.slice(0, 3)}</span>
                        <span className="sr-only">
                          {name} {viewYear}
                          {current ? " (this month)" : ""}
                        </span>
                        {current ? (
                          <span
                            aria-hidden
                            className={cn(
                              "absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full",
                              shown ? "bg-dash-card" : "bg-dash-accent",
                            )}
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <p aria-hidden className="mt-3 flex items-center gap-3 text-xs text-dash-ink-soft">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-dash-accent" /> Has an entry
              </span>
              <span>Future days can&apos;t be opened</span>
            </p>
            <button
              type="button"
              disabled={day === today}
              onClick={() => go(today)}
              className="mt-3 h-12 w-full rounded-full bg-dash-ink text-[15px] font-semibold text-dash-card outline-none transition-[transform,background-color] duration-150 ease-snap hover:bg-dash-ink/85 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98] disabled:opacity-45 md:h-10 md:text-sm"
            >
              Go to today
            </button>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <RoundButton label="Next day" disabled={day >= today} onClick={() => go(addDaysIso(day, 1))}>
        <ChevronRight className="size-4" />
      </RoundButton>

      <p className="sr-only" role="status" aria-live="polite">
        Showing {label}
      </p>
    </div>
  );
}
