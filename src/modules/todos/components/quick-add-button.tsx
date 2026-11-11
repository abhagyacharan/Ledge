"use client";

import { Plus } from "lucide-react";
import { DashButton } from "@/components/dash/dash-button";

export const QUICK_ADD_EVENT = "ledge:quick-add";

/** What the quick-add form starts with when it is opened from somewhere that already knows something. */
export type QuickAddPrefill = {
  title?: string;
  listId?: string;
  dueDate?: string | null;
};

/** Opens the global quick-add form. Used as the action in empty states. */
export function QuickAddButton({ label = "Add a task" }: { label?: string }) {
  return (
    <DashButton
      variant="secondary"
      onClick={() => window.dispatchEvent(new Event(QUICK_ADD_EVENT))}
    >
      <Plus /> {label}
    </DashButton>
  );
}
