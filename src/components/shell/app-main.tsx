"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The page area. Task screens read best in a narrow column; the expense tracker has wide tables
 * and a twelve-month trend, so it gets more room.
 */
export function AppMain({ children }: { children: ReactNode }) {
  const wide = usePathname().startsWith("/expenses");
  return (
    <main
      className={cn(
        "mx-auto w-full flex-1 px-4 py-6 md:px-8 md:py-10",
        wide ? "max-w-6xl" : "max-w-3xl",
      )}
    >
      {children}
    </main>
  );
}
