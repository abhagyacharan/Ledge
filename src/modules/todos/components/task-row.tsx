"use client";

import { AlertCircle, CalendarDays, Check, Flag, ListChecks, Repeat } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useTransition, type CSSProperties, type ReactNode, type Ref } from "react";
import { formatDue, formatDueDate, isOverdue, todayIn } from "@/lib/dates";
import { describeStored } from "@/lib/recurrence";
import { cn } from "@/lib/utils";
import type { TaskRow as TaskRowData } from "@/server/data/tasks";
import { setTaskDoneAction, undoRecurringCompletionAction } from "../actions/tasks";
import { run, undoToast } from "./run-action";
import { useTaskLinks } from "./use-task-links";
import { useTodos } from "./todos-provider";
import { PRIORITY_LABELS, type DateContext, type TagsById } from "./types";

const PRIORITY_STYLE = [
  "",
  "text-primary",
  "text-[oklch(0.46_0.1_75)] dark:text-brass",
  "text-destructive",
];

/**
 * Ticking is optimistic: the checkbox and the row change at once, and go back (with an error
 * message) if the server says no. Completing a task shows an Undo toast for a few seconds.
 */
export function useToggleDone(taskId: string, title: string, serverDone: boolean) {
  const [, startTransition] = useTransition();
  const [done, setDone] = useOptimistic(serverDone);
  const { timeZone, locale } = useTodos();

  function toggle() {
    startTransition(async () => {
      const next = !done;
      setDone(next);
      const result = await run(setTaskDoneAction({ id: taskId, done: next }));
      if (!result.ok || !next) return;
      const repeat = result.data.recurring;
      if (repeat) {
        // A repeating task is not finished for good: it moved to its next date.
        const when = formatDueDate(repeat.nextDueDate, todayIn(timeZone), locale).toLowerCase();
        undoToast(
          `Done "${title}". Next: ${when}`,
          () =>
            void run(
              undoRecurringCompletionAction({
                taskId,
                snapshotId: repeat.snapshotId,
                previousDueDate: repeat.previousDueDate,
                previousDueTime: repeat.previousDueTime,
                reopenedSubtaskIds: repeat.reopenedSubtaskIds,
              }),
            ),
        );
        return;
      }
      undoToast(
        `Completed "${title}"`,
        () => void run(setTaskDoneAction({ id: taskId, done: false })),
      );
    });
  }

  return { done, toggle };
}

export function CheckboxButton({
  title,
  done,
  onToggle,
  size = "md",
}: {
  title: string;
  done: boolean;
  onToggle: () => void;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={`${title}: mark ${done ? "not done" : "done"}`}
      data-task-checkbox
      onClick={onToggle}
      className="flex size-11 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:size-8"
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

/** A checkbox that manages its own optimistic state (used in the drawer and its subtask list). */
export function TaskCheckbox({
  taskId,
  title,
  done: serverDone,
  size = "md",
}: {
  taskId: string;
  title: string;
  done: boolean;
  size?: "sm" | "md";
}) {
  const { done, toggle } = useToggleDone(taskId, title, serverDone);
  return <CheckboxButton title={title} done={done} onToggle={toggle} size={size} />;
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
  const { done, toggle } = useToggleDone(task.id, task.title, task.status === "done");
  const subtasksDone = subtasks.filter((s) => s.status === "done").length;
  const tagList = task.tagIds.map((id) => tagsById[id]).filter(Boolean);
  const { hrefFor } = useTaskLinks();
  const repeatText = describeStored(task.recurrenceRule, task.recurrenceMode);

  return (
    <li
      ref={liRef}
      data-task-row
      data-task-id={task.id}
      style={liStyle}
      className={cn(
        "group flex items-start gap-1 border-b bg-background py-1 last:border-b-0",
        dragging && "relative z-10 rounded-md border shadow-md",
      )}
    >
      {handle}
      <CheckboxButton title={task.title} done={done} onToggle={toggle} />
      <Link
        href={hrefFor(task.id)}
        data-task-link
        scroll={false}
        className="flex min-h-11 min-w-0 flex-1 flex-col justify-center rounded-md py-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-0"
      >
        <span className={cn("block break-words", done && "text-muted-foreground line-through")}>
          {task.title}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 empty:hidden">
          <DueLabel task={task} ctx={ctx} done={done} />
          {repeatText ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Repeat className="size-3.5" aria-hidden />
              {repeatText}
            </span>
          ) : null}
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
