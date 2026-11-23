"use client";

import {
  ArrowLeft,
  Check,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  Loader2,
  Milestone,
  Repeat,
  Scissors,
  Undo2,
} from "lucide-react";
import { DashButton } from "@/components/dash/dash-button";
import { Sheet, SheetBody, SheetFooter, SheetHeader } from "@/components/dash/sheet";
import { formatRowDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useTodos } from "@/modules/todos/components/todos-provider";
import { MAX_LIST_NAME, type DraftTask, type PlanPhase } from "../../schema";
import type { FlowDates } from "../flow/types";
import { PlanSelect } from "./plan-select";
import { cutTasks, phaseCountWording, phaseLabel, type Summary } from "./review-logic";

/** Where the tasks go: a new list named after the plan, or one the person already has. */
export type ListState = { other: boolean; listId: string | null; name: string };

/** Where the tasks go (screens 8h summary, 8i panel): "Create a new list?" on, a name; off, a list. */
export function ListOptions({
  state,
  onChange,
  compact,
}: {
  state: ListState;
  onChange: (next: ListState) => void;
  compact?: boolean;
}) {
  const { lists, inboxId } = useTodos();
  const chosen = state.listId ?? inboxId;
  const makeNew = !state.other;
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl bg-dash-card px-4 py-3.5",
        compact
          ? "shadow-[inset_0_0_0_1px_var(--dash-edge)]"
          : "border border-dash-edge shadow-(--dash-card-shadow)",
      )}
    >
      <div className="flex items-center gap-3">
        <label htmlFor="plan-new-list-switch" className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium text-dash-ink">Create a new list?</span>
          <span className="mt-0.5 block text-[13px] leading-snug text-dash-ink-soft">
            {makeNew ? "Name it below." : "The tasks go into the list you pick."}
          </span>
        </label>
        <button
          type="button"
          id="plan-new-list-switch"
          role="switch"
          aria-checked={makeNew}
          onClick={() => onChange({ ...state, other: makeNew })}
          className={cn(
            "flex h-7 w-12 shrink-0 items-center rounded-full p-[3px] outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/50",
            makeNew
              ? "bg-dash-ink"
              : "bg-dash-well shadow-[inset_0_0_0_1.5px_var(--dash-ink-soft)]",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "size-[22px] rounded-full transition-[transform,background-color] duration-150 ease-snap motion-reduce:transition-none",
              makeNew
                ? "translate-x-5 bg-dash-card shadow-(--dash-lift)"
                : "scale-[0.72] bg-dash-ink-soft",
            )}
          />
        </button>
      </div>
      {makeNew ? (
        <input
          aria-label="New list name"
          value={state.name}
          maxLength={MAX_LIST_NAME}
          placeholder="List name"
          onChange={(e) => onChange({ ...state, name: e.target.value })}
          className="h-11 w-full rounded-xl bg-dash-well px-3 text-sm text-dash-ink outline-none placeholder:text-dash-ink-soft focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      ) : (
        <PlanSelect
          variant="field"
          label="List for the tasks"
          value={chosen}
          options={lists.map((list) => ({ value: list.id, label: list.name }))}
          onChange={(listId) => onChange({ ...state, listId })}
        />
      )}
    </div>
  );
}

/** The name of the list the tasks will land in, for the line under Add plan. */
export function destinationName(
  state: ListState,
  lists: { id: string; name: string }[],
  inboxId: string,
) {
  if (!state.other) return state.name || "a new list";
  return lists.find((l) => l.id === (state.listId ?? inboxId))?.name ?? "your list";
}

function AddButton({
  label,
  adding,
  disabled,
  hint,
  className,
  onClick,
}: {
  label: string;
  adding: boolean;
  disabled: boolean;
  hint?: boolean;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-keyshortcuts="Control+Enter"
      disabled={disabled || adding}
      onClick={onClick}
      className={cn(
        "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-dash-ink px-5 text-[15px] font-semibold text-dash-card outline-none transition-[transform,background-color,opacity] duration-150 hover:bg-dash-ink/85 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97] disabled:opacity-50",
        className,
      )}
    >
      {adding ? (
        <Loader2 aria-hidden className="size-[17px] animate-spin" />
      ) : (
        <Check aria-hidden className="size-[17px]" />
      )}
      {label}
      {hint ? (
        <kbd className="ml-1 hidden rounded-md px-1.5 py-0.5 font-mono text-[11px] font-medium opacity-80 shadow-[inset_0_0_0_1px_currentColor] md:inline">
          Ctrl Enter
        </kbd>
      ) : null}
    </button>
  );
}

