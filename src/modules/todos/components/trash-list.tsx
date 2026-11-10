"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { restoreListAction } from "../actions/lists";
import { restoreTaskAction } from "../actions/tasks";
import {
  deleteListForeverAction,
  deleteTaskForeverAction,
  emptyTrashAction,
} from "../actions/trash";
import { ConfirmDialog } from "./confirm-dialog";
import { run } from "./run-action";

export type TrashItem = {
  kind: "list" | "task";
  id: string;
  title: string;
  icon: string | null;
  /** "In Home", "Subtask of X in Home" or "List with 4 tasks". */
  detail: string;
  /** Whole days before it is erased for good. */
  daysLeft: number;
};

/** The Trash screen: restore or permanently delete each item, or empty everything. */
export function TrashList({ items }: { items: TrashItem[] }) {
  const [confirming, setConfirming] = useState<TrashItem | "all" | null>(null);

  async function restore(item: TrashItem) {
    const action = item.kind === "list" ? restoreListAction : restoreTaskAction;
    const result = await run(action({ id: item.id }));
    if (result.ok) toast.success(`Restored "${item.title}"`);
  }

  async function deleteForever(item: TrashItem) {
    const action = item.kind === "list" ? deleteListForeverAction : deleteTaskForeverAction;
    await run(action({ id: item.id }), { success: `Deleted "${item.title}" for good` });
  }

  async function emptyAll() {
    const result = await run(emptyTrashAction({}));
    if (result.ok) toast.success("Trash emptied");
  }

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button
          type="button"
          variant="outline"
          className="h-11 gap-1 text-destructive md:h-8"
          onClick={() => setConfirming("all")}
        >
          <Trash2 /> Empty Trash
        </Button>
      </div>

      <ul>
        {items.map((item) => (
          <li
            key={`${item.kind}:${item.id}`}
            className="flex flex-wrap items-center gap-2 border-b py-2 last:border-b-0"
          >
            <div className="min-w-0 flex-1">
              <p className="break-words">
                {item.icon ? <span aria-hidden>{item.icon} </span> : null}
                {item.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.detail}. Erased for good in {item.daysLeft}{" "}
                {item.daysLeft === 1 ? "day" : "days"}.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-11 gap-1 md:h-8"
              aria-label={`Restore ${item.title}`}
              onClick={() => void restore(item)}
            >
              <RotateCcw /> Restore
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 gap-1 text-destructive md:h-8"
              aria-label={`Delete ${item.title} forever`}
              onClick={() => setConfirming(item)}
            >
              <Trash2 /> Delete forever
            </Button>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={
          confirming === "all"
            ? "Empty the Trash?"
            : `Delete "${confirming?.title ?? ""}" for good?`
        }
        description={
          confirming === "all"
            ? "Everything in the Trash is erased permanently. This cannot be undone."
            : "It is erased permanently, along with anything inside it. This cannot be undone."
        }
        confirmLabel={confirming === "all" ? "Empty Trash" : "Delete forever"}
        onConfirm={() => {
          const target = confirming;
          setConfirming(null);
          if (target === "all") void emptyAll();
          else if (target) void deleteForever(target);
        }}
      />
    </>
  );
}
