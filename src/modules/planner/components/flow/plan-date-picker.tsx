"use client";

import {
  CalendarDays,
  CalendarPlus,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  Sun,
  Sunrise,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addDaysIso, formatRowDay, isoWeekday, nextWeekStart } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { FlowDates } from "./types";

/**
 * The due date picker of Tasks (screen 2e) for plans: quick choices and a month calendar, with
 * every day before `min` or after `max` turned off. Plans may start today and reach six months
 * ahead, so "today and earlier off" is `min = tomorrow` where a future date is needed.
 */

type Month = { y: number; m: number };
const monthOf = (iso: string): Month => ({
  y: Number(iso.slice(0, 4)),
  m: Number(iso.slice(5, 7)),
});
const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const daysIn = ({ y, m }: Month) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export function PlanDatePicker({
  value,
  min,
  max,
  ctx,
  onChange,
  trigger,
  title = "Pick a date",
  allowClear = false,
  clearLabel = "No date",
  align = "start",
}: {
  value: string | null;
  min: string;
  max: string;
  ctx: FlowDates;
  onChange: (next: string | null) => void;
  trigger: (label: string) => ReactNode;
  title?: string;
  allowClear?: boolean;
  clearLabel?: string;
  align?: "start" | "center" | "end";
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Month>(() => monthOf(value ?? min));
  const inRange = (iso: string) => iso >= min && iso <= max;

  const weekday = (iso: string) =>
    new Intl.DateTimeFormat(ctx.locale, { weekday: "short", timeZone: "UTC" }).format(
      new Date(`${iso}T00:00:00Z`),
    );
  const quick = [
    { label: "Today", date: ctx.today, icon: Sun },
    { label: "Tomorrow", date: addDaysIso(ctx.today, 1), icon: Sunrise },
    { label: "Next week", date: nextWeekStart(ctx.today, ctx.weekStartsOn), icon: CalendarPlus },
  ].filter((q) => inRange(q.date));

  function pick(next: string | null) {
    onChange(next);
    setOpen(false);
  }

  const first = isoOf(month.y, month.m, 1);
  const startOffset = (isoWeekday(first) - (ctx.weekStartsOn === 0 ? 7 : ctx.weekStartsOn) + 7) % 7;
  const cells: (string | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysIn(month) }, (_, i) => isoOf(month.y, month.m, i + 1)),
  ];
  const headers = Array.from({ length: 7 }, (_, i) => addDaysIso(first, i - startOffset));
  const monthName = new Intl.DateTimeFormat(ctx.locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(month.y, month.m - 1, 1)));
  const step = (by: number) =>
    setMonth(({ y, m }) => {
      const n = m + by;
      return n < 1 ? { y: y - 1, m: 12 } : n > 12 ? { y: y + 1, m: 1 } : { y, m: n };
    });
  const minMonth = monthOf(min);
  const maxMonth = monthOf(max);
  const atStart = month.y * 12 + month.m <= minMonth.y * 12 + minMonth.m;
  const atEnd = month.y * 12 + month.m >= maxMonth.y * 12 + maxMonth.m;

  const label = value ? formatRowDay(value, ctx.today, ctx.locale) : "Add date";

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setMonth(monthOf(value ?? min));
      }}
    >
      <PopoverTrigger asChild>{trigger(label)}</PopoverTrigger>
      <PopoverContent
        align={align}
        collisionPadding={16}
        className="dash max-h-(--radix-popover-content-available-height) w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-dash-edge bg-dash-card p-4 text-dash-ink shadow-[0_24px_48px_-16px_rgb(0_0_0/0.3)]"
      >
        <h2 className="mb-3 font-display text-lg font-semibold">{title}</h2>
        <div className="flex flex-wrap gap-2">
          {quick.map((q) => (
            <button
              key={q.label}
              type="button"
              aria-pressed={value === q.date}
              onClick={() => pick(q.date)}
              className={cn(
                "flex h-11 items-center gap-2 rounded-xl px-3 text-[14px] font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                value === q.date ? "bg-dash-ink text-dash-card" : "bg-dash-well hover:bg-dash-edge",
              )}
            >
              <q.icon aria-hidden className="size-4" />
              {q.label}
              <span className="text-xs opacity-70">{weekday(q.date)}</span>
            </button>
          ))}
          {allowClear ? (
            <button
              type="button"
              onClick={() => pick(null)}
              className="flex h-11 items-center gap-2 rounded-xl bg-dash-well px-3 text-[14px] font-medium outline-none transition-colors hover:bg-dash-edge focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <CalendarX aria-hidden className="size-4" />
              {clearLabel}
            </button>
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-semibold" aria-live="polite">
            <CalendarDays aria-hidden className="size-4 text-dash-ink-soft" />
            {monthName}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              aria-label="Previous month"
              disabled={atStart}
              onClick={() => step(-1)}
              className="grid size-11 place-items-center rounded-full outline-none hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-30 md:size-8"
            >
              <ChevronLeft aria-hidden className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Next month"
              disabled={atEnd}
              onClick={() => step(1)}
              className="grid size-11 place-items-center rounded-full outline-none hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-30 md:size-8"
            >
              <ChevronRight aria-hidden className="size-4" />
            </button>
          </div>
        </div>
        <div className="mt-1 grid grid-cols-7 text-center">
          {headers.map((iso) => (
            <span key={iso} aria-hidden className="py-1 font-mono text-[11px] text-dash-ink-soft">
              {weekday(iso).charAt(0)}
            </span>
          ))}
          {cells.map((iso, i) =>
            iso === null ? (
              <span key={`blank-${i}`} />
            ) : (
              <button
                key={iso}
                type="button"
                disabled={!inRange(iso)}
                aria-label={new Intl.DateTimeFormat(ctx.locale, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  timeZone: "UTC",
                }).format(new Date(`${iso}T00:00:00Z`))}
                aria-pressed={value === iso}
                aria-current={iso === ctx.today ? "date" : undefined}
                onClick={() => pick(iso)}
                className="grid h-10 place-items-center outline-none disabled:cursor-not-allowed"
              >
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-full text-[13px] transition-colors duration-150",
                    !inRange(iso) && "text-dash-ink-soft/40",
                    value === iso
                      ? "bg-dash-ink font-semibold text-dash-card"
                      : iso === ctx.today
                        ? "border-2 border-dash-ink font-semibold"
                        : inRange(iso) && "hover:bg-dash-well",
                  )}
                >
                  {Number(iso.slice(8))}
                </span>
              </button>
            ),
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
