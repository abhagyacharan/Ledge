import { formatInr, formatUsd, microsToPaise } from "@/lib/ai-cost";

/**
 * The words and groupings on the Plans screens (docs/plans designs, 8a to 8n). Pure, so they are
 * unit tested; the pages only lay them out. Types are structural so this file never imports server
 * code.
 */

// ---------------------------------------------------------------------------------------------
// Plans home

export const PLAN_FILTERS = ["active", "drafts", "done", "archived"] as const;
export type PlanFilter = (typeof PLAN_FILTERS)[number];

export const FILTER_LABELS: Record<PlanFilter, string> = {
  active: "Active",
  drafts: "Drafts",
  done: "Done",
  archived: "Archived",
};

/** `?status=` to a filter; anything else is "active". */
export function parseFilter(value: string | string[] | undefined): PlanFilter {
  const v = Array.isArray(value) ? value[0] : value;
  return PLAN_FILTERS.find((f) => f === v) ?? "active";
}

type StatusLike = { status: "draft" | "active" | "done" | "archived" };

/** Whether a plan shows under a filter. Drafts also show first under Active (design 8a). */
export function inFilter(plan: StatusLike, filter: PlanFilter): boolean {
  if (filter === "active") return plan.status === "active" || plan.status === "draft";
  if (filter === "drafts") return plan.status === "draft";
  return plan.status === filter;
}

export function countByFilter(plans: StatusLike[]): Record<PlanFilter, number> {
  return {
    active: plans.filter((p) => inFilter(p, "active")).length,
    drafts: plans.filter((p) => inFilter(p, "drafts")).length,
    done: plans.filter((p) => inFilter(p, "done")).length,
    archived: plans.filter((p) => inFilter(p, "archived")).length,
  };
}

type DraftLike = {
  step: "goal" | "basics" | "questions" | "followups" | "making" | "review" | null;
  questions: unknown[] | null;
  followups: unknown[] | null;
  answers: { questionId: string }[];
};

/**
 * Where a draft stands, in words: "Draft · question 3 of 5". A follow-up id starts with "f"
 * (src/server/data/plans.ts), so the two rounds are counted apart.
 */
export function draftStepText(plan: DraftLike): string {
  switch (plan.step) {
    case "questions": {
      const total = plan.questions?.length ?? 0;
      if (total === 0) return "Draft · questions next";
      const answered = plan.answers.filter((a) => !a.questionId.startsWith("f")).length;
      return `Draft · question ${Math.min(answered + 1, total)} of ${total}`;
    }
    case "followups": {
      const total = plan.followups?.length ?? 0;
      if (total === 0) return "Draft · a few more questions";
      const answered = plan.answers.filter((a) => a.questionId.startsWith("f")).length;
      return `Draft · follow-up ${Math.min(answered + 1, total)} of ${total}`;
    }
    case "making":
      return "Draft · making the plan";
    case "review":
      return "Draft · ready to review";
    case "goal":
    case "basics":
    default:
      return "Draft · the basics";
  }
}

/** Whole-number percent, never 100 until everything is done. */
export function progressPercent(done: number, total: number): number {
  if (total <= 0) return 0;
  const raw = Math.round((done / total) * 100);
  return done < total ? Math.min(raw, 99) : 100;
}

/** "24 days left", "Last day", "Ended 3 days ago". Null without an end date. */
export function daysLeftText(daysLeft: number | null): string | null {
  if (daysLeft === null) return null;
  if (daysLeft > 1) return `${daysLeft} days left`;
  if (daysLeft === 1) return "1 day left";
  if (daysLeft === 0) return "Last day";
  const ago = -daysLeft;
  return ago === 1 ? "Ended yesterday" : `Ended ${ago} days ago`;
}

/** "4 of 18 · 24 days left" (the card) and "4 of 18 done · 24 days left" (the page). */
export function progressLine(
  done: number,
  total: number,
  daysLeft: number | null,
  options: { word?: boolean; finished?: boolean } = {},
): string {
  const count = `${done} of ${total}${options.word ? " done" : ""}`;
  const left = options.finished ? null : daysLeftText(daysLeft);
  return left ? `${count} · ${left}` : count;
}

// ---------------------------------------------------------------------------------------------
// A plan's page

type PhaseLike = { id: string; name: string };
type TaskLike = {
  id: string;
  parentId: string | null;
  status: "open" | "done";
  planPhase: string | null;
};

export type PhaseGroup<T extends TaskLike> = {
  id: string;
  name: string;
  /** Top-level tasks, in the order they were given (the server sorts them). */
  tasks: T[];
  done: number;
  total: number;
};

