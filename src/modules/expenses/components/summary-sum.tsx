import { ArrowDownRight, ArrowUpRight, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { formatPercent, minorDigits } from "@/lib/money";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "../category-icons";
import { MONTH_NAMES } from "../periods";
import type { BreakdownRow, EmiProgress, PeriodTotals } from "../summary";

type Fmt = { currency: string; locale: string };

/**
 * Money as the new design writes it (docs/new_design.md §1): Plex Mono, lakh grouping, no paise
 * when the amount is whole rupees, and a true minus sign for money going out ("−₹3,642").
 */
export function money(minor: number, fmt: Fmt, sign: "minus" | "auto" = "auto"): string {
  const per = 10 ** minorDigits(fmt.currency);
  const whole = minor % per === 0;
  const text = new Intl.NumberFormat(fmt.locale, {
    style: "currency",
    currency: fmt.currency,
    minimumFractionDigits: whole ? 0 : minorDigits(fmt.currency),
    maximumFractionDigits: whole ? 0 : minorDigits(fmt.currency),
  }).format(Math.abs(minor) / per);
  const negative = sign === "minus" ? minor !== 0 : minor < 0;
  return negative ? `−${text}` : text;
}

const monthShort = (month: number) => MONTH_NAMES[month - 1]?.slice(0, 3) ?? "";
const monthLong = (month: number) => MONTH_NAMES[month - 1] ?? "";

/** "Up ₹4,088 on October", with an arrow; a word as well as the arrow (never colour alone). */
function Change({
  now,
  before,
  month,
  fmt,
  short = false,
}: {
  now: number;
  before: number;
  month: number;
  fmt: Fmt;
  short?: boolean;
}) {
  const diff = now - before;
  if (diff === 0) return <span>Same as {short ? monthShort(month) : monthLong(month)}</span>;
  const Icon = diff > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon aria-hidden className="size-3.5" />
      {diff > 0 ? "Up" : "Down"} {money(Math.abs(diff), fmt)}{" "}
      {short ? `vs ${monthShort(month)}` : `on ${monthLong(month)}`}
    </span>
  );
}

/**
 * The phone Summary as a sum (docs/new_design.md §5 "Summary as a sum", screen 3a): Inflows, minus
 * EMIs and loans, minus living expenses, a double rule, then Net savings (or "Overspent" with a
 * minus) with the savings rate and the change against the month before.
 */
export function SummarySum({
  totals,
  previous,
  previousMonth,
  emi,
  fmt,
}: {
  totals: PeriodTotals;
  previous: PeriodTotals | null;
  previousMonth: number | null;
  emi: EmiProgress;
  fmt: Fmt;
}) {
  const overspent = totals.netSavings < 0;
  return (
    <section
      aria-label="Summary"
      className="rounded-2xl border border-dash-edge bg-dash-card px-4 py-4 shadow-(--dash-card-shadow)"
    >
      <dl className="flex flex-col">
        <SumRow label="Inflows" value={money(totals.income, fmt)} />
        <SumRow
          label="EMIs & loans"
          value={money(totals.emi, fmt, "minus")}
          sub={
            totals.emi > 0
              ? `${money(emi.paidMinor, fmt)} paid · ${money(emi.remainingMinor, fmt)} to pay · ${emi.delayedCount} delayed`
              : undefined
          }
          bad={emi.delayedCount > 0}
        />
        <SumRow label="Living expenses" value={money(totals.expense, fmt, "minus")} />
      </dl>
      {/* The bottom-line rule is the logo's orange double rule. */}
      <div aria-hidden className="mt-2 border-t-[3px] border-double border-dash-accent" />
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "inline-flex items-center gap-1 text-[15px] font-semibold",
              overspent && "text-dash-bad",
            )}
          >
            {overspent ? <TriangleAlert aria-hidden className="size-4" /> : null}
            {overspent ? "Overspent" : "Net savings"}
          </p>
          <p className="text-xs text-dash-ink-soft">
            Savings rate{" "}
            {totals.savingsRate === null ? "—" : formatPercent(totals.savingsRate, fmt.locale)}
          </p>
        </div>
        <p
          className={cn(
            "font-display text-[30px] leading-none font-semibold tabular-nums",
            overspent && "text-dash-bad",
          )}
        >
          {money(totals.netSavings, fmt)}
        </p>
      </div>
      {previous && previousMonth ? (
        <p className="mt-2 text-xs text-dash-ink-soft">
          <Change
            now={totals.netSavings}
            before={previous.netSavings}
            month={previousMonth}
            fmt={fmt}
          />
        </p>
      ) : null}
    </section>
  );
}

function SumRow({
  label,
  value,
  sub,
  bad = false,
}: {
  label: string;
  value: string;
  sub?: string;
  bad?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <dt className="text-[15px] font-medium">{label}</dt>
        {sub ? (
          <p className={cn("mt-0.5 text-xs", bad ? "text-dash-bad" : "text-dash-ink-soft")}>
            {sub}
          </p>
        ) : null}
      </div>
      <dd className="shrink-0 font-mono text-[15px] font-medium tabular-nums">{value}</dd>
    </div>
  );
}

