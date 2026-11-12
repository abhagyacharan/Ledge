import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Landmark,
  PiggyBank,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import { DeltaPill } from "@/components/dash/delta-pill";
import { StatTile } from "@/components/dash/stat-tile";
import { formatAmount, formatMoney, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "../category-icons";
import { MONTH_NAMES } from "../periods";
import { MoneyFlow } from "./money-flow";
import {
  changePercent,
  type BreakdownRow,
  type CategoryRow,
  type EmiProgress,
  type PeriodTotals,
  type TrendRow,
} from "../summary";

type Fmt = { currency: string; locale: string };

const money = (minor: number, f: Fmt) => formatMoney(minor, f.currency, f.locale);
const amount = (minor: number, f: Fmt) => formatAmount(minor, f.currency, f.locale);

/**
 * The four tiles (docs/design.md): income, EMIs and loans, expenses, and the orange savings tile.
 * Each shows its change against the previous month when `previous` is given. Savings also carries
 * the savings rate and the investing figures, so nothing from the old tiles is lost.
 */
export function SummaryStats({
  totals,
  previous,
  emi,
  fmt,
}: {
  totals: PeriodTotals;
  /** The month before, or null in the whole-year view (nothing fair to compare to). */
  previous: PeriodTotals | null;
  emi: EmiProgress;
  fmt: Fmt;
}) {
  const overspent = totals.netSavings < 0;
  const delta = (current: number, before: number | undefined) =>
    previous === null || before === undefined ? null : changePercent(current, before);
  // Phone: one column of rows. Wider: a 2 by 2 grid of separate cards, spaced like the page.
  return (
    <dl className="flex flex-1 flex-col sm:grid sm:grid-cols-2 sm:grid-rows-2 sm:gap-4">
      <StatTile
        label="Total inflows"
        value={money(totals.income, fmt)}
        figure={<MoneyFlow minor={totals.income} fmt={fmt} />}
        icon={Wallet}
        variant="card"
      >
        <DeltaPill
          change={delta(totals.income, previous?.income)}
          goodWhen="up"
          locale={fmt.locale}
        />
        <Line>Salary, bonuses and other income</Line>
      </StatTile>

      <StatTile
        label="Total EMIs & loans"
        value={money(totals.emi, fmt)}
        figure={<MoneyFlow minor={totals.emi} fmt={fmt} />}
        icon={Landmark}
        variant="card"
      >
        <DeltaPill change={delta(totals.emi, previous?.emi)} goodWhen="down" locale={fmt.locale} />
        {totals.emi > 0 ? (
          <span className="hidden flex-col gap-1 text-xs text-dash-ink-soft sm:flex">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="size-3.5" aria-hidden />
              {money(emi.paidMinor, fmt)} paid
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />
              {money(emi.remainingMinor, fmt)} to pay
            </span>
            {emi.delayedCount > 0 ? (
              <span className="inline-flex items-center gap-1 font-medium text-dash-bad">
                <AlertTriangle className="size-3.5" aria-hidden />
                {emi.delayedCount} delayed
              </span>
            ) : null}
          </span>
        ) : (
          <Line>Fixed debt obligations</Line>
        )}
      </StatTile>

      <StatTile
        label="Living expenses"
        value={money(totals.expense, fmt)}
        figure={<MoneyFlow minor={totals.expense} fmt={fmt} />}
        icon={ShoppingBag}
        variant="card"
      >
        <DeltaPill
          change={delta(totals.expense, previous?.expense)}
          goodWhen="down"
          locale={fmt.locale}
        />
        <Line>Monthly outflows</Line>
      </StatTile>

      <StatTile
        label="Net savings"
        value={money(totals.netSavings, fmt)}
        figure={<MoneyFlow minor={totals.netSavings} fmt={fmt} />}
        icon={PiggyBank}
        variant="card"
        highlight
      >
        <DeltaPill
          change={delta(totals.netSavings, previous?.netSavings)}
          goodWhen="up"
          locale={fmt.locale}
          onAccent
        />
        <span className="hidden flex-col gap-1 text-xs text-white sm:flex">
          {overspent ? (
            <span className="inline-flex items-center gap-1 font-medium">
              <AlertTriangle className="size-3.5" aria-hidden />
              Overspent: you spent more than you earned
            </span>
          ) : null}
          <span>
            Savings rate{" "}
            <span className="font-semibold">
              {totals.savingsRate === null
                ? "none yet (no income)"
                : formatPercent(totals.savingsRate, fmt.locale)}
            </span>
          </span>
          <span>
            {money(totals.investment, fmt)} invested, {money(totals.leftAfterInvesting, fmt)} left
            after investing
          </span>
        </span>
      </StatTile>
    </dl>
  );
}

/** A quiet description under a tile's figure; phones skip it to keep the tiles short. */
function Line({ children }: { children: ReactNode }) {
  return <span className="hidden text-xs text-dash-ink-soft sm:inline">{children}</span>;
}

function ScrollRegion({ label, children }: { label: string; children: ReactNode }) {
  return (
    // Keyboard users must be able to scroll a table that is wider than the screen.
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="overflow-x-auto rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {children}
    </div>
  );
}

/** Header cells form a grey band with rounded ends, like the table in the design. */
const th =
  "bg-dash-well px-2.5 py-2 text-left text-xs font-medium text-dash-ink-soft first:rounded-l-xl last:rounded-r-xl";
const num = "figures px-2.5 py-2.5 text-right";

/** Numbers in the narrow details table: a little smaller and tighter so five columns fit half a row. */
const tnum = "figures px-2 py-2.5 text-right text-xs";

/** Spending by category, with a bar for the share. Categories with no spending stay in the list. */
export function BreakdownTable({
  rows,
  total,
  fmt,
}: {
  rows: BreakdownRow[];
  total: CategoryRow;
  fmt: Fmt;
}) {
  return (
    <ScrollRegion label="Expense breakdown by category">
      <table className="w-full text-sm sm:min-w-[22rem]">
        <caption className="sr-only">Expense breakdown by category for the chosen period</caption>
        <thead>
          <tr>
            <th scope="col" className={th}>
              Expense category
            </th>
            <th scope="col" className={cn(th, "text-right")}>
              Period spend
            </th>
            <th scope="col" className={cn(th, "hidden text-right sm:table-cell")}>
              % of total
            </th>
            <th scope="col" className={cn(th, "hidden sm:table-cell")}>
              Share
            </th>
            <th
              scope="col"
              className={cn(th, "hidden text-right sm:table-cell xl:hidden 2xl:table-cell")}
            >
              Items
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dash-edge">
          {rows.map((row) => (
            <tr key={row.category} className={row.amountMinor === 0 ? "text-dash-ink-soft" : ""}>
              <th scope="row" className="px-2.5 py-2 text-left font-normal">
                <span className="flex items-center gap-2.5 whitespace-nowrap">
                  <span
                    aria-hidden
                    className="grid size-7 shrink-0 place-items-center rounded-full bg-dash-well"
                  >
                    <CategoryIcon
                      kind="expense"
                      category={row.category}
                      className="size-3.5"
                      strokeWidth={2}
                    />
                  </span>
                  {row.category}
                </span>
              </th>
              <td className={num}>{amount(row.amountMinor, fmt)}</td>
              <td className={cn(num, "hidden sm:table-cell")}>
                {formatPercent(row.percent, fmt.locale)}
              </td>
              <td className="hidden w-28 px-2.5 py-2.5 sm:table-cell">
                <div aria-hidden className="h-2.5 overflow-hidden rounded-full bg-dash-well">
                  <div
                    className="dash-fill-soft h-full origin-left rounded-full transition-transform duration-500 ease-snap"
                    style={{
                      transform: `scaleX(${Math.max(0, Math.min(100, row.percent ?? 0)) / 100})`,
                    }}
                  />
                </div>
              </td>
              <td className={cn(num, "hidden sm:table-cell xl:hidden 2xl:table-cell")}>
                {row.count}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-dash-edge font-semibold">
          <tr>
            <th scope="row" className="px-2.5 py-2.5 text-left">
              Total living expenses
            </th>
            <td className={cn(num, "rule-double")}>{amount(total.amountMinor, fmt)}</td>
            <td className={cn(num, "hidden sm:table-cell")}>
              {total.amountMinor > 0 ? "100.0%" : formatPercent(null)}
            </td>
            <td className="hidden sm:table-cell" />
            <td className={cn(num, "hidden sm:table-cell xl:hidden 2xl:table-cell")}>
              {total.count}
            </td>
          </tr>
        </tfoot>
      </table>
    </ScrollRegion>
  );
}

/** January to December with a full-year row. The chosen month is marked with text and a tint. */
export function TrendTable({
  months,
  total,
  selectedMonth,
  year,
  fmt,
}: {
  months: TrendRow[];
  total: PeriodTotals;
  selectedMonth: number | "all";
  year: number;
  fmt: Fmt;
}) {
  return (
    <ScrollRegion label={`Annual cash flow trend for ${year}`}>
      <table className="w-full min-w-[26rem] text-sm">
        <caption className="sr-only">Cash flow for each month of {year}</caption>
        <thead>
          <tr>
            <th scope="col" className={cn(th, "sticky left-0 z-10 w-20")}>
              Month
            </th>
            <th scope="col" className={cn(th, "px-2 text-right")}>
              Total inflow
            </th>
            <th scope="col" className={cn(th, "px-2 text-right")}>
              EMI & debt
            </th>
            <th scope="col" className={cn(th, "px-2 text-right")}>
              Expenses
            </th>
            <th scope="col" className={cn(th, "px-2 text-right")}>
              Net savings
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dash-edge">
          {months.map((row) => {
            const selected = selectedMonth === row.month;
            const empty = row.income + row.emi + row.expense === 0;
            return (
              <tr
                key={row.month}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  selected && "bg-dash-well font-medium",
                  empty && !selected && "text-dash-ink-soft",
                )}
              >
                <th
                  scope="row"
                  className={cn(
                    "sticky left-0 px-2.5 py-2.5 text-left font-normal",
                    selected ? "bg-dash-well" : "bg-dash-card",
                  )}
                >
                  {MONTH_NAMES[row.month - 1]}
                  {/* The tint shows the chosen month; this says it in words for screen readers. */}
                  {selected ? <span className="sr-only"> (selected)</span> : null}
                </th>
                <td className={tnum}>{amount(row.income, fmt)}</td>
                <td className={tnum}>{amount(row.emi, fmt)}</td>
                <td className={tnum}>{amount(row.expense, fmt)}</td>
                <td className={tnum}>{amount(row.netSavings, fmt)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="border-t border-dash-edge font-semibold">
          <tr>
            <th scope="row" className="sticky left-0 bg-dash-card px-2.5 py-2.5 text-left">
              Full year total
            </th>
            <td className={cn(tnum, "rule-double")}>{amount(total.income, fmt)}</td>
            <td className={cn(tnum, "rule-double")}>{amount(total.emi, fmt)}</td>
            <td className={cn(tnum, "rule-double")}>{amount(total.expense, fmt)}</td>
            <td className={cn(tnum, "rule-double")}>{amount(total.netSavings, fmt)}</td>
          </tr>
        </tfoot>
      </table>
    </ScrollRegion>
  );
}