/**
 * Splits a plan's tasks (top-level and subtasks together, as `getPlanTasks` returns them) into its
 * phases. Tasks whose phase is gone go to an "Other" group at the end. Empty phases are kept, so
 * a phase with no tasks yet still shows; "Other" is dropped when empty.
 */
export function groupByPhase<T extends TaskLike>(phases: PhaseLike[], all: T[]): PhaseGroup<T>[] {
  const top = all.filter((t) => t.parentId === null);
  const known = new Set(phases.map((p) => p.id));
  const make = (id: string, name: string, tasks: T[]): PhaseGroup<T> => ({
    id,
    name,
    tasks,
    done: tasks.filter((t) => t.status === "done").length,
    total: tasks.length,
  });
  const groups = phases.map((p) =>
    make(
      p.id,
      p.name,
      top.filter((t) => t.planPhase === p.id),
    ),
  );
  const other = top.filter((t) => !t.planPhase || !known.has(t.planPhase));
  if (other.length > 0) groups.push(make("other", "Other", other));
  return groups;
}

/** A phone phase with more rows than this folds the rest behind "N more tasks". */
export const PHONE_FOLD_AT = 7;
export const PHONE_SHOWN = 5;

/**
 * Which tasks of a phase to show. Desktop folds the done ones while something is still open
 * (design 8k, "Show 3 done"); the phone folds the tail of a long phase (design 8j, "6 more
 * tasks"). A finished plan is never folded: it is a record.
 */
export function visibleTasks<T extends TaskLike>(
  tasks: T[],
  options: {
    desktop: boolean;
    showDone: boolean;
    expanded: boolean;
    folding: boolean;
  },
): { shown: T[]; hiddenDone: number; hiddenMore: number } {
  if (!options.folding) return { shown: tasks, hiddenDone: 0, hiddenMore: 0 };
  if (options.desktop) {
    const open = tasks.filter((t) => t.status === "open");
    if (open.length === 0 || options.showDone)
      return { shown: tasks, hiddenDone: 0, hiddenMore: 0 };
    return { shown: open, hiddenDone: tasks.length - open.length, hiddenMore: 0 };
  }
  if (options.expanded || tasks.length <= PHONE_FOLD_AT) {
    return { shown: tasks, hiddenDone: 0, hiddenMore: 0 };
  }
  return {
    shown: tasks.slice(0, PHONE_SHOWN),
    hiddenDone: 0,
    hiddenMore: tasks.length - PHONE_SHOWN,
  };
}

/** "AI used for this plan: ..." second line: "4 requests · 9,800 tokens · about $0.004 (₹0.34)". */
export function planAiLine(
  usage: { requests: number; tokens: number; costMicros: number },
  usdToInr: number,
): string {
  const requests = `${usage.requests} ${usage.requests === 1 ? "request" : "requests"}`;
  const tokens = `${usage.tokens.toLocaleString("en-US")} tokens`;
  return `${requests} · ${tokens} · ${costWords(usage.costMicros, usdToInr)}`;
}

/** "about $0.004 (₹0.34)": every cost shown about AI says "about". */
export function costWords(micros: number, usdToInr: number): string {
  return `about ${formatUsd(micros)} (${formatInr(microsToPaise(micros, usdToInr))})`;
}

/** The footer line on Plans home: "AI this month: 9 requests · about $0.01". */
export function monthAiLine(requests: number, micros: number): string {
  return `${requests} ${requests === 1 ? "request" : "requests"} · about ${formatUsd(micros)}`;
}

// ---------------------------------------------------------------------------------------------
// Home

type HintPlan = { title: string; done: number; total: number; next: string | null };

export type PlansHint = { line: string; figure: string; sub: string };

/**
 * Home's Plans row (design 8n). `plans` are the active plans, the most recently touched first.
 * One plan: "Freelancing · 4 of 18 done · next: Write your pitch". Two or more: "2 plans · next:
 * Write your pitch". None: an invitation.
 */
export function plansHint(plans: HintPlan[]): PlansHint {
  const first = plans[0];
  if (!first) {
    return {
      line: "Plan a goal and turn it into tasks",
      figure: "No plans yet",
      sub: "plan a goal",
    };
  }
  const next = first.next ? ` · next: ${first.next}` : "";
  if (plans.length > 1) {
    return {
      line: `${plans.length} plans${next}`,
      figure: `${plans.length} plans`,
      sub: first.next ? `next: ${first.next}` : "all caught up",
    };
  }
  const allDone = first.total > 0 && first.done >= first.total;
  return {
    line: `${first.title} · ${first.done} of ${first.total} done${allDone ? "" : next}`,
    figure: `${first.done} of ${first.total}`,
    sub: allDone ? `${first.title}, all done` : `${first.title}${next}`,
  };
}

