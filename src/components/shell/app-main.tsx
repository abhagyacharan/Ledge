"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The page area. Dashboards (the Expense Tracker and the Tasks overview) get a wide canvas; lists of
 * tasks read best a little narrower. Phones leave room at the bottom for the tab bar and the + button.
 */
export function AppMain({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const wide = pathname.startsWith("/expenses") || pathname === "/tasks";
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
