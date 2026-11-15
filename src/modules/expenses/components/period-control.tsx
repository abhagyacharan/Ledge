"use client";

import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { Popover } from "radix-ui";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MAX_YEAR, MIN_YEAR, MONTH_NAMES, periodLabel, shiftPeriod, type Period } from "../periods";

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

/**
 * The period control: one pill with "previous" and "next" either side of the chosen month.
 * Tapping the month opens a small calendar of months with a year stepper, "Whole year" and
 * "This month". `yearOnly` steps whole years and has no calendar (reports that cover a year).
 * Controlled: the parent keeps the period (the Summary keeps it in the URL, Settings in state).
 */
export function PeriodControl({
  period,
  fallback,
  onChange,
  yearOnly = false,
  label: groupLabel = "Period",
  compact = false,
}: {
  period: Period;
  /** The current month: marked in the calendar and used by "This month". */
  fallback: Period;
  onChange: (next: Period) => void;
  yearOnly?: boolean;
  label?: string;
  /** Only the pill ("Nov 2026"), for the entry tabs' top bar (docs/new_design.md screen 3b). */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(period.year);

  function go(next: Period) {
    setOpen(false);
    onChange(next);
  }

  const stepLabel = yearOnly || period.month === "all" ? "year" : "month";
  const label = yearOnly
    ? String(period.year)
    : compact && period.month !== "all"
      ? `${MONTH_NAMES[period.month - 1]?.slice(0, 3)} ${period.year}`
      : periodLabel(period);
  const isThisMonth = period.year === fallback.year && period.month === fallback.month;

  return (
    <div
      role="group"
      aria-label={groupLabel}
      className={cn("flex items-center gap-2", compact ? "w-auto" : "w-full sm:w-auto")}
    >
      {compact ? null : (
        <RoundButton
          label={`Previous ${stepLabel}`}
          disabled={
            period.year <= MIN_YEAR && (yearOnly || period.month === "all" || period.month === 1)
          }
          onClick={() =>
            go(yearOnly ? { year: period.year - 1, month: "all" } : shiftPeriod(period, -1))
          }
        >
          <ChevronLeft className="size-4" />
        </RoundButton>
      )}

      {yearOnly ? (
        <span className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-full border border-dash-edge bg-dash-card px-4 text-sm font-medium text-dash-ink sm:min-w-48 sm:flex-none md:h-9">
          <CalendarDays aria-hidden className="size-4 text-dash-ink-soft" />
          <span className="tabular-nums">{period.year}</span>
        </span>
      ) : (
        <Popover.Root
          open={open}
          onOpenChange={(next) => {
            if (next) setViewYear(period.year);
            setOpen(next);
          }}
        >
          <Popover.Trigger
            className={cn(
              "group flex h-11 min-w-0 items-center justify-center gap-2 rounded-full border border-dash-edge bg-dash-card px-4 text-[15px] font-semibold text-dash-ink shadow-(--dash-card-shadow) outline-none transition-colors duration-150 hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=open]:bg-dash-well md:h-10 md:text-sm",
              compact ? "flex-none" : "flex-1 sm:min-w-52 sm:flex-none",
            )}
          >
            <span className="sr-only">Choose period: </span>
            <span className="truncate tabular-nums">{label}</span>
            <ChevronDown
              aria-hidden
              className="size-4 text-dash-ink-soft transition-transform duration-200 ease-snap group-data-[state=open]:rotate-180"
            />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="center"
              sideOffset={8}
              collisionPadding={16}
              aria-label="Choose a period"
              className="dash z-50 w-[min(21rem,calc(100vw-2rem))] origin-(--radix-popover-content-transform-origin) rounded-2xl border border-dash-edge bg-dash-card p-3 text-dash-ink shadow-[0_24px_48px_-16px_rgb(0_0_0/0.3)] outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:duration-100 data-[state=open]:duration-150"
            >
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
                  disabled={viewYear >= MAX_YEAR}
                  onClick={() => setViewYear((y) => y + 1)}
                >
                  <ChevronRight className="size-4" />
                </RoundButton>
              </div>

              <button
                type="button"
                aria-pressed={period.month === "all" && period.year === viewYear}
                onClick={() => go({ year: viewYear, month: "all" })}
                className={cn(
                  "mt-2 flex h-11 w-full items-center rounded-xl px-3 text-sm font-semibold outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/50",
                  period.month === "all" && period.year === viewYear
                    ? "bg-dash-ink text-dash-card"
                    : "bg-dash-well text-dash-ink hover:bg-dash-edge",
                )}
              >
                Whole year {viewYear}
              </button>

              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {MONTH_NAMES.map((name, i) => {
                  const month = i + 1;
                  const selected = period.year === viewYear && period.month === month;
                  const current = fallback.year === viewYear && fallback.month === month;
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => go({ year: viewYear, month })}
                      className={cn(
                        "relative h-12 rounded-xl border text-sm outline-none transition-[transform,background-color,color] duration-150 ease-snap focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95",
                        selected
                          ? "border-dash-ink bg-dash-well font-semibold text-dash-ink"
                          : "border-dash-edge text-dash-ink hover:bg-dash-well",
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
                            "bg-dash-accent",
                          )}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={isThisMonth}
                onClick={() => go(fallback)}
                className="mt-2 h-11 w-full rounded-full text-sm font-semibold text-dash-ink outline-none transition-colors duration-150 hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-45"
              >
                Back to this month
              </button>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}

      {compact ? null : (
        <RoundButton
          label={`Next ${stepLabel}`}
          disabled={
            period.year >= MAX_YEAR && (yearOnly || period.month === "all" || period.month === 12)
          }
          onClick={() =>
            go(yearOnly ? { year: period.year + 1, month: "all" } : shiftPeriod(period, 1))
          }
        >
          <ChevronRight className="size-4" />
        </RoundButton>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        Showing {label}
      </p>
    </div>
  );
}
