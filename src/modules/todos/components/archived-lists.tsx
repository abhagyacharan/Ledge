"use client";

import { Button } from "@/components/ui/button";
import type { List } from "@/server/db/schema";
import { archiveListAction } from "../actions/lists";
import { run } from "./run-action";
import { ListGlyph } from "../list-icons";

/** Lists that were archived, with a button to bring each back. */
export function ArchivedLists({ lists }: { lists: List[] }) {
  if (lists.length === 0) {
    return <p className="text-sm text-muted-foreground">No archived lists.</p>;
  }
  return (
    <ul className="divide-y">
      {lists.map((list) => (
        <li key={list.id} className="flex items-center justify-between gap-2 py-2">
          <span className="min-w-0 truncate">
            <ListGlyph icon={list.icon} className="mr-1.5 inline size-4 align-[-2px]" />
            {list.name}
          </span>
          <Button
            type="button"
            variant="outline"
            className="h-11 md:h-8"
            onClick={() =>
              void run(archiveListAction({ id: list.id, archived: false }), {
                success: `Restored "${list.name}"`,
              })
            }
          >
            Unarchive
          </Button>
        </li>
      ))}
    </ul>
  );
}
