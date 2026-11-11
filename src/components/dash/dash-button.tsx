import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Pill buttons of the dashboard look (docs/design.md §4): black primary, white secondary, a quiet
 * ghost and a red danger. Every one presses down a little (scale 0.97) so a tap feels heard.
 * Heights are 44px on phones and a tighter 36px with a mouse. Must sit inside `.dash`.
 */
export const dashButton = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full text-sm font-medium whitespace-nowrap outline-none transition-[transform,background-color,color,opacity] duration-150 ease-snap focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-dash-ink text-dash-card hover:bg-dash-ink/85",
        secondary: "border border-dash-edge bg-dash-card text-dash-ink hover:bg-dash-well",
        well: "bg-dash-well text-dash-ink hover:bg-dash-edge",
        ghost: "text-dash-ink-soft hover:bg-dash-well hover:text-dash-ink",
        danger: "text-dash-bad hover:bg-dash-bad-bg",
      },
      size: {
        md: "h-11 px-4 md:h-9",
        sm: "h-11 px-3 text-[13px] md:h-8",
        icon: "size-11 md:size-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function DashButton({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ComponentProps<"button"> & VariantProps<typeof dashButton>) {
  return <button type={type} className={cn(dashButton({ variant, size }), className)} {...props} />;
}
