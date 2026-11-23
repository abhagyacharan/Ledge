"use client";

import { Search } from "lucide-react";
import { OPEN_PALETTE_EVENT } from "@/modules/todos/components/shortcuts";

/**
 * The round Search button at the top right of the Tasks and Expense Tracker headers. Shown on
 * phones too, since the tab bar has no Search tab (docs/new_design.md §3). It opens the same
 * palette as Ctrl K and the sidebar's Search row; Enter there searches everything.
 */
export function SearchButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
      aria-label="Search tasks and expenses"
      className="grid size-11 shrink-0 place-items-center rounded-full bg-dash-track text-dash-ink shadow-[inset_0_0_0_1px_var(--dash-track-edge)] outline-none transition-colors duration-150 hover:bg-dash-raised focus-visible:ring-3 focus-visible:ring-ring/50 md:size-10"
    >
      <Search aria-hidden className="size-4" />
    </button>
  );
}
