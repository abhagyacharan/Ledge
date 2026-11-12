"use client";

import { Download } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { dashButton } from "@/components/dash/dash-button";
import { cn } from "@/lib/utils";
import { periodLabel, type Period } from "../periods";
import { PeriodControl } from "./period-control";

type Report = "breakdown" | "cash-flow";

const REPORTS: { id: Report; label: string }[] = [
  { id: "breakdown", label: "Expense breakdown" },
  { id: "cash-flow", label: "Annual cash flow" },
];

/**
 * Settings, Expense Tracker (docs/expenses-spec.md, "Download as PDF"): pick a report, pick its
 * period (a month or a year for the breakdown, a year for the cash flow) and download the PDF.
 * The same files as the download buttons on the Summary cards, for any period.
 */
export function ReportDownloads({ thisMonth }: { thisMonth: Period }) {
  const reduce = useReducedMotion();
  const [report, setReport] = useState<Report>("breakdown");
  const [period, setPeriod] = useState<Period>(thisMonth);
  const [year, setYear] = useState(thisMonth.year);

  const href =
    report === "breakdown"
      ? `/api/export/expense-breakdown?y=${period.year}&m=${period.month}`
      : `/api/export/cash-flow?y=${year}`;
  const what =
    report === "breakdown"
      ? `the expense breakdown for ${periodLabel(period)}`
      : `the annual cash flow trend for ${year}`;

  return (
    <div className="flex flex-col gap-4">
      <div
        role="group"
        aria-label="Report"
        className="grid grid-cols-2 gap-1 rounded-full bg-dash-track p-1 shadow-[inset_0_0_0_1px_var(--dash-track-edge)] sm:inline-grid sm:self-start"
      >
        {REPORTS.map((r) => {
          const current = report === r.id;
          return (
            <button
              key={r.id}
              type="button"
              aria-pressed={current}
              onClick={() => setReport(r.id)}
              className={cn(
                "relative z-0 h-11 rounded-full px-4 text-sm font-medium whitespace-nowrap outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9",
                current ? "text-dash-ink" : "text-dash-ink-soft hover:text-dash-ink",
              )}
            >
              {current ? (
                <motion.span
                  aria-hidden
                  layoutId="report-downloads-pill"
                  transition={
                    reduce ? { duration: 0 } : { type: "spring", duration: 0.3, bounce: 0 }
                  }
                  className="absolute inset-0 -z-10 rounded-full bg-dash-raised shadow-(--dash-lift)"
                />
              ) : null}
              {r.label}
            </button>
          );
        })}
      </div>

      <p className="text-sm text-dash-ink-soft">
        {report === "breakdown"
          ? "Spending in each category for one month or a whole year."
          : "Inflows, EMIs and loans, expenses, investments and net savings for each month of a year."}{" "}
        A period with no entries comes out as a full sheet of zeros.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {report === "breakdown" ? (
          <PeriodControl
            period={period}
            fallback={thisMonth}
            onChange={setPeriod}
            label="Period for the expense breakdown"
          />
        ) : (
          <PeriodControl
            period={{ year, month: "all" }}
            fallback={thisMonth}
            onChange={(next) => setYear(next.year)}
            yearOnly
            label="Year for the annual cash flow"
          />
        )}
        <a
          href={href}
          download
          aria-label={`Download ${what} as a PDF`}
          className={cn(dashButton({ variant: "primary", size: "md" }), "h-11 px-5 md:h-10")}
        >
          <Download aria-hidden />
          Download PDF
        </a>
      </div>
    </div>
  );
}
