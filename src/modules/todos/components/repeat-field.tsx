"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { addMonthsIso, addDaysIso } from "@/lib/dates";
import {
  describeRule,
  formatRule,
  MAX_INTERVAL,
  parseRule,
  ruleFor,
  WEEKDAYS,
  type Freq,
  type RecurrenceMode,
  type Rule,
  type Weekday,
} from "@/lib/recurrence";

export type RepeatChange = {
  recurrenceRule?: string | null;
  recurrenceMode?: RecurrenceMode;
  /** Turning a repeat on gives the task a due date (today) when it has none. */
  dueDate?: string;
  /** Last day the repeat may fall on; null means it never ends. */
  recurrenceUntil?: string | null;
};

/** Ready-made ends, counted from the first date. */
const END_PRESETS: { value: string; label: string; from: (start: string) => string }[] = [
  { value: "week", label: "After 1 week", from: (s) => addDaysIso(s, 7) },
  { value: "month", label: "After 1 month", from: (s) => addMonthsIso(s, 1) },
  { value: "3months", label: "After 3 months", from: (s) => addMonthsIso(s, 3) },
];
const ENDS_NEVER = "never";

const FREQS: { value: Freq; unit: [string, string] }[] = [
  { value: "daily", unit: ["day", "days"] },
  { value: "weekly", unit: ["week", "weeks"] },
  { value: "monthly", unit: ["month", "months"] },
  { value: "yearly", unit: ["year", "years"] },
];
const WORKDAYS: Weekday[] = ["MO", "TU", "WE", "TH", "FR"];
const WEEKDAY_LABELS: Record<Weekday, [string, string]> = {
  MO: ["M", "Monday"],
  TU: ["T", "Tuesday"],
  WE: ["W", "Wednesday"],
  TH: ["T", "Thursday"],
  FR: ["F", "Friday"],
  SA: ["S", "Saturday"],
  SU: ["S", "Sunday"],
};

type Preset = "daily" | "weekdays" | "weekly" | "monthly" | "yearly" | "custom";
const PRESETS: { value: Preset; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Every N…" },
];

/** Which chip a stored rule matches. */
function presetOf(rule: Rule | null): Preset | null {
  if (!rule) return null;
  if (rule.interval > 1) return "custom";
  if (
    rule.freq === "weekly" &&
    rule.byDay.length === WORKDAYS.length &&
    WORKDAYS.every((d) => rule.byDay.includes(d))
  )
    return "weekdays";
  return rule.freq;
}

const chip =
  "inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium whitespace-nowrap outline-none transition-[background-color,color,transform] duration-150 ease-snap focus-visible:shadow-[0_0_0_2px_var(--dash-card),0_0_0_4px_var(--dash-ink)] active:scale-[0.97] md:h-9 md:text-[13px]";

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        chip,
        on
          ? "bg-dash-ink font-semibold text-dash-card"
          : "bg-dash-well text-dash-ink hover:bg-dash-edge",
      )}
    >
      {on ? <Check aria-hidden className="size-3.5" strokeWidth={2.5} /> : null}
      {children}
    </button>
  );
}

const sub = "text-[12px] font-medium text-dash-ink-soft";

/**
 * The Repeat editor (docs/new_design.md screen 2f, CLAUDE.md §6.2): a sentence that restates the
 * rule, then chips for how often (tap the chosen one again to stop repeating), the weekdays,
 * whether the next date follows the schedule or counts from when you finish it, and when it ends.
 * "Every N…" swaps in a number and a days/weeks/months choice. Every change saves at once.
 */
