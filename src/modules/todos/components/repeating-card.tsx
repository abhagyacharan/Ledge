"use client";

import { ChevronDown, Repeat } from "lucide-react";
import { useState, type ReactNode } from "react";
import { SectionCard } from "@/components/dash/page-title";
import { cn } from "@/lib/utils";

/**
 * The Repeating card (O, 2026-11-22): frequent repeats (skincare, steps, supplements) kept apart
 * from one-off tasks. In Today it counts how many are done and folds to one line once all are;
 * in Upcoming it lists each repeat once instead of on every day. "Show" and "Hide" open and close
 * it; your choice holds until the count changes.
 */
export function RepeatingCard({
  id,
  done,
  total,
  children,
}: {
  id: string;
  /** Today only: how many are ticked off. Leave out in Upcoming. */
  done?: number;
  total: number;
  children: ReactNode;
}) {
  const allDone = done !== undefined && total > 0 && done === total;
  const [choice, setChoice] = useState<{ open: boolean; at: string } | null>(null);
  const stamp = `${done ?? ""}/${total}`;
  const open = choice && choice.at === stamp ? choice.open : !allDone;

  return (
    <SectionCard
      id={id}
      className={cn(!open && "pb-3.5")}
      heading={
        <>
          <Repeat aria-hidden className="size-3.5" strokeWidth={2.25} />
          Repeating ·{" "}
          {done === undefined ? (
            total
          ) : (
            <span>
              {done} of {total} done
            </span>
          )}
        </>
      }
      aside={
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-body`}
          onClick={() => setChoice({ open: !open, at: stamp })}
          className="-my-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-xs font-medium text-dash-ink-soft outline-none hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-8"
        >
          {open ? "Hide" : "Show"}
          <ChevronDown
            aria-hidden
            className={cn("size-3.5 transition-transform duration-150", open && "rotate-180")}
          />
        </button>
      }
    >
      {allDone && !open ? (
        <p className="text-xs text-dash-ink-soft">All done for today. They come back tomorrow.</p>
      ) : null}
      <div id={`${id}-body`} hidden={!open}>
        {children}
      </div>
    </SectionCard>
  );
}
