import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A designed empty state (CLAUDE.md §8): a quiet icon, one sentence, a hint, and optionally one
 * action. Sits inside a card, so it has no box of its own.
 */
export function EmptyState({
  title,
  hint,
  action,
  icon: Icon,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      {Icon ? (
        <span
          aria-hidden
          className="mb-4 grid size-12 place-items-center rounded-full bg-dash-well text-dash-ink-soft"
        >
          <Icon className="size-5" strokeWidth={1.75} />
        </span>
      ) : null}
      <p className="font-medium text-balance">{title}</p>
      {hint ? <p className="mt-1 max-w-sm text-sm text-pretty text-dash-ink-soft">{hint}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
