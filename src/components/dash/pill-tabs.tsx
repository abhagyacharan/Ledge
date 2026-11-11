"use client";

import type { LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type PillTab = { label: string; href: string; icon: LucideIcon; current: boolean };

/**
 * A module's views as one pill bar (docs/design.md §5c), used by the Expense Tracker and Tasks.
 * The current view is a raised pill that slides to the next one. On a phone each tab is a line
 * icon (the name is still read out) and the cells share the full width; wider screens show names.
 */
export function PillTabs({ label, id, tabs }: { label: string; id: string; tabs: PillTab[] }) {
  const reduce = useReducedMotion();
  const scroller = useRef<HTMLElement>(null);
  const active = useRef<HTMLAnchorElement>(null);
  const currentHref = tabs.find((t) => t.current)?.href;

  // Keep the current tab in view if the bar ever has to scroll (long names on a small tablet).
  useEffect(() => {
    const bar = scroller.current;
    const tab = active.current;
    if (!bar || !tab || bar.scrollWidth <= bar.clientWidth) return;
    bar.scrollTo({
      left: tab.offsetLeft - (bar.clientWidth - tab.offsetWidth) / 2,
      behavior: reduce ? "auto" : "smooth",
    });
  }, [currentHref, reduce]);

  return (
    <nav ref={scroller} aria-label={label} className="no-scrollbar overflow-x-auto">
      <ul className="flex w-full gap-1 rounded-full bg-dash-track p-1 shadow-[inset_0_0_0_1px_var(--dash-track-edge)] sm:inline-flex sm:w-auto">
        {tabs.map((tab) => (
          <li key={tab.href} className="flex-1 sm:flex-none">
            <Link
              ref={tab.current ? active : undefined}
              href={tab.href}
              aria-current={tab.current ? "page" : undefined}
              className={cn(
                "relative z-0 flex h-11 items-center justify-center rounded-full px-4 text-sm font-medium whitespace-nowrap outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9",
                tab.current ? "text-dash-ink" : "text-dash-ink-soft hover:text-dash-ink",
              )}
            >
              {tab.current ? (
                <motion.span
                  aria-hidden
                  layoutId={`${id}-pill`}
                  transition={{ type: "spring", duration: 0.35, bounce: 0 }}
                  className="absolute inset-0 -z-10 rounded-full bg-dash-raised shadow-(--dash-lift)"
                />
              ) : null}
              <tab.icon aria-hidden className="size-[18px] sm:hidden" strokeWidth={1.75} />
              <span className="max-sm:sr-only">{tab.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
