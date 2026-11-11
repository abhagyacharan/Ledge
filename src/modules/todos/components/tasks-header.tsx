"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PillTabs } from "@/components/dash/pill-tabs";
import { isCurrent, modules } from "@/config/modules";

/**
 * The top of every Tasks page (docs/design.md §5f): the title with Search beside it, then the
 * views as pill tabs. Lists live in the sidebar (the More sheet on a phone) and on the Overview.
 */
export function TasksHeader() {
  const pathname = usePathname();
  const tasks = modules.find((m) => m.id === "todos");
  const home = tasks?.route ?? "/tasks";

  return (
    <header className="mb-6 flex flex-col gap-4 md:mb-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Tasks</h1>
        <Link
          href="/search"
          aria-label="Search tasks and expenses"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-dash-track text-dash-ink shadow-[inset_0_0_0_1px_var(--dash-track-edge)] outline-none transition-colors duration-150 hover:bg-dash-raised focus-visible:ring-3 focus-visible:ring-ring/50 md:size-10"
        >
          <Search aria-hidden className="size-4" />
        </Link>
      </div>
      <PillTabs
        label="Task views"
        id="tasks-tab"
        tabs={(tasks?.nav ?? []).map((item) => ({
          label: item.label,
          icon: item.icon,
          href: item.route,
          current: isCurrent(item.route, pathname, home),
        }))}
      />
    </header>
  );
}
