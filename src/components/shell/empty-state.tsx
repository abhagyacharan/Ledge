import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A designed empty state (CLAUDE.md §8): a quiet icon, one sentence, a hint, and optionally one
 * action. Sits inside a card, so it has no box of its own.
 */
export function EmptyState({
  title,
  hint,
  action,
  icon: Icon,
  compact = false,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  icon?: LucideIcon;
  /** Less height on a phone (the Tasks overview's Today card); wider screens keep the full size. */
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-4 text-center",
        compact ? "py-3 md:py-10" : "py-10",
      )}
    >
      {Icon ? (
        <span
          aria-hidden
          className={cn(
            "grid place-items-center rounded-full bg-dash-well text-dash-ink-soft",
            compact ? "mb-2 size-10 md:mb-4 md:size-12" : "mb-4 size-12",
          )}
        >
          <Icon className="size-5" strokeWidth={1.75} />
        </span>
      ) : null}
      <p className="font-medium text-balance">{title}</p>
      {hint ? <p className="mt-1 max-w-sm text-sm text-pretty text-dash-ink-soft">{hint}</p> : null}
      {action ? (
        <div className={cn("flex justify-center", compact ? "mt-3 md:mt-5" : "mt-5")}>{action}</div>
      ) : null}
    </div>
  );
}
