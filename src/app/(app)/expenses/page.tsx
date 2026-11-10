import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { loadMoneyContext } from "@/modules/expenses/context";
import {
  BreakdownTable,
  CashFlowChart,
  InvestingTiles,
  SummaryTiles,
  TrendTable,
} from "@/modules/expenses/components/summary-sections";
import { parsePeriod, periodLabel, periodRange, periodToParams } from "@/modules/expenses/periods";
import {
  annualTrend,
  emiProgress,
  expenseBreakdown,
  periodTotals,
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

  const [monthly, expenseRows, emiRows] = await Promise.all([
    monthlyTotals(userId, period.year),
    categoryTotals(userId, "expense", range),
    emiStatusTotals(userId, range),
  ]);

  const totals = periodTotals(monthly, period.month);
  const trend = annualTrend(monthly);
  const breakdown = expenseBreakdown(expenseRows);
  const emi = emiProgress(emiRows);
  const nothingYet = totals.income + totals.emi + totals.expense + totals.investment === 0;
  const query = `?${periodToParams(period).toString()}`;

  return (
    <div className="flex flex-col gap-8">
      <h2 className="sr-only">Summary for {periodLabel(period)}</h2>

      {nothingYet ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed p-4">
          <p className="text-sm">
            Nothing recorded for {periodLabel(period)} yet. Start with your income.
          </p>
          <Button asChild className="h-11 md:h-8">
            <Link href={`/expenses/income${query}`}>Add income</Link>
          </Button>
        </div>
      ) : null}

      <section aria-labelledby="tiles-heading" className="flex flex-col gap-3">
        <h3 id="tiles-heading" className="text-sm font-semibold">
          {periodLabel(period)} at a glance
        </h3>
        <SummaryTiles totals={totals} emi={emi} fmt={fmt} />
        <InvestingTiles totals={totals} fmt={fmt} />
      </section>

      <div className="grid gap-8 xl:grid-cols-2">
        <section aria-labelledby="breakdown-heading" className="flex min-w-0 flex-col gap-3">
          <h3 id="breakdown-heading" className="text-sm font-semibold">
            Expense breakdown by category
          </h3>
          <BreakdownTable rows={breakdown.rows} total={breakdown.total} fmt={fmt} />
        </section>

        <section aria-labelledby="trend-heading" className="flex min-w-0 flex-col gap-3">
          <h3 id="trend-heading" className="text-sm font-semibold">
            Annual cash flow trend, {period.year}
          </h3>
          <CashFlowChart months={trend.months} selectedMonth={period.month} />
          <TrendTable
            months={trend.months}
            total={trend.total}
            selectedMonth={period.month}
            year={period.year}
            fmt={fmt}
          />
        </section>
      </div>
    </div>
  );
}
