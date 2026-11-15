import type { Metadata } from "next";
import { loadMoneyContext } from "@/modules/expenses/context";
import { TrendTable } from "@/modules/expenses/components/summary-sections";
import {
  BreakdownList,
  InvestTiles,
  SummarySum,
  SummaryTiles,
} from "@/modules/expenses/components/summary-sum";
import { CashFlowCard } from "@/modules/expenses/components/cash-flow-card";
import { CashFlowChart } from "@/modules/expenses/components/cash-flow-chart";
import { DownloadReport } from "@/modules/expenses/components/download-report";
import { SummaryEmpty } from "@/modules/expenses/components/summary-empty";
import { parsePeriod, periodLabel, periodRange } from "@/modules/expenses/periods";
import {
  annualTrend,
  emiProgress,
  expenseBreakdown,
  periodTotals,
  previousMonthTotals,
} from "@/modules/expenses/summary";
import { categoryTotals, emiStatusTotals, monthlyTotals } from "@/server/data/finance";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Expenses summary" };

/**
 * The Summary (docs/new_design.md screens 3a and 3f). Phone: the period written as a sum, two
 * small figures for investing, where the money went, then the year's cash flow. Desktop: five
 * figures in a row, the cash flow chart with its table beside the breakdown.
 */
export default async function ExpensesSummaryPage({ searchParams }: PageProps<"/expenses">) {
  const { userId } = await requireUser();
  const [money, params] = await Promise.all([loadMoneyContext(userId), searchParams]);
  const period = parsePeriod(params, money.defaultPeriod);
  const range = periodRange(period);
  const fmt = { currency: money.currency, locale: money.locale };

  const [monthly, previousYear, expenseRows, emiRows] = await Promise.all([
    monthlyTotals(userId, period.year),
    // Only January needs last year, to compare with December.
    period.month === 1 ? monthlyTotals(userId, period.year - 1) : Promise.resolve([]),
    categoryTotals(userId, "expense", range),
    emiStatusTotals(userId, range),
  ]);

  const totals = periodTotals(monthly, period.month);
  const previous =
    period.month === "all" ? null : previousMonthTotals(monthly, previousYear, period.month);
  const previousMonth = period.month === "all" ? null : period.month === 1 ? 12 : period.month - 1;
  const trend = annualTrend(monthly);
  const breakdown = expenseBreakdown(expenseRows);
  const emi = emiProgress(emiRows);
  const nothingYet = totals.income + totals.emi + totals.expense + totals.investment === 0;
  const label = periodLabel(period);

  const breakdownPdf = (
    <DownloadReport
      href={`/api/export/expense-breakdown?y=${period.year}&m=${period.month}`}
      label={`Download the expense breakdown for ${label} as a PDF`}
    />
  );

  return (
    <div className="dash flex flex-col gap-3 md:gap-4">
      <h2 className="sr-only">Summary for {label}</h2>

      {nothingYet ? <SummaryEmpty periodLabel={label} /> : null}

      <div className="flex flex-col gap-2.5 md:hidden">
        <SummarySum
          totals={totals}
          previous={previous}
          previousMonth={previousMonth}
          emi={emi}
          fmt={fmt}
        />
        <InvestTiles totals={totals} fmt={fmt} />
      </div>
      <div className="hidden md:block">
        <SummaryTiles
          totals={totals}
          previous={previous}
          previousMonth={previousMonth}
          emi={emi}
          expenseCount={breakdown.total.count}
          fmt={fmt}
        />
      </div>

      <div className="grid gap-3 md:gap-4 xl:grid-cols-12 xl:items-start">
        <section
          aria-labelledby="breakdown-title"
          className="order-first rounded-2xl border border-dash-edge bg-dash-card px-4 pt-4 pb-2 text-dash-ink shadow-(--dash-card-shadow) md:rounded-3xl md:px-5 xl:order-last xl:col-span-5"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 id="breakdown-title" className="text-[15px] font-semibold">
              <span className="md:hidden">Where it went</span>
              <span className="hidden md:inline">Expense breakdown</span>
            </h2>
            {breakdownPdf}
          </div>
          <BreakdownList
            rows={[...breakdown.rows].sort((a, b) => b.amountMinor - a.amountMinor)}
            fmt={fmt}
          />
        </section>

        <div className="xl:col-span-7">
          <CashFlowCard
            title={`Annual cash flow, ${period.year}`}
            actions={
              <DownloadReport
                href={`/api/export/cash-flow?y=${period.year}`}
                label={`Download the annual cash flow trend for ${period.year} as a PDF`}
              />
            }
            chart={
              <CashFlowChart
                months={trend.months}
                year={period.year}
                selectedMonth={period.month}
                fmt={fmt}
              />
            }
            table={
              <TrendTable
                months={trend.months}
                total={trend.total}
                selectedMonth={period.month}
                year={period.year}
                fmt={fmt}
              />
            }
          />
        </div>
      </div>
    </div>
  );
}
