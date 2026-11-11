"use client";

import {
  CalendarDays,
  ChartPie,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Landmark,
  ReceiptIndianRupee,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Popover } from "radix-ui";
import { useEffect, useOptimistic, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { KIND_LABELS, KIND_ROUTES } from "../categories";
import {
  MAX_YEAR,
  MIN_YEAR,
  MONTH_NAMES,
  parsePeriod,
  periodLabel,
  shiftPeriod,
  type Period,
} from "../periods";
import { usePending } from "./pending";

const TABS = [
  { label: "Summary", icon: ChartPie, route: "/expenses" },
  { label: KIND_LABELS.income.tab, icon: Wallet, route: KIND_ROUTES.income },
  { label: KIND_LABELS.emi.tab, icon: Landmark, route: KIND_ROUTES.emi },
  { label: KIND_LABELS.expense.tab, icon: ReceiptIndianRupee, route: KIND_ROUTES.expense },
  { label: KIND_LABELS.investment.tab, icon: TrendingUp, route: KIND_ROUTES.investment },
];

/** Keeps only the period in the query string (filters belong to one tab). */
function periodQuery(search: URLSearchParams): string {
  const keep = new URLSearchParams();
  for (const key of ["y", "m"]) {
    const value = search.get(key);
    if (value) keep.set(key, value);
  }
  const text = keep.toString();
  return text ? `?${text}` : "";
}

/**
 * The five sections as one pill bar (docs/design.md §5c). The chosen tab is a raised pill that
 * slides to the next one. On a phone the bar scrolls sideways and keeps the chosen tab in view.
 * The chosen period travels with you from tab to tab.
 */
export function ExpensesTabs() {
  const pathname = usePathname();
  const search = useSearchParams();
  const query = periodQuery(new URLSearchParams(search.toString()));
  const reduce = useReducedMotion();
  const scroller = useRef<HTMLElement>(null);
  const active = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const bar = scroller.current;
    const tab = active.current;
    if (!bar || !tab || bar.scrollWidth <= bar.clientWidth) return;
    bar.scrollTo({
      left: tab.offsetLeft - (bar.clientWidth - tab.offsetWidth) / 2,
      behavior: reduce ? "auto" : "smooth",
    });
  }, [pathname, reduce]);

  return (
    <nav
      ref={scroller}
      aria-label="Expense sections"
      className="no-scrollbar -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0"
    >
      <ul className="flex w-full gap-1 rounded-full bg-dash-well p-1 sm:inline-flex sm:w-auto">
        {TABS.map((tab) => {
          const current = pathname === tab.route;
          return (
            <li key={tab.route} className="flex-1 sm:flex-none">
              <Link
                ref={current ? active : undefined}
                href={`${tab.route}${query}`}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "relative z-0 flex h-11 items-center justify-center rounded-full px-4 text-sm font-medium whitespace-nowrap outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9",
                  current ? "text-dash-ink" : "text-dash-ink-soft hover:text-dash-ink",
                )}
              >
                {current ? (
                  <motion.span
                    aria-hidden
                    layoutId="expenses-tab-pill"
                    transition={{ type: "spring", duration: 0.35, bounce: 0 }}
                    className="absolute inset-0 -z-10 rounded-full bg-dash-raised shadow-[0_1px_2px_rgb(0_0_0/0.08)]"
                  />
                ) : null}
                {/* Phones show a line icon so all five fit; the name is still read out. */}
                <tab.icon aria-hidden className="size-[18px] sm:hidden" strokeWidth={1.75} />
                <span className="max-sm:sr-only">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

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
 * The period: one pill with "previous" and "next" either side of the chosen month. Tapping the
 * month opens a small calendar of months with a year stepper, "Whole year" and "This month".
 * The choice lives in the URL as `?y=&m=`; the picker answers at once and the page follows.
 */
export function PeriodPicker({ fallback }: { fallback: Period }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const params = Object.fromEntries(search.entries());
  // Two quick clicks on "previous" move two months: the second reads the optimistic month.
  const [period, setPeriod] = useOptimistic(parsePeriod(params, fallback));
  const { start: startTransition } = usePending();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(period.year);

  function go(next: Period) {
    const query = new URLSearchParams(search.toString());
    query.set("y", String(next.year));
    query.set("m", String(next.month));
    setOpen(false);
    startTransition(() => {
      setPeriod(next);
      router.replace(`${pathname}?${query.toString()}`, { scroll: false });
    });
  }

  const stepLabel = period.month === "all" ? "year" : "month";
  const label = periodLabel(period);
  const isThisMonth = period.year === fallback.year && period.month === fallback.month;

  return (
    <div
      role="group"
      aria-label="Period"
      className="flex w-full items-center gap-1 rounded-full bg-dash-well p-1 sm:w-auto sm:self-start lg:self-auto"
    >
      <RoundButton label={`Previous ${stepLabel}`} onClick={() => go(shiftPeriod(period, -1))}>
        <ChevronLeft className="size-4" />
      </RoundButton>

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
              <span className="font-display text-lg font-semibold tabular-nums" aria-live="polite">
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

      <RoundButton label={`Next ${stepLabel}`} onClick={() => go(shiftPeriod(period, 1))}>
        <ChevronRight className="size-4" />
      </RoundButton>

      <p className="sr-only" role="status" aria-live="polite">
        Showing {label}
      </p>
    </div>
  );
}
