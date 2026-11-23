"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import type { ToldRow } from "../../plan-view";

/**
 * "What you told Ledge" (docs/plans designs 8j): the goal in your words, the plan length and time,
 * and every question with its answer, follow-ups too ("Skipped" for a skip). A fold that starts
 * closed; read-only, because an active plan changes through "Add more tasks".
 */
export function PlanTold({ goal, rows }: { goal: string; rows: ToldRow[] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <section className="rounded-2xl border border-dash-edge bg-dash-card text-dash-ink shadow-(--dash-card-shadow)">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl px-4 text-left text-[15px] font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          What you told Ledge
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 shrink-0 text-dash-ink-soft transition-transform duration-200 ease-snap",
              open && "rotate-180",
            )}
          />
        </button>
      </h2>
      {open ? (
        <div id={id} className="flex flex-col gap-3 px-4 pb-4">
          <blockquote className="rounded-2xl bg-dash-well px-3.5 py-3 text-sm leading-relaxed break-words">
            &ldquo;{goal}&rdquo;
          </blockquote>
          <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 text-[13px] leading-snug">
            {rows.map((row, i) => (
              <div key={`${row.label}-${i}`} className="contents">
                <dt className="text-dash-ink-soft">{row.label}</dt>
                <dd
                  className={cn(
                    "max-w-[60vw] text-right font-medium break-words md:max-w-xs",
                    row.mono && "font-mono",
                    row.text === "Skipped" && "font-normal text-dash-ink-soft",
                  )}
                >
                  {row.text}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </section>
  );
}
