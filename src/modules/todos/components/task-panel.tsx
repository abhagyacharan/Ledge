import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The white card every task screen sits in (docs/design.md §5f): an optional title row with a
 * count and an action on the right, then the content. Same card as the Expense Tracker's.
 */
export function TaskPanel({
  id,
  title,
  subtitle,
  action,
  hideTitle = false,
  className,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  hideTitle?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className={cn(
        "min-w-0 rounded-2xl border border-dash-edge bg-dash-card px-4 py-5 shadow-(--dash-card-shadow) text-dash-ink sm:p-5 md:rounded-3xl md:p-6",
        className,
      )}
    >
      <header
        className={cn(
          "mb-3 flex flex-wrap items-start justify-between gap-x-3 gap-y-2",
          hideTitle && "sr-only",
        )}
      >
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="text-base font-semibold">
            {title}
          </h2>
          {subtitle ? <p className="text-[13px] text-dash-ink-soft">{subtitle}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

/**
 * A group inside a panel ("Overdue", "Tomorrow · 12 Nov"): the label on the left, how many on
 * the right, then its rows. `tone="bad"` marks the overdue group (with its word, never colour alone).
 */
export function TaskGroup({
  id,
  label,
  count,
  tone,
  children,
}: {
  id: string;
  label: string;
  count: number;
  tone?: "bad";
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="pt-3 first:pt-0">
      <div className="flex items-baseline justify-between gap-3 pb-1">
        <h3
          id={id}
          className={cn(
            "text-[13px] font-medium",
            tone === "bad" ? "text-dash-bad" : "text-dash-ink-soft",
          )}
        >
          {label}
        </h3>
        <span className="figures text-xs text-dash-ink-soft">{count}</span>
      </div>
      {children}
    </section>
  );
}
