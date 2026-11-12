import type { Metadata } from "next";
import { DashCard } from "@/components/dash/dash-card";
import { loadMoneyContext } from "@/modules/expenses/context";
import {
  BreakdownTable,
  SummaryStats,
  TrendTable,
} from "@/modules/expenses/components/summary-sections";
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
  const trend = annualTrend(monthly);
  const breakdown = expenseBreakdown(expenseRows);
  const emi = emiProgress(emiRows);
  const nothingYet = totals.income + totals.emi + totals.expense + totals.investment === 0;

  return (
    <div className="dash flex flex-col gap-4">
      <h2 className="sr-only">Summary for {periodLabel(period)}</h2>

      {nothingYet ? <SummaryEmpty periodLabel={periodLabel(period)} /> : null}

      {/* The dashboard look (docs/design.md): four blocks, two rows, one column on small screens. */}
      <div className="grid gap-4 xl:grid-cols-12">
        <DashCard
          id="tiles"
          title={`${periodLabel(period)} at a glance`}
          hideTitle
          // Phones: one card of four equal rows, edge to edge. Wider: no outer box, the four
          // figures are cards of their own in a 2 by 2 grid (like the Tasks overview).
          className="flex flex-col max-sm:overflow-hidden max-sm:p-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none md:rounded-none md:p-0 xl:col-span-6"
        >
          <SummaryStats totals={totals} previous={previous} emi={emi} fmt={fmt} />
        </DashCard>

        <DashCard
          id="cash-flow"
          title="Annual cash flow"
          subtitle={`Money in and out, each month of ${period.year}`}
          className="flex flex-col xl:col-span-6"
        >
          <CashFlowChart
            months={trend.months}
            year={period.year}
            selectedMonth={period.month}
            fmt={fmt}
          />
        </DashCard>

        <DashCard
          id="breakdown"
          title="Expense breakdown by category"
          subtitle={periodLabel(period)}
          action={
            <DownloadReport
              href={`/api/export/expense-breakdown?y=${period.year}&m=${period.month}`}
              label={`Download the expense breakdown for ${periodLabel(period)} as a PDF`}
            />
          }
          className="xl:col-span-6"
        >
          <BreakdownTable rows={breakdown.rows} total={breakdown.total} fmt={fmt} />
        </DashCard>

        <DashCard
          id="details"
          title={`Annual cash flow trend, ${period.year}`}
          subtitle="Month by month, with the full-year total"
          action={
            <DownloadReport
              href={`/api/export/cash-flow?y=${period.year}`}
              label={`Download the annual cash flow trend for ${period.year} as a PDF`}
            />
          }
          className="xl:col-span-6"
        >
          <TrendTable
            months={trend.months}
            total={trend.total}
            selectedMonth={period.month}
            year={period.year}
            fmt={fmt}
          />
        </DashCard>
      </div>
    </div>
  );
}
