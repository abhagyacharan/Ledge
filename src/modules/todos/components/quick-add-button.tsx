"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const QUICK_ADD_EVENT = "ledge:quick-add";

/** What the quick-add form starts with when it is opened from somewhere that already knows something. */
export type QuickAddPrefill = {
  title?: string;
  listId?: string;
  sectionId?: string | null;
  dueDate?: string | null;
  tagIds?: string[];
};

/** Opens the global quick-add dialog. Used as the action in empty states. */
export function QuickAddButton({ label = "Add a task" }: { label?: string }) {
  return (
    <Button
      type="button"
      className="h-11 gap-1 md:h-8"
      onClick={() => window.dispatchEvent(new Event(QUICK_ADD_EVENT))}
    >
      <Plus /> {label}
    </Button>
  );
}
