"use client";

import {
  Archive,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
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
import { daysBetween, formatRowDay } from "@/lib/dates";
import type { List } from "@/server/db/schema";
import {
  archiveListAction,
  moveListAction,
  restoreListAction,
  trashListAction,
  trashListKeepTasksAction,
} from "../actions/lists";
import { ConfirmDialog } from "./confirm-dialog";
import { ListFormDialog } from "./list-form-dialog";
import { ListGlyph } from "../list-icons";
import { run, undoToast } from "./run-action";
import type { DateContext } from "./types";

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

  async function trashKeepingTasks() {
    const result = await run(trashListKeepTasksAction({ id: list.id }));
    if (!result.ok) return;
    router.push("/tasks");
    toast.success(`Moved the tasks to ${result.data.moved} and "${list.name}" to Trash`);
  }

  // Only a list that still has tasks asks first (docs/new_design.md §1); an empty one goes
  // straight to Trash with Undo.
  function askToDelete() {
    if (taskCount > 0) setConfirmingDelete(true);
    else void trash();
  }

  const share = taskCount === 0 ? 0 : doneCount / taskCount;
  const left = list.targetDate ? daysBetween(ctx.today, list.targetDate) : null;

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <header className="flex min-w-0 flex-col">
        <Link
          href="/tasks"
          className="-ml-2 inline-flex h-11 w-fit items-center gap-1 rounded-full pr-3 pl-1.5 text-[13px] font-medium text-dash-ink-soft outline-none hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50 md:hidden"
        >
          <ChevronLeft aria-hidden className="size-4" />
          Tasks
        </Link>
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden
            className="grid size-12 shrink-0 place-items-center rounded-full border border-dash-edge bg-dash-card"
          >
            <ListGlyph icon={list.icon} className="size-[22px] text-dash-ink" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[28px] leading-tight font-semibold tracking-[-0.015em] break-words md:text-[32px]">
              {list.name}
            </h1>
            {list.description ? (
              <p className="mt-0.5 text-sm text-pretty text-dash-ink-soft">{list.description}</p>
            ) : null}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <DashButton
                variant="secondary"
                size="icon"
                className="shrink-0"
                aria-label={`Options for ${list.name}`}
              >
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
                  <DropdownMenuItem variant="destructive" onSelect={askToDelete}>
                    <Trash2 /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {taskCount > 0 || list.targetDate ? (
        <section
          aria-label="Progress"
          className="rounded-2xl border border-dash-edge bg-dash-card px-4 py-3.5 shadow-(--dash-card-shadow) md:px-5"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[13px]">
            <span className="font-medium">
              {doneCount} of {taskCount} done
            </span>
            {list.targetDate && left !== null ? (
              <span className="text-dash-ink-soft">
                Target {formatRowDay(list.targetDate, ctx.today, ctx.locale).replace(/^\S+ /, "")} ·{" "}
                {left > 0
                  ? `${left} ${left === 1 ? "day" : "days"} left`
                  : left === 0
                    ? "due today"
                    : `${-left} ${left === -1 ? "day" : "days"} past`}
              </span>
            ) : null}
          </div>
          {/* The list's one highlight: the orange progress bar. */}
          <div aria-hidden className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-dash-track">
            <div
              className="h-full origin-left rounded-full bg-dash-accent transition-transform duration-500 ease-snap"
              style={{ transform: `scaleX(${share})` }}
            />
          </div>
        </section>
      ) : null}

      <ListFormDialog open={editing} onOpenChange={setEditing} list={list} />
      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={`Delete "${list.name}" and its ${taskCount} ${taskCount === 1 ? "task" : "tasks"}?`}
        description="The list and its tasks go to Trash and can be restored for 30 days."
        confirmLabel="Delete list and tasks"
        onConfirm={() => void trash()}
        alternativeLabel="Move tasks to General, then delete"
        onAlternative={() => void trashKeepingTasks()}
      />
    </div>
  );
}
