import "server-only";
import { todayIn } from "@/lib/dates";
import { fakeFollowups, fakeMore, fakePlan, fakeQuestions } from "@/modules/planner/fake";
import {
  FOLLOWUPS_JSON_SCHEMA,
  MORE_JSON_SCHEMA,
  PLAN_JSON_SCHEMA,
  QUESTIONS_JSON_SCHEMA,
} from "@/modules/planner/json-schema";
import {
  buildFollowupsMessage,
  buildMoreMessage,
  buildPlanMessage,
  buildQuestionsMessage,
  FOLLOWUPS_SYSTEM_PROMPT,
  MORE_SYSTEM_PROMPT,
  PLAN_SYSTEM_PROMPT,
  QUESTIONS_SYSTEM_PROMPT,
  type PlannerContext,
} from "@/modules/planner/prompt";
import { resolveMoreTasks, resolvePlan, resolveQuestions } from "@/modules/planner/resolve";
import {
  modelMore,
  modelPlan,
  modelQuestions,
  planEndDate,
  type DraftPlan,
  type DraftTask,
  type PlanAnswer,
  type PlanQuestion,
} from "@/modules/planner/schema";
import { recordAiUsage } from "@/server/data/ai-usage";
import { listLists } from "@/server/data/lists";
import { getPlanTasks, type PlanRecord } from "@/server/data/plans";
import { getUserSettings } from "@/server/data/settings";
import type { AiFeature } from "@/server/db/schema";
import { getVoiceConfig, type VoiceConfig } from "@/server/env";
import { completeJson, GroqError } from "@/server/groq";
import { takeVoiceRequest } from "@/server/voice-limit";

/**
 * The AI planner on the server (docs/plans-module-spec.md, docs/planner-spec.md): checks the key
 * and the shared voice rate limit, builds the context, calls Groq or the fake, resolves the reply,
 * and writes one `ai_usage` row per call (counts only). A rate limit from Groq is waited out once
 * inside `groq.ts` (its retry-after, up to 10 seconds, else 3) before it reaches here as
 * `rate_limited`. Nothing here saves a plan; nothing here logs the goal or the answers.
 */

export type PlannerFailure =
  "off" | "limit_minute" | "limit_day" | "rate_limited" | "unavailable" | "bad_dates";

export const PLANNER_MESSAGES: Record<PlannerFailure, string> = {
  off: "The planner isn't set up on this Ledge yet.",
  limit_minute: "That's a lot of planning in a minute. Wait a moment and try again.",
  limit_day: "That's a lot of planning today. Try again tomorrow.",
  rate_limited: "Ledge is busy right now. Try again in a minute.",
  unavailable: "Ledge couldn't make a plan right now. Try again.",
  bad_dates: "Pick an end date between tomorrow and six months from today.",
};

export type PlannerOutcome<T> = { ok: true; data: T } | { ok: false; failure: PlannerFailure };

/** Is the planner usable (a Groq key, or fake mode)? It does not need voice switched on. */
export function plannerAvailable(): boolean {
  return getVoiceConfig().enabled;
}

function admit(userId: string): PlannerOutcome<VoiceConfig> {
  const config = getVoiceConfig();
  if (!config.enabled) return { ok: false, failure: "off" };
  const taken = takeVoiceRequest(userId, config.dailyLimit);
  if (!taken.ok) {
    return { ok: false, failure: taken.reason === "day" ? "limit_day" : "limit_minute" };
  }
  return { ok: true, data: config };
}

function fromGroq(error: unknown): PlannerFailure {
  if (error instanceof GroqError) {
    if (error.kind === "rate_limited") return "rate_limited";
    console.error(`Planner: Groq ${error.kind}: ${error.message}`);
    return "unavailable";
  }
  console.error("Planner: unexpected failure");
  return "unavailable";
}

async function loadContext(userId: string) {
  const settings = await getUserSettings(userId);
  // General (the default list) is never offered as a plan's home. Only names are sent.
  const lists = (await listLists(userId)).filter((l) => !l.isInbox);
  const today = todayIn(settings.timezone);
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" }).format(
    new Date(`${today}T00:00:00Z`),
  );
  const context: PlannerContext = {
    today,
    weekday,
    timeZone: settings.timezone,
    lists: lists.map((l) => l.name),
  };
  return { context, today };
}

type Call = {
  feature: AiFeature;
  planId: string;
  system: string;
  user: string;
  schemaName: string;
  schema: object;
  fake: () => unknown;
};

/** Admits the request, asks Groq (or the fake), and records the usage. Returns the raw reply. */
async function generate(userId: string, call: Call): Promise<PlannerOutcome<unknown>> {
  const admitted = admit(userId);
  if (!admitted.ok) return admitted;
  const config = admitted.data;
  if (config.fake) {
    await recordAiUsage(userId, { feature: call.feature, model: "fake", planId: call.planId });
    return { ok: true, data: call.fake() };
  }
  try {
    const completed = await completeJson(
      config,
      call.system,
      call.user,
      call.schemaName,
      call.schema,
    );
    await recordAiUsage(userId, {
      feature: call.feature,
      model: completed.usage.model,
      inputTokens: completed.usage.inputTokens,
      outputTokens: completed.usage.outputTokens,
      planId: call.planId,
    });
    return { ok: true, data: completed.data };
  } catch (error) {
    return { ok: false, failure: fromGroq(error) };
  }
}

