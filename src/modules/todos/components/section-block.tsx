"use client";

import { ArrowDown, ArrowUp, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Section } from "@/server/db/schema";
import { deleteSectionAction, moveSectionAction, renameSectionAction } from "../actions/sections";
import { ConfirmDialog } from "./confirm-dialog";
import { NameDialog } from "./name-dialog";
import { run } from "./run-action";

/** A section heading with its options menu. Tasks and the inline add go in `children`. */
export function SectionBlock({
  section,
  count,
  children,
}: {
  section: Section;
  count: number;
  children: ReactNode;
}) {
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <section aria-labelledby={`section-${section.id}`} className="mt-6">
      <div className="flex items-center justify-between border-b pb-1">
        <h2 id={`section-${section.id}`} className="text-sm font-semibold">
          {section.name} <span className="font-normal text-muted-foreground">{count}</span>
        </h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-11 md:size-8"
              aria-label={`Options for section ${section.name}`}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setRenaming(true)}>
              <Pencil /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => void run(moveSectionAction({ id: section.id, direction: "up" }))}
            >
              <ArrowUp /> Move up
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => void run(moveSectionAction({ id: section.id, direction: "down" }))}
            >
              <ArrowDown /> Move down
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
              <Trash2 /> Delete section
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {children}

      <NameDialog
        open={renaming}
        onOpenChange={setRenaming}
        title="Rename section"
        initial={section.name}
        submitLabel="Save"
        onSubmit={async (name) => (await run(renameSectionAction({ id: section.id, name }))).ok}
      />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete section "${section.name}"?`}
        description="Its tasks are kept and move to the top of the list, with no section."
        confirmLabel="Delete section"
        onConfirm={() => void run(deleteSectionAction({ id: section.id }))}
      />
    </section>
  );
}
