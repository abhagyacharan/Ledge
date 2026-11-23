import { addDaysIso, daysBetween, isIsoDate } from "@/lib/dates";
import { formatRule, ruleFor, WEEKDAYS } from "@/lib/recurrence";
import {
  MAX_FOLLOWUPS,
  MAX_LIST_NAME,
  MAX_MILESTONES,
  MAX_MORE_TASKS,
  MAX_NOTES,
  MAX_OPTIONS,
  MAX_PHASES,
  MAX_QUESTIONS,
  MAX_RESOURCES,
  MAX_SUBTASKS,
  MAX_TASK_TITLE,
  MAX_TASKS,
  MAX_TASKS_PER_PHASE,
  MAX_ESTIMATE,
  MIN_ESTIMATE,
  MIN_OPTIONS,
  MIN_PHASES,
  PLAN_WINDOW_DAYS,
  PRIORITY_WORDS,
  TITLE_MAX,
  type DraftPlan,
  type DraftTask,
  type ModelMore,
  type ModelPlan,
  type ModelPlanTask,
  type ModelQuestions,
  type PlanPhase,
  type PlanQuestion,
  type PlanResource,
  type Repeat,
} from "./schema";

/**
 * Turns the model's replies into what the page shows (docs/plans-module-spec.md §3, docs/planner-
 * spec.md "Rules the code enforces"). Nothing the model says is trusted: counts are capped, text
 * is trimmed, dates are held to the plan's window, phases are made contiguous, repeats get a date
 * and an end, and resources never carry a link. Pure, so it is fully unit tested.
 */

const MAX_QUESTION_TEXT = 200;
const MAX_OPTION_TEXT = 80;
const MAX_SCALE_LABEL = 40;
const MAX_BECAUSE = 80;
const MAX_SUMMARY = 300;
const MAX_PHASE_NAME = 40;
const MAX_RESOURCE_NAME = 80;
const MAX_RESOURCE_WHY = 160;
export const FALLBACK_LIST_NAME = "My plan";
const DEFAULT_SCALE = { low: "Not at all", high: "Very much" };

const clean = (text: string, max: number) => text.replace(/\s+/g, " ").trim().slice(0, max).trim();

// ---------------------------------------------------------------------------------------------
// Questions

/**
 * Questions and follow-ups: ids q1.. or f1.., kinds kept, 2 to 6 distinct options for the choice
 * kinds (a choice question that cannot be tapped becomes a text question), scale labels filled
 * in. Follow-ups may carry a short "because". `round` picks the id prefix and the cap.
 */
