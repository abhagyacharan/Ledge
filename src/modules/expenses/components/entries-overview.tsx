"use client";

import { ArrowDownRight, ArrowUpRight, CheckCircle2, Clock, TriangleAlert } from "lucide-react";
import { formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { EntryKind } from "@/server/db/schema";
import { CATEGORIES_BY_KIND } from "../categories";
import { shareRows } from "../entries-logic";
import { MONTH_NAMES } from "../periods";
import type { EmiProgress } from "../summary";
import { MoneyFlow } from "./money-flow";
import { money } from "./summary-sum";

export type Breakdown =
  | { type: "shares"; title: string; rows: { label: string; amountMinor: number }[] }
  | { type: "emi"; progress: EmiProgress };

type Fmt = { currency: string; locale: string };

/** What the big figure is, per area: "Spent in November 2026" (read out, and shown on desktop). */
const VERBS: Record<EntryKind, string> = {
  income: "Earned",
  emi: "Due",
  expense: "Spent",
  investment: "Invested",
};

/**
 * The area's total right under its title (docs/new_design.md screens 3b and 3c): the big figure
 * and, in mono beside it, how many entries make it up. No card and no button: the round + and
 * the desktop Log button add entries.
 */
export function EntriesOverview({
  kind,
  periodLabel,
  totalMinor,
  count,
  fmt,
  className,
  change = null,
  savings = null,
}: {
  kind: EntryKind;
  periodLabel: string;
  totalMinor: number;
  count: number;
  fmt: Fmt;
  onAdd?: () => void;
  className?: string;
  change?: { diffMinor: number; month: number } | null;
  savings?: { netSavingsMinor: number; leftMinor: number } | null;
}) {
  return (
    <section aria-labelledby="overview-title" className={cn("min-w-0 text-dash-ink", className)}>
      <h3 id="overview-title" className="sr-only">
        {VERBS[kind]} in {periodLabel}
      </h3>
      <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="font-display text-[34px] leading-none font-semibold tracking-tight tabular-nums md:text-[40px]">
          <MoneyFlow minor={totalMinor} fmt={fmt} />
        </span>
        <span className="font-mono text-xs font-medium text-dash-ink-soft">
          {count === 0 ? "nothing yet" : `${count} ${count === 1 ? "entry" : "entries"}`}
          <span className="hidden md:inline"> · {periodLabel}</span>
        </span>
      </p>
      {change && change.diffMinor !== 0 ? (
        <p
          className={cn(
            "mt-2 inline-flex items-center gap-1 text-[13px] font-medium",
            change.diffMinor > 0 ? "text-dash-good" : "text-dash-ink-soft",
          )}
        >
          {change.diffMinor > 0 ? (
            <ArrowUpRight aria-hidden className="size-4" />
          ) : (
            <ArrowDownRight aria-hidden className="size-4" />
          )}
          {change.diffMinor > 0 ? "Up" : "Down"} {money(Math.abs(change.diffMinor), fmt)} on{" "}
          {MONTH_NAMES[change.month - 1]}
        </p>
      ) : null}
      {savings ? (
        <dl className="mt-3 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-dash-edge bg-dash-card p-3.5 shadow-(--dash-card-shadow)">
            <dt className="text-[13px] text-dash-ink-soft">Net savings</dt>
            <dd className="mt-1 font-display text-[22px] leading-tight font-semibold tabular-nums">
              {money(savings.netSavingsMinor, fmt)}
            </dd>
          </div>
          <div className="rounded-2xl border border-dash-edge bg-dash-card p-3.5 shadow-(--dash-card-shadow)">
            <dt className="text-[13px] text-dash-ink-soft">Left after investing</dt>
            <dd className="mt-1 font-display text-[22px] leading-tight font-semibold tabular-nums">
              {money(savings.leftMinor, fmt)}
            </dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}

const card =
  "min-w-0 rounded-2xl border border-dash-edge bg-dash-card px-4 py-4 text-dash-ink shadow-(--dash-card-shadow) sm:p-5 md:rounded-3xl";

/** Segment fills for the stacked bar, strongest first; the orange is used once. */
const SEGMENTS = ["bg-dash-ink", "bg-dash-ink-soft", "bg-dash-accent", "bg-dash-track"];

/**
 * The area's breakdown in one card: a stacked bar of shares with a legend (by category, payment
 * method or type), or, for EMIs, paid against still to pay with the unpaid part hatched.
 */
export function EntriesBreakdown({
  kind,
  breakdown,
  fmt,
  className,
}: {
  kind?: EntryKind;
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
  const shares = shareRows(breakdown.rows);
  if (shares.length === 0) return null;
  if (kind === "income" || kind === "investment") {
    const used = new Set(breakdown.rows.filter((r) => r.amountMinor > 0).map((r) => r.label));
    const unused = CATEGORIES_BY_KIND[kind].filter((c) => !used.has(c));
    return (
      <section aria-labelledby="breakdown-title" className={cn(card, className)}>
        <h3 id="breakdown-title" className="text-[13px] font-semibold">
          {breakdown.title}
        </h3>
        {kind === "investment" ? (
          <div aria-hidden className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
            {shares.map((s, i) => (
              <span
                key={s.label}
                className={cn("h-full first:rounded-l-full last:rounded-r-full", SEGMENTS[i % 4])}
                style={{ flexGrow: Math.max(0.5, s.percent ?? 0) }}
              />
            ))}
          </div>
        ) : null}
        <ul className="mt-3 flex flex-col gap-2.5">
          {shares.map((s, i) => (
            <li key={s.label}>
              <div className="flex items-baseline justify-between gap-3 text-[14px]">
                <span className="min-w-0 truncate">{s.label}</span>
                <span className="shrink-0 font-mono text-[13px] font-medium">
                  {money(s.amountMinor, fmt)} · {formatPercent(s.percent, fmt.locale)}
                </span>
              </div>
              {kind === "income" ? (
                <div
                  aria-hidden
                  className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-dash-track"
                >
                  <div
                    className={cn(
                      "h-full origin-left rounded-full",
                      i === 0 ? "bg-dash-ink" : "bg-dash-accent",
                    )}
                    style={{
                      transform: `scaleX(${Math.max(0, Math.min(1, (s.percent ?? 0) / 100))})`,
                    }}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        {kind === "income" && unused.length > 0 ? (
          <p className="mt-3 border-t border-dash-edge pt-3 text-xs text-dash-ink-soft">
            No {unused.join(", ").replace(/, ([^,]*)$/, " or $1")} this month
          </p>
        ) : null}
      </section>
    );
  }
  // Four segments at most: the biggest three and everything else together.
  const top = shares.slice(0, 3);
  const rest = shares.slice(3);
  const restMinor = rest.reduce((n, r) => n + r.amountMinor, 0);
  const restPercent = rest.reduce((n, r) => n + (r.percent ?? 0), 0);
  const segments = [
    ...top,
    ...(rest.length > 0
      ? [{ label: `${rest.length} more`, amountMinor: restMinor, percent: restPercent }]
      : []),
  ];
  return (
    <section aria-labelledby="breakdown-title" className={cn(card, className)}>
      <h3 id="breakdown-title" className="sr-only">
        {breakdown.title}
      </h3>
      <div aria-hidden className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
        {segments.map((s, i) => (
          <span
            key={s.label}
            className={cn("h-full first:rounded-l-full last:rounded-r-full", SEGMENTS[i])}
            style={{ flexGrow: Math.max(0.5, s.percent ?? 0) }}
          />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {segments.map((s, i) => (
          <li key={s.label} className="flex items-center justify-between gap-2 text-[13px]">
            <span className="flex min-w-0 items-center gap-1.5">
              <span aria-hidden className={cn("size-2 shrink-0 rounded-full", SEGMENTS[i])} />
              <span className="truncate">{s.label}</span>
            </span>
            <span className="shrink-0 font-mono text-xs text-dash-ink-soft">
              {formatPercent(s.percent, fmt.locale)}
              <span className="sr-only">, {money(s.amountMinor, fmt)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EmiProgressBlock({ progress, fmt }: { progress: EmiProgress; fmt: Fmt }) {
  const total = progress.paidMinor + progress.remainingMinor;
  if (total === 0) return null;
  const paidShare = progress.paidMinor / total;
  return (
    <div>
      <h3 id="breakdown-title" className="sr-only">
        Paid so far
      </h3>
      {/* Paid is solid ink; what is still to pay is hatched, so it never rests on colour. */}
      <div aria-hidden className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
        <span className="h-full rounded-l-full bg-dash-ink" style={{ flexGrow: paidShare }} />
        <span className="dash-hatch h-full rounded-r-full" style={{ flexGrow: 1 - paidShare }} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[13px]">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 aria-hidden className="size-4" />
          Paid <span className="font-mono">{money(progress.paidMinor, fmt)}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock aria-hidden className="size-4" />
          To pay <span className="font-mono">{money(progress.remainingMinor, fmt)}</span>
        </span>
        {progress.delayedCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 font-semibold text-dash-bad">
            <TriangleAlert aria-hidden className="size-4" />
            {progress.delayedCount} delayed
          </span>
        ) : null}
      </div>
    </div>
  );
}
