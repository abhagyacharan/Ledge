"use client";

import { CalendarDays, Check, Flag, Folder, ListChecks, Repeat, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { motion, useIsPresent, useReducedMotion, type TargetAndTransition } from "motion/react";
import {
  useOptimistic,
  useState,
  useTransition,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import {
  addDaysIso,
  daysBetween,
  formatDueDate,
  formatRowDay,
  formatTime,
  isOverdue,
  todayIn,
} from "@/lib/dates";
import { describeStored } from "@/lib/recurrence";
import { cn } from "@/lib/utils";
import type { TaskRow as TaskRowData } from "@/server/data/tasks";
import { setTaskDoneAction, undoRecurringCompletionAction } from "../actions/tasks";
import { run, undoToast } from "./run-action";
import { useTaskLinks } from "./use-task-links";
import { useTodos } from "./todos-provider";
import { PRIORITY_LABELS, type DateContext } from "./types";

/** Priority words (docs/new_design.md §4): High red, Medium amber, Low soft, each with a flag. */
export const PRIORITY_STYLE = ["", "text-dash-ink-soft", "text-dash-warn", "text-dash-bad"];

/** The date an open repeating task is due on, which decides whether it can be ticked yet. */
export function repeatDate(
  task: Pick<TaskRowData, "recurrenceRule" | "parentId" | "dueDate">,
): string | null {
  return task.recurrenceRule && !task.parentId ? task.dueDate : null;
}

/**
 * Ticking is optimistic: the checkbox and the row change at once, and go back (with an error
 * message) if the server says no. Completing a task shows an Undo toast for a few seconds.
 * A repeat whose next date has not come yet cannot be ticked (O, 2026-11-22): `ahead` is true and
 * a tap only says when it comes back. Pass `repeatsOn` (see `repeatDate`) for that.
 */
export function useToggleDone(
  taskId: string,
  title: string,
  serverDone: boolean,
  repeatsOn: string | null = null,
) {
  const [, startTransition] = useTransition();
  const [optimisticDone, setDone] = useOptimistic(serverDone);
  const { timeZone, locale } = useTodos();
  // The row stays ticked while it plays its exit (see TaskRow): once the page refreshes, the
  // optimistic value falls back to the old props, and a row that is leaving must not untick.
  const [kept, setKept] = useState(false);
  const [seen, setSeen] = useState(serverDone);
  if (serverDone !== seen) {
    setSeen(serverDone);
    setKept(false);
  }
  const done = optimisticDone || kept;
  const today = todayIn(timeZone);
  const ahead = !done && repeatsOn !== null && repeatsOn > today;

  function toggle() {
    if (ahead) {
      toast(`"${title}" comes back ${formatDueDate(repeatsOn, today, locale).toLowerCase()}.`, {
        description: "You can tick it then.",
      });
      return;
    }
    startTransition(async () => {
      const next = !done;
      setDone(next);
      setKept(next);
      const result = await run(setTaskDoneAction({ id: taskId, done: next }));
      if (!result.ok) setKept(false);
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

  return { done, toggle, ahead };
}

export function CheckboxButton({
  title,
  done,
  onToggle,
  size = "md",
  priority = 0,
  ahead = false,
}: {
  title: string;
  done: boolean;
  onToggle: () => void;
  size?: "sm" | "md";
  /** 0 to 3: high and medium tint the ring, so urgency shows before you read the row. */
  priority?: number;
  /** A repeat whose day has not come: a dashed ring with the repeat icon, and it cannot be ticked. */
  ahead?: boolean;
}) {
  if (ahead) {
    return (
      <button
        type="button"
        aria-label={`${title}: repeats, not due yet`}
        data-task-checkbox
        onClick={onToggle}
        className="flex size-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:size-9"
      >
        <span
          className={cn(
            "flex items-center justify-center rounded-full border-[1.5px] border-dashed border-dash-ink-soft/70 text-dash-ink-soft",
            size === "md" ? "size-5" : "size-4",
          )}
        >
          <Repeat className="size-2.5" strokeWidth={2.5} aria-hidden />
        </span>
      </button>
    );
  }
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
          // The ring repeats the priority (the flag and word in the row say it too): 2px red for
          // high, 2px amber for medium, 1.5px soft otherwise (docs/new_design.md §4). A done
          // task is an orange tick: the small reward for finishing something.
          "flex items-center justify-center rounded-full transition-[background-color,border-color,transform] duration-150 ease-snap group-active/check:scale-90",
          size === "md" ? "size-5" : "size-4",
          done
            ? "border-[1.5px] border-dash-accent bg-dash-accent text-dash-on-accent"
            : priority === 3
              ? "border-2 border-dash-bad hover:bg-dash-bad-bg"
              : priority === 2
                ? "border-2 border-dash-warn hover:bg-dash-warn-bg"
                : "border-[1.5px] border-dash-ink-soft hover:border-dash-ink",
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
  priority = 0,
  repeatsOn = null,
}: {
  taskId: string;
  title: string;
  done: boolean;
  size?: "sm" | "md";
  priority?: number;
  repeatsOn?: string | null;
}) {
  const { done, toggle, ahead } = useToggleDone(taskId, title, serverDone, repeatsOn);
  return (
    <CheckboxButton
      title={title}
      done={done}
      onToggle={toggle}
      size={size}
      priority={priority}
      ahead={ahead}
    />
  );
}

/**
 * The due part of a row's meta line. Late tasks lead with an alert icon and "Overdue: 2 days"
 * (a word and an icon, never colour alone), then the date. `timeOnly` is for views already grouped
 * by day (Upcoming), where only the time is worth repeating.
 */
export function DueLabel({
  task,
  ctx,
  done,
  timeOnly = false,
}: {
  task: Pick<TaskRowData, "dueDate" | "dueTime">;
  ctx: DateContext;
  done: boolean;
  timeOnly?: boolean;
}) {
  if (!task.dueDate) return null;
  const overdue = !done && isOverdue(task, ctx.today, ctx.timeNow);
  const late = daysBetween(task.dueDate, ctx.today);
  const time = task.dueTime ? formatTime(task.dueTime, ctx.locale) : null;
  const day =
    task.dueDate === ctx.today
      ? null
      : task.dueDate === addDaysIso(ctx.today, 1)
        ? "Tomorrow"
        : formatRowDay(task.dueDate, ctx.today, ctx.locale);
  const when = timeOnly ? time : day && time ? `${day}, ${time}` : (day ?? time);
  return (
    <>
      {overdue ? (
        <span className="inline-flex items-center gap-1 font-semibold text-dash-bad">
          <TriangleAlert className="size-3.5" aria-hidden strokeWidth={2.25} />
          {late > 0 ? `Overdue: ${late} ${late === 1 ? "day" : "days"}` : "Overdue"}
        </span>
      ) : null}
      {when ? (
        <span className="inline-flex items-center gap-1 text-dash-ink-soft">
          <CalendarDays className="size-3.5" aria-hidden />
          <span>{when}</span>
        </span>
      ) : null}
    </>
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
/**
 * How a row leaves a list (O, 2026-11-16, option 2 of the preview): a ticked task keeps its
 * filled tick and struck-through title for half a second so the tick registers, then fades
 * (0.16 s) and folds shut (0.24 s) while the rows below glide up. Any other row that leaves
 * (deleted, moved, filtered out) just folds away quickly.
 */
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const EXIT_AFTER_TICK: TargetAndTransition = {
  opacity: 0,
  height: 0,
  overflow: "hidden",
  transition: {
    opacity: { delay: 0.48, duration: 0.16, ease: "easeOut" },
    height: { delay: 0.64, duration: 0.24, ease: EASE_OUT },
  },
};
const EXIT_QUICK: TargetAndTransition = {
  opacity: 0,
  height: 0,
  overflow: "hidden",
  transition: { duration: 0.2, ease: EASE_OUT },
};
/** With reduced motion: the same pause, then gone, with nothing sliding. */
const exitWithoutMotion = (afterTick: boolean): TargetAndTransition => ({
  opacity: 0,
  height: 0,
  overflow: "hidden",
  transition: { duration: 0, delay: afterTick ? 0.48 : 0 },
});

export function TaskRow({
  task,
  subtasks,
  ctx,
  context,
  handle,
  liRef,
  liStyle,
  dragging = false,
  timeOnly = false,
  marker,
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
  /** The view is grouped by day already: the row shows only the time (Upcoming). */
  timeOnly?: boolean;
  /** A word with an icon at the start of the details line (a plan's "Milestone"). */
  marker?: ReactNode;
}) {
  const { done, toggle, ahead } = useToggleDone(
    task.id,
    task.title,
    task.status === "done",
    repeatDate(task),
  );
  const subtasksDone = subtasks.filter((s) => s.status === "done").length;
  const { hrefFor } = useTaskLinks();
  // The open task's row stays marked while its detail is docked beside the list (screen 6b).
  const selected = useSearchParams().get("task") === task.id;
  const repeatText = describeStored(task.recurrenceRule, task.recurrenceMode, task.recurrenceUntil);
  const present = useIsPresent();
  const reduceMotion = useReducedMotion();
  const exit = reduceMotion ? exitWithoutMotion(done) : done ? EXIT_AFTER_TICK : EXIT_QUICK;

  return (
    <motion.li
      ref={liRef}
      data-task-row
      data-task-id={task.id}
      data-leaving={present ? undefined : ""}
      exit={exit}
      style={liStyle}
      className={cn(
        "group/row relative -mx-2 flex items-start gap-0.5 rounded-xl px-1 transition-colors duration-150 hover:bg-dash-well/70",
        selected && "bg-dash-well",
        dragging &&
          "z-10 bg-dash-card shadow-[0_12px_32px_-12px_rgb(0_0_0/0.35)] ring-1 ring-dash-edge",
      )}
    >
      {handle}
      <CheckboxButton
        title={task.title}
        done={done}
        onToggle={toggle}
        priority={task.priority}
        ahead={ahead}
      />
      <Link
        href={hrefFor(task.id)}
        data-task-link
        scroll={false}
        className="flex min-h-11 min-w-0 flex-1 flex-col justify-center rounded-lg py-2 pr-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-9"
      >
        <span
          className={cn(
            "block text-[15px] leading-snug break-words transition-colors duration-150 md:text-sm",
            done && "text-dash-ink-soft",
          )}
        >
          {/* The strike-through draws left to right as the tick fills; a gradient line, so it
              follows the text over every line of a long title. */}
          <span
            className={cn(
              "bg-[linear-gradient(var(--dash-ink-soft),var(--dash-ink-soft))] bg-[position:0_58%] bg-no-repeat [box-decoration-break:clone] transition-[background-size] duration-200 ease-out",
              done ? "bg-[length:100%_1.5px]" : "bg-[length:0%_1.5px]",
            )}
          >
            {task.title}
          </span>
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs empty:hidden">
          {marker}
          <DueLabel task={task} ctx={ctx} done={done} timeOnly={timeOnly} />
          {repeatText ? (
            <span className="inline-flex items-center gap-1 text-dash-ink-soft">
              <Repeat className="size-3.5" aria-hidden />
              {repeatText}
            </span>
          ) : null}
          {task.priority > 0 ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 font-medium",
                PRIORITY_STYLE[task.priority],
              )}
            >
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
              <Folder className="size-3.5 shrink-0" aria-hidden />
              <span className="sr-only">In </span>
              <span className="truncate">
                {context.parentTitle ? `${context.parentTitle} · ` : ""}
                {context.listName}
              </span>
            </span>
          ) : null}
        </span>
      </Link>
    </motion.li>
  );
}