export function RepeatField({
  rule: stored,
  mode,
  until,
  dueDate,
  today,
  onChange,
  locale = "en-IN",
}: {
  rule: string | null;
  mode: RecurrenceMode;
  /** Last day the repeat may fall on, or null. */
  until: string | null;
  dueDate: string | null;
  today: string;
  onChange: (change: RepeatChange) => void;
  locale?: string;
}) {
  const rule = stored ? parseRule(stored) : null;
  const preset = presetOf(rule);
  const base = dueDate ?? today;
  const [interval, setInterval_] = useState(String(rule?.interval ?? 2));
  const [seen, setSeen] = useState(rule?.interval ?? 2);
  if ((rule?.interval ?? 2) !== seen) {
    setSeen(rule?.interval ?? 2);
    setInterval_(String(rule?.interval ?? 2));
  }

  function apply(next: Rule, extra: RepeatChange = {}) {
    onChange({ recurrenceRule: formatRule(next), ...(dueDate ? {} : { dueDate: base }), ...extra });
  }

  function choose(value: Preset) {
    // Tapping the chosen chip again stops the repeat (docs/new_design.md §4).
    if (value === preset) return onChange({ recurrenceRule: null });
    if (value === "custom") {
      return apply(ruleFor(rule?.freq ?? "daily", base, Math.max(2, rule?.interval ?? 2)));
    }
    if (value === "weekdays") return apply({ ...ruleFor("weekly", base, 1), byDay: WORKDAYS });
    apply(ruleFor(value, base, 1));
  }

  function commitInterval() {
    if (!rule) return;
    const n = Math.round(Number(interval));
    if (!Number.isFinite(n) || n < 1 || n > MAX_INTERVAL) {
      setInterval_(String(rule.interval)); // not a usable number: show what is saved
      return;
    }
    if (n !== rule.interval) apply({ ...rule, interval: n });
  }

  function toggleDay(day: Weekday) {
    if (!rule) return;
    const days = rule.byDay.length > 0 ? rule.byDay : [WEEKDAYS[0]];
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
    if (next.length === 0) return; // at least one weekday stays on
    apply({ ...rule, byDay: WEEKDAYS.filter((d) => next.includes(d)) });
  }

  const endPreset = until ? END_PRESETS.find((p) => p.from(base) === until)?.value : ENDS_NEVER;
  const untilLabel = until
    ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(
        new Date(`${until}T00:00:00Z`),
      )
    : null;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-dash-ink-soft" aria-live="polite">
        {rule
          ? `${describeRule(rule, mode)}${untilLabel ? ` until ${untilLabel}` : ""}`
          : "Does not repeat. Pick how often."}
      </p>

      <div role="radiogroup" aria-label="How often" className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Chip key={p.value} on={preset === p.value} onClick={() => choose(p.value)}>
            {p.label}
          </Chip>
        ))}
      </div>

      {rule && preset === "custom" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="task-repeat-interval" className="text-[13px]">
            Every
          </Label>
          <Input
            id="task-repeat-interval"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_INTERVAL}
            value={interval}
            onChange={(e) => setInterval_(e.target.value)}
            onBlur={commitInterval}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="h-11 w-20 rounded-xl bg-dash-well md:h-9"
          />
          <div role="radiogroup" aria-label="Unit" className="flex flex-wrap gap-1.5">
            {FREQS.filter((f) => f.value !== "yearly").map((f) => (
              <Chip
                key={f.value}
                on={rule.freq === f.value}
                onClick={() => apply(ruleFor(f.value, base, rule.interval))}
              >
                {rule.interval === 1 ? f.unit[0] : f.unit[1]}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}

      {rule && rule.freq === "weekly" ? (
        <div className="flex flex-col gap-2">
          <p className={sub}>On</p>
          <div role="group" aria-label="Repeat on" className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((day) => {
              const on = (rule.byDay.length > 0 ? rule.byDay : [WEEKDAYS[0]]).includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={on}
                  aria-label={WEEKDAY_LABELS[day][1]}
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "grid size-11 place-items-center rounded-full text-[13px] font-semibold outline-none transition-colors duration-150 focus-visible:shadow-[0_0_0_2px_var(--dash-card),0_0_0_4px_var(--dash-ink)] md:size-10",
                    on ? "bg-dash-ink text-dash-card" : "border border-dash-edge text-dash-ink",
                  )}
                >
                  {WEEKDAY_LABELS[day][0]}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {rule ? (
        <>
          <div className="flex flex-col gap-2">
            <p className={sub}>Next one counts from</p>
            <div
              role="radiogroup"
              aria-label="Next one counts from"
              className="grid grid-cols-2 gap-1 rounded-full bg-dash-well p-1"
            >
              {(
                [
                  ["fixed", "Fixed schedule"],
                  ["after_completion", "When I complete it"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={mode === value}
                  onClick={() => onChange({ recurrenceMode: value })}
                  className={cn(
                    "inline-flex h-10 items-center justify-center gap-1.5 rounded-full text-[13px] font-medium outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8",
                    mode === value
                      ? "bg-dash-raised font-semibold text-dash-ink shadow-(--dash-lift)"
                      : "text-dash-ink-soft",
                  )}
                >
                  {mode === value ? <Check aria-hidden className="size-3.5" /> : null}
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className={sub}>Ends</p>
            <div role="radiogroup" aria-label="Ends" className="flex flex-wrap gap-2">
              <Chip on={!until} onClick={() => onChange({ recurrenceUntil: null })}>
                Never
              </Chip>
              {END_PRESETS.map((p) => (
                <Chip
                  key={p.value}
                  on={endPreset === p.value}
                  onClick={() => onChange({ recurrenceUntil: p.from(base) })}
                >
                  {p.value === "week" ? p.label : p.label.replace("After ", "")}
                </Chip>
              ))}
              <Chip
                on={Boolean(until) && endPreset === undefined}
                onClick={() => onChange({ recurrenceUntil: until ?? addMonthsIso(base, 2) })}
              >
                {until && endPreset === undefined ? `On ${untilLabel}` : "On a date"}
              </Chip>
            </div>
            {until && endPreset === undefined ? (
              <Input
                id="task-repeat-until"
                type="date"
                aria-label="Last day of the repeat"
                min={base}
                value={until}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next && next >= base) onChange({ recurrenceUntil: next });
                }}
                className="h-11 w-fit rounded-xl bg-dash-well md:h-9"
              />
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
