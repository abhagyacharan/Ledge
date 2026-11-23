import { addDaysIso, daysBetween, formatRowDay } from "@/lib/dates";
import {
  draftTaskSchema,
  MAX_TASK_TITLE,
  PLAN_WINDOW_DAYS,
  type DraftTask,
  type PlanPhase,
} from "../../schema";

/**
 * Pure logic of the plan review (docs/plans-module-spec.md §2c): the order of the cards, the cut
 * mark, the summary and its wording, the swipe thresholds and the checks that run before Add plan.
 */

// ---------------------------------------------------------------------------------------------
// Cut mark. A cut card keeps its place in the draft (`cut: true`) so it can be brought back;
// Add plan sends only the kept ones, and the server drops any cut card it is sent.

export const isCut = (task: DraftTask): boolean => task.cut === true;

/** The note the code left on a card (a moved date, say). */
export const realCheck = (task: DraftTask): string | null => task.check;

export function setCut(task: DraftTask, cut: boolean): DraftTask {
  return { ...task, cut };
}

export const keptTasks = (tasks: DraftTask[]): DraftTask[] => tasks.filter((t) => !isCut(t));
export const cutTasks = (tasks: DraftTask[]): DraftTask[] => tasks.filter(isCut);

// ---------------------------------------------------------------------------------------------
// Order and labels

/** Tasks grouped by phase, phases in order; the order cards are shown in. */
export function orderedTasks(tasks: DraftTask[], phases: PlanPhase[]): DraftTask[] {
  const known = new Set(phases.map((p) => p.id));
  return [
    ...phases.flatMap((p) => tasks.filter((t) => t.phaseId === p.id)),
    ...tasks.filter((t) => !known.has(t.phaseId)),
  ];
}

export { phaseLabel, phasePrefix } from "../../phase-label";

export function newTaskKey(existing: DraftTask[]): string {
  const taken = new Set(existing.map((t) => t.key));
  for (let i = 0; i < 50; i++) {
    const key = `n${Math.random().toString(36).slice(2, 8)}`;
    if (!taken.has(key)) return key;
  }
  return `n${Date.now().toString(36)}`;
}

export function blankTask(
  existing: DraftTask[],
  phaseId: string,
  dueDate: string | null,
): DraftTask {
  return {
    key: newTaskKey(existing),
    title: "New task",
    notes: "",
    phaseId,
    dueDate,
    priority: 0,
    repeat: "none",
    repeatUntil: null,
    estimateMinutes: null,
    milestone: false,
    subtasks: [],
    check: null,
  };
}

/** Puts `task` after the last task of its phase (or where that phase would start). */
export function insertInPhase(
  tasks: DraftTask[],
  task: DraftTask,
  phases: PlanPhase[],
): DraftTask[] {
  const ordered = orderedTasks(tasks, phases);
  let at = -1;
  ordered.forEach((t, i) => {
    if (t.phaseId === task.phaseId) at = i;
  });
  if (at === -1) {
    // The phase is empty: before the first task of a later phase, so the phase order holds.
    const phaseIndex = phases.findIndex((p) => p.id === task.phaseId);
    const later = new Set(phases.slice(phaseIndex + 1).map((p) => p.id));
    const firstLater = ordered.findIndex((t) => later.has(t.phaseId));
    at = firstLater === -1 ? ordered.length - 1 : firstLater - 1;
  }
  return [...ordered.slice(0, at + 1), task, ...ordered.slice(at + 1)];
}

// ---------------------------------------------------------------------------------------------
// Summary

export type PhaseCount = { phase: PlanPhase; tasks: number; milestones: number; cut: number };

export type Summary = {
  kept: number;
  cut: number;
  repeating: number;
  milestones: number;
  headline: string;
  firstLine: string;
  firstDate: string | null;
  lastDate: string | null;
  perPhase: PhaseCount[];
};

const noun = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function spanWording(startDate: string, endDate: string): string {
  const days = Math.max(1, daysBetween(startDate, endDate) + 1);
  if (days < 7) return noun(days, "day", "days");
  return noun(Math.max(1, Math.round(days / 7)), "week", "weeks");
}

/** "15 tasks over 4 weeks, 2 repeating" */
export function headline(
  kept: number,
  repeating: number,
  startDate: string,
  endDate: string,
): string {
  const base = `${noun(kept, "task", "tasks")} over ${spanWording(startDate, endDate)}`;
  return repeating > 0 ? `${base}, ${repeating} repeating` : base;
}

