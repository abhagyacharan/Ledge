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
import { formatAmount, formatCompact, formatMoney, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import { MONTH_NAMES } from "../periods";
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
  // The gap between tiles equals the card padding (p-5, md:p-6), so the spacing is even all round.
  return (
    <dl className="grid flex-1 grid-cols-1 gap-5 min-[420px]:grid-cols-2 min-[420px]:grid-rows-2 md:gap-6">
      <StatTile label="Total inflows" value={money(totals.income, fmt)} icon={Wallet}>
        <DeltaPill
          change={delta(totals.income, previous?.income)}
          goodWhen="up"
          locale={fmt.locale}
        />
        <Line>Salary, bonuses and other income</Line>
      </StatTile>

      <StatTile label="Total EMIs & loans" value={money(totals.emi, fmt)} icon={Landmark}>
        <DeltaPill change={delta(totals.emi, previous?.emi)} goodWhen="down" locale={fmt.locale} />
        {totals.emi > 0 ? (
          <span className="flex flex-col gap-1 text-xs text-dash-ink-soft">
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

      <StatTile label="Living expenses" value={money(totals.expense, fmt)} icon={ShoppingBag}>
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
        icon={PiggyBank}
        highlight
      >
        <DeltaPill
          change={delta(totals.netSavings, previous?.netSavings)}
          goodWhen="up"
          locale={fmt.locale}
          onAccent
        />
        <span className="flex flex-col gap-1 text-xs text-white">
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

function Line({ children }: { children: ReactNode }) {
  return <span className="text-xs text-dash-ink-soft">{children}</span>;
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
      <table className="w-full min-w-[22rem] text-sm">
        <caption className="sr-only">Expense breakdown by category for the chosen period</caption>
        <thead>
          <tr>
            <th scope="col" className={th}>
              Expense category
            </th>
            <th scope="col" className={cn(th, "text-right")}>
              Period spend
            </th>
            <th scope="col" className={cn(th, "text-right")}>
              % of total
            </th>
            <th scope="col" className={cn(th, "hidden sm:table-cell")}>
              Visual share
            </th>
            <th scope="col" className={cn(th, "hidden text-right sm:table-cell")}>
              Item count
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dash-edge">
          {rows.map((row) => (
            <tr key={row.category} className={row.amountMinor === 0 ? "text-dash-ink-soft" : ""}>
              <th scope="row" className="px-2.5 py-2.5 text-left font-normal">
                {row.category}
              </th>
              <td className={num}>{amount(row.amountMinor, fmt)}</td>
              <td className={num}>{formatPercent(row.percent, fmt.locale)}</td>
              <td className="hidden w-36 px-2.5 py-2.5 sm:table-cell">
                <div aria-hidden className="h-2.5 overflow-hidden rounded-full bg-dash-well">
                  <div
                    className="dash-fill-soft h-full rounded-full"
                    style={{ width: `${Math.max(0, Math.min(100, row.percent ?? 0))}%` }}
                  />
                </div>
              </td>
              <td className={cn(num, "hidden sm:table-cell")}>{row.count}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-dash-edge font-semibold">
          <tr>
            <th scope="row" className="px-2.5 py-2.5 text-left">
              Total living expenses
            </th>
            <td className={cn(num, "rule-double")}>{amount(total.amountMinor, fmt)}</td>
            <td className={num}>{total.amountMinor > 0 ? "100.0%" : formatPercent(null)}</td>
            <td className="hidden sm:table-cell" />
            <td className={cn(num, "hidden sm:table-cell")}>{total.count}</td>
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
            <th scope="col" className={cn(th, "w-20")}>
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
                <th scope="row" className="px-2.5 py-2.5 text-left font-normal">
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
            <th scope="row" className="px-2.5 py-2.5 text-left">
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

/** A round upper limit for the chart (1, 2, 2.5 or 5 times a power of ten), split in four steps. */
function niceCeiling(peakMinor: number): number {
  const steps = 4;
  const raw = Math.max(1, peakMinor) / steps;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const unit = [1, 2, 2.5, 5, 10].find((m) => m * magnitude >= raw) ?? 10;
  return Math.round(unit * magnitude) * steps;
}

/**
 * One bar per month, made of two rounded bars stacked in it with a small gap (as in the design):
 * money in (solid, bottom) and money out, EMIs plus expenses (orange hatch, on top). The bar grows and shrinks with both.
 * A picture of the details table, so it is hidden from screen readers; the table has the numbers.
 */
export function CashFlowChart({
  months,
  selectedMonth,
  fmt,
}: {
  months: TrendRow[];
  selectedMonth: number | "all";
  fmt: Fmt;
}) {
  const peak = Math.max(0, ...months.map((m) => m.income + m.emi + m.expense));
  const top = niceCeiling(peak);
  const ticks = [0, 1, 2, 3, 4];
  return (
    <figure aria-hidden className="flex flex-1 flex-col rounded-[20px] bg-dash-well p-4">
      <div className="mb-3 flex flex-wrap justify-end gap-x-4 gap-y-1 text-xs text-dash-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-dash-ink" /> Money in
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="dash-hatch size-2.5 rounded-sm" /> Money out
        </span>
      </div>
      <div className="flex flex-1 gap-2">
        <div className="flex min-h-64 flex-col-reverse justify-between text-[10px] text-dash-ink-soft tabular-nums">
          {ticks.map((i) => (
            <span key={i} className="leading-none">
              {i === 0 ? "0" : formatCompact((top / 4) * i, fmt.currency, fmt.locale)}
            </span>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-64 flex-1">
            {ticks.map((i) => (
              <div
                key={i}
                className="absolute inset-x-0 border-t border-dashed border-dash-edge"
                style={{ bottom: `${i * 25}%` }}
              />
            ))}
            <div className="absolute inset-0 flex items-end gap-2">
              {months.map((m) => (
                <div key={m.month} className="flex h-full flex-1 items-end justify-center">
                  <div
                    className="flex w-full max-w-[24px] flex-col-reverse gap-0.5"
                    style={{ height: `${((m.income + m.emi + m.expense) / top) * 100}%` }}
                  >
                    {m.income > 0 ? (
                      <div className="rounded-md bg-dash-ink" style={{ flexGrow: m.income }} />
                    ) : null}
                    {m.emi + m.expense > 0 ? (
                      <div
                        className="dash-hatch rounded-md"
                        style={{ flexGrow: m.emi + m.expense }}
                      />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            {months.map((m) => (
              <span
                key={m.month}
                className={cn(
                  "flex-1 text-center text-[10px] text-dash-ink-soft",
                  selectedMonth === m.month && "font-semibold text-dash-ink",
                )}
              >
                {MONTH_NAMES[m.month - 1].slice(0, 3)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}
