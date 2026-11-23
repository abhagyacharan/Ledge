import { z } from "zod";
import { addDaysIso, isIsoDate } from "@/lib/dates";

/**
 * Plans: the shapes (docs/plans-module-spec.md, docs/planner-spec.md). Layers, as in voice capture:
 *  1. `modelQuestions`, `modelPlan`, `modelMore`: what the language model must return (strict mode;
 *     the matching JSON schemas are in json-schema.ts);
 *  2. `PlanQuestion`, `DraftPlan`: what the page shows and edits, after the server checked it;
 *  3. the `*Input` schemas: what the actions accept, validated again.
 */

export const GOAL_MIN = 5;
export const GOAL_MAX = 1000;
export const TITLE_MAX = 80;
export const MIN_QUESTIONS = 3;
export const MAX_QUESTIONS = 6;
export const MAX_FOLLOWUPS = 3;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;
export const MIN_PHASES = 2;
export const MAX_PHASES = 6;
export const MAX_TASKS = 30;
export const MAX_TASKS_PER_PHASE = 8;
export const MAX_MORE_TASKS = 10;
export const MAX_SUBTASKS = 5;
export const MAX_MILESTONES = 3;
export const MIN_RESOURCES = 3;
export const MAX_RESOURCES = 8;
export const MAX_TASK_TITLE = 200;
export const MAX_NOTES = 400;
export const MAX_LIST_NAME = 60;
export const MIN_ESTIMATE = 5;
export const MAX_ESTIMATE = 240;
/** The absolute reach of a plan, in days from today (about six months). */
export const PLAN_WINDOW_DAYS = 183;

export const PRIORITY_WORDS = ["none", "low", "medium", "high"] as const;
export const REPEATS = ["none", "daily", "weekdays", "weekly"] as const;
export type Repeat = (typeof REPEATS)[number];

export const REPEAT_LABELS: Record<Repeat, string> = {
  none: "None",
  daily: "Every day",
  weekdays: "Weekdays",
  weekly: "Every week",
};

export const QUESTION_KINDS = ["single", "multi", "scale", "text"] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];

export const RESOURCE_KINDS = ["book", "course", "video", "community", "tool", "article"] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number];

export const RESOURCE_KIND_LABELS: Record<ResourceKind, string> = {
  book: "Book",
  course: "Course",
  video: "Video channel",
  community: "Community",
  tool: "Tool",
  article: "Article",
};

const isoDate = z.string().refine(isIsoDate, "Pick a valid date");

// ---------------------------------------------------------------------------------------------
// Basics: asked by the app itself, no AI.

export const LENGTH_PRESETS = ["1w", "2w", "1m", "3m"] as const;
export const LENGTH_DAYS: Record<(typeof LENGTH_PRESETS)[number], number> = {
  "1w": 7,
  "2w": 14,
  "1m": 30,
  "3m": 91,
};
export const MINUTES_CHOICES = [15, 30, 60, 120] as const;

export const basicsSchema = z.object({
  length: z.union([z.enum(LENGTH_PRESETS), z.object({ date: isoDate })]),
  minutesPerDay: z.union([
    z.literal(15),
    z.literal(30),
    z.literal(60),
    z.literal(120),
    z.literal("weekends"),
  ]),
});
export type PlanBasics = z.infer<typeof basicsSchema>;

/**
 * The plan's last day for these basics, or null when a custom date is outside the allowed reach
 * (tomorrow up to 183 days from today). A preset of N days runs today through today + N - 1.
 */
export function planEndDate(basics: PlanBasics, today: string): string | null {
  const max = addDaysIso(today, PLAN_WINDOW_DAYS);
  if (typeof basics.length === "string") {
    const end = addDaysIso(today, LENGTH_DAYS[basics.length] - 1);
    return end > max ? max : end;
  }
  const date = basics.length.date;
  return date > today && date <= max ? date : null;
}

/** "1 month" etc., for prompts and headings. */
export function describeBasics(basics: PlanBasics): { length: string; time: string } {
  const length =
    typeof basics.length === "string"
      ? { "1w": "1 week", "2w": "2 weeks", "1m": "1 month", "3m": "3 months" }[basics.length]
      : `until ${basics.length.date}`;
  const time =
    basics.minutesPerDay === "weekends"
      ? "weekends only"
      : basics.minutesPerDay >= 60
        ? `${basics.minutesPerDay / 60} hour${basics.minutesPerDay === 60 ? "" : "s"} a day`
        : `${basics.minutesPerDay} minutes a day`;
  return { length, time };
}

// ---------------------------------------------------------------------------------------------
// 1. The model's replies. Every field is present; null means "not said".

