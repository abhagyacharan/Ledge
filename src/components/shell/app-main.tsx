"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The page area. The Expense Tracker gets the wide canvas. Every other page, including every Tasks
 * tab, is one centred column of the same width, so the Tasks header and tab bar never shift when
 * you switch tabs (O, 2026-11-12). Phones leave room at the bottom for the tab bar and + button.
 */
export function AppMain({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // The Expense Tracker, the Tasks overview and All tasks use the wide canvas (screens 3f, 6a, 6d).
  const wide = pathname.startsWith("/expenses") || pathname === "/tasks" || pathname === "/all";
  // An open task docks on the right from 1200px (screen 6b): leave it room.
  const taskOpen = useSearchParams().has("task");
  return (
    <main
      className={cn(
        // Phones: clear of the notch and rounded corners (viewport-fit=cover), and room at the
        // bottom for the floating tab bar and the + button beside it.
        "mx-auto w-full flex-1 px-[max(1rem,env(safe-area-inset-left,0px),env(safe-area-inset-right,0px))] pt-[calc(1.5rem+env(safe-area-inset-top,0px))] pb-[calc(var(--tabbar-gap)+6.5rem)] md:px-8 md:pt-10 md:pb-16",
        wide ? "max-w-6xl" : "max-w-4xl",
        taskOpen && "min-[1200px]:mr-[456px] min-[1200px]:max-w-3xl",
      )}
    >
      {children}
    </main>
  );
}
