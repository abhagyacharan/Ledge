"use client";

import { AlertCircle, CalendarDays, Check, Flag, ListChecks } from "lucide-react";
import Link from "next/link";
import { useTransition, type CSSProperties, type ReactNode, type Ref } from "react";
import { formatDue, isOverdue } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { TaskRow as TaskRowData } from "@/server/data/tasks";
import { setTaskDoneAction } from "../actions/tasks";
import { run } from "./run-action";
import { useTaskLinks } from "./use-task-links";
import { PRIORITY_LABELS, type DateContext, type TagsById } from "./types";

const PRIORITY_STYLE = [
  "",
  "text-sky-700 dark:text-sky-400",
  "text-amber-700 dark:text-amber-400",
  "text-red-700 dark:text-red-400",
];

export function TaskCheckbox({
  taskId,
  title,
  done,
  size = "md",
}: {
  taskId: string;
  title: string;
  done: boolean;
  size?: "sm" | "md";
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={`${title}: mark ${done ? "not done" : "done"}`}
      disabled={pending}
      onClick={() =>
        startTransition(
          async () => void (await run(setTaskDoneAction({ id: taskId, done: !done }))),
        )
      }
      className="flex size-11 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60 md:size-8"
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-full border-2 transition-colors duration-150",
          size === "md" ? "size-5" : "size-4",
          done
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/70 hover:border-foreground",
        )}
      >
        {done ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
    </button>
  );
}

export function DueLabel({
  task,
  ctx,
  done,
}: {
  task: Pick<TaskRowData, "dueDate" | "dueTime">;
  ctx: DateContext;
  done: boolean;
}) {
  if (!task.dueDate) return null;
  const overdue = !done && isOverdue(task, ctx.today, ctx.timeNow);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        overdue ? "font-medium text-destructive" : "text-muted-foreground",
      )}
    >
      {overdue ? (
        <AlertCircle className="size-3.5" aria-hidden />
      ) : (
        <CalendarDays className="size-3.5" aria-hidden />
      )}
      {overdue ? <span>Overdue:</span> : null}
      <span>{formatDue(task.dueDate, task.dueTime, ctx.today, ctx.locale)}</span>
    </span>
  );
}

export function TagChip({ name, color }: { name: string; color: string | null }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
      <span
        aria-hidden
        className="size-2 rounded-full bg-muted-foreground/50"
        style={color ? { backgroundColor: color } : undefined}
      />
      {name}
    </span>
  );
}

export type RowContext = {
  listName: string;
  listIcon: string | null;
  /** Set when the row is a subtask shown outside its parent. */
  parentTitle: string | null;
};

export function TaskRow({
  task,
  subtasks,
  tagsById,
  ctx,
  context,
  handle,
  liRef,
  liStyle,
  dragging = false,
}: {
  task: TaskRowData;
  subtasks: TaskRowData[];
  tagsById: TagsById;
  ctx: DateContext;
  /** Where the task lives; shown in views that mix lists (Today, All, ...). */
  context?: RowContext;
  /** Drag handle, shown before the checkbox when the row can be reordered. */
  handle?: ReactNode;
  /** Used by the sortable list to position the row while it is dragged. */
  liRef?: Ref<HTMLLIElement>;
  liStyle?: CSSProperties;
  dragging?: boolean;
}) {
  const done = task.status === "done";
  const subtasksDone = subtasks.filter((s) => s.status === "done").length;
  const tagList = task.tagIds.map((id) => tagsById[id]).filter(Boolean);
  const { hrefFor } = useTaskLinks();

  return (
    <li
      ref={liRef}
      style={liStyle}
      className={cn(
        "group flex items-start gap-1 border-b bg-background py-1 last:border-b-0",
        dragging && "relative z-10 rounded-md border shadow-md",
      )}
    >
      {handle}
      <TaskCheckbox taskId={task.id} title={task.title} done={done} />
      <Link
        href={hrefFor(task.id)}
        scroll={false}
        className="min-w-0 flex-1 rounded-md py-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:py-1"
      >
        <span className={cn("block break-words", done && "text-muted-foreground line-through")}>
          {task.title}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 empty:hidden">
          <DueLabel task={task} ctx={ctx} done={done} />
          {task.priority > 0 ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs",
                PRIORITY_STYLE[task.priority],
              )}
            >
              <Flag className="size-3.5" aria-hidden />
              {PRIORITY_LABELS[task.priority]}
              <span className="sr-only"> priority</span>
            </span>
          ) : null}
          {subtasks.length > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <ListChecks className="size-3.5" aria-hidden />
              <span aria-label={`${subtasksDone} of ${subtasks.length} subtasks done`}>
                {subtasksDone}/{subtasks.length}
              </span>
            </span>
          ) : null}
          {tagList.map((t) => (
            <TagChip key={t.id} name={t.name} color={t.color} />
          ))}
          {context ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              {context.listIcon ? <span aria-hidden>{context.listIcon}</span> : null}
              <span>
                {context.parentTitle ? `Subtask of ${context.parentTitle} in ` : "In "}
                {context.listName}
              </span>
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}
