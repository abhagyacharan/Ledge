"use client";

import { Archive, ArrowDown, ArrowUp, MoreHorizontal, Pencil, Target, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { daysBetween, formatDueDate } from "@/lib/dates";
import type { List } from "@/server/db/schema";
import {
  archiveListAction,
  moveListAction,
  restoreListAction,
  trashListAction,
} from "../actions/lists";
import { ConfirmDialog } from "./confirm-dialog";
import { ListFormDialog } from "./list-form-dialog";
import { run, undoToast } from "./run-action";
import type { DateContext } from "./types";

function goalText(targetDate: string, ctx: DateContext): string {
  const days = daysBetween(ctx.today, targetDate);
  const when = formatDueDate(targetDate, ctx.today, ctx.locale);
  if (days < 0) return `Goal date passed (${when})`;
  if (days === 0) return "Goal date is today";
  return `Goal: by ${when} (${days} ${days === 1 ? "day" : "days"} left)`;
}

export function ListHeader({
  list,
  taskCount,
  ctx,
}: {
  list: List;
  taskCount: number;
  ctx: DateContext;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function move(direction: "up" | "down") {
    await run(moveListAction({ id: list.id, direction }));
  }

  async function archive() {
    const result = await run(archiveListAction({ id: list.id, archived: true }));
    if (result.ok) {
      toast.success(`Archived "${list.name}". Find it in Settings.`);
      router.push("/inbox");
    }
  }

  async function trash() {
    const result = await run(trashListAction({ id: list.id }));
    if (!result.ok) return;
    router.push("/inbox");
    undoToast(`Moved "${list.name}" to Trash`, () => void run(restoreListAction({ id: list.id })));
  }

  return (
    <header className="mb-4 flex items-start justify-between gap-2">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          {list.icon ? <span aria-hidden>{list.icon}</span> : null}
          <span className="break-words">{list.name}</span>
        </h1>
        {list.description ? (
          <p className="mt-1 text-sm text-muted-foreground">{list.description}</p>
        ) : null}
        {list.targetDate ? (
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <Target className="size-4" aria-hidden />
            {goalText(list.targetDate, ctx)}
          </p>
        ) : null}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-11 shrink-0 md:size-8"
            aria-label={`Options for ${list.name}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <Pencil /> Edit details
          </DropdownMenuItem>
          {list.isInbox ? null : (
            <>
              <DropdownMenuItem onSelect={() => void move("up")}>
                <ArrowUp /> Move up
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void move("down")}>
                <ArrowDown /> Move down
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void archive()}>
                <Archive /> Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmingDelete(true)}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ListFormDialog open={editing} onOpenChange={setEditing} list={list} />
      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={`Delete "${list.name}"?`}
        description={
          taskCount > 0
            ? `This list and its ${taskCount} ${taskCount === 1 ? "task" : "tasks"} will move to Trash. You can undo this right after.`
            : "This list will move to Trash. You can undo this right after."
        }
        confirmLabel="Move to Trash"
        onConfirm={() => void trash()}
      />
    </header>
  );
}
