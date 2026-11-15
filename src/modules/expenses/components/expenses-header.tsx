"use client";

import { ChevronLeft, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { SearchButton } from "@/components/shell/search-button";
import { modules } from "@/config/modules";
import { cn } from "@/lib/utils";
import type { EntryKind } from "@/server/db/schema";
import { KIND_LABELS, KIND_ROUTES } from "../categories";
import type { Period } from "../periods";
import { PeriodPicker } from "./expenses-nav";
import { useLogTransaction } from "./transaction-launcher";

/** Which kind the Log button opens on each area (Summary opens an expense). */
const KIND_BY_ROUTE: Record<string, EntryKind> = Object.fromEntries(
  Object.entries(KIND_ROUTES).map(([kind, route]) => [route, kind as EntryKind]),
);

/** Keeps only the period in the query string (filters belong to one area). */
function periodQuery(search: URLSearchParams): string {
  const keep = new URLSearchParams();
  for (const key of ["y", "m"]) {
    const value = search.get(key);
    if (value) keep.set(key, value);
  }
  const text = keep.toString();
  return text ? `?${text}` : "";
}

const title =
  "font-display text-[32px] leading-[1.1] font-semibold tracking-[-0.015em] md:text-[40px] md:tracking-[-0.02em]";

/**
 * The top of every Expense Tracker page (docs/new_design.md screens 3a, 3b, 3f). Summary: the
 * module title, the period with arrows, and the five areas as chips (phones; the sidebar lists
 * them with a mouse). An entry area: "‹ Summary" with the period as a compact pill on phones, then
 * the area's name. With a mouse the period sits on the right with a Log button.
 */
export function ExpensesHeader({ fallback }: { fallback: Period }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const query = periodQuery(new URLSearchParams(search.toString()));
  const expenses = modules.find((m) => m.id === "expenses");
  const nav = expenses?.nav ?? [];
  const summary = pathname === "/expenses";
  const area = nav.find((item) => item.route === pathname);
  const { open } = useLogTransaction();
  const kind = KIND_BY_ROUTE[pathname] ?? "expense";
  // Narrowed to one day from the Journal (screen 3e): the way back is that Journal page.
  const day = search.get("day");
  const fromJournal = day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
  const back = fromJournal
    ? {
        href: `/journal?d=${fromJournal}`,
        label: `Journal, ${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${fromJournal}T00:00:00Z`))}`,
      }
    : { href: `/expenses${query}`, label: "Summary" };

  const logButton = (
    <button
      type="button"
      onClick={() => open(kind)}
      className="hidden h-10 items-center gap-1.5 rounded-full bg-dash-ink px-4 text-sm font-semibold text-dash-card outline-none transition-[transform,background-color] duration-150 ease-snap hover:bg-dash-ink/85 focus-visible:shadow-[0_0_0_2px_var(--background),0_0_0_4px_var(--dash-ink)] active:scale-[0.97] md:inline-flex"
    >
      <Plus aria-hidden className="size-4" strokeWidth={2.25} />
      {summary ? "Log" : `Add ${KIND_LABELS[kind].singular}`}
    </button>
  );

  if (summary) {
    return (
      <header className="mb-5 flex flex-col gap-4 md:mb-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between gap-3">
          <h1 className={title}>
            <span className="md:hidden">{expenses?.label ?? "Expense Tracker"}</span>
            <span className="hidden md:inline">Summary</span>
          </h1>
          <span className="md:hidden">
            <SearchButton />
          </span>
        </div>
        <div className="flex items-center gap-2">
          <PeriodPicker fallback={fallback} />
          {logButton}
        </div>
        <nav aria-label="Expense areas" className="-mx-4 md:hidden">
          <ul className="flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {nav.map((item) => {
              const current = item.route === pathname;
              return (
                <li key={item.route} className="shrink-0">
                  <Link
                    href={`${item.route}${query}`}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "inline-flex h-11 items-center rounded-full px-4 text-[14px] font-medium whitespace-nowrap outline-none transition-colors duration-150 focus-visible:shadow-[0_0_0_2px_var(--background),0_0_0_4px_var(--dash-ink)]",
                      current
                        ? "bg-dash-ink font-semibold text-dash-card"
                        : "border border-dash-edge bg-dash-card text-dash-ink",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>
    );
  }

  return (
    <header className="mb-4 flex flex-col md:mb-6">
      <div className="flex items-center justify-between gap-3 md:hidden">
        <Link
          href={back.href}
          className="-ml-2 inline-flex h-11 items-center gap-1 rounded-full pr-3 pl-1.5 text-[13px] font-medium text-dash-ink-soft outline-none hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ChevronLeft aria-hidden className="size-4" />
          {back.label}
        </Link>
        <PeriodPicker fallback={fallback} compact />
      </div>
      <div className="mt-1 flex items-center justify-between gap-3 md:mt-0">
        <h1 className={title}>{area?.label ?? expenses?.label ?? "Expense Tracker"}</h1>
        <div className="hidden items-center gap-2 md:flex">
          <PeriodPicker fallback={fallback} compact />
          {logButton}
        </div>
      </div>
    </header>
  );
}