/** Two small figure cards: what was invested and what is left after investing (screen 3a). */
export function InvestTiles({ totals, fmt }: { totals: PeriodTotals; fmt: Fmt }) {
  return (
    <dl className="grid grid-cols-2 gap-2.5">
      <MiniTile label="Invested" value={money(totals.investment, fmt)} />
      <MiniTile label="Left after investing" value={money(totals.leftAfterInvesting, fmt)} />
    </dl>
  );
}

function MiniTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-dash-edge bg-dash-card p-3.5 shadow-(--dash-card-shadow)">
      <dt className="text-[13px] text-dash-ink-soft">{label}</dt>
      <dd className="mt-1 font-display text-[22px] leading-tight font-semibold tabular-nums">
        {value}
      </dd>
    </div>
  );
}

/**
 * The desktop row of five figures (screen 3f): Inflows, EMIs & loans, Living expenses, Net savings
 * (the screen's one orange tile) and Invested, each with one quiet line under it.
 */
export function SummaryTiles({
  totals,
  previous,
  previousMonth,
  emi,
  expenseCount,
  fmt,
}: {
  totals: PeriodTotals;
  previous: PeriodTotals | null;
  previousMonth: number | null;
  emi: EmiProgress;
  expenseCount: number;
  fmt: Fmt;
}) {
  const overspent = totals.netSavings < 0;
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Tile label="Inflows" value={money(totals.income, fmt)}>
        {previous && previousMonth ? (
          <Change
            now={totals.income}
            before={previous.income}
            month={previousMonth}
            fmt={fmt}
            short
          />
        ) : (
          "money in"
        )}
      </Tile>
      <Tile label="EMIs & loans" value={money(totals.emi, fmt)}>
        <span className={emi.delayedCount > 0 ? "font-semibold text-dash-bad" : undefined}>
          {money(emi.remainingMinor, fmt)} to pay · {emi.delayedCount} delayed
        </span>
      </Tile>
      <Tile label="Living expenses" value={money(totals.expense, fmt)}>
        {expenseCount} {expenseCount === 1 ? "entry" : "entries"}
      </Tile>
      <Tile
        label={overspent ? "Overspent" : "Net savings"}
        value={money(totals.netSavings, fmt)}
        accent
      >
        {previous && previousMonth ? (
          <Change
            now={totals.netSavings}
            before={previous.netSavings}
            month={previousMonth}
            fmt={fmt}
            short
          />
        ) : null}
        {totals.savingsRate === null ? null : ` · ${formatPercent(totals.savingsRate, fmt.locale)}`}
      </Tile>
      <Tile label="Invested" value={money(totals.investment, fmt)}>
        {money(totals.leftAfterInvesting, fmt)} left after
      </Tile>
    </dl>
  );
}

function Tile({
  label,
  value,
  accent = false,
  children,
}: {
  label: string;
  value: string;
  accent?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[112px] flex-col rounded-3xl p-4",
        accent
          ? "bg-dash-accent-from text-white"
          : "border border-dash-edge bg-dash-card shadow-(--dash-card-shadow)",
      )}
    >
      <dt className={cn("text-[13px]", accent ? "font-medium text-white" : "text-dash-ink-soft")}>
        {label}
      </dt>
      <dd className="mt-1 font-display text-[28px] leading-tight font-semibold tabular-nums">
        {value}
      </dd>
      <p className={cn("mt-auto text-xs", accent ? "text-white" : "text-dash-ink-soft")}>
        {children}
      </p>
    </div>
  );
}

/**
 * "Where it went" (screens 3a and 3f): each category with its icon, amount, a bar for its share and
 * "62.3% · 2 items". Categories with nothing spent stay in the list, quieter.
 */
export function BreakdownList({ rows, fmt }: { rows: BreakdownRow[]; fmt: Fmt }) {
  return (
    <ul className="flex flex-col">
      {rows.map((row, i) => {
        const share = Math.max(0, Math.min(100, row.percent ?? 0)) / 100;
        const zero = row.amountMinor === 0;
        return (
          <li
            key={row.category}
            className={cn(
              "py-2.5",
              i > 0 && "border-t border-dash-edge",
              zero && "text-dash-ink-soft",
            )}
          >
            <div className="flex items-center gap-2.5">
              <CategoryIcon
                kind="expense"
                category={row.category}
                className="size-4 shrink-0"
                strokeWidth={1.85}
              />
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium">
                {row.category}
              </span>
              <span className="shrink-0 font-mono text-[14px] font-medium tabular-nums">
                {money(row.amountMinor, fmt)}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <span aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-dash-track">
                <span
                  className="block h-full origin-left rounded-full bg-dash-ink transition-transform duration-500 ease-snap"
                  style={{ transform: `scaleX(${share})` }}
                />
              </span>
              <span className="shrink-0 font-mono text-[11px] text-dash-ink-soft">
                {formatPercent(row.percent, fmt.locale)} · {row.count}{" "}
                {row.count === 1 ? "item" : "items"}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
