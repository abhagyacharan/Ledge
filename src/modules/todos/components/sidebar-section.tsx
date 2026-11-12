"use client";

import { ChevronRight, Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NavRow } from "@/components/shell/nav-row";
import { cn } from "@/lib/utils";
import { ListFormDialog } from "./list-form-dialog";
import { listIcon } from "../list-icons";
import { useTodos } from "./todos-provider";

/** The sidebar block under Tasks: your lists, General first, and a button for a new one. */
export function TodoSidebarSection() {
  return <ListsNav />;
}

/**
 * "Lists" is a small section of its own (O, 2026-11-12): its label is a button that shows or hides
 * the lists, like the module headers. The + for a new list shows only while it is open. It starts
 * open, and opens by itself when you arrive on one of your lists.
 */
export function ListsNav({ onNavigate }: { onNavigate?: () => void }) {
  const { lists } = useTodos();
  const pathname = usePathname();
  const [creating, setCreating] = useState(false);
  const onList = pathname.startsWith("/lists/");
  const [open, setOpen] = useState(true);
  const [seenOnList, setSeenOnList] = useState(onList);
  if (onList !== seenOnList) {
    setSeenOnList(onList);
    if (onList) setOpen(true);
  }

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between gap-1 pr-0.5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="nav-lists"
          onClick={() => setOpen((o) => !o)}
          className="flex h-11 min-w-0 flex-1 items-center gap-1.5 rounded-lg pl-2.5 text-left text-xs font-medium text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 md:h-7"
        >
          Lists
          <ChevronRight
            aria-hidden
            className={cn(
              "size-3.5 shrink-0 transition-transform duration-200 ease-snap",
              open && "rotate-90",
            )}
          />
        </button>
        {open ? (
          <button
            type="button"
            aria-label="New list"
            title="New list"
            onClick={() => setCreating(true)}
            className="grid size-11 place-items-center rounded-lg text-muted-foreground outline-none transition-colors duration-150 hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 md:size-7"
          >
            <Plus aria-hidden className="size-4" />
          </button>
        ) : null}
      </div>
      {open ? (
        <div id="nav-lists" className="flex flex-col gap-1">
          {lists.map((list) => {
            const href = `/lists/${list.id}`;
            return (
              <NavRow
                key={list.id}
                href={href}
                label={list.name}
                icon={listIcon(list.icon)}
                current={pathname === href}
                onNavigate={onNavigate}
              />
            );
          })}
        </div>
      ) : null}
      <ListFormDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