export function summarize(input: {
  tasks: DraftTask[];
  phases: PlanPhase[];
  startDate: string;
  endDate: string;
  today: string;
  locale: string;
}): Summary {
  const { tasks, phases, startDate, endDate, today, locale } = input;
  const kept = keptTasks(tasks);
  const repeating = kept.filter((t) => t.repeat !== "none").length;
  const milestoneTasks = kept.filter((t) => t.milestone);
  const dates = kept.map((t) => t.dueDate).filter((d): d is string => d !== null);
  const firstDate = dates.length > 0 ? dates.reduce((a, b) => (a < b ? a : b)) : null;
  const lastDate = dates.length > 0 ? dates.reduce((a, b) => (a > b ? a : b)) : null;
  const milestoneDates = milestoneTasks
    .map((t) => t.dueDate)
    .filter((d): d is string => d !== null)
    .sort();
  const day = (iso: string) => formatRowDay(iso, today, locale);
  const parts: string[] = [];
  if (firstDate) parts.push(`First task ${day(firstDate)}.`);
  if (milestoneDates.length === 1) parts.push(`The milestone is ${day(milestoneDates[0])}.`);
  else if (milestoneDates.length > 1) {
    parts.push(`The last milestone is ${day(milestoneDates[milestoneDates.length - 1])}.`);
  }
  return {
    kept: kept.length,
    cut: tasks.length - kept.length,
    repeating,
    milestones: milestoneTasks.length,
    headline: headline(kept.length, repeating, startDate, endDate),
    firstLine: parts.join(" "),
    firstDate,
    lastDate,
    perPhase: phases.map((phase) => {
      const inPhase = tasks.filter((t) => t.phaseId === phase.id);
      const keptHere = keptTasks(inPhase);
      return {
        phase,
        tasks: keptHere.length,
        milestones: keptHere.filter((t) => t.milestone).length,
        cut: inPhase.length - keptHere.length,
      };
    }),
  };
}

/** "6 tasks · 1 milestone", or "No tasks". */
export function phaseCountWording(row: PhaseCount): string {
  if (row.tasks === 0) return "No tasks";
  const base = noun(row.tasks, "task", "tasks");
  return row.milestones > 0 ? `${base} · ${noun(row.milestones, "milestone", "milestones")}` : base;
}

// ---------------------------------------------------------------------------------------------
// Swipe

/** The word shows from this far (pixels). */
export const SWIPE_SHOW_PX = 40;

/** What a drag of `offsetX` pixels is leaning towards: nothing until 40px. */
export function swipeLean(offsetX: number): "cut" | "keep" | null {
  if (Math.abs(offsetX) < SWIPE_SHOW_PX) return null;
  return offsetX < 0 ? "cut" : "keep";
}

/** What letting go at `offsetX` does: past a third of the card's width commits. */
export function swipeCommit(offsetX: number, width: number): "cut" | "keep" | null {
  if (width <= 0 || Math.abs(offsetX) < width / 3) return null;
  return offsetX < 0 ? "cut" : "keep";
}

// ---------------------------------------------------------------------------------------------
// Checks before Add plan

/**
 * Problems per task key: schema problems (empty title...) and dates that have passed or lie
 * beyond the allowed reach, so the message sits on the card it belongs to.
 */
export function taskProblems(tasks: DraftTask[], today: string): Record<string, string> {
  const out: Record<string, string> = {};
  const max = addDaysIso(today, PLAN_WINDOW_DAYS);
  for (const task of tasks) {
    const parsed = draftTaskSchema.safeParse(task);
    if (!parsed.success) {
      out[task.key] = parsed.error.issues[0]?.message ?? "Check this task";
    } else if (task.repeat !== "none" && !task.dueDate) {
      out[task.key] = "A repeat needs a date";
    } else if (task.repeatUntil && task.dueDate && task.repeatUntil < task.dueDate) {
      out[task.key] = "The repeat can't end before it starts";
    } else if (task.dueDate && task.dueDate < today) {
      out[task.key] = "This date has passed. Pick a new one.";
    } else if (task.dueDate && task.dueDate > max) {
      out[task.key] = "This date is more than six months away. Pick an earlier one.";
    } else if (task.repeatUntil && (task.repeatUntil < today || task.repeatUntil > max)) {
      out[task.key] = "Pick an end date within the next six months.";
    }
  }
  return out;
}

/** Truncates a title for a toast: "Pick one offer you can…" */
export function shortTitle(title: string, max = 28): string {
  const clean = title.trim().slice(0, MAX_TASK_TITLE);
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

/** A plain-text estimate: "about 45 min", "about 1 hr 30 min". */
export function estimateWording(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const text = hours === 0 ? `${rest} min` : rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
  return `about ${text}`;
}

export const ESTIMATE_CHOICES = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240] as const;
