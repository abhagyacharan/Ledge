"use client";

import { Calendar, Clock, Flag, Milestone, Plus, Repeat as RepeatIcon, X } from "lucide-react";
import { useId, useState } from "react";
import { DashButton } from "@/components/dash/dash-button";
import { addDaysIso } from "@/lib/dates";
import { cn } from "@/lib/utils";
import {
  MAX_ESTIMATE,
  MAX_NOTES,
  MAX_SUBTASKS,
  MAX_TASK_TITLE,
  MIN_ESTIMATE,
  PLAN_WINDOW_DAYS,
  PRIORITY_WORDS,
  REPEATS,
  REPEAT_LABELS,
  type DraftTask,
  type PlanPhase,
  type Repeat,
} from "../../schema";
import { PlanDatePicker } from "../flow/plan-date-picker";
import type { FlowDates } from "../flow/types";
import { PlanSelect } from "./plan-select";
import { ESTIMATE_CHOICES, estimateWording, phaseLabel } from "./review-logic";
import { TaskNotices } from "./task-card";

const pill =
  "inline-flex h-11 items-center gap-1.5 rounded-full bg-dash-well px-3.5 text-[13px] font-medium text-dash-ink outline-none transition-colors hover:bg-dash-edge focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9";

/** Radix select values cannot be empty, so "no estimate" has a name of its own. */
const NO_ESTIMATE = "none";

/**
 * A card's fields, editable in place (screen 8h Edit, screen 8i an opened row): title, date,
 * priority, estimate, repeat and its end, phase, milestone, notes and subtasks. Works on a copy;
 * Done hands it back, Esc or Cancel throws the changes away.
 */