// ---------------------------------------------------------------------------------------------
// Settings: AI usage

export type FeatureLike = {
  feature: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  costMicros: number;
};

export type UsageRow = { requests: number; tokens: number; costMicros: number };
export type GroupedUsage = { voice: UsageRow; planner: UsageRow; total: UsageRow };

const emptyRow = (): UsageRow => ({ requests: 0, tokens: 0, costMicros: 0 });

/** Voice (voice_*) and Planner (plan_*) rows, and their total. Anything else counts only in the total. */
export function groupFeatures(features: FeatureLike[]): GroupedUsage {
  const out: GroupedUsage = { voice: emptyRow(), planner: emptyRow(), total: emptyRow() };
  for (const f of features) {
    const row = f.feature.startsWith("voice_")
      ? out.voice
      : f.feature.startsWith("plan_")
        ? out.planner
        : null;
    for (const target of row ? [row, out.total] : [out.total]) {
      target.requests += f.requests;
      target.tokens += f.inputTokens + f.outputTokens;
      target.costMicros += f.costMicros;
    }
  }
  return out;
}

/** Paise to the rupees field's text: "85", "85.5", "85.25". */
export function rupeesText(paise: number): string {
  return String(paise / 100);
}

/** The rupees field's text to paise, or null when it is not a sensible rate (₹1 to ₹1,000). */
export function parseRupees(text: string): number | null {
  const cleaned = text.trim().replace(/^₹/, "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const paise = Math.round(Number(cleaned) * 100);
  return paise >= 100 && paise <= 100000 ? paise : null;
}

// ---------------------------------------------------------------------------------------------
// "What you told Ledge"

type BasicsLike = {
  length: "1w" | "2w" | "1m" | "3m" | { date: string };
  minutesPerDay: 15 | 30 | 60 | 120 | "weekends";
};

const LENGTH_WORDS = {
  "1w": "1 week",
  "2w": "2 weeks",
  "1m": "1 month",
  "3m": "3 months",
} as const;

/** "1 month", or "Until Mon 21 Dec" for a chosen date (`formatDate` makes the date's words). */
export function lengthWords(basics: BasicsLike, formatDate: (iso: string) => string): string {
  return typeof basics.length === "string"
    ? LENGTH_WORDS[basics.length]
    : `Until ${formatDate(basics.length.date)}`;
}

/** "30 min a day", "1 hour a day", "2+ hours a day", "Weekends only". */
export function timeWords(basics: BasicsLike): string {
  const m = basics.minutesPerDay;
  if (m === "weekends") return "Weekends only";
  if (m === 60) return "1 hour a day";
  if (m === 120) return "2+ hours a day";
  return `${m} min a day`;
}

type AnswerLike = {
  kind: "single" | "multi" | "scale" | "text";
  value: string | string[] | number | null;
  custom: string | null;
};

/**
 * One answer in words. `mono` marks a scale ("2 of 5"), which the page sets in the mono face.
 * A skipped question reads "Skipped"; "Type my own" text is kept beside any ticks.
 */
export function answerText(answer: AnswerLike): { text: string; mono: boolean } {
  const parts: string[] = [];
  const { value } = answer;
  if (Array.isArray(value)) parts.push(...value);
  else if (typeof value === "string" && value.trim()) parts.push(value.trim());
  if (answer.custom?.trim()) parts.push(answer.custom.trim());
  if (typeof value === "number" && answer.kind === "scale") {
    return { text: `${value} of 5`, mono: true };
  }
  if (typeof value === "number") parts.push(String(value));
  return parts.length > 0
    ? { text: parts.join(", "), mono: false }
    : { text: "Skipped", mono: false };
}

export type ToldRow = { label: string; text: string; mono: boolean };

/**
 * The rows under "What you told Ledge": plan length and time, then each question with its answer in
 * the order asked (both rounds).
 */
export function toldRows(
  basics: { length: string; time: string } | null,
  answers: (AnswerLike & { question: string })[],
): ToldRow[] {
  const rows: ToldRow[] = [];
  if (basics) {
    rows.push({ label: "Plan length", text: basics.length, mono: false });
    rows.push({ label: "Time you can give it", text: basics.time, mono: false });
  }
  for (const a of answers) {
    const { text, mono } = answerText(a);
    rows.push({ label: a.question, text, mono });
  }
  return rows;
}
