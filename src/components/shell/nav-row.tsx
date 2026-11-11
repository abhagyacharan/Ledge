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
  onNavigate,
}: {
  href: string;
  label: string;
  icon?: LucideIcon;
  current: boolean;
  /** A module's own row: slightly bolder. */
  strong?: boolean;
  trailing?: ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "group/nav flex h-11 min-w-0 items-center gap-2.5 rounded-xl px-2.5 text-sm outline-none transition-[background-color,color,box-shadow] duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9",
        current
          ? "bg-card font-medium text-foreground shadow-(--dash-lift)"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
        strong && !current && "text-foreground",
        strong && "font-medium",
      )}
    >
      {Icon ? <Icon aria-hidden className="size-4 shrink-0" strokeWidth={1.85} /> : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
    </Link>
  );
}
