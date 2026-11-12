"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The page area. The Expense Tracker gets the wide canvas. Every other page, including every Tasks
 * tab, is one centred column of the same width, so the Tasks header and tab bar never shift when
 * you switch tabs (O, 2026-11-12). Phones leave room at the bottom for the tab bar and + button.
 */
export function AppMain({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const wide = pathname.startsWith("/expenses");
  return (
    <main
      className={cn(
        "mx-auto w-full flex-1 px-4 pt-6 pb-32 md:px-8 md:pt-10 md:pb-16",
        wide ? "max-w-6xl" : "max-w-4xl",
      )}
    >
      {children}
    </main>
  );
}
