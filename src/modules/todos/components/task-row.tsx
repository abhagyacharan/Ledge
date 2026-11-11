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
import { ListGlyph } from "../list-icons";
import { useTodos } from "./todos-provider";
import { PRIORITY_LABELS, type DateContext } from "./types";

const PRIORITY_STYLE = ["", "text-dash-ink-soft", "text-brass", "text-dash-bad"];

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
  priority = 0,
}: {
  title: string;
  done: boolean;
  onToggle: () => void;
  size?: "sm" | "md";
  /** 0 to 3: high and medium tint the ring, so urgency shows before you read the row. */
  priority?: number;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={`${title}: mark ${done ? "not done" : "done"}`}
      data-task-checkbox
      onClick={onToggle}
      className="group/check flex size-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:size-9"
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-full border-[1.5px] transition-[background-color,border-color,transform] duration-150 ease-snap group-active/check:scale-90",
          size === "md" ? "size-5" : "size-4",
          done
            ? "border-dash-ink bg-dash-ink text-dash-card"
            : priority === 3
              ? "border-dash-bad hover:bg-dash-bad-bg"
              : priority === 2
                ? "border-brass hover:bg-brass/10"
                : "border-dash-ink-soft/70 hover:border-dash-ink",
        )}
      >
        {done ? (
          <Check className="size-3 animate-in duration-150 zoom-in-50" strokeWidth={3} />
        ) : null}
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
        "inline-flex items-center gap-1",
        overdue ? "font-medium text-dash-bad" : "text-dash-ink-soft",
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

export type RowContext = {
  listName: string;
  listIcon: string | null;
  /** Set when the row is a subtask shown outside its parent. */
  parentTitle: string | null;
};

/**
 * One task (docs/design.md §5f): a round checkbox (its ring tinted by priority), the title, and
 * one quiet line of details: due date (red with the word "Overdue" when late), repeat, priority,
 * subtask progress and, in views that mix lists, which list it is in. The whole text opens the
 * task. Rows have no lines between them; a soft grey shows under the pointer.
 */
export function TaskRow({
  task,
  subtasks,
  ctx,
  context,
  handle,
  liRef,
  liStyle,
  dragging = false,
}: {
  task: TaskRowData;
  subtasks: TaskRowData[];
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
  const { hrefFor } = useTaskLinks();
  const repeatText = describeStored(task.recurrenceRule, task.recurrenceMode);

  return (
    <li
      ref={liRef}
      data-task-row
      data-task-id={task.id}
      style={liStyle}
      className={cn(
        "group/row relative -mx-2 flex items-start gap-0.5 rounded-xl px-1 transition-colors duration-150 hover:bg-dash-well/70",
        dragging &&
          "z-10 bg-dash-card shadow-[0_12px_32px_-12px_rgb(0_0_0/0.35)] ring-1 ring-dash-edge",
      )}
    >
      {handle}
      <CheckboxButton title={task.title} done={done} onToggle={toggle} priority={task.priority} />
      <Link
        href={hrefFor(task.id)}
        data-task-link
        scroll={false}
        className="flex min-h-11 min-w-0 flex-1 flex-col justify-center rounded-lg py-2 pr-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-9"
      >
        <span
          className={cn(
            "block text-[15px] leading-snug break-words transition-colors duration-150 md:text-sm",
            done && "text-dash-ink-soft line-through decoration-dash-ink-soft/60",
          )}
        >
          {task.title}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs empty:hidden">
          <DueLabel task={task} ctx={ctx} done={done} />
          {repeatText ? (
            <span className="inline-flex items-center gap-1 text-dash-ink-soft">
              <Repeat className="size-3.5" aria-hidden />
              {repeatText}
            </span>
          ) : null}
          {task.priority > 0 ? (
            <span className={cn("inline-flex items-center gap-1", PRIORITY_STYLE[task.priority])}>
              <Flag className="size-3.5" aria-hidden />
              {PRIORITY_LABELS[task.priority]}
              <span className="sr-only"> priority</span>
            </span>
          ) : null}
          {subtasks.length > 0 ? (
            <span className="inline-flex items-center gap-1 text-dash-ink-soft">
              <ListChecks className="size-3.5" aria-hidden />
              <span aria-label={`${subtasksDone} of ${subtasks.length} subtasks done`}>
                {subtasksDone}/{subtasks.length}
              </span>
            </span>
          ) : null}
          {context ? (
            <span className="inline-flex min-w-0 items-center gap-1 text-dash-ink-soft">
              <ListGlyph icon={context.listIcon} className="size-3.5 shrink-0" />
              <span className="truncate">
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
