import { Calendar, CircleAlert, Clock, Flag, Milestone, Repeat } from "lucide-react";
import { formatRowDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { PRIORITY_WORDS, REPEAT_LABELS, type DraftTask } from "../../schema";
import type { FlowDates } from "../flow/types";
import { estimateWording, realCheck } from "./review-logic";

export const PRIORITY_TONE = [
  "text-dash-ink-soft",
  "text-dash-ink-soft",
  "text-dash-warn",
  "text-dash-bad",
] as const;

/** "Every day until Mon 21 Dec" or "Does not repeat". */
export function repeatWording(task: DraftTask, dates: FlowDates): string {
  if (task.repeat === "none") return "Does not repeat";
  const base = REPEAT_LABELS[task.repeat];
  return task.repeatUntil
    ? `${base} until ${formatRowDay(task.repeatUntil, dates.today, dates.locale)}`
    : base;
}

/** The facts under a card's title: date, priority, estimate, repeat, milestone. */
export function TaskMeta({ task, dates }: { task: DraftTask; dates: FlowDates }) {
  return (
    <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[13px] font-medium text-dash-ink-soft">
      <span className="inline-flex items-center gap-1.5">
        <Calendar aria-hidden className="size-3.5" />
        <span className="font-mono text-xs">
          {task.dueDate ? formatRowDay(task.dueDate, dates.today, dates.locale) : "No date"}
        </span>
      </span>
      {task.priority > 0 ? (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 font-semibold",
            PRIORITY_TONE[task.priority],
          )}
        >
          <Flag aria-hidden className="size-3.5" />
          {capital(PRIORITY_WORDS[task.priority])}
          <span className="sr-only"> priority</span>
        </span>
      ) : null}
      {task.estimateMinutes !== null ? (
        <span className="inline-flex items-center gap-1.5">
          <Clock aria-hidden className="size-3.5" />
          <span className="font-mono text-xs">{estimateWording(task.estimateMinutes)}</span>
        </span>
      ) : null}
      <span className="inline-flex items-center gap-1.5">
        <Repeat aria-hidden className="size-3.5" />
        {repeatWording(task, dates)}
      </span>
      {task.milestone ? (
        <span className="inline-flex items-center gap-1.5 font-semibold text-dash-ink">
          <Milestone aria-hidden className="size-3.5" />
          Milestone
        </span>
      ) : null}
    </div>
  );
}

const capital = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/** The note the code leaves when it changed something the model said, and any problem to fix. */
export function TaskNotices({ task, problem }: { task: DraftTask; problem?: string }) {
  const check = realCheck(task);
  return (
    <>
      {check ? (
        <p className="flex items-start gap-1.5 rounded-xl bg-dash-warn-bg px-3 py-2 text-[13px] leading-snug font-medium text-dash-warn">
          <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span>Check this: {check}</span>
        </p>
      ) : null}
      {problem ? (
        <p
          role="alert"
          className="flex items-start gap-1.5 rounded-xl bg-dash-bad-bg px-3 py-2 text-[13px] leading-snug font-medium text-dash-bad"
        >
          <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span>{problem}</span>
        </p>
      ) : null}
    </>
  );
}

/** The read-only face of a card (screen 8h): title, facts, how and why, subtasks. */
export function TaskCardBody({
  task,
  dates,
  problem,
  eyebrow,
  counter,
}: {
  task: DraftTask;
  dates: FlowDates;
  problem?: string;
  eyebrow: string;
  counter: string;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs font-medium text-dash-ink-soft">{eyebrow}</span>
        <span className="font-mono text-xs font-medium text-dash-ink-soft">{counter}</span>
      </div>
      <h2 className="font-display text-2xl leading-tight font-semibold tracking-[-0.01em] text-dash-ink md:text-[28px]">
        {task.title}
      </h2>
      <TaskMeta task={task} dates={dates} />
      <TaskNotices task={task} problem={problem} />
      {task.notes ? (
        <p className="text-sm leading-normal whitespace-pre-line text-dash-ink">{task.notes}</p>
      ) : null}
      {task.subtasks.length > 0 ? (
        <ul className="mt-auto border-t border-dash-edge">
          {task.subtasks.map((title, i) => (
            <li
              key={i}
              className="flex min-h-10 items-center gap-2.5 border-b border-dash-edge text-sm text-dash-ink last:border-b-0"
            >
              <span
                aria-hidden
                className="size-4 shrink-0 rounded-[5px] border-[1.5px] border-dash-ink-soft"
              />
              {title}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
