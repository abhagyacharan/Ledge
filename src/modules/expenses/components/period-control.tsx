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
      className="grid size-11 shrink-0 place-items-center rounded-full text-dash-ink outline-none transition-[transform,background-color] duration-150 ease-snap hover:bg-dash-raised focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95 disabled:pointer-events-none disabled:opacity-40 md:size-9"
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
}: {
  period: Period;
  /** The current month: marked in the calendar and used by "This month". */
  fallback: Period;
  onChange: (next: Period) => void;
  yearOnly?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(period.year);

  function go(next: Period) {
    setOpen(false);
    onChange(next);
  }

  const stepLabel = yearOnly || period.month === "all" ? "year" : "month";
  const label = yearOnly ? String(period.year) : periodLabel(period);
  const isThisMonth = period.year === fallback.year && period.month === fallback.month;

  return (
    <div
      role="group"
      aria-label={groupLabel}
      className="flex w-full items-center gap-1 rounded-full bg-dash-track p-1 shadow-[inset_0_0_0_1px_var(--dash-track-edge)] sm:w-auto sm:self-start lg:self-auto"
    >
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

      {yearOnly ? (
        <span className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 px-4 text-sm font-medium text-dash-ink sm:min-w-48 sm:flex-none md:h-9">
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
          <Popover.Trigger className="group flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium text-dash-ink outline-none transition-colors duration-150 hover:bg-dash-raised focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=open]:bg-dash-raised sm:min-w-48 sm:flex-none md:h-9">
            <CalendarDays aria-hidden className="size-4 text-dash-ink-soft" />
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
              className="dash z-50 w-[19.5rem] origin-(--radix-popover-content-transform-origin) rounded-2xl border border-dash-edge bg-dash-card p-3 text-dash-ink shadow-[0_24px_48px_-16px_rgb(0_0_0/0.3)] outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:duration-100 data-[state=open]:duration-150"
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

              <div className="mt-2 grid grid-cols-3 gap-1">
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
                        "relative h-11 rounded-2xl text-sm outline-none transition-[transform,background-color,color] duration-150 ease-snap focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95",
                        selected
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
                            selected ? "bg-dash-card" : "bg-dash-accent",
                          )}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 grid grid-cols-2 gap-1 border-t border-dash-edge pt-2">
                <button
                  type="button"
                  aria-pressed={period.month === "all" && period.year === viewYear}
                  onClick={() => go({ year: viewYear, month: "all" })}
                  className={cn(
                    "h-11 rounded-2xl text-sm font-medium outline-none transition-[transform,background-color,color] duration-150 ease-snap focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95",
                    period.month === "all" && period.year === viewYear
                      ? "bg-dash-ink text-dash-card"
                      : "bg-dash-well text-dash-ink hover:bg-dash-edge",
                  )}
                >
                  Whole year
                </button>
                <button
                  type="button"
                  disabled={isThisMonth}
                  onClick={() => go(fallback)}
                  className="h-11 rounded-2xl bg-dash-well text-sm font-medium text-dash-ink outline-none transition-[transform,background-color] duration-150 ease-snap hover:bg-dash-edge focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95 disabled:opacity-45"
                >
                  This month
                </button>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}

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

      <p className="sr-only" role="status" aria-live="polite">
        Showing {label}
      </p>
    </div>
  );
}
