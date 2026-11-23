"use client";

import { Check, Info, Mic, Target } from "lucide-react";
import { useState, type ReactNode } from "react";
import { formatInr, formatUsd, microsToPaise } from "@/lib/ai-cost";
import { cn } from "@/lib/utils";
import type { GroupedUsage, UsageRow } from "@/modules/planner/plan-view";
import { card, CardTitle } from "./card";

export type UsageMonth = {
  /** "November" */
  label: string;
  /** Requests, tokens and cost of every feature together. */
  total: UsageRow;
  grouped: GroupedUsage;
};

const nf = new Intl.NumberFormat("en-US");

/**
 * Settings, "AI usage" (docs/plans designs 8m): what Voice and the Planner used this month and last,
 * and what that would cost on Groq's paid plan. Always an estimate, worked out from token counts;
 * on the free plan nothing is charged. With a mouse both months sit side by side with a table; a
 * phone switches months with a segmented control.
 */
export function AiUsageCard({
  thisMonth,
  lastMonth,
  usdToInr,
  rupeeRate,
}: {
  thisMonth: UsageMonth;
  lastMonth: UsageMonth;
  /** Paise per dollar. */
  usdToInr: number;
  /** "85", shown in the footnote. */
  rupeeRate: string;
}) {
  const [shown, setShown] = useState<"this" | "last">("this");
  const month = shown === "this" ? thisMonth : lastMonth;
  const other = shown === "this" ? lastMonth : thisMonth;

  const cost = (micros: number) => formatUsd(micros);
  const rupees = (micros: number) => formatInr(microsToPaise(micros, usdToInr));

  const rows: { key: "voice" | "planner"; label: string; icon: ReactNode }[] = [
    { key: "voice", label: "Voice", icon: <Mic aria-hidden className="size-3.5" /> },
    { key: "planner", label: "Planner", icon: <Target aria-hidden className="size-3.5" /> },
  ];

  const note = (
    <div className="flex gap-2.5 rounded-2xl bg-dash-well px-3.5 py-3 text-[13px] leading-relaxed">
      <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>
        On Groq&apos;s free plan you&apos;re not charged. This is what it would cost on the paid
        plan. <span className="text-dash-ink-soft">Rupees at ₹{rupeeRate} to the dollar.</span>
      </span>
    </div>
  );

  return (
    <section id="ai-usage" aria-labelledby="ai-usage-title" className={cn(card, "pb-4")}>
      <div className="flex items-baseline justify-between gap-3">
        <CardTitle id="ai-usage-title">AI usage</CardTitle>
        <span className="font-mono text-xs text-dash-ink-soft max-md:hidden">
          Voice and Planner use Groq
        </span>
      </div>

      {/* Desktop and tablet: both months side by side, then one table. */}
      <div className="hidden flex-col gap-3 pt-1 md:flex">
        <div className="grid grid-cols-2 gap-3">
          {[
            { m: thisMonth, label: `${thisMonth.label}, so far` },
            { m: lastMonth, label: lastMonth.label },
          ].map(({ m, label }) => (
            <div key={m.label} className="rounded-2xl bg-dash-well px-4 py-3.5">
              <p className="text-xs text-dash-ink-soft">{label}</p>
              <p className="mt-1.5 flex items-baseline gap-2.5">
                <span className="text-xs font-medium text-dash-ink-soft">about</span>
                <span className="figures font-display text-[28px] leading-none font-semibold">
                  {cost(m.total.costMicros)}
                </span>
                <span className="font-mono text-[13px] font-medium text-dash-ink-soft">
                  {rupees(m.total.costMicros)}
                </span>
              </p>
              <p className="mt-1.5 font-mono text-xs text-dash-ink-soft">
                {m.total.requests} {m.total.requests === 1 ? "request" : "requests"} ·{" "}
                {nf.format(m.total.tokens)} tokens
              </p>
            </div>
          ))}
        </div>
        <table className="w-full text-sm">
          <caption className="sr-only">AI use by feature, this month and last month</caption>
          <thead>
            <tr className="border-b border-dash-edge text-xs text-dash-ink-soft">
              <th scope="col" className="py-2 text-left font-medium">
                Feature
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                {thisMonth.label.slice(0, 3)} requests
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                {thisMonth.label.slice(0, 3)} tokens
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                {lastMonth.label.slice(0, 3)} requests
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                {lastMonth.label.slice(0, 3)} tokens
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                {thisMonth.label.slice(0, 3)} cost (about)
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-dash-edge">
                <th scope="row" className="py-2.5 text-left font-normal">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-dash-ink-soft">{r.icon}</span>
                    {r.label}
                  </span>
                </th>
                <Num>{thisMonth.grouped[r.key].requests}</Num>
                <Num>{nf.format(thisMonth.grouped[r.key].tokens)}</Num>
                <Num>{lastMonth.grouped[r.key].requests}</Num>
                <Num>{nf.format(lastMonth.grouped[r.key].tokens)}</Num>
                <Num>{cost(thisMonth.grouped[r.key].costMicros)}</Num>
              </tr>
            ))}
            <tr className="border-t-2 border-dash-ink font-semibold">
              <th scope="row" className="py-2.5 text-left font-semibold">
                Total
              </th>
              <Num>{thisMonth.grouped.total.requests}</Num>
              <Num>{nf.format(thisMonth.grouped.total.tokens)}</Num>
              <Num>{lastMonth.grouped.total.requests}</Num>
              <Num>{nf.format(lastMonth.grouped.total.tokens)}</Num>
              <Num>{cost(thisMonth.grouped.total.costMicros)}</Num>
            </tr>
          </tbody>
        </table>
        {note}
      </div>

      {/* Phone: one month at a time. */}
      <div className="flex flex-col gap-3.5 pt-1 md:hidden">
        <div
          role="radiogroup"
          aria-label="Month"
          className="flex h-11 gap-0.5 rounded-full bg-dash-well p-1"
        >
          {(
            [
              ["this", thisMonth.label],
              ["last", lastMonth.label],
            ] as const
          ).map(([value, label]) => {
            const on = shown === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setShown(value)}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/50",
                  on
                    ? "bg-dash-raised font-semibold text-dash-ink shadow-(--dash-lift)"
                    : "text-dash-ink-soft",
                )}
              >
                {on ? <Check aria-hidden className="size-3.5" /> : null}
                {label}
              </button>
            );
          })}
        </div>
        <div>
          <p className="text-xs text-dash-ink-soft">
            Estimated cost {shown === "this" ? "this month" : `in ${month.label}`}
          </p>
          <p className="mt-1 flex items-baseline gap-2.5">
            <span className="text-xs font-medium text-dash-ink-soft">about</span>
            <span className="figures font-display text-[30px] leading-none font-semibold">
              {cost(month.total.costMicros)}
            </span>
            <span className="font-mono text-sm font-medium text-dash-ink-soft">
              {rupees(month.total.costMicros)}
            </span>
          </p>
        </div>
        <table className="w-full text-sm">
          <caption className="sr-only">AI use by feature in {month.label}</caption>
          <thead>
            <tr className="border-b border-dash-edge text-xs text-dash-ink-soft">
              <th scope="col" className="py-2 text-left font-medium">
                Feature
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Requests
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Tokens
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Cost
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-dash-edge">
                <th scope="row" className="py-2.5 text-left font-normal">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-dash-ink-soft">{r.icon}</span>
                    {r.label}
                  </span>
                </th>
                <Num>{month.grouped[r.key].requests}</Num>
                <Num>{nf.format(month.grouped[r.key].tokens)}</Num>
                <Num>{cost(month.grouped[r.key].costMicros)}</Num>
              </tr>
            ))}
            <tr className="border-t-2 border-dash-ink font-semibold">
              <th scope="row" className="py-2.5 text-left font-semibold">
                Total
              </th>
              <Num>{month.grouped.total.requests}</Num>
              <Num>{nf.format(month.grouped.total.tokens)}</Num>
              <Num>{cost(month.grouped.total.costMicros)}</Num>
            </tr>
          </tbody>
        </table>
        <p className="text-xs text-dash-ink-soft">
          {other.label}:{" "}
          <span className="font-mono">
            {other.total.requests} {other.total.requests === 1 ? "request" : "requests"} ·{" "}
            {nf.format(other.total.tokens)} tokens · {cost(other.total.costMicros)}
          </span>
        </p>
        {note}
      </div>
    </section>
  );
}

function Num({ children }: { children: ReactNode }) {
  return <td className="py-2.5 text-right font-mono text-[13px] tabular-nums">{children}</td>;
}