export const modelQuestion = z.object({
  id: z.string(),
  kind: z.enum(QUESTION_KINDS),
  text: z.string(),
  options: z.array(z.string()),
  scaleLow: z.string().nullable(),
  scaleHigh: z.string().nullable(),
  because: z.string().nullable(),
});

/** The questions step and the follow-ups step share one reply shape. */
export const modelQuestions = z.object({ questions: z.array(modelQuestion) });

export const modelPlanTask = z.object({
  title: z.string(),
  notes: z.string().nullable(),
  phaseId: z.string(),
  dueDate: z.string().nullable(),
  priority: z.enum(PRIORITY_WORDS),
  repeat: z.enum(REPEATS),
  repeatUntil: z.string().nullable(),
  estimateMinutes: z.number().nullable(),
  milestone: z.boolean(),
  subtasks: z.array(z.string()),
});

export const modelPhase = z.object({
  id: z.string(),
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
});

export const modelResource = z.object({
  name: z.string(),
  kind: z.enum(RESOURCE_KINDS),
  why: z.string(),
});

export const modelPlan = z.object({
  title: z.string(),
  listName: z.string(),
  summary: z.string(),
  phases: z.array(modelPhase),
  tasks: z.array(modelPlanTask),
  resources: z.array(modelResource),
});

export const modelMore = z.object({ tasks: z.array(modelPlanTask) });

export type ModelQuestions = z.infer<typeof modelQuestions>;
export type ModelPlan = z.infer<typeof modelPlan>;
export type ModelPlanTask = z.infer<typeof modelPlanTask>;
export type ModelMore = z.infer<typeof modelMore>;

// ---------------------------------------------------------------------------------------------
// 2. What the page shows and edits. Also what is stored (validated again on read).

export const planQuestionSchema = z.object({
  id: z.string().min(1).max(20),
  kind: z.enum(QUESTION_KINDS),
  text: z.string().min(1).max(200),
  options: z.array(z.string().min(1).max(80)).max(MAX_OPTIONS),
  scaleLabels: z.object({ low: z.string().max(40), high: z.string().max(40) }).nullable(),
  because: z.string().max(80).nullable(),
});
export type PlanQuestion = z.infer<typeof planQuestionSchema>;

const answerValue = z.union([
  z.string().max(300),
  z.array(z.string().max(300)).max(MAX_OPTIONS),
  z.number().int().min(1).max(5),
  z.null(),
]);

/** One answer. `value` null means skipped; `custom` is "Type my own" (kept beside any ticks). */
export const planAnswerSchema = z.object({
  questionId: z.string().min(1).max(20),
  question: z.string().max(300),
  kind: z.enum(QUESTION_KINDS),
  value: answerValue,
  custom: z.string().max(300).nullable(),
});
export type PlanAnswer = z.infer<typeof planAnswerSchema>;

export const draftTaskSchema = z.object({
  key: z.string().min(1).max(20),
  title: z.string().trim().min(1, "Give the task a title").max(MAX_TASK_TITLE),
  /** How and why, without the estimate line (that is stored from `estimateMinutes`). */
  notes: z.string().max(MAX_NOTES),
  phaseId: z.string().min(1).max(40),
  dueDate: isoDate.nullable(),
  /** 0 none, 1 low, 2 medium, 3 high. */
  priority: z.number().int().min(0).max(3),
  repeat: z.enum(REPEATS),
  repeatUntil: isoDate.nullable(),
  estimateMinutes: z.number().int().min(MIN_ESTIMATE).max(MAX_ESTIMATE).nullable(),
  milestone: z.boolean(),
  subtasks: z.array(z.string().trim().min(1).max(MAX_TASK_TITLE)).max(MAX_SUBTASKS),
  /** Set when the code changed something the model said; the card asks the user to check it. */
  check: z.string().max(300).nullable(),
  /** Cut in the review: kept in the draft so it can be brought back, never saved as a task. */
  cut: z.boolean().optional(),
});
export type DraftTask = z.infer<typeof draftTaskSchema>;

export const planPhaseSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().trim().min(1).max(40),
  startDate: isoDate,
  endDate: isoDate,
});
export type PlanPhase = z.infer<typeof planPhaseSchema>;

/** A resource: the model gives name, kind and why only; `url` can only be one the user pasted. */
export const planResourceSchema = z.object({
  id: z.string().min(1).max(20),
  name: z.string().trim().min(1).max(80),
  kind: z.enum(RESOURCE_KINDS),
  why: z.string().max(160),
  used: z.boolean(),
  url: z
    .string()
    .max(500)
    .refine((value) => {
      try {
        const protocol = new URL(value).protocol;
        return protocol === "http:" || protocol === "https:";
      } catch {
        return false;
      }
    }, "Paste a web address that starts with http:// or https://")
    .nullable(),
});
export type PlanResource = z.infer<typeof planResourceSchema>;