export function CardEditor({
  task,
  phases,
  planStart,
  planEnd,
  dates,
  problem,
  onDone,
  onCancel,
  compact,
}: {
  task: DraftTask;
  phases: PlanPhase[];
  planStart: string;
  planEnd: string;
  dates: FlowDates;
  problem?: string;
  onDone: (next: DraftTask) => void;
  onCancel: () => void;
  compact?: boolean;
}) {
  const [draft, setDraft] = useState<DraftTask>(task);
  const [titleError, setTitleError] = useState(false);
  const id = useId();
  const patch = (changes: Partial<DraftTask>) => setDraft((d) => ({ ...d, ...changes }));
  const min = dates.today;
  const max = addDaysIso(dates.today, PLAN_WINDOW_DAYS);

  function done() {
    const title = draft.title.trim();
    if (!title) {
      setTitleError(true);
      return;
    }
    // Picking a new date answers the note about the old one.
    const check = draft.dueDate !== task.dueDate ? null : draft.check;
    onDone({
      ...draft,
      check,
      title,
      subtasks: draft.subtasks.map((s) => s.trim()).filter(Boolean),
    });
  }

  const estimateOptions: number[] = [...ESTIMATE_CHOICES];
  if (draft.estimateMinutes !== null && !estimateOptions.includes(draft.estimateMinutes)) {
    estimateOptions.push(draft.estimateMinutes);
    estimateOptions.sort((a, b) => a - b);
  }

  return (
    <div
      onKeyDown={(e) => {
        // Esc in an open dropdown closes the dropdown, not the editor.
        if (e.target instanceof Element && e.target.closest("[role=listbox]")) return;
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          onCancel();
        }
      }}
      className="flex flex-col gap-3"
    >
      <div className="flex items-center gap-3">
        <input
          aria-label="Task title"
          aria-invalid={titleError || undefined}
          autoFocus
          value={draft.title}
          maxLength={MAX_TASK_TITLE}
          onChange={(e) => {
            patch({ title: e.target.value });
            setTitleError(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              done();
            }
          }}
          className={cn(
            "h-10 min-w-0 flex-1 rounded-lg bg-transparent font-display font-semibold tracking-[-0.01em] text-dash-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            compact ? "text-base" : "text-xl",
          )}
        />
        <span className="font-mono text-xs font-medium text-dash-ink-soft">Editing</span>
      </div>
      {titleError ? (
        <p role="alert" className="-mt-1.5 text-[13px] font-medium text-dash-bad">
          Give the task a title
        </p>
      ) : null}
      <TaskNotices task={draft} problem={problem} />

      <div className="flex flex-wrap gap-1.5">
        <PlanDatePicker
          value={draft.dueDate}
          min={min}
          max={max}
          ctx={dates}
          title="Due date"
          allowClear={draft.repeat === "none"}
          onChange={(dueDate) => patch({ dueDate })}
          trigger={(label) => (
            <button type="button" aria-label={`Date: ${label}. Change.`} className={pill}>
              <Calendar aria-hidden className="size-3.5" />
              <span className="font-mono text-xs">{draft.dueDate ? label : "No date"}</span>
            </button>
          )}
        />
        <PlanSelect
          label="Priority"
          icon={<Flag aria-hidden className="size-3.5 shrink-0" />}
          value={String(draft.priority)}
          onChange={(v) => patch({ priority: Number(v) })}
          options={PRIORITY_WORDS.map((word, i) => ({
            value: String(i),
            label:
              i === 0 ? "No priority" : `${word.charAt(0).toUpperCase()}${word.slice(1)} priority`,
          }))}
        />
        <PlanSelect
          label="Time estimate"
          icon={<Clock aria-hidden className="size-3.5 shrink-0" />}
          value={draft.estimateMinutes === null ? NO_ESTIMATE : String(draft.estimateMinutes)}
          onChange={(v) => patch({ estimateMinutes: v === NO_ESTIMATE ? null : Number(v) })}
          options={[
            { value: NO_ESTIMATE, label: "No estimate" },
            ...estimateOptions
              .filter((m) => m >= MIN_ESTIMATE && m <= MAX_ESTIMATE)
              .map((m) => ({ value: String(m), label: estimateWording(m) })),
          ]}
        />
        <PlanSelect
          label="Repeat"
          icon={<RepeatIcon aria-hidden className="size-3.5 shrink-0" />}
          value={draft.repeat}
          onChange={(v) => {
            const repeat = v as Repeat;
            patch({
              repeat,
              dueDate: repeat !== "none" && !draft.dueDate ? dates.today : draft.dueDate,
              repeatUntil: repeat === "none" ? null : draft.repeatUntil,
            });
          }}
          options={REPEATS.map((r) => ({
            value: r,
            label: r === "none" ? "Does not repeat" : REPEAT_LABELS[r],
          }))}
        />
        {draft.repeat !== "none" ? (
          <PlanDatePicker
            value={draft.repeatUntil}
            min={draft.dueDate ?? min}
            max={max}
            ctx={dates}
            title="Repeat ends"
            allowClear
            clearLabel="At the plan's end"
            onChange={(repeatUntil) => patch({ repeatUntil })}
            trigger={(label) => (
              <button type="button" className={pill}>
                <Calendar aria-hidden className="size-3.5" />
                {draft.repeatUntil ? `Ends ${label}` : "Ends with the plan"}
              </button>
            )}
          />
        ) : null}
        {phases.length > 1 ? (
          <PlanSelect
            label="Phase"
            value={draft.phaseId}
            onChange={(phaseId) => patch({ phaseId })}
            className="max-w-full"
            options={phases.map((p) => ({ value: p.id, label: phaseLabel(p, planStart, planEnd) }))}
          />
        ) : null}
        <button
          type="button"
          aria-pressed={draft.milestone}
          onClick={() => patch({ milestone: !draft.milestone })}
          className={cn(pill, draft.milestone && "bg-dash-ink text-dash-card hover:bg-dash-ink")}
        >
          <Milestone aria-hidden className="size-3.5" />
          Milestone
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-notes`} className="text-xs font-medium text-dash-ink-soft">
          How and why
        </label>
        <textarea
          id={`${id}-notes`}
          value={draft.notes}
          maxLength={MAX_NOTES}
          rows={compact ? 3 : 4}
          onChange={(e) => patch({ notes: e.target.value })}
          className="block w-full resize-none rounded-2xl bg-dash-well px-3.5 py-2.5 text-sm leading-normal text-dash-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <span className="text-right font-mono text-xs text-dash-ink-soft">
          {draft.notes.length} / {MAX_NOTES}
        </span>
      </div>

      <fieldset className="flex flex-col">
        <legend className="mb-1 text-xs font-medium text-dash-ink-soft">Subtasks</legend>
        {draft.subtasks.map((title, i) => (
          <div key={i} className="flex min-h-11 items-center gap-2.5 text-sm">
            <span
              aria-hidden
              className="size-4 shrink-0 rounded-[5px] border-[1.5px] border-dash-ink-soft"
            />
            <input
              aria-label={`Subtask ${i + 1}`}
              value={title}
              maxLength={MAX_TASK_TITLE}
              onChange={(e) =>
                patch({ subtasks: draft.subtasks.map((s, j) => (j === i ? e.target.value : s)) })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (draft.subtasks.length < MAX_SUBTASKS && title.trim()) {
                    patch({ subtasks: [...draft.subtasks, ""] });
                  }
                }
              }}
              className="h-9 min-w-0 flex-1 rounded-lg bg-transparent outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <button
              type="button"
              aria-label={`Remove subtask ${i + 1}`}
              onClick={() => patch({ subtasks: draft.subtasks.filter((_, j) => j !== i) })}
              className="grid size-11 place-items-center rounded-full text-dash-ink-soft outline-none hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50 md:size-8"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          </div>
        ))}
        {draft.subtasks.length < MAX_SUBTASKS ? (
          <button
            type="button"
            onClick={() => patch({ subtasks: [...draft.subtasks, ""] })}
            className="flex min-h-11 w-fit items-center gap-2.5 rounded-lg text-sm text-dash-ink-soft outline-none hover:text-dash-ink focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Plus aria-hidden className="size-4" />
            Add subtask
          </button>
        ) : null}
      </fieldset>

      <div className="flex items-center justify-end gap-2">
        <span className="mr-auto hidden text-xs text-dash-ink-soft md:inline">
          <kbd className="rounded-md bg-dash-well px-1.5 py-0.5 font-mono text-[11px]">Esc</kbd>{" "}
          cancel
        </span>
        <DashButton variant="well" onClick={onCancel}>
          Cancel
        </DashButton>
        <DashButton onClick={done} className="px-5">
          Done
        </DashButton>
      </div>
    </div>
  );
}
