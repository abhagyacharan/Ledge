"use client";

import { BarChart3, Table2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The annual cash flow card (docs/new_design.md §5 "Annual cash flow", screen 3f): the paired bars,
 * and a "Show as table" switch to a real table with the full-year total. With a mouse both are
 * shown, the table under the chart; on a phone the switch picks one.
 */
export function CashFlowCard({
  title,
  actions,
  chart,
  table,
}: {
  title: string;
  actions?: ReactNode;
  chart: ReactNode;
  table: ReactNode;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section
      aria-labelledby="cash-flow-title"
      className="flex min-w-0 flex-col gap-3 rounded-2xl border border-dash-edge bg-dash-card p-4 text-dash-ink shadow-(--dash-card-shadow) md:rounded-3xl md:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="cash-flow-title" className="text-[15px] font-semibold">
          {title}
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-pressed={asTable}
            onClick={() => setAsTable((t) => !t)}
            className="inline-flex h-11 items-center gap-1.5 rounded-full bg-dash-well px-3.5 text-[13px] font-medium outline-none transition-colors duration-150 hover:bg-dash-edge focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8 lg:hidden"
          >
            {asTable ? (
              <BarChart3 aria-hidden className="size-3.5" />
            ) : (
              <Table2 aria-hidden className="size-3.5" />
            )}
            {asTable ? "Show as chart" : "Show as table"}
          </button>
          {actions}
        </div>
      </div>
      <div className={cn(asTable && "max-lg:hidden")}>{chart}</div>
      <div className={cn(!asTable && "max-lg:hidden")}>{table}</div>
    </section>
  );
}
