"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic } from "react";
import { PillTabs } from "@/components/dash/pill-tabs";
import { modules } from "@/config/modules";
import { parsePeriod, type Period } from "../periods";
import { usePending } from "./pending";
import { PeriodControl } from "./period-control";

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
 * The five sections as one pill bar (docs/design.md §5c), from the module registry. The chosen
 * period travels with you from tab to tab.
 */
export function ExpensesTabs() {
  const pathname = usePathname();
  const search = useSearchParams();
  const query = periodQuery(new URLSearchParams(search.toString()));
  const expenses = modules.find((m) => m.id === "expenses");
  return (
    <PillTabs
      label="Expense sections"
      id="expenses-tab"
      tabs={(expenses?.nav ?? []).map((item) => ({
        label: item.label,
        icon: item.icon,
        href: `${item.route}${query}`,
        current: pathname === item.route,
      }))}
    />
  );
}

/**
 * The Summary's period picker: the period control, with the choice kept in the URL as `?y=&m=`.
 * It answers at once and the page follows.
 */
export function PeriodPicker({ fallback }: { fallback: Period }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const params = Object.fromEntries(search.entries());
  // Two quick clicks on "previous" move two months: the second reads the optimistic month.
  const [period, setPeriod] = useOptimistic(parsePeriod(params, fallback));
  const { start: startTransition } = usePending();

  function go(next: Period) {
    const query = new URLSearchParams(search.toString());
    query.set("y", String(next.year));
    query.set("m", String(next.month));
    startTransition(() => {
      setPeriod(next);
      router.replace(`${pathname}?${query.toString()}`, { scroll: false });
    });
  }

  return <PeriodControl period={period} fallback={fallback} onChange={go} />;
}
