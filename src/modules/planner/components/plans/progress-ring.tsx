import { cn } from "@/lib/utils";

/**
 * A progress ring (docs/plans designs 8a, 8b): a conic gradient with the percent in the middle.
 * Only the most recently touched plan's ring is orange; the others are ink (`accent` false).
 * The percent is also in the accessible name, so the colour never carries it alone.
 */
export function ProgressRing({
  percent,
  accent = false,
  size = "md",
  className,
}: {
  percent: number;
  accent?: boolean;
  size?: "md" | "lg";
  className?: string;
}) {
  const fill = accent ? "var(--dash-accent)" : "var(--dash-ink)";
  return (
    <span
      role="img"
      aria-label={`${percent}% done`}
      style={{
        background: `conic-gradient(${fill} 0 ${percent}%, var(--dash-track) 0)`,
      }}
      className={cn(
        "grid shrink-0 place-items-center rounded-full",
        size === "lg" ? "size-16" : "size-[52px] md:size-16",
        className,
      )}
    >
      <span
        className={cn(
          "grid place-items-center rounded-full bg-dash-card font-mono text-[11px] font-semibold text-dash-ink md:text-xs",
          size === "lg" ? "size-[52px]" : "size-[42px] md:size-[52px]",
        )}
      >
        {percent}%
      </span>
    </span>
  );
}
