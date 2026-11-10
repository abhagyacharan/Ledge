import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import type { ReactNode } from "react";
import { formatAmount, formatMoney, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import { MONTH_NAMES } from "../periods";
import type { BreakdownRow, CategoryRow, EmiProgress, PeriodTotals, TrendRow } from "../summary";

type Fmt = { currency: string; locale: string };

const money = (minor: number, f: Fmt) => formatMoney(minor, f.currency, f.locale);
const amount = (minor: number, f: Fmt) => formatAmount(minor, f.currency, f.locale);

function Tile({
  label,
  value,
  caption,
  tone,
  children,
}: {
  label: string;
  value: string;
  caption: string;
  tone: string;
  children?: ReactNode;
}) {
  // Captions are darker than the usual muted grey so they stay readable on the tinted tiles.
  return (
    <div className={cn("flex flex-col gap-1 rounded-xl border p-4", tone)}>
      <dt className="text-xs font-medium tracking-wide text-foreground/70 uppercase">{label}</dt>
      <dd className="flex flex-col gap-1">
        <span className="text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
          {value}
        </span>
        <span className="text-xs text-foreground/70">{caption}</span>
        {children}
      </dd>
    </div>
  );
}

/** The five headline numbers, same meaning as the sheet. */
export function SummaryTiles({
  totals,
  emi,
  fmt,
}: {
  totals: PeriodTotals;
  emi: EmiProgress;
  fmt: Fmt;
}) {
  const overspent = totals.netSavings < 0;
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      <Tile
        label="Total inflows"
        value={money(totals.income, fmt)}
        caption="Salary, bonuses and other income"
        tone="bg-emerald-50 dark:bg-emerald-950/30"
      />
      <Tile
        label="Total EMIs & loans"
        value={money(totals.emi, fmt)}
        caption="Fixed debt obligations"
        tone="bg-rose-50 dark:bg-rose-950/30"
      >
        {totals.emi > 0 ? (
          <span className="flex flex-wrap items-center gap-x-2 text-xs text-foreground/70">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="size-3.5" aria-hidden />
              {money(emi.paidMinor, fmt)} paid
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />
              {money(emi.remainingMinor, fmt)} to pay
            </span>
            {emi.delayedCount > 0 ? (
              <span className="inline-flex items-center gap-1 font-medium text-destructive">
                <AlertTriangle className="size-3.5" aria-hidden />
                {emi.delayedCount} delayed
              </span>
            ) : null}
          </span>
        ) : null}
      </Tile>
      <Tile
        label="Living expenses"
        value={money(totals.expense, fmt)}
        caption="Monthly outflows"
        tone="bg-amber-50 dark:bg-amber-950/30"
      />
      <Tile
        label="Net savings"
        value={money(totals.netSavings, fmt)}
        caption={overspent ? "Overspent: you spent more than you earned" : "Retained cash flow"}
        tone="bg-emerald-50 dark:bg-emerald-950/30"
      >
        {overspent ? (
          <span className="flex items-center gap-1 text-xs font-medium text-destructive">
            <AlertTriangle className="size-3.5" aria-hidden />
            Overspent
          </span>
        ) : null}
      </Tile>
      <Tile
        label="Savings rate"
        value={formatPercent(totals.savingsRate, fmt.locale)}
        caption={totals.savingsRate === null ? "No income recorded yet" : "Efficiency ratio"}
        tone="bg-sky-50 dark:bg-sky-950/30"
      />
    </dl>
  );
}

/** Investing, which is kept apart from the savings rate (as in the sheet). */
export function InvestingTiles({ totals, fmt }: { totals: PeriodTotals; fmt: Fmt }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:max-w-xl">
      <Tile
        label="Invested"
        value={money(totals.investment, fmt)}
        caption="Money put into investments"
        tone="bg-violet-50 dark:bg-violet-950/30"
      />
      <Tile
        label="Left after investing"
        value={money(totals.leftAfterInvesting, fmt)}
        caption="Net savings minus invested"
        tone="bg-muted/50"
      />
    </dl>
  );
}

function ScrollRegion({ label, children }: { label: string; children: ReactNode }) {
  return (
    // Keyboard users must be able to scroll a table that is wider than the screen.
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="overflow-x-auto rounded-xl border outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {children}
    </div>
  );
}

const th =
  "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground";