/** What the engine needs from a draft: loaded by the action, so the user already owns it. */
type DraftInput = Pick<PlanRecord, "id" | "goal" | "basics">;

export async function askQuestionsForUser(
  userId: string,
  plan: DraftInput,
): Promise<PlannerOutcome<PlanQuestion[]>> {
  if (!plan.basics) return { ok: false, failure: "unavailable" };
  const { context, today } = await loadContext(userId);
  const basics = plan.basics;
  const reply = await generate(userId, {
    feature: "plan_questions",
    planId: plan.id,
    system: QUESTIONS_SYSTEM_PROMPT,
    user: buildQuestionsMessage(context, plan.goal, basics, planEndDate(basics, today)),
    schemaName: "ledge_plan_questions",
    schema: QUESTIONS_JSON_SCHEMA,
    fake: fakeQuestions,
  });
  if (!reply.ok) return reply;
  const parsed = modelQuestions.safeParse(reply.data);
  if (!parsed.success) return { ok: false, failure: "unavailable" };
  const questions = resolveQuestions(parsed.data, "questions");
  return questions.length > 0
    ? { ok: true, data: questions }
    : { ok: false, failure: "unavailable" };
}

/** One round only (the action enforces it). An empty list is a good answer: nothing to ask. */
export async function askFollowupsForUser(
  userId: string,
  plan: DraftInput,
  answers: PlanAnswer[],
): Promise<PlannerOutcome<PlanQuestion[]>> {
  if (!plan.basics) return { ok: false, failure: "unavailable" };
  const { context, today } = await loadContext(userId);
  const basics = plan.basics;
  const reply = await generate(userId, {
    feature: "plan_followups",
    planId: plan.id,
    system: FOLLOWUPS_SYSTEM_PROMPT,
    user: buildFollowupsMessage(context, plan.goal, basics, planEndDate(basics, today), answers),
    schemaName: "ledge_plan_followups",
    schema: FOLLOWUPS_JSON_SCHEMA,
    fake: fakeFollowups,
  });
  if (!reply.ok) return reply;
  const parsed = modelQuestions.safeParse(reply.data);
  if (!parsed.success) return { ok: false, failure: "unavailable" };
  return { ok: true, data: resolveQuestions(parsed.data, "followups") };
}

export async function makePlanForUser(
  userId: string,
  plan: DraftInput,
  answers: PlanAnswer[],
): Promise<PlannerOutcome<DraftPlan>> {
  if (!plan.basics) return { ok: false, failure: "unavailable" };
  const { context, today } = await loadContext(userId);
  const basics = plan.basics;
  const end = planEndDate(basics, today);
  if (!end) return { ok: false, failure: "bad_dates" };
  const reply = await generate(userId, {
    feature: "plan_make",
    planId: plan.id,
    system: PLAN_SYSTEM_PROMPT,
    user: buildPlanMessage(context, plan.goal, basics, end, answers),
    schemaName: "ledge_plan",
    schema: PLAN_JSON_SCHEMA,
    fake: () => fakePlan(plan.goal, basics, today, end),
  });
  if (!reply.ok) return reply;
  const parsed = modelPlan.safeParse(reply.data);
  if (!parsed.success) return { ok: false, failure: "unavailable" };
  const draft = resolvePlan(parsed.data, { today, end });
  if (draft.tasks.length === 0) return { ok: false, failure: "unavailable" };
  return { ok: true, data: draft };
}

/**
 * "Add more tasks": suggestions continuing the plan from today. Only this plan's task titles and
 * done state are sent. Nothing is saved.
 */
export async function moreTasksForUser(
  userId: string,
  plan: PlanRecord,
): Promise<PlannerOutcome<DraftTask[]>> {
  const { context, today } = await loadContext(userId);
  const own = (await getPlanTasks(userId, plan.id)).filter((t) => !t.parentId);
  const reply = await generate(userId, {
    feature: "plan_more",
    planId: plan.id,
    system: MORE_SYSTEM_PROMPT,
    user: buildMoreMessage(context, {
      goal: plan.goal,
      basics: plan.basics,
      endDate: plan.endDate,
      phases: plan.phases,
      tasks: own.map((t) => ({ title: t.title, done: t.status === "done", phaseId: t.planPhase })),
    }),
    schemaName: "ledge_plan_more",
    schema: MORE_JSON_SCHEMA,
    fake: () => fakeMore(today, plan.phases),
  });
  if (!reply.ok) return reply;
  const parsed = modelMore.safeParse(reply.data);
  if (!parsed.success) return { ok: false, failure: "unavailable" };
  const tasks = resolveMoreTasks(parsed.data, {
    today,
    planEnd: plan.endDate,
    phases: plan.phases,
  });
  return tasks.length > 0 ? { ok: true, data: tasks } : { ok: false, failure: "unavailable" };
}
