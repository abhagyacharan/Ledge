"use client";

import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NavRow } from "@/components/shell/nav-row";
import { ListFormDialog } from "./list-form-dialog";
import { listIcon } from "../list-icons";
import { useTodos } from "./todos-provider";

/** The sidebar block under Tasks: your lists, General first, and a button for a new one. */
export function TodoSidebarSection() {
  return <ListsNav />;
}

export function ListsNav({ onNavigate }: { onNavigate?: () => void }) {
  const { lists } = useTodos();
  const pathname = usePathname();
  const [creating, setCreating] = useState(false);

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between pr-0.5 pl-2.5">
        <h2 className="text-xs font-medium text-muted-foreground">Lists</h2>
        <button
          type="button"
          aria-label="New list"
          title="New list"
          onClick={() => setCreating(true)}
          className="grid size-11 place-items-center rounded-lg text-muted-foreground outline-none transition-colors duration-150 hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 md:size-7"
        >
          <Plus aria-hidden className="size-4" />
        </button>
      </div>
      <div className="flex flex-col gap-1">
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
      <ListFormDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