/**
 * The last frame of the cards (screen 8h): all cards seen, what the plan comes to, what was cut,
 * Options, then Add plan.
 */
export function SummaryFrame({
  title,
  summary,
  total,
  mode,
  addLabel,
  adding,
  addError,
  listState,
  onListChange,
  onOpenTray,
  onAdd,
  onBackToCards,
  planStart,
  planEnd,
}: {
  title: string;
  summary: Summary;
  total: number;
  mode: "new" | "more";
  addLabel: string;
  adding: boolean;
  addError: string | null;
  listState: ListState;
  onListChange: (next: ListState) => void;
  onOpenTray: () => void;
  onAdd: () => void;
  onBackToCards: () => void;
  planStart: string;
  planEnd: string;
}) {
  const headline = mode === "more" ? moreHeadline(summary.kept) : summary.headline;
  return (
    <div className="flex flex-1 flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Back to the cards"
          onClick={onBackToCards}
          className="grid size-11 place-items-center rounded-full border border-dash-edge bg-dash-card text-dash-ink outline-none hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ArrowLeft aria-hidden className="size-[18px]" />
        </button>
        <span className="font-mono text-xs font-medium text-dash-ink-soft">
          Summary · {total} {total === 1 ? "card" : "cards"}
        </span>
        <span className="w-11" />
      </div>
      <div className="mt-2">
        <div className="font-mono text-xs font-medium text-dash-ink-soft">{title}</div>
        <h1 className="mt-1.5 font-display text-[32px] leading-[1.1] font-semibold tracking-[-0.01em] text-dash-ink">
          {headline}
        </h1>
        {summary.firstLine ? (
          <p className="mt-2 text-[15px] leading-snug text-dash-ink-soft">{summary.firstLine}</p>
        ) : null}
      </div>
      <ul className="rounded-2xl border border-dash-edge bg-dash-card px-4 py-1 shadow-(--dash-card-shadow)">
        {summary.perPhase.map((row) => (
          <li
            key={row.phase.id}
            className="flex min-h-[52px] items-center gap-3 border-b border-dash-edge text-[15px] font-medium text-dash-ink last:border-b-0"
          >
            <CircleCheck aria-hidden className="size-[18px] shrink-0" />
            <span className="flex-1">{phaseLabel(row.phase, planStart, planEnd)}</span>
            <span className="font-mono text-xs font-medium text-dash-ink-soft">
              {phaseCountWording(row)}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenTray}
          className="inline-flex h-11 items-center gap-1.5 rounded-full bg-dash-well px-4 text-sm font-medium text-dash-ink outline-none hover:bg-dash-edge focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Scissors aria-hidden className="size-[15px]" />
          Cut ({summary.cut})
          <ChevronUp aria-hidden className="size-[15px]" />
        </button>
        <span className="text-[13px] text-dash-ink-soft">Not added. You can bring them back.</span>
      </div>
      {mode === "new" ? <ListOptions state={listState} onChange={onListChange} /> : null}
      {addError ? <AddError message={addError} /> : null}
      <div className="mt-auto flex flex-col gap-2 pt-4">
        <AddButton label={addLabel} adding={adding} disabled={summary.kept === 0} onClick={onAdd} />
        <button
          type="button"
          onClick={onBackToCards}
          className="h-11 rounded-full text-sm font-semibold text-dash-ink outline-none hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Back to the cards
        </button>
      </div>
    </div>
  );
}

const moreHeadline = (kept: number) => `${kept} ${kept === 1 ? "task" : "tasks"} to add`;

function AddError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl bg-dash-bad-bg px-3 py-2.5 text-[13px] leading-snug font-medium text-dash-bad"
    >
      <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      {message}
    </p>
  );
}

