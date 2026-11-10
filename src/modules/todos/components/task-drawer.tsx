"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { List, Section, Tag } from "@/server/db/schema";
import type { TaskRow } from "@/server/data/tasks";
import {
  moveTaskAction,
  restoreTaskAction,
  setTaskTagsAction,
  trashTaskAction,
  updateTaskAction,
} from "../actions/tasks";
import { DueDateField } from "./due-date-field";
import { InlineAdd } from "./inline-add";
import { run } from "./run-action";
import { TagField } from "./tag-field";
import { TaskCheckbox } from "./task-row";
import { PRIORITY_LABELS, type DateContext } from "./types";

export type TaskDetailData = {
  task: TaskRow;
  subtasks: TaskRow[];
  /** Title of the parent when this task is a subtask. */
  parentTitle: string | null;
  /** Sections of the list this task is in. */
  sections: Section[];
};

type Props = {
  detail: TaskDetailData | null;
  lists: List[];
  tags: Tag[];
  ctx: DateContext;
};

/**
 * Task detail drawer: right side on desktop, full screen on a phone. Every field saves on its
 * own (text on blur, pickers immediately); there is no Save button. The open task is in the URL
 * as `?task=<id>`, so reload and the back button work (CLAUDE.md §6.2).
 */
export function TaskDrawer({ detail, lists, tags, ctx }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function close() {
    router.replace(pathname, { scroll: false });
  }

  return (
    <Sheet open={detail !== null} onOpenChange={(open) => !open && close()}>
      <SheetContent
        side="right"
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
        aria-describedby={undefined}
      >
        <SheetHeader>
          <SheetTitle className="sr-only">Task details</SheetTitle>
          <SheetDescription className="sr-only">
            Edit this task. Changes are saved automatically.
          </SheetDescription>
        </SheetHeader>
        {detail ? (
          <DrawerBody
            key={detail.task.id}
            detail={detail}
            lists={lists}
            tags={tags}
            ctx={ctx}
            close={close}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

type SaveState = "idle" | "saving" | "saved" | "error";

function DrawerBody({
  detail,
  lists,
  tags,
  ctx,
  close,
}: {
  detail: TaskDetailData;
} & Omit<Props, "detail"> & { close: () => void }) {
  const { task, subtasks, parentTitle, sections } = detail;
  const isSubtask = task.parentId !== null;
  const done = task.status === "done";

  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  async function save(patch: Record<string, unknown>) {
    setSaveState("saving");
    const result = await run(updateTaskAction({ id: task.id, ...patch }));
    setSaveState(result.ok ? "saved" : "error");
    return result.ok;
  }

  async function saveTitle() {
    const next = title.trim();
    if (!next) {
      setTitle(task.title);
      setTitleError("A task needs a title.");
      return;
    }
    setTitleError(null);
    if (next !== task.title) await save({ title: next });
    setTitle(next);
  }

  async function saveNotes() {
    const next = notes.trim();
    if (next !== (task.notes ?? "")) await save({ notes: next });
  }

  async function trash() {
    const result = await run(trashTaskAction({ id: task.id }));
    if (!result.ok) return;
    close();
    toast("Task moved to Trash", {
      duration: 8000,
      action: { label: "Undo", onClick: () => void run(restoreTaskAction({ id: task.id })) },
    });
  }

  async function moveTo(listId: string) {
    if (listId === task.listId) return;
    const target = lists.find((l) => l.id === listId);
    const result = await run(moveTaskAction({ id: task.id, listId }));
    if (result.ok) toast.success(`Moved to ${target?.name ?? "list"}`);
  }

  const subtasksDone = subtasks.filter((s) => s.status === "done").length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-6">
      {isSubtask && parentTitle ? (
        <p className="text-sm text-muted-foreground">
          Subtask of{" "}
          <Link
            href={`?task=${task.parentId}`}
            scroll={false}
            className="underline underline-offset-4"
          >
            {parentTitle}
          </Link>
        </p>
      ) : null}

      <div className="flex items-start gap-1">
        <TaskCheckbox taskId={task.id} title={task.title} done={done} />
        <div className="flex-1">
          <Label htmlFor="task-title" className="sr-only">
            Title
          </Label>
          <Input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => void saveTitle()}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            maxLength={500}
            aria-invalid={titleError ? true : undefined}
            aria-describedby={titleError ? "task-title-error" : undefined}
            className="h-11 text-base font-medium md:h-9"
          />
          {titleError ? (
            <p id="task-title-error" role="alert" className="mt-1 text-sm text-destructive">
              {titleError}
            </p>
          ) : null}
        </div>
      </div>

      <p className="-mt-3 text-xs text-muted-foreground" role="status" aria-live="polite">
        {saveState === "saving"
          ? "Saving…"
          : saveState === "saved"
            ? "Saved"
            : saveState === "error"
              ? "Not saved"
              : "Changes save automatically"}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label>Due</Label>
          <DueDateField
            value={{ dueDate: task.dueDate, dueTime: task.dueTime }}
            ctx={ctx}
            onChange={(due) => void save(due)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="task-priority">Priority</Label>
          <Select
            value={String(task.priority)}
            onValueChange={(v) => void save({ priority: Number(v) })}
          >
            <SelectTrigger id="task-priority" className="h-11 w-full md:h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_LABELS.map((label, i) => (
                <SelectItem key={label} value={String(i)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isSubtask ? null : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="task-list">List</Label>
            <Select value={task.listId} onValueChange={(v) => void moveTo(v)}>
              <SelectTrigger id="task-list" className="h-11 w-full md:h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {lists.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.icon ? `${l.icon} ` : ""}
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {isSubtask || sections.length === 0 ? null : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="task-section">Section</Label>
            <Select
              value={task.sectionId ?? "none"}
              onValueChange={(v) => void save({ sectionId: v === "none" ? null : v })}
            >
              <SelectTrigger id="task-section" className="h-11 w-full md:h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No section</SelectItem>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Tags</Label>
        <TagField
          allTags={tags}
          selectedIds={task.tagIds}
          onChange={(ids) => void run(setTaskTagsAction({ id: task.id, tagIds: ids }))}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="task-notes">Notes</Label>
        <Textarea
          id="task-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => void saveNotes()}
          rows={5}
          maxLength={10000}
          placeholder="Plain text. Add details, links, or steps."
        />
      </div>

      {isSubtask ? null : (
        <section aria-labelledby="subtasks-heading" className="flex flex-col gap-1">
          <h2 id="subtasks-heading" className="text-sm font-medium">
            Subtasks{" "}
            {subtasks.length > 0 ? (
              <span className="font-normal text-muted-foreground">
                {subtasksDone}/{subtasks.length} done
              </span>
            ) : null}
          </h2>
          <ul>
            {subtasks.map((s) => (
              <li key={s.id} className="flex items-center gap-1 border-b last:border-b-0">
                <TaskCheckbox taskId={s.id} title={s.title} done={s.status === "done"} size="sm" />
                <Link
                  href={`?task=${s.id}`}
                  scroll={false}
                  className={`min-w-0 flex-1 break-words py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${s.status === "done" ? "text-muted-foreground line-through" : ""}`}
                >
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
          <InlineAdd listId={task.listId} parentId={task.id} label="Add a subtask" />
        </section>
      )}

      <div className="mt-2 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          className="h-11 gap-2 text-destructive md:h-8"
          onClick={() => void trash()}
        >
          <Trash2 /> Move to Trash
        </Button>
      </div>
    </div>
  );
}
