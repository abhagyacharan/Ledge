"use client";

import { AlertTriangle, CheckCircle2, Clock, Plus } from "lucide-react";
import { DashButton } from "@/components/dash/dash-button";
import { formatMoney, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { EntryKind } from "@/server/db/schema";
import { KIND_LABELS } from "../categories";
import { shareRows } from "../entries-logic";
import type { EmiProgress } from "../summary";
import { MoneyFlow } from "./money-flow";

export type Breakdown =
  | { type: "shares"; title: string; rows: { label: string; amountMinor: number }[] }
  | { type: "emi"; progress: EmiProgress };

type Fmt = { currency: string; locale: string };

/** What the big figure is, per tab: "Spent in November 2026". */
const VERBS: Record<EntryKind, string> = {
  income: "Earned",
  emi: "Due",
  expense: "Spent",
  investment: "Invested",
};

const card =
  "min-w-0 rounded-2xl border border-dash-edge bg-dash-card px-4 py-5 shadow-(--dash-card-shadow) sm:p-5 md:rounded-3xl text-dash-ink md:p-6";

/**
 * The top card of an entries tab: the period's total as the one big number, how many entries
 * make it up, and the Add button. Kept short so the list starts high on a phone.
 */
export function EntriesOverview({
  kind,
  periodLabel,
  totalMinor,
  count,
  fmt,
  onAdd,
  className,
}: {
  kind: EntryKind;
  periodLabel: string;
  totalMinor: number;
  count: number;
  fmt: Fmt;
  onAdd: () => void;
  className?: string;
}) {
  const label = KIND_LABELS[kind];
  return (
    <section aria-labelledby="overview-title" className={cn(card, className)}>
      {/* Phones and the narrow side column: the button runs full width under the total. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between xl:flex-col xl:items-stretch">
        <div className="min-w-0">
          <h3 id="overview-title" className="text-sm text-dash-ink-soft">
            {VERBS[kind]} in {periodLabel}
          </h3>
          <p className="mt-1 font-display text-[2.125rem] leading-tight font-semibold tracking-tight tabular-nums">
            <MoneyFlow minor={totalMinor} fmt={fmt} />
          </p>
          <p className="mt-0.5 text-[13px] text-dash-ink-soft">
            {count === 0 ? "Nothing yet" : `${count} ${count === 1 ? "entry" : "entries"}`}
          </p>
        </div>
        <DashButton onClick={onAdd} className="h-11! md:h-10!">
          <Plus />
          Add {label.singular}
        </DashButton>
      </div>
    </section>
  );
}

/**
 * The tab's one breakdown, in its own card: shares by payment method, category or type, or the
 * EMI payment progress. Below the list on a phone, beside it on a wide screen.
 */
export function EntriesBreakdown({
  breakdown,
  fmt,
  className,
}: {
  breakdown: Breakdown;
  fmt: Fmt;
  className?: string;
}) {
  if (breakdown.type === "emi") {
    const { progress } = breakdown;
    if (progress.paidMinor + progress.remainingMinor === 0) return null;
    return (
      <section aria-labelledby="breakdown-title" className={cn(card, className)}>
        <EmiProgressBlock progress={progress} fmt={fmt} />
      </section>
    );
  }
  if (shareRows(breakdown.rows).length === 0) return null;
  return (
    <section aria-labelledby="breakdown-title" className={cn(card, className)}>
      <Shares title={breakdown.title} rows={breakdown.rows} fmt={fmt} />
    </section>
  );
}

function Shares({
  title,
  rows,
  fmt,
}: {
  title: string;
  rows: { label: string; amountMinor: number }[];
  fmt: Fmt;
}) {
  const shares = shareRows(rows);
  if (shares.length === 0) return null;
  return (
    <div>
      <h3 id="breakdown-title" className="mb-4 text-base font-semibold">
        {title}
      </h3>
      <ul className="flex flex-col gap-3.5">
        {shares.map((row) => (
          <li key={row.label} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{row.label}</span>
              <span className="flex shrink-0 items-baseline gap-2">
                <span className="figures text-[13px]">
                  {formatMoney(row.amountMinor, fmt.currency, fmt.locale)}
                </span>
                <span className="figures w-12 text-right text-xs text-dash-ink-soft">
                  {formatPercent(row.percent, fmt.locale)}
                </span>
              </span>
            </div>
            <Bar fraction={(row.percent ?? 0) / 100} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A thin share bar. It grows with a transform, never by animating its width. */
function Bar({ fraction }: { fraction: number }) {
  return (
    <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-dash-well">
      <div
        className="dash-fill-soft h-full origin-left rounded-full transition-transform duration-500 ease-snap"
        style={{ transform: `scaleX(${Math.max(0, Math.min(1, fraction))})` }}
      />
    </div>
  );
}

function EmiProgressBlock({ progress, fmt }: { progress: EmiProgress; fmt: Fmt }) {
  const total = progress.paidMinor + progress.remainingMinor;
  if (total === 0) return null;
  const paidShare = progress.paidMinor / total;
  const money = (minor: number) => formatMoney(minor, fmt.currency, fmt.locale);
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 id="breakdown-title" className="text-base font-semibold">
          Paid so far
        </h3>
        <span className="figures text-[13px] text-dash-ink-soft">
          {formatPercent(Math.round(paidShare * 1000) / 10, fmt.locale)}
        </span>
      </div>
      {/* Paid fills in orange; what is left is hatched (docs/design.md, progress bar). */}
      <div aria-hidden className="dash-hatch h-2.5 overflow-hidden rounded-full">
        <div
          className="h-full origin-left rounded-full bg-dash-accent transition-transform duration-500 ease-snap"
          style={{ transform: `scaleX(${paidShare})` }}
        />
      </div>
      <dl className="mt-4 flex flex-col gap-2.5 text-sm">
        <StatusLine icon={CheckCircle2} label="Paid" count={progress.paidCount}>
          {money(progress.paidMinor)}
        </StatusLine>
        <StatusLine
          icon={Clock}
          label="To pay"
          count={progress.scheduledCount + progress.delayedCount}
        >
          {money(progress.remainingMinor)}
        </StatusLine>
        {progress.delayedCount > 0 ? (
          <StatusLine icon={AlertTriangle} label="Delayed" count={progress.delayedCount} bad>
            {money(progress.delayedMinor)}
          </StatusLine>
        ) : null}
      </dl>
    </div>
  );
}

function StatusLine({
  icon: Icon,
  label,
  count,
  bad = false,
  children,
}: {
  icon: typeof Clock;
  label: string;
  count: number;
  bad?: boolean;
  children: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={cn("inline-flex items-center gap-2", bad && "font-medium text-dash-bad")}>
        <Icon className="size-4" aria-hidden />
        {label}
        <span className="text-xs text-dash-ink-soft">({count})</span>
      </dt>
      <dd className={cn("figures text-[13px]", bad && "text-dash-bad")}>{children}</dd>
    </div>
  );
}
