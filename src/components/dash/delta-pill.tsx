import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * A small pill that says how a number changed: an arrow, a percentage, and muted context. Green
 * or red says whether the change is good (more income is good, more spending is not); the arrow
 * and the words say up or down, so colour is never the only signal (docs/design.md).
 */
export function DeltaPill({
  change,
  goodWhen,
  context = "vs last month",
  locale,
  onAccent = false,
}: {
  /** Percent change, one decimal; null when there is nothing to compare to (shows nothing). */
  change: number | null;
  goodWhen: "up" | "down";
  context?: string;
  locale?: string;
  /** On the orange tile: a translucent white pill instead of a pastel one. */
  onAccent?: boolean;
}) {
  if (change === null) return null;
  const flat = change === 0;
  const up = change > 0;
  const good = flat ? null : up === (goodWhen === "up");
  const Icon = flat ? Minus : up ? ArrowUp : ArrowDown;
  const tone = onAccent
    ? "bg-white/20 text-white"
    : flat
      ? "bg-dash-card text-dash-ink-soft"
      : good
        ? "bg-dash-good-bg text-dash-good"
        : "bg-dash-bad-bg text-dash-bad";
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-medium",
          tone,
        )}
      >
        <Icon className="size-3" aria-hidden />
        {formatPercent(Math.abs(change), locale)}
        <span className="sr-only">
          {flat ? " no change" : up ? " up" : " down"} {context}
        </span>
      </span>
      {/* On a phone the tiles are narrow: the pill alone says it (screen readers still hear the context). */}
      <span
        aria-hidden
        className={cn("hidden sm:inline", onAccent ? "text-white" : "text-dash-ink-soft")}
      >
        {context}
      </span>
    </span>
  );
}
