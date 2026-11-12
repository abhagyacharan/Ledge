"use client";

import { usePathname } from "next/navigation";
import { PillTabs } from "@/components/dash/pill-tabs";
import { SearchButton } from "@/components/shell/search-button";
import { isCurrent, modules } from "@/config/modules";
import { ListsMenu } from "./lists-menu";

/**
 * The top of every Tasks page (docs/design.md §5f): the title with Search beside it (tablet and up)
 * or the Lists menu (phones), then the views as pill tabs. Wider screens keep the lists in the
 * sidebar; the Overview shows them too.
 */
export function TasksHeader() {
  const pathname = usePathname();
  const tasks = modules.find((m) => m.id === "todos");
  const home = tasks?.route ?? "/tasks";

  return (
    <header className="mb-6 flex flex-col gap-4 md:mb-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Tasks</h1>
        <SearchButton />
        <ListsMenu />
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