/** The sticky side panel of the list review (screen 8i). */
export function SummaryPanel({
  summary,
  total,
  reviewed,
  mode,
  addLabel,
  adding,
  addError,
  listState,
  onListChange,
  timeNote,
  dates,
  destination,
  onAdd,
}: {
  summary: Summary;
  total: number;
  reviewed: number;
  mode: "new" | "more";
  addLabel: string;
  adding: boolean;
  addError: string | null;
  listState: ListState;
  onListChange: (next: ListState) => void;
  timeNote: string | null;
  dates: FlowDates;
  destination: string;
  onAdd: () => void;
}) {
  const stats = [
    { label: "Kept", value: summary.kept, icon: Check },
    { label: "Cut", value: summary.cut, icon: Scissors },
    { label: "Repeating", value: summary.repeating, icon: Repeat },
    {
      label: summary.milestones === 1 ? "Milestone" : "Milestones",
      value: summary.milestones,
      icon: Milestone,
    },
  ];
  const range =
    summary.firstDate && summary.lastDate
      ? `${formatRowDay(summary.firstDate, dates.today, dates.locale)} – ${formatRowDay(summary.lastDate, dates.today, dates.locale)}`
      : null;
  return (
    <aside
      aria-label="Plan summary"
      className="sticky top-4 flex w-full shrink-0 flex-col gap-4 self-start rounded-3xl border border-dash-edge bg-dash-card p-5 shadow-(--dash-card-shadow) lg:w-[19rem]"
    >
      <div className="font-mono text-xs font-medium text-dash-ink-soft">Summary</div>
      <div className="font-display text-2xl leading-tight font-semibold tracking-[-0.01em] text-dash-ink">
        {mode === "more" ? moreHeadline(summary.kept) : summary.headline}
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-[13px] font-medium text-dash-ink">
          <span>Reviewed</span>
          <span className="font-mono">
            {reviewed} of {total}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Cards reviewed"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={reviewed}
          className="h-1.5 overflow-hidden rounded-full bg-dash-track"
        >
          <div
            className="h-full bg-dash-accent transition-[width] duration-200"
            style={{ width: `${total === 0 ? 0 : (reviewed / total) * 100}%` }}
          />
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-dash-well px-3.5 py-3">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-dash-ink-soft">
              <s.icon aria-hidden className="size-[13px]" />
              {s.label}
            </dt>
            <dd className="mt-1 font-display text-[30px] leading-none font-semibold text-dash-ink">
              {s.value}
            </dd>
          </div>
        ))}
      </dl>
      {range || timeNote ? (
        <div className="text-[13px] leading-relaxed text-dash-ink-soft">
          {range ? <span className="font-mono text-dash-ink">{range}</span> : null}
          {range && timeNote ? <br /> : null}
          {timeNote}
        </div>
      ) : null}
      {summary.firstLine ? (
        <p className="text-[13px] leading-snug text-dash-ink-soft">{summary.firstLine}</p>
      ) : null}
      {mode === "new" ? <ListOptions compact state={listState} onChange={onListChange} /> : null}
      {addError ? <AddError message={addError} /> : null}
      <AddButton
        label={addLabel}
        adding={adding}
        disabled={summary.kept === 0}
        hint
        onClick={onAdd}
        className="mt-1"
      />
      <p className="text-center text-xs text-dash-ink-soft">
        {mode === "more"
          ? `Tasks go to ${destination}.`
          : `Tasks go to ${listState.other ? "" : "a new list, "}${destination}.`}
      </p>
    </aside>
  );
}

/** The Cut tray (screen 8h): every cut card, with Bring back. */
export function CutTray({
  open,
  onOpenChange,
  tasks,
  phases,
  planStart,
  planEnd,
  onBringBack,
  onBringAllBack,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: DraftTask[];
  phases: PlanPhase[];
  planStart: string;
  planEnd: string;
  onBringBack: (key: string) => void;
  onBringAllBack: () => void;
}) {
  const cut = cutTasks(tasks);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetHeader
        title={`Cut cards (${cut.length})`}
        description="These won't be added. Bring one back and it goes back into its phase."
      />
      <SheetBody>
        {cut.length === 0 ? (
          <p className="py-6 text-center text-sm text-dash-ink-soft">Nothing is cut.</p>
        ) : (
          <ul className="flex flex-col">
            {cut.map((task) => {
              const phase = phases.find((p) => p.id === task.phaseId);
              return (
                <li
                  key={task.key}
                  className="flex min-h-16 items-center gap-3 border-b border-dash-edge last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-medium text-dash-ink">
                      {task.title}
                    </div>
                    {phase ? (
                      <div className="mt-0.5 font-mono text-xs text-dash-ink-soft">
                        {phaseLabel(phase, planStart, planEnd)}
                      </div>
                    ) : null}
                  </div>
                  <DashButton variant="well" onClick={() => onBringBack(task.key)}>
                    <Undo2 aria-hidden />
                    Bring back
                  </DashButton>
                </li>
              );
            })}
          </ul>
        )}
      </SheetBody>
      <SheetFooter>
        <DashButton
          variant="secondary"
          className="flex-1"
          disabled={cut.length === 0}
          onClick={onBringAllBack}
        >
          Bring all back
        </DashButton>
        <DashButton className="flex-1" onClick={() => onOpenChange(false)}>
          Done
        </DashButton>
      </SheetFooter>
    </Sheet>
  );
}
