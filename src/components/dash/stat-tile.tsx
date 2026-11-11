import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A figure tile (docs/design.md): a grey well with a label, a round icon, a big number and room
 * for a delta pill and extra lines. `highlight` makes it the one orange tile. The parent must be
 * a `<dl>`; the tile is the `<div>` that holds one term and its value.
 *
 * On a phone the tiles read as a statement instead (docs/design.md §5d): each is one row, label
 * on the left and the change pill and figure on the right, all on one centre line, with hairlines
 * between rows. The highlighted tile becomes a slim orange total row. Extra lines are hidden there.
 */
export function StatTile({
  label,
  value,
  figure,
  icon: Icon,
  highlight = false,
  children,
}: {
  label: string;
  /** The figure as text (decides the size step for long amounts). */
  value: string;
  /** What to draw for the figure, such as a rolling number; defaults to `value`. */
  figure?: ReactNode;
  icon: LucideIcon;
  highlight?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        // Phone: a row.
        "relative flex min-w-0 items-center justify-between gap-3 py-3.5",
        // Wider: a tile.
        "sm:h-full sm:flex-col sm:items-stretch sm:justify-start sm:gap-3 sm:rounded-[20px] sm:p-4",
        highlight
          ? "mt-2 rounded-xl bg-gradient-to-br from-dash-accent-from to-dash-accent-to px-3.5 text-white sm:mt-0"
          : "border-b border-dash-edge text-dash-ink sm:border-0 sm:bg-dash-well",
      )}
    >
      <dt
        className={cn(
          "shrink-0 text-sm leading-none sm:pr-11 sm:leading-normal",
          highlight ? "font-medium text-white" : "text-dash-ink-soft",
        )}
      >
        {label}
      </dt>
      <span
        aria-hidden
        className={cn(
          "absolute top-4 right-4 hidden size-9 place-items-center rounded-full sm:grid",
          highlight ? "bg-white/20" : "bg-dash-card",
        )}
      >
        <Icon className="size-4" />
      </span>
      <dd className="flex min-w-0 flex-row-reverse items-center gap-2.5 sm:flex-col sm:items-start sm:gap-2">
        <span
          className={cn(
            "font-display leading-none font-semibold tracking-tight whitespace-nowrap tabular-nums sm:leading-tight",
            // Long amounts (lakhs) step down a size instead of wrapping onto two lines.
            value.length > 11 ? "text-base sm:text-xl" : "text-[17px] sm:text-2xl",
          )}
        >
          {figure ?? value}
        </span>
        {children}
      </dd>
    </div>
  );
}