const num = "px-3 py-2 text-right tabular-nums";

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
        <thead className="bg-muted/50">
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
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={row.category} className={row.amountMinor === 0 ? "text-muted-foreground" : ""}>
              <th scope="row" className="px-3 py-2 text-left font-normal">
                {row.category}
              </th>
              <td className={num}>{amount(row.amountMinor, fmt)}</td>
              <td className={num}>{formatPercent(row.percent, fmt.locale)}</td>
              <td className="hidden w-40 px-3 py-2 sm:table-cell">
                <div aria-hidden className="h-3 rounded-sm bg-muted">
                  <div
                    className="h-3 rounded-sm bg-foreground/70"
                    style={{ width: `${Math.max(0, Math.min(100, row.percent ?? 0))}%` }}
                  />
                </div>
              </td>
              <td className={cn(num, "hidden sm:table-cell")}>{row.count}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t bg-muted/50 font-semibold">
          <tr>
            <th scope="row" className="px-3 py-2 text-left">
              Total living expenses
            </th>
            <td className={num}>{amount(total.amountMinor, fmt)}</td>
            <td className={num}>{total.amountMinor > 0 ? "100.0%" : formatPercent(null)}</td>
            <td className="hidden sm:table-cell" />
            <td className={cn(num, "hidden sm:table-cell")}>{total.count}</td>
          </tr>
        </tfoot>
      </table>
    </ScrollRegion>
  );
}

/** January to December with a full-year row. The chosen month is marked with text and colour. */
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
      <table className="w-full min-w-[36rem] text-sm">
        <caption className="sr-only">Cash flow for each month of {year}</caption>
        <thead className="bg-muted/50">
          <tr>
            <th scope="col" className={th}>
              Month
            </th>
            <th scope="col" className={cn(th, "text-right")}>
              Total inflow
            </th>
            <th scope="col" className={cn(th, "text-right")}>
              EMI & debt
            </th>
            <th scope="col" className={cn(th, "text-right")}>
              Expenses
            </th>
            <th scope="col" className={cn(th, "text-right")}>
              Net savings
            </th>
            <th scope="col" className={cn(th, "text-right")}>
              Savings %
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {months.map((row) => {
            const selected = selectedMonth === row.month;
            const empty = row.income + row.emi + row.expense === 0;
            return (
              <tr
                key={row.month}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  selected && "bg-accent font-medium",
                  empty && !selected && "text-muted-foreground",
                )}
              >
                <th scope="row" className="px-3 py-2 text-left font-normal">
                  {MONTH_NAMES[row.month - 1]}
                  {selected ? (
                    <span className="ml-2 rounded-full border px-1.5 text-xs">Selected</span>
                  ) : null}
                </th>
                <td className={num}>{amount(row.income, fmt)}</td>
                <td className={num}>{amount(row.emi, fmt)}</td>
                <td className={num}>{amount(row.expense, fmt)}</td>
                <td className={num}>{amount(row.netSavings, fmt)}</td>
                <td className={num}>{formatPercent(row.savingsRate, fmt.locale)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="border-t bg-muted/50 font-semibold">
          <tr>
            <th scope="row" className="px-3 py-2 text-left">
              Full year total
            </th>
            <td className={num}>{amount(total.income, fmt)}</td>
            <td className={num}>{amount(total.emi, fmt)}</td>
            <td className={num}>{amount(total.expense, fmt)}</td>
            <td className={num}>{amount(total.netSavings, fmt)}</td>
            <td className={num}>{formatPercent(total.savingsRate, fmt.locale)}</td>
          </tr>
        </tfoot>
      </table>
    </ScrollRegion>
  );
}

/**
 * Inflow against outflow (EMIs plus expenses) for each month. A picture of the table below it,
 * so it is hidden from screen readers; the table has the same numbers.
 */
export function CashFlowChart({
  months,
  selectedMonth,
}: {
  months: TrendRow[];
  selectedMonth: number | "all";
}) {
  const peak = Math.max(1, ...months.map((m) => Math.max(m.income, m.emi + m.expense)));
  return (
    <figure aria-hidden className="rounded-xl border p-4">
      <div className="flex h-36 items-end gap-1 sm:gap-2">
        {months.map((m) => {
          const out = m.emi + m.expense;
          return (
            <div
              key={m.month}
              className={cn(
                "flex h-full flex-1 flex-col items-center justify-end gap-1 rounded-md px-0.5",
                selectedMonth === m.month && "bg-accent",
              )}
            >
              <div className="flex h-full w-full items-end justify-center gap-0.5">
                <div
                  className="w-1/2 max-w-3 rounded-t-sm bg-emerald-600 dark:bg-emerald-400"
                  style={{ height: `${(m.income / peak) * 100}%` }}
                />
                <div
                  className="w-1/2 max-w-3 rounded-t-sm bg-rose-600 dark:bg-rose-400"
                  style={{ height: `${(out / peak) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">
                {MONTH_NAMES[m.month - 1][0]}
              </span>
            </div>
          );
        })}
      </div>
      <figcaption className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="size-2.5 rounded-sm bg-emerald-600 dark:bg-emerald-400" /> Inflow
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2.5 rounded-sm bg-rose-600 dark:bg-rose-400" /> EMIs and expenses
        </span>
      </figcaption>
    </figure>
  );
}
