"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const TABS = [
  { label: "Summary", route: "/expenses" },
  { label: KIND_LABELS.income.tab, route: KIND_ROUTES.income },
  { label: KIND_LABELS.emi.tab, route: KIND_ROUTES.emi },
  { label: KIND_LABELS.expense.tab, route: KIND_ROUTES.expense },
  { label: KIND_LABELS.investment.tab, route: KIND_ROUTES.investment },
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
 * The tab bar for the expense tracker: Summary, Income, EMIs & loans, Expenses, Investments. It
 * scrolls sideways on a narrow screen, and the chosen period travels with you from tab to tab.
 */
export function ExpensesTabs() {
  const pathname = usePathname();
  const search = useSearchParams();
  const query = periodQuery(new URLSearchParams(search.toString()));

  return (
    <nav aria-label="Expense sections" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex min-w-max gap-1 border-b">
        {TABS.map((tab) => {
          const active = pathname === tab.route;
          return (
            <li key={tab.route}>
              <Link
                href={`${tab.route}${query}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px flex min-h-11 items-center border-b-2 px-3 text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-9",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const ALL_MONTHS = "all";

/**
 * Month and year picker shared by every tab (docs/expenses-spec.md): previous and next arrows, a
 * month menu with "Whole year", and a year menu. The choice lives in the URL as `?y=&m=`.
 */
export function PeriodPicker({ fallback }: { fallback: Period }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const params = Object.fromEntries(search.entries());
  // The picker answers at once; the URL catches up a moment later. Two quick clicks on "previous"
  // therefore move two months instead of the second one reading the old month.
  const [period, setPeriod] = useOptimistic(parsePeriod(params, fallback));
  const [, startTransition] = useTransition();

  function go(next: Period) {
    const query = new URLSearchParams(search.toString());
    query.set("y", String(next.year));
    query.set("m", String(next.month));
    startTransition(() => {
      setPeriod(next);
      router.replace(`${pathname}?${query.toString()}`, { scroll: false });
    });
  }

  const thisYear = fallback.year;
  const years = Array.from(
    new Set([...Array.from({ length: 8 }, (_, i) => thisYear - 5 + i), period.year]),
  )
    .filter((y) => y >= MIN_YEAR && y <= MAX_YEAR)
    .sort((a, b) => a - b);

  const stepLabel = period.month === "all" ? "year" : "month";
  const label = periodLabel(period);

  return (
    <div role="group" aria-label="Period" className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11 md:size-8"
        aria-label={`Previous ${stepLabel}`}
        onClick={() => go(shiftPeriod(period, -1))}
      >
        <ChevronLeft />
      </Button>

      <Select
        value={String(period.month)}
        onValueChange={(v) =>
          go({ year: period.year, month: v === ALL_MONTHS ? "all" : Number(v) })
        }
      >
        <SelectTrigger aria-label="Month" className="h-11 w-40 md:h-8">
          <SelectValue>
            {period.month === "all" ? "Whole year" : MONTH_NAMES[period.month - 1]}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_MONTHS}>Whole year</SelectItem>
          {MONTH_NAMES.map((name, i) => (
            <SelectItem key={name} value={String(i + 1)}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={String(period.year)}
        onValueChange={(v) => go({ year: Number(v), month: period.month })}
      >
        <SelectTrigger aria-label="Year" className="h-11 w-28 md:h-8">
          <SelectValue>{period.year}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11 md:size-8"
        aria-label={`Next ${stepLabel}`}
        onClick={() => go(shiftPeriod(period, 1))}
      >
        <ChevronRight />
      </Button>

      <p className="sr-only" role="status" aria-live="polite">
        Showing {label}
      </p>
    </div>
  );
}
