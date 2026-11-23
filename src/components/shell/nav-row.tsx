"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * One row of the app's navigation (sidebar and the phone "More" sheet). The current page is a
 * raised white pill, the same mark the pill tabs use, so "where am I" reads the same everywhere.
 * 44px tall on phones, 36px with a mouse.
 */
export function NavRow({
  href,
  label,
  icon: Icon,
  current,
  strong = false,
  trailing,
  badge,
  onNavigate,
  onPress,
}: {
  /** Ignored when `onPress` is given: the row is then a button, not a link. */
  href: string;
  label: string;
  icon?: LucideIcon;
  current: boolean;
  /** A module's own row: slightly bolder. */
  strong?: boolean;
  trailing?: ReactNode;
  /** A small tag right after the label, such as "Beta". */
  badge?: string;
  onNavigate?: () => void;
  /** Makes the row a button that runs this instead of going to a page (Search opens the palette). */
  onPress?: () => void;
}) {
  const className = cn(
    "group/nav flex h-11 w-full min-w-0 items-center gap-2.5 rounded-xl px-2.5 text-left text-sm outline-none transition-[background-color,color,box-shadow] duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9",
    current
      ? "bg-card font-medium text-foreground shadow-(--dash-lift)"
      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
    strong && !current && "text-foreground",
    strong && "font-medium",
  );
  const body = (
    <>
      {Icon ? (
        <Icon
          aria-hidden
          // The current page's icon is orange: a quiet "you are here" beside the raised row.
          className={cn("size-4 shrink-0", current && "text-dash-accent")}
          strokeWidth={1.85}
        />
      ) : null}
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="truncate">{label}</span>
        {badge ? <BetaTag label={badge} /> : null}
      </span>
      {trailing}
    </>
  );
  if (onPress) {
    return (
      <button type="button" onClick={onPress} className={className}>
        {body}
      </button>
    );
  }
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      onClick={onNavigate}
      className={className}
    >
      {body}
    </Link>
  );
}

/** A quiet pill for a module that is still being shaped. */
export function BetaTag({ label = "Beta", className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full bg-dash-accent/15 px-1.5 py-px font-mono text-[10px] leading-4 font-medium tracking-wide text-dash-accent uppercase",
        className,
      )}
    >
      {label}
    </span>
  );
}
