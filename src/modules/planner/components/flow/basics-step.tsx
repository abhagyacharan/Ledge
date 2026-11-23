"use client";

import { ArrowLeft, ArrowRight, CalendarDays, CalendarRange, Loader2 } from "lucide-react";
import { useState } from "react";
import { addDaysIso } from "@/lib/dates";
import { cn } from "@/lib/utils";
import {
  basicsSchema,
  LENGTH_PRESETS,
  MINUTES_CHOICES,
  PLAN_WINDOW_DAYS,
  type PlanBasics,
} from "../../schema";
import { basicsLine } from "./basics-line";
import { Chip, FlowFrame, StepHint, StepTitle, flowButton } from "./flow-frame";
import { PlanDatePicker } from "./plan-date-picker";
import { stepEyebrow, stepProgress } from "./progress";
import type { FlowDates } from "./types";

const LENGTH_LABELS: Record<(typeof LENGTH_PRESETS)[number], string> = {
  "1w": "1 week",
  "2w": "2 weeks",
  "1m": "1 month",
  "3m": "3 months",
};

const MINUTES_LABELS: Record<PlanBasics["minutesPerDay"] & (number | string), string> = {
  15: "15 min a day",
  30: "30 min",
  60: "1 hour",
  120: "2+ hours",
  weekends: "Weekends only",
};

/** Step 2 of 4 (screen 8d): plan length and time per day. Both are needed, so there is no Skip. */
export function BasicsStep({
  initial,
  dates,
  onSubmit,
  onBack,
  onClose,
}: {
  initial: PlanBasics | null;
  dates: FlowDates;
  onSubmit: (basics: PlanBasics) => Promise<string | null>;
  onBack: () => void;
  onClose: () => void;
}) {
  const [length, setLength] = useState<PlanBasics["length"] | null>(initial?.length ?? null);
  const [minutes, setMinutes] = useState<PlanBasics["minutesPerDay"] | null>(
    initial?.minutesPerDay ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const candidate = length !== null && minutes !== null ? { length, minutesPerDay: minutes } : null;
  const parsed = candidate ? basicsSchema.safeParse(candidate) : null;
  const basics = parsed?.success ? parsed.data : null;
  const line = basics ? basicsLine(basics, dates.today, dates.locale) : null;
  const ready = basics !== null && line !== null && !busy;

  async function next() {
    if (!basics || !ready) return;
    setBusy(true);
    setError(null);
    const problem = await onSubmit(basics);
    if (problem) {
      setError(problem);
      setBusy(false);
    }
  }

  const screen = { name: "basics" } as const;
  const custom = typeof length === "object" && length !== null ? length.date : null;

  return (
    <FlowFrame
      progress={stepProgress(screen)}
      eyebrow={stepEyebrow(screen)}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" onClick={onBack} className={flowButton("secondary")}>
            <ArrowLeft aria-hidden className="size-[18px]" />
            Back
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={next}
            className={cn(flowButton(), "flex-1")}
          >
            {busy ? <Loader2 aria-hidden className="size-[18px] animate-spin" /> : null}
            Next
            {busy ? null : <ArrowRight aria-hidden className="size-[18px]" />}
          </button>
        </>
      }
    >
      <StepTitle>Two quick basics</StepTitle>
      <StepHint>Ledge spaces the tasks to fit.</StepHint>

      <div id="plan-length" className="mt-2 text-[15px] font-semibold text-dash-ink">
        Plan length
      </div>
      <div role="radiogroup" aria-labelledby="plan-length" className="flex flex-wrap gap-2">
        {LENGTH_PRESETS.map((preset) => (
          <Chip key={preset} on={length === preset} onClick={() => setLength(preset)}>
            {LENGTH_LABELS[preset]}
          </Chip>
        ))}
        <PlanDatePicker
          value={custom}
          min={addDaysIso(dates.today, 1)}
          max={addDaysIso(dates.today, PLAN_WINDOW_DAYS)}
          ctx={dates}
          title="Plan ends on"
          onChange={(date) => date && setLength({ date })}
          trigger={(label) => (
            <Chip on={custom !== null} className="gap-1.5">
              {custom === null ? <CalendarDays aria-hidden className="size-3.5" /> : null}
              {custom === null ? "Pick a date" : label}
            </Chip>
          )}
        />
      </div>

      <div id="plan-time" className="mt-3 text-[15px] font-semibold text-dash-ink">
        Time you can give it
      </div>
      <div role="radiogroup" aria-labelledby="plan-time" className="flex flex-wrap gap-2">
        {[...MINUTES_CHOICES, "weekends" as const].map((choice) => (
          <Chip key={choice} on={minutes === choice} onClick={() => setMinutes(choice)}>
            {MINUTES_LABELS[choice]}
          </Chip>
        ))}
      </div>

      <div
        role="status"
        aria-live="polite"
        className={cn(
          "mt-2 flex items-center gap-2.5 rounded-2xl bg-dash-well px-3.5 py-3 text-[13px] leading-snug text-dash-ink-soft",
          !line && "invisible",
        )}
      >
        <CalendarRange aria-hidden className="size-4 shrink-0 text-dash-ink" />
        <span>
          About <span className="font-mono text-dash-ink">{line?.amount ?? "0 hours"}</span> in all,{" "}
          {line?.range ?? "today to later"}.
        </span>
      </div>
      {error ? (
        <p role="alert" className="text-[13px] font-medium text-dash-bad">
          {error}
        </p>
      ) : null}
    </FlowFrame>
  );
}
