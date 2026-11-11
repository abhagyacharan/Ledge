"use client";

import { Archive, ArrowDown, ArrowUp, MoreHorizontal, Pencil, Target, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DashButton } from "@/components/dash/dash-button";
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
import { ListGlyph } from "../list-icons";
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
  doneCount,
  ctx,
}: {
  list: List;
  taskCount: number;
  doneCount: number;
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
      router.push("/tasks");
    }
  }

  async function trash() {
    const result = await run(trashListAction({ id: list.id }));
    if (!result.ok) return;
    router.push("/tasks");
    undoToast(`Moved "${list.name}" to Trash`, () => void run(restoreListAction({ id: list.id })));
  }

  const share = taskCount === 0 ? 0 : doneCount / taskCount;

  return (
    <header className="flex min-w-0 items-start gap-4 rounded-2xl border border-dash-edge bg-dash-card px-4 py-5 shadow-(--dash-card-shadow) text-dash-ink sm:p-5 md:rounded-3xl md:p-6">
      <span
        aria-hidden
        className="grid size-12 shrink-0 place-items-center rounded-2xl bg-dash-well"
      >
        <ListGlyph icon={list.icon} className="size-6 text-dash-ink" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-2xl leading-tight font-semibold tracking-tight break-words">
          {list.name}
        </h2>
        {list.description ? (
          <p className="mt-1 text-sm text-pretty text-dash-ink-soft">{list.description}</p>
        ) : null}
        {list.targetDate ? (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-dash-ink-soft">
            <Target className="size-4" aria-hidden />
            {goalText(list.targetDate, ctx)}
          </p>
        ) : null}
        {taskCount > 0 ? (
          <div className="mt-3 flex items-center gap-3">
            <div
              aria-hidden
              className="h-1.5 max-w-64 flex-1 overflow-hidden rounded-full bg-dash-well"
            >
              <div
                className="h-full origin-left rounded-full bg-dash-ink transition-transform duration-500 ease-snap"
                style={{ transform: `scaleX(${share})` }}
              />
            </div>
            <span className="figures shrink-0 text-xs text-dash-ink-soft">
              {doneCount}/{taskCount} done
            </span>
          </div>
        ) : null}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <DashButton variant="ghost" size="icon" aria-label={`Options for ${list.name}`}>
            <MoreHorizontal />
          </DashButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
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
