"use client";

import { CircleAlert, Flag, ListChecks, Milestone, Plus, Scissors, Undo2, X } from "lucide-react";
import { formatRowDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { PRIORITY_WORDS, type DraftTask, type PlanPhase } from "../../schema";
import type { FlowDates } from "../flow/types";
import { CardEditor } from "./card-editor";
import { isCut, phaseLabel, realCheck } from "./review-logic";
import { PRIORITY_TONE } from "./task-card";

export const phaseAnchor = (phaseId: string) => `plan-phase-${phaseId}`;

const RING_TONE = [
  "border-dash-ink-soft",
  "border-dash-ink-soft",
  "border-dash-warn",
  "border-dash-bad",
] as const;

/**
 * The list review (screen 8i): one section per phase, one line per card. A line opens in place
 * with the card's fields; a hovered or selected line shows Remove (key X). Cut lines stay in their
 * phase, struck through, so bringing one back is right there.
 */
export function ListView({
  tasks,
  phases,
  planStart,
  planEnd,
  dates,
  errors,
  selectedKey,
  editingKey,
  canAdd,
  onSelect,
  onEdit,
  onEditDone,
  onEditCancel,
  onCut,
  onBringBack,
  onAddTask,
}: {
  tasks: DraftTask[];
  phases: PlanPhase[];
  planStart: string;
  planEnd: string;
  dates: FlowDates;
  errors: Record<string, string>;
  selectedKey: string | null;
  editingKey: string | null;
  canAdd: boolean;
  onSelect: (key: string) => void;
  onEdit: (key: string) => void;
  onEditDone: (key: string, next: DraftTask) => void;
  onEditCancel: () => void;
  onCut: (key: string) => void;
  onBringBack: (key: string) => void;
  onAddTask: (phaseId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {phases.map((phase) => {
        const inPhase = tasks.filter((t) => t.phaseId === phase.id);
        const cutHere = inPhase.filter(isCut).length;
        return (
          <section
            key={phase.id}
            id={phaseAnchor(phase.id)}
            aria-labelledby={`${phaseAnchor(phase.id)}-h`}
            className="scroll-mt-24 rounded-2xl border border-dash-edge bg-dash-card p-1.5 shadow-(--dash-card-shadow)"
          >
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 px-3 pt-2.5 pb-1.5">
              <h2
                id={`${phaseAnchor(phase.id)}-h`}
                className="text-[15px] font-semibold text-dash-ink"
              >
                {phaseLabel(phase, planStart, planEnd)}
              </h2>
              <span className="font-mono text-xs font-medium text-dash-ink-soft">
                {formatRowDay(phase.startDate, dates.today, dates.locale)} –{" "}
                {formatRowDay(phase.endDate, dates.today, dates.locale)} ·{" "}
                {inPhase.length - cutHere} kept, {cutHere} cut
              </span>
            </div>
            <ul className="flex flex-col">
              {inPhase.map((task) =>
                editingKey === task.key ? (
                  <li
                    key={task.key}
                    data-task-key={task.key}
                    className="my-1.5 rounded-2xl border border-dash-edge bg-dash-card p-4 shadow-(--dash-card-shadow)"
                  >
                    <CardEditor
                      compact
                      task={task}
                      phases={phases}
                      planStart={planStart}
                      planEnd={planEnd}
                      dates={dates}
                      problem={errors[task.key]}
                      onDone={(next) => onEditDone(task.key, next)}
                      onCancel={onEditCancel}
                    />
                  </li>
                ) : (
                  <Row
                    key={task.key}
                    task={task}
                    dates={dates}
                    problem={errors[task.key]}
                    selected={selectedKey === task.key}
                    onSelect={() => onSelect(task.key)}
                    onEdit={() => onEdit(task.key)}
                    onCut={() => onCut(task.key)}
                    onBringBack={() => onBringBack(task.key)}
                  />
                ),
              )}
              {inPhase.length === 0 ? (
                <li className="px-3 py-3 text-sm text-dash-ink-soft">No tasks in this phase.</li>
              ) : null}
            </ul>
            {canAdd ? (
              <button
                type="button"
                onClick={() => onAddTask(phase.id)}
                className="mt-0.5 flex min-h-12 w-full items-center gap-3 rounded-b-xl border-t border-dash-edge px-3 text-sm font-medium text-dash-ink-soft outline-none transition-colors hover:bg-dash-well hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Plus aria-hidden className="w-5 text-center" />
                Add a task
              </button>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function Row({
  task,
  dates,
  problem,
  selected,
  onSelect,
  onEdit,
  onCut,
  onBringBack,
}: {
  task: DraftTask;
  dates: FlowDates;
  problem?: string;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onCut: () => void;
  onBringBack: () => void;
}) {
  const cut = isCut(task);
  const note = realCheck(task);
  return (
    <li
      data-task-key={task.key}
      data-selected={selected || undefined}
      className={cn(
        "group relative my-px flex min-h-12 items-center gap-1 rounded-xl transition-colors",
        selected
          ? "bg-dash-well shadow-[inset_0_0_0_1px_var(--dash-ink-soft)]"
          : "hover:bg-dash-well",
      )}
    >
      <button
        type="button"
        onClick={() => {
          onSelect();
          if (!cut) onEdit();
        }}
        aria-current={selected || undefined}
        aria-label={cut ? `${task.title}, cut` : `${task.title}. Edit.`}
        className={cn(
          "flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2 text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          cut && "text-dash-ink-soft",
        )}
      >
        {cut ? (
          <Scissors aria-hidden className="size-[15px] w-5 shrink-0" />
        ) : (
          <span
            aria-hidden
            className={cn("size-5 shrink-0 rounded-full border-2", RING_TONE[task.priority])}
          />
        )}
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate font-medium", cut && "line-through")}>
            {task.title}
          </span>
          {problem ? (
            <span
              role="alert"
              className="mt-0.5 flex items-center gap-1 text-xs font-medium text-dash-bad"
            >
              <CircleAlert aria-hidden className="size-3" />
              {problem}
            </span>
          ) : null}
        </span>
        {task.subtasks.length > 0 && !cut ? (
          <span className="hidden items-center gap-1 text-xs text-dash-ink-soft sm:inline-flex">
            <ListChecks aria-hidden className="size-3" />
            {task.subtasks.length} {task.subtasks.length === 1 ? "subtask" : "subtasks"}
          </span>
        ) : null}
        {task.milestone && !cut ? (
          <Milestone aria-label="Milestone" className="size-3.5 shrink-0 text-dash-ink" />
        ) : null}
        {note && !cut ? (
          <CircleAlert aria-label="Check this task" className="size-3.5 shrink-0 text-dash-warn" />
        ) : null}
        {cut ? (
          <span className="inline-flex h-[22px] items-center gap-1 rounded-full bg-dash-well px-2.5 text-[11px] font-semibold text-dash-ink-soft">
            <X aria-hidden className="size-[11px]" />
            Cut
          </span>
        ) : (
          <>
            <span className="w-[5.75rem] shrink-0 font-mono text-xs font-medium text-dash-ink-soft">
              {task.dueDate ? formatRowDay(task.dueDate, dates.today, dates.locale) : "No date"}
            </span>
            <span
              className={cn(
                "hidden w-[5.25rem] shrink-0 items-center gap-1 text-[13px] font-medium md:inline-flex",
                PRIORITY_TONE[task.priority],
              )}
            >
              {task.priority > 0 ? (
                <>
                  <Flag aria-hidden className="size-[13px]" />
                  {PRIORITY_WORDS[task.priority].charAt(0).toUpperCase()}
                  {PRIORITY_WORDS[task.priority].slice(1)}
                </>
              ) : null}
            </span>
          </>
        )}
      </button>
      {cut ? (
        <button
          type="button"
          onClick={onBringBack}
          className="mr-2 inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-dash-ink outline-none hover:bg-dash-card focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8"
        >
          <Undo2 aria-hidden className="size-[13px]" />
          Bring back
        </button>
      ) : (
        <button
          type="button"
          aria-label={`Remove ${task.title}`}
          aria-keyshortcuts="X"
          onClick={onCut}
          className={cn(
            "mr-2 inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-dash-card px-3 text-xs font-medium text-dash-ink shadow-[0_0_0_1px_var(--dash-edge)] outline-none transition-opacity focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8",
            selected
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 pointer-coarse:opacity-100",
          )}
        >
          <X aria-hidden className="size-[13px]" />
          Remove
        </button>
      )}
    </li>
  );
}
