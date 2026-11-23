"use client";

import { Check, GalleryHorizontal, List, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanPhase } from "../../schema";
import { phaseLabel } from "./review-logic";
import type { ReviewView } from "./use-review-prefs";

/** The phases as a strip of chips; tapping one jumps to its first card or section. */
export function PhaseStrip({
  phases,
  planStart,
  planEnd,
  current,
  onJump,
  className,
}: {
  phases: PlanPhase[];
  planStart: string;
  planEnd: string;
  current: string | null;
  onJump: (phaseId: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Phases"
      className={cn(
        "no-scrollbar -mr-4 flex gap-1.5 overflow-x-auto pr-4 md:mr-0 md:flex-wrap md:pr-0",
        className,
      )}
    >
      {phases.map((phase) => {
        const on = phase.id === current;
        return (
          <button
            key={phase.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onJump(phase.id)}
            className={cn(
              "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9",
              on
                ? "bg-dash-ink font-semibold text-dash-card"
                : "bg-dash-well text-dash-ink hover:bg-dash-edge",
            )}
          >
            {on ? <Check aria-hidden className="size-3.5" strokeWidth={2.75} /> : null}
            {phaseLabel(phase, planStart, planEnd)}
          </button>
        );
      })}
    </div>
  );
}

/** Cards or List, remembered. A tick marks the chosen one as well as the fill. */
export function ViewToggle({
  value,
  onChange,
}: {
  value: ReviewView;
  onChange: (next: ReviewView) => void;
}) {
  const options = [
    { id: "cards" as const, label: "Cards", icon: GalleryHorizontal },
    { id: "list" as const, label: "List", icon: List },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Review as"
      className="flex h-11 shrink-0 gap-0.5 rounded-full bg-dash-well p-1 text-sm"
    >
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-4",
              on
                ? "bg-dash-raised font-semibold text-dash-ink shadow-[0_0_0_1px_var(--dash-edge),var(--dash-card-shadow)]"
                : "text-dash-ink-soft hover:text-dash-ink",
            )}
          >
            {on ? (
              <Check aria-hidden className="size-3.5" strokeWidth={2.75} />
            ) : (
              <o.icon aria-hidden className="size-[15px]" />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** The plan's editable name, in the display face. */
export function TitleField({
  value,
  onChange,
  big,
  error,
}: {
  value: string;
  onChange: (next: string) => void;
  big?: boolean;
  error?: string;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <input
          aria-label="Plan title"
          aria-invalid={error ? true : undefined}
          value={value}
          maxLength={80}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "min-w-0 flex-1 rounded-lg bg-transparent font-display font-semibold tracking-[-0.015em] text-dash-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            big
              ? "h-[52px] text-[34px] leading-[1.05] md:text-[44px]"
              : "h-10 text-[28px] leading-[1.15]",
          )}
        />
        <Pencil aria-hidden className="size-4 shrink-0 text-dash-ink-soft" />
      </div>
      {error ? (
        <p role="alert" className="mt-1 text-[13px] font-medium text-dash-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}
