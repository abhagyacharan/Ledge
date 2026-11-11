"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
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
};

const FREQS: { value: Freq; label: string; unit: [string, string] }[] = [
  { value: "daily", label: "Every day", unit: ["day", "days"] },
  { value: "weekly", label: "Every week", unit: ["week", "weeks"] },
  { value: "monthly", label: "Every month", unit: ["month", "months"] },
  { value: "yearly", label: "Every year", unit: ["year", "years"] },
];
const WEEKDAY_LABELS: Record<Weekday, [string, string]> = {
  MO: ["Mon", "Monday"],
  TU: ["Tue", "Tuesday"],
  WE: ["Wed", "Wednesday"],
  TH: ["Thu", "Thursday"],
  FR: ["Fri", "Friday"],
  SA: ["Sat", "Saturday"],
  SU: ["Sun", "Sunday"],
};
const MODE_LABELS: Record<RecurrenceMode, string> = {
  fixed: "Follows the schedule",
  after_completion: "Counts from when I finish it",
};
const NONE = "none";

/**
 * The Repeat controls in the task drawer (CLAUDE.md §6.2). Choose how often, optionally every N
 * days, weeks, months or years and on which weekdays, and whether the next date follows the
 * schedule or counts from the day the task is finished. Every change saves at once.
 */
export function RepeatField({
  rule: stored,
  mode,
  dueDate,
  today,
  onChange,
}: {
  rule: string | null;
  mode: RecurrenceMode;
  dueDate: string | null;
  today: string;
  onChange: (change: RepeatChange) => void;
}) {
  const rule = stored ? parseRule(stored) : null;
  const base = dueDate ?? today;
  const [interval, setInterval_] = useState(String(rule?.interval ?? 1));
  const [seen, setSeen] = useState(rule?.interval ?? 1);
  if ((rule?.interval ?? 1) !== seen) {
    setSeen(rule?.interval ?? 1);
    setInterval_(String(rule?.interval ?? 1));
  }

  function apply(next: Rule, extra: RepeatChange = {}) {
    onChange({ recurrenceRule: formatRule(next), ...(dueDate ? {} : { dueDate: base }), ...extra });
  }

  function chooseFreq(value: string) {
    if (value === NONE) return onChange({ recurrenceRule: null });
    apply(ruleFor(value as Freq, base, rule?.interval ?? 1));
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

  const unit = FREQS.find((f) => f.value === rule?.freq)?.unit ?? ["day", "days"];

  return (
    <div className="flex flex-col gap-3">
      <Select value={rule?.freq ?? NONE} onValueChange={chooseFreq}>
        <SelectTrigger id="task-repeat" className="h-11 w-full md:h-8">
          <SelectValue>
            {rule ? FREQS.find((f) => f.value === rule.freq)?.label : "Does not repeat"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Does not repeat</SelectItem>
          {FREQS.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {rule ? (
        <div className="flex flex-col gap-3 rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 text-sm">
            <Label htmlFor="task-repeat-interval">Repeat every</Label>
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
              className="h-11 w-20 md:h-8"
            />
            <span>{rule.interval === 1 ? unit[0] : unit[1]}</span>
          </div>

          {rule.freq === "weekly" ? (
            <div role="group" aria-label="Repeat on" className="flex flex-wrap gap-1">
              {WEEKDAYS.map((day) => {
                const on = (rule.byDay.length > 0 ? rule.byDay : [WEEKDAYS[0]]).includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={on}
                    title={WEEKDAY_LABELS[day][1]}
                    onClick={() => toggleDay(day)}
                    className={cn(
                      "h-11 w-11 rounded-md border text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8 md:w-11",
                      on
                        ? "border-transparent bg-primary text-primary-foreground"
                        : "bg-background hover:bg-accent",
                    )}
                  >
                    {WEEKDAY_LABELS[day][0]}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="task-repeat-mode">Next date</Label>
            <Select
              value={mode}
              onValueChange={(v) => onChange({ recurrenceMode: v as RecurrenceMode })}
            >
              <SelectTrigger id="task-repeat-mode" className="h-11 w-full md:h-8">
                <SelectValue>{MODE_LABELS[mode]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(MODE_LABELS) as RecurrenceMode[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {MODE_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground" aria-live="polite">
            {describeRule(rule, mode)}. When you tick it, a finished copy goes to Completed and the
            due date moves on.
          </p>
        </div>
      ) : null}
    </div>
  );
}
