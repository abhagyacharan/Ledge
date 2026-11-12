import { Search } from "lucide-react";
import Link from "next/link";

/**
 * The round Search button at the top right of the Tasks and Expense Tracker headers. Tablet and
 * desktop only: on phones Search is a tab in the bottom bar, within reach of the thumb.
 */
export function SearchButton() {
  return (
    <Link
      href="/search"
      aria-label="Search tasks and expenses"
      className="hidden size-11 shrink-0 md:grid place-items-center rounded-full bg-dash-track text-dash-ink shadow-[inset_0_0_0_1px_var(--dash-track-edge)] outline-none transition-colors duration-150 hover:bg-dash-raised focus-visible:ring-3 focus-visible:ring-ring/50 md:size-10"
    >
      <Search aria-hidden className="size-4" />
    </Link>
  );
}
