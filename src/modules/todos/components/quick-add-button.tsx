"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const QUICK_ADD_EVENT = "ledge:quick-add";

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
