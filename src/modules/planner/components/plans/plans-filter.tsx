import { Check } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { FILTER_LABELS, PLAN_FILTERS, type PlanFilter } from "../../plan-view";

/**
 * The Active · Drafts · Done · Archived chips (docs/plans designs 8a, 8b). Each is a link that sets
 * `?status=`, so the choice is in the URL and the back button works. The current chip has a tick as
 * well as the dark fill.
 */
export function PlansFilter({
  current,
  counts,
}: {
  current: PlanFilter;
  counts: Record<PlanFilter, number>;
}) {
  return (
    <nav aria-label="Show plans">
      <ul className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
        {PLAN_FILTERS.map((f) => {
          const on = f === current;
          return (
            <li key={f} className="shrink-0">
              <Link
                href={f === "active" ? "/plans" : `/plans?status=${f}`}
                aria-current={on ? "page" : undefined}
                replace
                scroll={false}
                className={cn(
                  "inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-medium whitespace-nowrap outline-none transition-[background-color,color,transform] duration-150 ease-snap focus-visible:shadow-[0_0_0_2px_var(--background),0_0_0_4px_var(--dash-ink)] active:scale-[0.97]",
                  on
                    ? "bg-dash-ink font-semibold text-dash-card"
                    : "bg-dash-well text-dash-ink hover:bg-dash-edge",
                )}
              >
                {on ? <Check aria-hidden className="size-3.5" strokeWidth={2.5} /> : null}
                {FILTER_LABELS[f]}
                <span
                  className={cn(
                    "font-mono text-xs",
                    on ? "text-dash-card/75" : "text-dash-ink-soft",
                  )}
                >
                  {counts[f]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