export const draftPlanSchema = z
  .object({
    title: z.string().trim().min(1, "Give the plan a name").max(TITLE_MAX),
    listName: z.string().trim().min(1).max(MAX_LIST_NAME),
    summary: z.string().max(300),
    startDate: isoDate,
    endDate: isoDate,
    phases: z.array(planPhaseSchema).min(MIN_PHASES).max(MAX_PHASES),
    tasks: z.array(draftTaskSchema).min(1, "Add at least one task").max(MAX_TASKS),
    resources: z.array(planResourceSchema).max(MAX_RESOURCES),
  })
  .superRefine((plan, ctx) => {
    const ids = new Set(plan.phases.map((p) => p.id));
    if (ids.size !== plan.phases.length) {
      ctx.addIssue({ code: "custom", path: ["phases"], message: "Phases need different ids" });
    }
    plan.tasks.forEach((task, index) => {
      if (!ids.has(task.phaseId)) {
        ctx.addIssue({ code: "custom", path: ["tasks", index], message: "Unknown phase" });
      }
      if (task.repeat !== "none" && !task.dueDate) {
        ctx.addIssue({ code: "custom", path: ["tasks", index], message: "A repeat needs a date" });
      }
      if (task.repeatUntil && task.dueDate && task.repeatUntil < task.dueDate) {
        ctx.addIssue({
          code: "custom",
          path: ["tasks", index],
          message: "The repeat can't end before it starts",
        });
      }
    });
  });

/** What the review shows and edits. The list choice is made when adding (Add plan). */
export type DraftPlan = z.infer<typeof draftPlanSchema>;

// ---------------------------------------------------------------------------------------------
// 3. What the actions accept.

const goal = z.string().trim().min(GOAL_MIN, "Say a little more about your goal").max(GOAL_MAX);
const planId = z.uuid();

export const startPlanInput = z.object({ goal });
export const saveGoalInput = z.object({ planId, goal });
export const planIdInput = z.object({ planId });
export const saveBasicsInput = z.object({ planId, basics: basicsSchema });
export const saveAnswersInput = z.object({
  planId,
  answers: z.array(planAnswerSchema).max(MAX_QUESTIONS),
  /** True when the person has moved on from this step, so the draft resumes at the next one. */
  done: z.boolean().optional(),
});
export const saveFollowupAnswersInput = z.object({
  planId,
  answers: z.array(planAnswerSchema).max(MAX_FOLLOWUPS),
  done: z.boolean().optional(),
});
export const saveReviewInput = z.object({ planId, draft: draftPlanSchema });

export const listChoiceInput = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("new"),
    name: z.string().trim().min(1, "Give the list a name").max(MAX_LIST_NAME),
  }),
  z.object({ kind: z.literal("existing"), listId: z.uuid() }),
]);
export type ListChoice = z.infer<typeof listChoiceInput>;

export const addPlanInput = z.object({ planId, draft: draftPlanSchema, list: listChoiceInput });

/** What Add plan returns so one Undo can take it back and put the draft back at review. */
export const planReceiptSchema = z.object({
  planId,
  listId: z.uuid(),
  listName: z.string().max(MAX_LIST_NAME + 40),
  listCreated: z.boolean(),
  taskIds: z.array(z.uuid()).max(MAX_TASKS),
  summary: z.string().max(200),
  draft: draftPlanSchema,
});
export type PlanReceipt = z.infer<typeof planReceiptSchema>;

export const addMoreTasksInput = z.object({
  planId,
  tasks: z.array(draftTaskSchema).min(1, "Add at least one task").max(MAX_MORE_TASKS),
});

export const moreReceiptSchema = z.object({
  planId,
  taskIds: z.array(z.uuid()).max(MAX_MORE_TASKS),
  summary: z.string().max(200),
});
export type MoreReceipt = z.infer<typeof moreReceiptSchema>;

export const renamePlanInput = z.object({
  planId,
  title: z.string().trim().min(1, "Give the plan a name").max(TITLE_MAX),
});

export const setPlanStatusInput = z.object({
  planId,
  status: z.enum(["active", "done", "archived"]),
});

export const reschedulePlanInput = z.object({
  planId,
  schedule: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("shift"), days: z.number().int().min(-60).max(365) }),
    z.object({ mode: z.literal("spread"), endDate: isoDate }),
  ]),
});

export const deletePlanInput = z.object({ planId, withTasks: z.boolean() });

export const updateResourcesInput = z.object({
  planId,
  resources: z.array(planResourceSchema).max(20),
});

/** Draft statuses of a plan's follow-up round, for the one-round rule. */
export function canAskFollowups(plan: { followups: PlanQuestion[] | null }): boolean {
  return plan.followups === null;
}
