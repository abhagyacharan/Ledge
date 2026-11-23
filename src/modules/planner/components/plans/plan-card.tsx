import { ChevronRight, CornerDownRight } from "lucide-react";
import Link from "next/link";
import { formatDueDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { PlanListItem } from "@/server/data/plans";
import { progressLine, progressPercent } from "../../plan-view";
import { ProgressRing } from "./progress-ring";
import { StatusPill } from "./status-pill";

const focusRing =
  "outline-none focus-visible:shadow-[0_0_0_2px_var(--background),0_0_0_4px_var(--dash-ink)]";

/**
 * One plan on Plans home (docs/plans designs 8a, 8b): the ring, the title, "4 of 18 · 24 days
 * left" and the next open task. With a mouse the card also lists each phase's progress. Only the
 * most recently touched plan's ring is orange (`accent`).
 */
export function PlanCard({
  plan,
  accent,
  today,
  locale,
}: {
  plan: PlanListItem;
  accent: boolean;
  today: string;
  locale: string;
}) {
  const { done, total } = plan.progress;
  const percent = progressPercent(done, total);
  const finished = plan.status === "done";
  const line = progressLine(done, total, plan.daysLeft, {
    finished: finished || plan.status === "archived",
  });
  const next = plan.nextTask;
  const nextWhen = next ? formatDueDate(next.dueDate, today, locale) : null;
  const showNext = next && plan.status === "active";

  return (
    <Link
      href={`/plans/${plan.id}`}
      className={cn(
        "group flex flex-col gap-4 rounded-2xl border border-dash-edge bg-dash-card p-4 shadow-(--dash-card-shadow) transition-[transform,background-color] duration-150 ease-snap hover:bg-dash-well/40 md:min-h-[196px] md:rounded-3xl md:p-6 md:hover:-translate-y-0.5 motion-reduce:md:hover:translate-y-0",
        focusRing,
      )}
    >
      <span className="flex items-center gap-3.5 md:gap-4">
        <ProgressRing percent={percent} accent={accent} />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold break-words md:text-lg">{plan.title}</span>
          <span className="mt-0.5 block font-mono text-xs font-medium text-dash-ink-soft md:mt-1">
            {line}
          </span>
          {showNext ? (
            <span className="mt-1.5 flex items-center gap-1.5 text-[13px] text-dash-ink-soft md:hidden">
              <CornerDownRight aria-hidden className="size-3.5 shrink-0" />
              <span className="min-w-0 truncate">
                Next: <span className="font-medium text-dash-ink">{next.title}</span>
              </span>
            </span>
          ) : null}
        </span>
        <StatusPill status={plan.status} className="hidden md:inline-flex" />
        <ChevronRight aria-hidden className="size-4 shrink-0 text-dash-ink-soft md:hidden" />
      </span>

      {plan.phaseProgress.length > 0 ? (
        <span className="hidden flex-col gap-1.5 text-[13px] text-dash-ink-soft md:flex">
          {plan.phaseProgress.map((phase) => (
            <span key={phase.id} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate">{phase.name}</span>
              <span className="shrink-0 font-mono">
                {phase.done} of {phase.total}
              </span>
            </span>
          ))}
        </span>
      ) : null}

      {showNext ? (
        <span className="mt-auto hidden items-center gap-1.5 border-t border-dash-edge pt-3 text-[13px] text-dash-ink-soft md:flex">
          <CornerDownRight aria-hidden className="size-3.5 shrink-0" />
          <span className="min-w-0 truncate">
            Next: <span className="font-medium text-dash-ink">{next.title}</span>
          </span>
          <span className="ml-auto shrink-0 font-mono text-xs font-medium">{nextWhen}</span>
        </span>
      ) : null}
    </Link>
  );
}
