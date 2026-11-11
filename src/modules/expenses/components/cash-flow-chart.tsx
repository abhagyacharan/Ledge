"use client";

import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatCompact, formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { MONTH_NAMES } from "../periods";
import type { TrendRow } from "../summary";
import { useQueryUpdate } from "./pending";

type Fmt = { currency: string; locale: string };

/** A round upper limit for the chart (1, 2, 2.5 or 5 times a power of ten), split in four steps. */
function niceCeiling(peakMinor: number): number {
  const steps = 4;
  const raw = Math.max(1, peakMinor) / steps;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const unit = [1, 2, 2.5, 5, 10].find((m) => m * magnitude >= raw) ?? 10;
  return Math.round(unit * magnitude) * steps;
}

/**
 * One bar per month, made of two rounded bars stacked in it with a small gap (docs/design.md):
 * money in (solid, bottom) and money out, EMIs plus expenses (orange hatch, on top).
 *
 * Each month is a button: pointing at it shows its figures and fades the other months; choosing
 * it opens that month (the period picker follows). Bars grow and shrink smoothly when the year
 * changes. The details table beside it has the same numbers for screen readers and keyboards.
 */
export function CashFlowChart({
  months,
  year,
  selectedMonth,
  fmt,
}: {
  months: TrendRow[];
  year: number;
  selectedMonth: number | "all";
  fmt: Fmt;
}) {
  const update = useQueryUpdate();
  // On a phone the bars are too narrow to tap well (44px rule), so there they are just a picture;
  // the period picker right above chooses the month.
  const interactive = !useIsMobile();
  const [hover, setHover] = useState<number | null>(null);
  const peak = Math.max(0, ...months.map((m) => m.income + m.emi + m.expense));
  const top = niceCeiling(peak);
  const ticks = [0, 1, 2, 3, 4];
  const money = (minor: number) => formatMoney(minor, fmt.currency, fmt.locale);
  const shown = hover === null ? null : months.find((m) => m.month === hover);

  return (
    <figure className="flex flex-1 flex-col rounded-xl bg-dash-well p-3 sm:rounded-[20px] sm:p-4">
      <div
        aria-hidden
        className="mb-3 flex flex-wrap justify-end gap-x-4 gap-y-1 text-xs text-dash-ink-soft"
      >
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-dash-ink" /> Money in
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="dash-hatch size-2.5 rounded-sm" /> Money out
        </span>
      </div>
      <div className="flex flex-1 gap-2">
        <div
          aria-hidden
          className="flex min-h-64 flex-col-reverse justify-between text-[10px] text-dash-ink-soft tabular-nums"
        >
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
                aria-hidden
                className="absolute inset-x-0 border-t border-dashed border-dash-edge"
                style={{ bottom: `${i * 25}%` }}
              />
            ))}
            <div
              role={interactive ? "group" : undefined}
              aria-label={interactive ? `Months of ${year}: choose one to open it` : undefined}
              aria-hidden={interactive ? undefined : true}
              className="absolute inset-0 flex items-end gap-1 sm:gap-2"
              onPointerLeave={() => setHover(null)}
            >
              {months.map((m) => {
                const out = m.emi + m.expense;
                const height = ((m.income + out) / top) * 100;
                const faded = hover !== null && hover !== m.month;
                const bar = (
                  <span
                    aria-hidden
                    className="flex w-full max-w-[24px] flex-col-reverse gap-0.5"
                    style={{
                      height: `${height}%`,
                      opacity: faded ? 0.35 : 1,
                      transition: "height 500ms cubic-bezier(0.23, 1, 0.32, 1), opacity 150ms ease",
                    }}
                  >
                    {m.income > 0 ? (
                      <span className="rounded-md bg-dash-ink" style={{ flexGrow: m.income }} />
                    ) : null}
                    {out > 0 ? (
                      <span className="dash-hatch rounded-md" style={{ flexGrow: out }} />
                    ) : null}
                  </span>
                );
                if (!interactive) {
                  return (
                    <span
                      key={m.month}
                      aria-hidden
                      className="flex h-full min-w-0 flex-1 items-end justify-center"
                    >
                      {bar}
                    </span>
                  );
                }
                return (
                  <button
                    key={m.month}
                    type="button"
                    aria-label={`${MONTH_NAMES[m.month - 1]} ${year}: ${money(m.income)} in, ${money(out)} out`}
                    aria-pressed={selectedMonth === m.month}
                    onClick={() => {
                      setHover(null);
                      update({ y: String(year), m: String(m.month) });
                    }}
                    onPointerEnter={(e) => e.pointerType === "mouse" && setHover(m.month)}
                    // Keyboard focus shows the figures; a mouse click that leaves focus behind does not.
                    onFocus={(e) => e.currentTarget.matches(":focus-visible") && setHover(m.month)}
                    onBlur={() => setHover(null)}
                    className="flex h-full min-w-0 flex-1 cursor-pointer items-end justify-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {bar}
                  </button>
                );
              })}
            </div>

            {shown ? (
              <Tip
                month={shown}
                year={year}
                index={shown.month - 1}
                bottom={((shown.income + shown.emi + shown.expense) / top) * 100}
                money={money}
              />
            ) : null}
          </div>
          {/* Narrow phones get one letter per month so December never spills out of the card. */}
          <div aria-hidden className="mt-2 flex gap-1 sm:gap-2">
            {months.map((m) => (
              <span
                key={m.month}
                className={cn(
                  "min-w-0 flex-1 text-center text-[10px] text-dash-ink-soft",
                  selectedMonth === m.month && "font-semibold text-dash-ink",
                )}
              >
                <span className="min-[440px]:hidden">{MONTH_NAMES[m.month - 1][0]}</span>
                <span className="hidden min-[440px]:inline">
                  {MONTH_NAMES[m.month - 1].slice(0, 3)}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}

/** The figures of the month under the pointer, floating just above its bar. */
function Tip({
  month,
  year,
  index,
  bottom,
  money,
}: {
  month: TrendRow;
  year: number;
  index: number;
  bottom: number;
  money: (minor: number) => string;
}) {
  // Centred on the bar, except near the edges, where it leans inwards to stay on screen.
  const shift = index < 2 ? "-12%" : index > 9 ? "-88%" : "-50%";
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-10"
      style={{
        left: `${((index + 0.5) / 12) * 100}%`,
        bottom: `calc(${Math.min(bottom, 100)}% + 8px)`,
        transform: `translateX(${shift})`,
      }}
    >
      <div className="origin-bottom animate-in rounded-2xl bg-dash-ink px-3 py-2.5 text-xs whitespace-nowrap text-dash-card shadow-[0_12px_32px_-12px_rgb(0_0_0/0.5)] duration-150 fade-in-0 zoom-in-95">
        <p className="mb-1.5 font-medium">
          {MONTH_NAMES[month.month - 1]} {year}
        </p>
        <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5">
          <dt className="opacity-70">In</dt>
          <dd className="figures text-right">{money(month.income)}</dd>
          <dt className="opacity-70">Out</dt>
          <dd className="figures text-right">{money(month.emi + month.expense)}</dd>
          <dt className="opacity-70">Net</dt>
          <dd className="figures text-right font-medium">{money(month.netSavings)}</dd>
        </dl>
      </div>
    </div>
  );
}
