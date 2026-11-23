"use client";

import * as chrono from "chrono-node";
import { format } from "date-fns";
import {
  CalendarDays,
  CalendarPlus,
  CalendarX,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sun,
  Sunrise,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addDaysIso, formatDue, isoWeekday, nextWeekStart, trimTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { DateContext } from "./types";

type Due = { dueDate: string | null; dueTime: string | null };

/** The month a calendar shows, as year and 1-based month. */
type Month = { y: number; m: number };

const monthOf = (iso: string): Month => ({
  y: Number(iso.slice(0, 4)),
  m: Number(iso.slice(5, 7)),
});
const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const daysIn = ({ y, m }: Month) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Reads "16 nov", "next fri", "in 3 days" into a date, counting forward from today. */
function parseTypedDate(text: string, today: string, locale: string): string | null {
  const [y, m, d] = today.split("-").map(Number);
  const parser = locale === "en-US" ? chrono.en.casual : chrono.en.GB;
  const found = parser.parseDate(text, new Date(y, m - 1, d, 12), { forwardDate: true });
  return found ? format(found, "yyyy-MM-dd") : null;
}

/**
 * The due date picker (docs/new_design.md screen 2e, CLAUDE.md §6.2): four quick choices (Today,
 * Tomorrow, Next week, No date) with the day they land on, a field that understands typed dates
 * ("16 nov", "next fri"), a month calendar (today has a ring, the chosen day is filled) and an
 * optional time. A quick choice or a calendar day closes it straight away.
 */
export function DueDateField({
  value,
  ctx,
  onChange,
  trigger,
  minDate,
  allowClear = true,
  allowTime = true,
  title = "Due date",
}: {
  value: Due;
  ctx: DateContext;
  onChange: (next: Due) => void;
  /** A custom opener (the task detail's Due row); defaults to a pill button. */
  trigger?: (label: string) => ReactNode;
  /** Days before this one are turned off (a plan's new end date cannot be in the past). */
  minDate?: string;
  /** False hides "No date" (a date is required). */
  allowClear?: boolean;
  /** False hides the time row (a plan's end date is a day, not a moment). */
  allowTime?: boolean;
  /** The heading of the picker. */
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Month>(() => monthOf(value.dueDate ?? ctx.today));
  const [typed, setTyped] = useState("");
  const [typedError, setTypedError] = useState(false);
  const [showTime, setShowTime] = useState(Boolean(value.dueTime));

  const weekday = (iso: string) =>
    new Intl.DateTimeFormat(ctx.locale, { weekday: "short", timeZone: "UTC" }).format(
      new Date(`${iso}T00:00:00Z`),
    );
  const nextWeek = nextWeekStart(ctx.today, ctx.weekStartsOn);
  const quick: { label: string; date: string | null; hint: string; icon: LucideIcon }[] = [
    { label: "Today", date: ctx.today, hint: weekday(ctx.today), icon: Sun },
    {
      label: "Tomorrow",
      date: addDaysIso(ctx.today, 1),
      hint: weekday(addDaysIso(ctx.today, 1)),
      icon: Sunrise,
    },
    {
      label: "Next week",
      date: nextWeek,
      hint: `${weekday(nextWeek)} ${Number(nextWeek.slice(8))}`,
      icon: CalendarPlus,
    },
    { label: "No date", date: null, hint: "", icon: CalendarX },
  ].filter((q) =>
    q.date === null ? allowClear : minDate === undefined || (q.date as string) >= minDate,
  );
  const tooEarly = (iso: string) => minDate !== undefined && iso < minDate;

  function pick(dueDate: string | null) {
    onChange({ dueDate, dueTime: dueDate ? value.dueTime : null });
    setOpen(false);
  }

  function submitTyped() {
    const parsed = typed.trim() ? parseTypedDate(typed, ctx.today, ctx.locale) : null;
    if (!parsed || tooEarly(parsed)) {
      setTypedError(Boolean(typed.trim()));
      return;
    }
    setTyped("");
    setTypedError(false);
    pick(parsed);
  }

  const label = value.dueDate
    ? formatDue(value.dueDate, value.dueTime, ctx.today, ctx.locale)
    : "Add date";

  // The calendar grid, starting on the user's first day of the week.
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

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setMonth(monthOf(value.dueDate ?? ctx.today));
          setShowTime(Boolean(value.dueTime));
        }
      }}
    >
      <PopoverTrigger asChild>
        {trigger ? (
          trigger(label)
        ) : (
          <button
            type="button"
            aria-label={`Due date: ${value.dueDate ? label : "none"}. Change.`}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-dash-edge bg-dash-card px-3.5 text-[13px] font-medium text-dash-ink outline-none hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9"
          >
            <CalendarDays aria-hidden className="size-4" />
            {label}
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={16}
        className="dash max-h-(--radix-popover-content-available-height) w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-dash-edge bg-dash-card p-4 text-dash-ink shadow-[0_24px_48px_-16px_rgb(0_0_0/0.3)]"
      >
        <h2 className="mb-3 font-display text-lg font-semibold">{title}</h2>
        <div className="grid grid-cols-2 gap-2">
          {quick.map((q) => {
            const on = value.dueDate === q.date;
            return (
              <button
                key={q.label}
                type="button"
                aria-pressed={on}
                onClick={() => pick(q.date)}
                className={cn(
                  "flex h-11 items-center gap-2 rounded-xl px-3 text-[14px] font-medium whitespace-nowrap outline-none transition-colors duration-150 focus-visible:shadow-[0_0_0_2px_var(--dash-card),0_0_0_4px_var(--dash-ink)]",
                  on
                    ? "bg-dash-ink text-dash-card"
                    : "bg-dash-well text-dash-ink hover:bg-dash-edge",
                )}
              >
                {on ? (
                  <Check aria-hidden className="size-4" strokeWidth={2.5} />
                ) : (
                  <q.icon aria-hidden className="size-4" />
                )}
                <span className="flex-1 text-left">{q.label}</span>
                {q.hint ? (
                  <span className={cn("text-xs", on ? "text-dash-card/80" : "text-dash-ink-soft")}>
                    {q.hint}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <form
          className="mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            submitTyped();
          }}
        >
          <input
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
              setTypedError(false);
            }}
            aria-label="Type a date"
            aria-invalid={typedError || undefined}
            aria-describedby={typedError ? "typed-date-error" : undefined}
            placeholder={'Type a date, like "16 nov" or "next fri"'}
            enterKeyHint="done"
            className="h-11 w-full rounded-xl border border-dash-edge bg-dash-card px-3 text-base outline-none placeholder:text-dash-ink-soft focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
          />
          {typedError ? (
            <p id="typed-date-error" role="alert" className="mt-1 text-xs text-dash-bad">
              That doesn&apos;t look like a date. Try &quot;20 nov&quot; or &quot;next monday&quot;.
            </p>
          ) : null}
        </form>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm font-semibold" aria-live="polite">
            {monthName}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => step(-1)}
              className="grid size-11 place-items-center rounded-full outline-none hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50 md:size-8"
            >
              <ChevronLeft aria-hidden className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => step(1)}
              className="grid size-11 place-items-center rounded-full outline-none hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50 md:size-8"
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
                aria-label={new Intl.DateTimeFormat(ctx.locale, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  timeZone: "UTC",
                }).format(new Date(`${iso}T00:00:00Z`))}
                aria-pressed={value.dueDate === iso}
                aria-current={iso === ctx.today ? "date" : undefined}
                disabled={tooEarly(iso)}
                onClick={() => pick(iso)}
                className="grid h-10 place-items-center outline-none disabled:pointer-events-none"
              >
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-full text-[13px] transition-colors duration-150",
                    tooEarly(iso) && "text-dash-ink-soft/40 line-through",
                    value.dueDate === iso
                      ? "bg-dash-ink font-semibold text-dash-card"
                      : iso === ctx.today
                        ? "border-2 border-dash-ink font-semibold"
                        : "hover:bg-dash-well",
                  )}
                >
                  {Number(iso.slice(8))}
                </span>
              </button>
            ),
          )}
        </div>

        {allowTime ? (
          <div className="mt-3 border-t border-dash-edge pt-3">
            {showTime && value.dueDate ? (
              <div className="flex items-center gap-2">
                <Clock aria-hidden className="size-4 text-dash-ink-soft" />
                <label htmlFor="due-time-input" className="text-sm font-medium">
                  Time
                </label>
                <input
                  id="due-time-input"
                  type="time"
                  value={value.dueTime ? trimTime(value.dueTime) : ""}
                  onChange={(e) =>
                    onChange({ dueDate: value.dueDate, dueTime: e.target.value || null })
                  }
                  className="h-11 flex-1 rounded-xl bg-dash-well px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9 md:text-sm"
                />
                {value.dueTime ? (
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ dueDate: value.dueDate, dueTime: null });
                      setShowTime(false);
                    }}
                    className="h-11 rounded-full px-3 text-[13px] font-medium text-dash-ink-soft hover:text-dash-ink md:h-9"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                disabled={!value.dueDate}
                onClick={() => setShowTime(true)}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-dash-well text-[14px] font-medium outline-none hover:bg-dash-edge focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 md:h-9"
              >
                <Clock aria-hidden className="size-4" />
                {value.dueDate ? "Add time" : "Pick a date to add a time"}
              </button>
            )}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
