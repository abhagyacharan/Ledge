"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { SearchButton } from "@/components/shell/search-button";
import { isCurrent, modules } from "@/config/modules";
import { cn } from "@/lib/utils";
import { QUICK_ADD_EVENT } from "./quick-add-button";

/**
 * The top of the Tasks overview (docs/new_design.md screen 2a): the title with Search, then the
 * views as chips that double as sub-navigation ("Today 3" carries today's count). The other views
 * have their own title with a "‹ Tasks" link back here on phones; with a mouse the sidebar lists
 * them.
 */
export function TasksHeader({ todayCount, eyebrow }: { todayCount: number; eyebrow: string }) {
  const pathname = usePathname();
  const tasks = modules.find((m) => m.id === "todos");
  const home = tasks?.route ?? "/tasks";
  const scroller = useRef<HTMLUListElement>(null);
  const active = useRef<HTMLAnchorElement>(null);

  // Keep the current chip in view when the row has to scroll on a narrow phone.
  useEffect(() => {
    const bar = scroller.current;
    const chip = active.current;
    if (!bar || !chip || bar.scrollWidth <= bar.clientWidth) return;
    bar.scrollLeft = chip.offsetLeft - 16;
  }, [pathname]);

  return (
    <header className="mb-5 flex flex-col gap-4 md:mb-6">
      <div className="flex items-center justify-between gap-3 md:items-end">
        <div>
          <p className="hidden font-mono text-xs font-medium text-dash-ink-soft md:block">
            {eyebrow}
          </p>
          <h1 className="font-display text-[32px] leading-[1.1] font-semibold tracking-[-0.015em] md:mt-1 md:text-[40px] md:tracking-[-0.02em]">
            <span className="md:hidden">Tasks</span>
            <span className="hidden md:inline">Overview</span>
          </h1>
        </div>
        <span className="md:hidden">
          <SearchButton />
        </span>
        {/* With a mouse: a field that opens quick add, with its shortcut (screen 6a). */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(QUICK_ADD_EVENT))}
          aria-keyshortcuts="q"
          className="hidden h-11 w-full max-w-sm items-center gap-2 rounded-full border border-dash-edge bg-dash-card px-4 text-left text-[13px] text-dash-ink-soft shadow-(--dash-card-shadow) outline-none transition-colors duration-150 hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50 md:flex"
        >
          <Plus aria-hidden className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            Add a task, e.g. &ldquo;pay rent tomorrow 5pm #home p1&rdquo;
          </span>
          <kbd className="rounded-[5px] bg-dash-well px-1.5 py-0.5 font-mono text-[11px] font-medium text-dash-ink-soft">
            Q
          </kbd>
        </button>
      </div>
      <nav aria-label="Task views" className="-mx-4 md:hidden">
        <ul
          ref={scroller}
          className="flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {(tasks?.nav ?? []).map((item) => {
            const current = isCurrent(item.route, pathname, home);
            const count = item.route === "/today" && todayCount > 0 ? todayCount : null;
            return (
              <li key={item.route} className="shrink-0">
                <Link
                  ref={current ? active : undefined}
                  href={item.route}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium whitespace-nowrap outline-none transition-[background-color,color,transform] duration-150 ease-snap focus-visible:shadow-[0_0_0_2px_var(--background),0_0_0_4px_var(--dash-ink)] active:scale-[0.97] md:h-10",
                    current
                      ? "bg-dash-ink font-semibold text-dash-card"
                      : "border border-dash-edge bg-dash-card text-dash-ink hover:bg-dash-well",
                  )}
                >
                  {item.label}
                  {count !== null ? (
                    <span
                      className={cn(
                        "font-mono text-xs",
                        current ? "text-dash-card/80" : "text-dash-ink-soft",
                      )}
                    >
                      {count}
                      <span className="sr-only"> due</span>
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
