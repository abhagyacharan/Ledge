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
        // Phones: clear of the notch and rounded corners (viewport-fit=cover), and room at the
        // bottom for the floating tab bar and the + button above it.
        "mx-auto w-full flex-1 px-[max(1rem,env(safe-area-inset-left,0px),env(safe-area-inset-right,0px))] pt-[calc(1.5rem+env(safe-area-inset-top,0px))] pb-[calc(var(--tabbar-gap)+8.5rem)] md:px-8 md:pt-10 md:pb-16",
        wide ? "max-w-6xl" : "max-w-4xl",
      )}
    >
      {children}
    </main>
  );
}
