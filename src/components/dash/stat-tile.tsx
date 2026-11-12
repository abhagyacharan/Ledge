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
 * between rows. Every row has the same height, padding and type; the highlighted one is simply
 * filled orange from edge to edge (the parent card has no padding on phones and clips its
 * corners). Extra lines are hidden there.
 */
export function StatTile({
  label,
  value,
  figure,
  icon: Icon,
  highlight = false,
  variant = "well",
  children,
}: {
  label: string;
  /** The figure as text (decides the size step for long amounts). */
  value: string;
  /** What to draw for the figure, such as a rolling number; defaults to `value`. */
  figure?: ReactNode;
  icon: LucideIcon;
  highlight?: boolean;
  /**
   * "well": a grey tile inside a card (the Expense Tracker summary). "card": a white card of its
   * own on the page canvas, larger and less rounded (the Tasks overview).
   */
  variant?: "well" | "card";
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        // Phone: a row, edge to edge inside its card.
        "relative flex min-h-14 min-w-0 items-center justify-between gap-3 px-4 py-3.5",
        // Wider: a tile.
        "sm:h-full sm:flex-col sm:items-stretch sm:justify-start sm:gap-3",
        variant === "card" ? "sm:rounded-2xl sm:p-5" : "sm:rounded-[20px] sm:p-4",
        highlight
          ? "bg-gradient-to-br from-dash-accent-from to-dash-accent-to text-white"
          : variant === "card"
            ? "border-b border-dash-edge text-dash-ink last:border-b-0 sm:border sm:bg-dash-card sm:shadow-(--dash-card-shadow)"
            : "border-b border-dash-edge text-dash-ink last:border-b-0 sm:border-0 sm:bg-dash-well",
      )}
    >
      <dt
        className={cn(
          "shrink-0 text-sm leading-none sm:pr-11 sm:leading-normal",
          highlight ? "text-white sm:font-medium" : "text-dash-ink-soft",
        )}
      >
        {label}
      </dt>
      <span
        aria-hidden
        className={cn(
          "absolute hidden size-9 place-items-center rounded-full sm:grid",
          variant === "card" ? "top-5 right-5" : "top-4 right-4",
          highlight ? "bg-white/20" : variant === "card" ? "bg-dash-well" : "bg-dash-card",
        )}
      >
        <Icon className="size-4" />
      </span>
      <dd className="flex min-w-0 flex-row-reverse items-center gap-2.5 sm:flex-col sm:items-start sm:gap-2">
        <span
          className={cn(
            "font-display leading-none font-semibold tracking-tight whitespace-nowrap tabular-nums sm:leading-tight",
            // Long amounts (lakhs) step down a size instead of wrapping onto two lines.
            value.length > 11
              ? "text-base sm:text-xl"
              : variant === "card"
                ? "text-[17px] sm:text-4xl"
                : "text-[17px] sm:text-2xl",
          )}
        >
          {figure ?? value}
        </span>
        {children}
      </dd>
    </div>
  );
}
