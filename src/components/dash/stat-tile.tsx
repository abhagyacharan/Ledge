import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A figure tile (docs/design.md): a grey well with a label, a round icon, a big number and room
 * for a delta pill and extra lines. `highlight` makes it the one orange tile. The parent must be
 * a `<dl>`; the tile is the `<div>` that holds one term and its value. On a phone tiles sit two
 * abreast, so they are tighter and the icon steps aside.
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
        "relative flex h-full min-w-0 flex-col gap-2.5 rounded-[20px] p-3.5 sm:gap-3 sm:p-4",
        highlight
          ? "bg-gradient-to-br from-dash-accent-from to-dash-accent-to text-white"
          : "bg-dash-well text-dash-ink",
      )}
    >
      <dt
        className={cn(
          "text-[13px] sm:pr-11 sm:text-sm",
          highlight ? "text-white" : "text-dash-ink-soft",
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
      <dd className="flex flex-col gap-2">
        <span
          className={cn(
            "font-display font-semibold tracking-tight whitespace-nowrap tabular-nums",
            // Long amounts (lakhs) step down a size instead of wrapping onto two lines.
            value.length > 11 ? "text-base sm:text-xl" : "text-lg sm:text-2xl",
          )}
        >
          {figure ?? value}
        </span>
        {children}
      </dd>
    </div>
  );
}