export function resolveQuestions(
  reply: ModelQuestions,
  round: "questions" | "followups" = "questions",
): PlanQuestion[] {
  const max = round === "questions" ? MAX_QUESTIONS : MAX_FOLLOWUPS;
  const prefix = round === "questions" ? "q" : "f";
  const out: PlanQuestion[] = [];
  for (const q of reply.questions) {
    if (out.length >= max) break;
    const text = clean(q.text, MAX_QUESTION_TEXT);
    if (!text) continue;
    let kind = q.kind;
    let options: string[] = [];
    if (kind === "single" || kind === "multi") {
      const seen = new Set<string>();
      for (const raw of q.options) {
        const option = clean(raw, MAX_OPTION_TEXT);
        const lower = option.toLowerCase();
        if (!option || seen.has(lower)) continue;
        seen.add(lower);
        options.push(option);
        if (options.length >= MAX_OPTIONS) break;
      }
      if (options.length < MIN_OPTIONS) {
        kind = "text";
        options = [];
      }
    }
    const low = clean(q.scaleLow ?? "", MAX_SCALE_LABEL);
    const high = clean(q.scaleHigh ?? "", MAX_SCALE_LABEL);
    const because = round === "followups" ? clean(q.because ?? "", MAX_BECAUSE) : "";
    out.push({
      id: `${prefix}${out.length + 1}`,
      kind,
      text,
      options,
      scaleLabels:
        kind === "scale"
          ? { low: low || DEFAULT_SCALE.low, high: high || DEFAULT_SCALE.high }
          : null,
      because: because || null,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Repeats

/** The stored rule text for a repeat choice, or null for "none". */
export function ruleForRepeat(repeat: Repeat, dueDate: string): string | null {
  switch (repeat) {
    case "none":
      return null;
    case "daily":
      return formatRule(ruleFor("daily", dueDate));
    case "weekdays":
      return formatRule({
        freq: "weekly",
        interval: 1,
        byDay: WEEKDAYS.slice(0, 5),
        byMonthDay: null,
        byMonth: null,
      });
    case "weekly":
      return formatRule(ruleFor("weekly", dueDate));
  }
}

// ---------------------------------------------------------------------------------------------
// Phases

const phaseId = (index: number) => `p${index + 1}`;

/** Splits today..end into `count` contiguous phases of nearly equal length. */
function evenPhases(names: string[], today: string, end: string): PlanPhase[] {
  const days = daysBetween(today, end) + 1;
  const count = Math.max(1, Math.min(names.length, days));
  const phases: PlanPhase[] = [];
  let start = today;
  for (let i = 0; i < count; i++) {
    const last = i === count - 1;
    const stop = last ? end : addDaysIso(today, Math.floor(((i + 1) * days) / count) - 1);
    phases.push({
      id: phaseId(i),
      name: names[i] ?? `Phase ${i + 1}`,
      startDate: start,
      endDate: stop,
    });
    start = addDaysIso(stop, 1);
  }
  return phases;
}

/**
 * 2 to 6 contiguous phases that start today and end on the plan's last day. The model's phase
 * end dates, put in order, decide the boundaries; ones that cannot fit are dropped. Returns the
 * phases and a map from the model's phase ids to the new ones.
 */
export function resolvePhases(
  raw: ModelPlan["phases"],
  today: string,
  end: string,
): { phases: PlanPhase[]; idMap: Map<string, string> } {
  const usable = raw
    .map((p, order) => ({ p, order }))
    .filter(({ p }) => clean(p.name, MAX_PHASE_NAME) !== "")
    .sort((a, b) => {
      const sa = isIsoDate(a.p.startDate) ? a.p.startDate : "9999-12-31";
      const sb = isIsoDate(b.p.startDate) ? b.p.startDate : "9999-12-31";
      return sa === sb ? a.order - b.order : sa < sb ? -1 : 1;
    })
    .slice(0, MAX_PHASES);

  const phases: PlanPhase[] = [];
  const idMap = new Map<string, string>();
  let start = today;
  for (const { p } of usable) {
    if (start > end) break;
    const last = phases.length === usable.length - 1;
    let stop = isIsoDate(p.endDate) ? p.endDate : end;
    if (stop < start) stop = start;
    if (stop > end || last) stop = end;
    const id = phaseId(phases.length);
    phases.push({ id, name: clean(p.name, MAX_PHASE_NAME), startDate: start, endDate: stop });
    idMap.set(p.id, id);
    start = addDaysIso(stop, 1);
  }
  // The last kept phase always runs to the end of the plan.
  const final = phases[phases.length - 1];
  if (final) final.endDate = end;

  if (phases.length >= MIN_PHASES) return { phases, idMap };

  // Too few phases to be a plan: split the window evenly, keeping any name the model gave.
  const names =
    phases.length === 1 ? [phases[0].name, "Keep going"] : ["Getting started", "Keep going"];
  const even = evenPhases(names, today, end);
  const first = usable[0]?.p.id;
  const mapped = new Map<string, string>();
  if (first) mapped.set(first, even[0].id);
  return { phases: even, idMap: mapped };
}

/** The phase whose dates hold `date`, else the nearest one, else the first. */
export function nearestPhase(phases: PlanPhase[], date: string | null): string {
  if (phases.length === 0) return "";
  if (!date) return phases[0].id;
  for (const p of phases) if (date >= p.startDate && date <= p.endDate) return p.id;
  return date < phases[0].startDate ? phases[0].id : phases[phases.length - 1].id;
}

// ---------------------------------------------------------------------------------------------
// Tasks

export type TaskWindow = {
  today: string;
  /** The last day a task may fall on. */
  end: string;
  phases: PlanPhase[];
  /** Maps a model phase id to a real one; unknown ids fall back to the nearest phase by date. */
  idMap?: Map<string, string>;
  /** The most tasks to keep in all. */
  maxTotal: number;
  /** The most tasks to keep in one phase (counting `existing`). */
  maxPerPhase: number;
  /** Prefix for the card keys ("t" for a plan, "m" for more tasks). */
  keyPrefix: string;
};

/** The largest end date any plan may have. */
export const maxPlanEnd = (today: string) => addDaysIso(today, PLAN_WINDOW_DAYS);

/** Capped, clamped, with repeats given a date and an end, subtasks and estimates cleaned. */
export function resolveTasks(raw: ModelPlanTask[], window: TaskWindow): DraftTask[] {
  const { today, end, phases } = window;
  const inWindow = (d: string) => isIsoDate(d) && d >= today && d <= end;
  const perPhase = new Map<string, number>();
  const out: DraftTask[] = [];

  for (const task of raw) {
    if (out.length >= window.maxTotal) break;
    const title = clean(task.title, MAX_TASK_TITLE);
    if (!title) continue;
    const checks: string[] = [];

    let dueDate: string | null = null;
    if (task.dueDate !== null) {
      if (inWindow(task.dueDate)) {
        dueDate = task.dueDate;
      } else if (isIsoDate(task.dueDate)) {
        dueDate = task.dueDate < today ? today : end;
        checks.push("The date was outside the plan, so it was moved to fit.");
      } else {
        checks.push("The date wasn't valid, so it was cleared.");
      }
    }
    let repeat = task.repeat;
    if (repeat !== "none" && !dueDate) {
      dueDate = today;
      checks.push("A repeat needs a date, so it starts today.");
    }
    if (repeat !== "none" && !dueDate) repeat = "none";

    let repeatUntil: string | null = null;
    if (repeat !== "none" && dueDate) {
      const wanted = task.repeatUntil;
      if (wanted === null) {
        repeatUntil = end;
      } else if (inWindow(wanted) && wanted >= dueDate) {
        repeatUntil = wanted;
      } else {
        repeatUntil = end;
        checks.push("The repeat end was changed to fit the plan.");
      }
    }

    const mapped = window.idMap?.get(task.phaseId);
    const known = phases.some((p) => p.id === task.phaseId);
    const phase = mapped ?? (known ? task.phaseId : nearestPhase(phases, dueDate));
    if ((perPhase.get(phase) ?? 0) >= window.maxPerPhase) continue;
    perPhase.set(phase, (perPhase.get(phase) ?? 0) + 1);

    const estimate =
      task.estimateMinutes === null || !Number.isFinite(task.estimateMinutes)
        ? null
        : Math.min(MAX_ESTIMATE, Math.max(MIN_ESTIMATE, Math.round(task.estimateMinutes)));
    // A repeating task is one practice, not a checklist: subtasks cannot repeat.
    const subtasks =
      repeat !== "none"
        ? []
        : task.subtasks
            .map((s) => clean(s, MAX_TASK_TITLE))
            .filter(Boolean)
            .slice(0, MAX_SUBTASKS);
    const priority = Math.max(0, PRIORITY_WORDS.indexOf(task.priority));

    out.push({
      key: `${window.keyPrefix}${out.length + 1}`,
      title,
      notes: (task.notes ?? "").trim().slice(0, MAX_NOTES),
      phaseId: phase,
      dueDate,
      priority,
      repeat,
      repeatUntil,
      estimateMinutes: estimate,
      milestone: task.milestone,
      subtasks,
      check: checks.length > 0 ? checks.join(" ") : null,
    });
  }
  return out;
}

/** 1 to 3 milestones, each forced to high priority. Extra ones become ordinary tasks. */
export function settleMilestones(tasks: DraftTask[], requireOne: boolean): void {
  let kept = 0;
  for (const t of tasks) {
    if (!t.milestone) continue;
    if (kept >= MAX_MILESTONES) t.milestone = false;
    else kept += 1;
  }
  if (kept === 0 && requireOne) {
    // No checkpoint was named: the last one-off task of the plan stands in for it.
    const candidate = [...tasks].reverse().find((t) => t.repeat === "none");
    if (candidate) candidate.milestone = true;
  }
  for (const t of tasks) if (t.milestone) t.priority = 3;
  capHighPriority(tasks);
}

/**
 * High stays rare, so it still means something: at most one task in four (at least the
 * milestones). Models mark most tasks high, so the extra ones, latest first, become medium.
 */
export function capHighPriority(tasks: DraftTask[]): void {
  const limit = Math.max(Math.ceil(tasks.length / 4), tasks.filter((t) => t.milestone).length);
  let high = tasks.filter((t) => t.priority === 3).length;
  for (let i = tasks.length - 1; i >= 0 && high > limit; i--) {
    const t = tasks[i];
    if (t.priority === 3 && !t.milestone) {
      t.priority = 2;
      high -= 1;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Resources

export function resolveResources(raw: ModelPlan["resources"]): PlanResource[] {
  const out: PlanResource[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    if (out.length >= MAX_RESOURCES) break;
    const name = clean(r.name, MAX_RESOURCE_NAME);
    const lower = name.toLowerCase();
    if (!name || seen.has(lower)) continue;
    seen.add(lower);
    // Any link the model wrote is dropped on purpose: `url` only ever holds one the user pasted.
    out.push({
      id: `r${out.length + 1}`,
      name,
      kind: r.kind,
      why: clean(r.why, MAX_RESOURCE_WHY),
      used: false,
      url: null,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// The plan

export type ResolveContext = {
  today: string;
  /** The plan's last day (from the basics), already inside the 183-day reach. */
  end: string;
};

/** One reply to an editable plan: capped, clamped, phased, with milestones and resources. */
export function resolvePlan(reply: ModelPlan, context: ResolveContext): DraftPlan {
  const { today } = context;
  const end = context.end > maxPlanEnd(today) ? maxPlanEnd(today) : context.end;
  const { phases, idMap } = resolvePhases(reply.phases, today, end);
  const tasks = resolveTasks(reply.tasks, {
    today,
    end,
    phases,
    idMap,
    maxTotal: MAX_TASKS,
    maxPerPhase: MAX_TASKS_PER_PHASE,
    keyPrefix: "t",
  });
  settleMilestones(tasks, true);

  const listName = clean(reply.listName, MAX_LIST_NAME) || FALLBACK_LIST_NAME;
  const title = clean(reply.title, TITLE_MAX) || listName.slice(0, TITLE_MAX);
  return {
    title,
    listName,
    summary: clean(reply.summary, MAX_SUMMARY),
    startDate: today,
    endDate: end,
    phases,
    tasks,
    resources: resolveResources(reply.resources),
  };
}

/**
 * "Add more tasks": up to 10 tasks continuing from today inside the plan's own phases. The window
 * ends at the plan's end date, or a week from today when the plan has already run out.
 */
export function resolveMoreTasks(
  reply: ModelMore,
  context: { today: string; planEnd: string | null; phases: PlanPhase[] },
): DraftTask[] {
  const { today, phases } = context;
  const reach = maxPlanEnd(today);
  const minEnd = addDaysIso(today, 6);
  const wanted = context.planEnd && context.planEnd > minEnd ? context.planEnd : minEnd;
  const end = wanted > reach ? reach : wanted;
  const tasks = resolveTasks(reply.tasks, {
    today,
    end,
    phases,
    maxTotal: MAX_MORE_TASKS,
    maxPerPhase: MAX_MORE_TASKS,
    keyPrefix: "m",
  });
  settleMilestones(tasks, false);
  return tasks;
}

/** A short plan title from the goal's first words ("I want to start freelancing" becomes a title). */
export function titleFromGoal(goal: string): string {
  const words = goal
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 7)
    .join(" ");
  const text = words.charAt(0).toUpperCase() + words.slice(1);
  return text.slice(0, TITLE_MAX).trim() || "My plan";
}

/** The last day a plan's tasks touch: the latest date or repeat end. Null when nothing has a date. */
export function planLastDate(
  tasks: { dueDate: string | null; repeat: Repeat; repeatUntil: string | null }[],
): string | null {
  let last: string | null = null;
  for (const t of tasks) {
    for (const d of [t.dueDate, t.repeat === "none" ? null : t.repeatUntil]) {
      if (d && (last === null || d > last)) last = d;
    }
  }
  return last;
}
