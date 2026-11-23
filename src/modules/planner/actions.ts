"use server";

import { addDaysIso, todayIn } from "@/lib/dates";
import { fail, ok } from "@/lib/result";
import { guarded, NOT_FOUND, refresh } from "@/server/action-guard";
import { createList, getList } from "@/server/data/lists";
import { getInbox } from "@/server/data/lists";
import {
  activatePlan,
  addPlanMilestones,
  deleteDraft,
  getPlan,
  removePlanWork,
  renamePlan,
  reschedulePlan,
  restorePlan,
  revertToDraft,
  setPlanStatus,
  trashPlan,
  createDraft,
  updateDraft,
  updatePlanResources,
  type PlanRecord,
} from "@/server/data/plans";
import { getUserSettings } from "@/server/data/settings";
import { createTask } from "@/server/data/tasks";
import {
  askFollowupsForUser,
  askQuestionsForUser,
  makePlanForUser,
  moreTasksForUser,
  PLANNER_MESSAGES,
} from "@/server/planner";
import type { PlanStep } from "@/server/db/schema";
import { composeNotes } from "./estimate";
import { ruleForRepeat, titleFromGoal } from "./resolve";
import {
  addMoreTasksInput,
  addPlanInput,
  canAskFollowups,
  deletePlanInput,
  moreReceiptSchema,
  PLAN_WINDOW_DAYS,
  planEndDate,
  planIdInput,
  planReceiptSchema,
  renamePlanInput,
  reschedulePlanInput,
  saveAnswersInput,
  saveBasicsInput,
  saveFollowupAnswersInput,
  saveGoalInput,
  saveReviewInput,
  setPlanStatusInput,
  startPlanInput,
  updateResourcesInput,
  type DraftPlan,
  type DraftTask,
  type MoreReceipt,
  type PlanQuestion,
  type PlanReceipt,
  type PlanResource,
} from "./schema";

/**
 * The Plans module's server actions (docs/plans-module-spec.md §11). Every one goes through
 * `guarded`: signed-in user, Zod, typed result (`{ ok: true, data } | { ok: false, error }`).
 * `refresh()` re-renders the app shell, which covers `/plans` and `/plans/[id]`.
 *
 * THE UI CONTRACT (inputs / data):
 *
 *  Making a plan (a draft; the draft stores every answer, so leaving and coming back resumes at
 *  `plan.step`, read with `getPlan` from `@/server/data/plans`)
 *   startPlanAction({ goal })                      -> { planId }              creates the draft, step "basics"
 *   saveGoalAction({ planId, goal })               -> { planId }              editing the goal (clears later steps if it changed)
 *   saveBasicsAction({ planId, basics })           -> { planId }              basics: { length, minutesPerDay }
 *   askQuestionsAction({ planId })                 -> { questions }           3-6 questions; stored, so a reload never asks again
 *   saveAnswersAction({ planId, answers, done? })  -> { planId }              autosave; done: true moves the step on
 *   askFollowupsAction({ planId })                 -> { followups }           0-3 questions, ONE round only (a second call returns the stored round, no AI call)
 *   saveFollowupAnswersAction({ planId, answers, done? }) -> { planId }
 *   makePlanAction({ planId })                     -> { draft }               resolved DraftPlan stored in the draft, step "review"; returns the stored one if it exists
 *   remakePlanAction({ planId })                   -> { draft }               makes it again (drafts only); the old draft is kept if the AI fails
 *   saveReviewAction({ planId, draft })            -> { planId }              the review's kept, cut and edited cards
 *   addPlanAction({ planId, draft, list })         -> PlanReceipt             all or nothing; list: { kind: "new", name } | { kind: "existing", listId }
 *   undoAddPlanAction(receipt)                     -> { planId }              back to a draft at review with the draft restored
 *   deleteDraftAction({ planId })                  -> { planId }              erased at once (a draft has no tasks)
 *
 *  Living plans
 *   moreTasksAction({ planId })                    -> { tasks }               DraftTask[] suggestions, not saved
 *   addMoreTasksAction({ planId, tasks })          -> MoreReceipt
 *   undoAddMoreTasksAction(receipt)                -> { planId }
 *   renamePlanAction({ planId, title })            -> { planId }
 *   setPlanStatusAction({ planId, status })        -> { planId }              "active" | "done" | "archived"
 *   reschedulePlanAction({ planId, schedule })     -> { endDate, moved }      schedule: { mode: "shift", days } | { mode: "spread", endDate }
 *   deletePlanAction({ planId, withTasks })        -> { planId, title, withTasks }   to Trash; Undo = restorePlanAction
 *   restorePlanAction({ planId })                  -> { planId }              from Trash, with what went in with it
 *   updateResourcesAction({ planId, resources })   -> { planId }              tick as used, remove, add with an optional pasted http(s) link
 *
 *  Also: `deletePlanForeverAction({ planId })` in `@/modules/todos/actions/trash` for the Trash page.
 *
 * Read helpers (Server Components): `getPlan`, `listPlans`, `getPlanTasks` (`@/server/data/plans`),
 * `getPlanAiUsage` (`@/server/data/ai-usage`), `plannerAvailable` (`@/server/planner`).
 */

const PLAN_GONE = "That plan no longer exists.";
const STEP_ORDER: PlanStep[] = ["goal", "basics", "questions", "followups", "making", "review"];

/** The later of two steps: going Back to an earlier screen never makes a draft forget its progress. */
function advance(current: PlanStep | null, to: PlanStep): PlanStep {
  const a = current ? STEP_ORDER.indexOf(current) : -1;
  return STEP_ORDER[Math.max(a, STEP_ORDER.indexOf(to))] ?? to;
}

async function loadDraft(userId: string, planId: string): Promise<PlanRecord | null> {
  const plan = await getPlan(userId, planId);
  return plan && plan.status === "draft" ? plan : null;
}

const plural = (n: number) => `${n} ${n === 1 ? "task" : "tasks"}`;

// ---------------------------------------------------------------------------------------------
// Making a plan

export async function startPlanAction(input: unknown) {
  return guarded(startPlanInput, input, async ({ goal }, userId) => {
    const plan = await createDraft(userId, { goal, title: titleFromGoal(goal) });
    if (!plan) return fail("You have a lot of unfinished plans. Finish or delete one first.");
    refresh();
    return ok({ planId: plan.id });
  });
}

export async function saveGoalAction(input: unknown) {
  return guarded(saveGoalInput, input, async ({ planId, goal }, userId) => {
    const plan = await loadDraft(userId, planId);
    if (!plan) return fail(PLAN_GONE);
    if (plan.goal !== goal) {
      // A different goal makes the old questions and answers meaningless.
      await updateDraft(userId, planId, {
        goal,
        title: titleFromGoal(goal),
        questions: null,
        answers: null,
        followups: null,
        draft: null,
        step: "basics",
      });
      refresh();
    }
    return ok({ planId });
  });
}

export async function saveBasicsAction(input: unknown) {
  return guarded(saveBasicsInput, input, async ({ planId, basics }, userId) => {
    const plan = await loadDraft(userId, planId);
    if (!plan) return fail(PLAN_GONE);
    const settings = await getUserSettings(userId);
    if (!planEndDate(basics, todayIn(settings.timezone))) {
      return fail(PLANNER_MESSAGES.bad_dates, { basics: PLANNER_MESSAGES.bad_dates });
    }
    await updateDraft(userId, planId, { basics, step: advance(plan.step, "questions") });
    refresh();
    return ok({ planId });
  });
}

export async function askQuestionsAction(input: unknown) {
  return guarded(planIdInput, input, async ({ planId }, userId) => {
    const plan = await loadDraft(userId, planId);
    if (!plan) return fail(PLAN_GONE);
    // Already asked: a reload or Back never costs a second AI call.
    if (plan.questions && plan.questions.length > 0) {
      return ok<{ questions: PlanQuestion[] }>({ questions: plan.questions });
    }
    if (!plan.basics) return fail("Choose the plan length and your time first.");
    const outcome = await askQuestionsForUser(userId, plan);
    if (!outcome.ok) return fail(PLANNER_MESSAGES[outcome.failure]);
    await updateDraft(userId, planId, {
      questions: outcome.data,
      step: advance(plan.step, "questions"),
    });
    return ok<{ questions: PlanQuestion[] }>({ questions: outcome.data });
  });
}

export async function saveAnswersAction(input: unknown) {
  return guarded(saveAnswersInput, input, async ({ planId, answers, done }, userId) => {
    const plan = await loadDraft(userId, planId);
    if (!plan) return fail(PLAN_GONE);
    const asked = new Set((plan.questions ?? []).map((q) => q.id));
    if (!answers.every((a) => asked.has(a.questionId))) return fail("Those answers don't match.");
    const followupIds = new Set((plan.followups ?? []).map((q) => q.id));
    // Replace this round's answers; keep any follow-up answers already given.
    const kept = plan.answers.filter((a) => followupIds.has(a.questionId));
    await updateDraft(userId, planId, {
      answers: [...answers, ...kept],
      step: done ? advance(plan.step, "followups") : undefined,
    });
    return ok({ planId });
  });
}

export async function askFollowupsAction(input: unknown) {
  return guarded(planIdInput, input, async ({ planId }, userId) => {
    const plan = await loadDraft(userId, planId);
    if (!plan) return fail(PLAN_GONE);
    // One round only: a second call returns the stored round and never reaches the AI.
    if (!canAskFollowups(plan)) {
      return ok<{ followups: PlanQuestion[] }>({ followups: plan.followups ?? [] });
    }
    if (!plan.basics || !plan.questions) return fail("Answer the questions first.");
    const outcome = await askFollowupsForUser(userId, plan, plan.answers);
    if (!outcome.ok) return fail(PLANNER_MESSAGES[outcome.failure]);
    await updateDraft(userId, planId, {
      followups: outcome.data,
      step: advance(plan.step, outcome.data.length > 0 ? "followups" : "making"),
    });
    return ok<{ followups: PlanQuestion[] }>({ followups: outcome.data });
  });
}

export async function saveFollowupAnswersAction(input: unknown) {
  return guarded(saveFollowupAnswersInput, input, async ({ planId, answers, done }, userId) => {
    const plan = await loadDraft(userId, planId);
    if (!plan) return fail(PLAN_GONE);
    const asked = new Set((plan.followups ?? []).map((q) => q.id));
    if (!answers.every((a) => asked.has(a.questionId))) return fail("Those answers don't match.");
    const mainIds = new Set((plan.questions ?? []).map((q) => q.id));
    const kept = plan.answers.filter((a) => mainIds.has(a.questionId));
    await updateDraft(userId, planId, {
      answers: [...kept, ...answers],
      step: done ? advance(plan.step, "making") : undefined,
    });
    return ok({ planId });
  });
}

async function makeAndStore(userId: string, plan: PlanRecord) {
  const outcome = await makePlanForUser(userId, plan, plan.answers);
  if (!outcome.ok) return fail(PLANNER_MESSAGES[outcome.failure]);
  const draft = outcome.data;
  await updateDraft(userId, plan.id, {
    draft,
    title: draft.title,
    startDate: draft.startDate,
    endDate: draft.endDate,
    step: "review",
  });
  refresh();
  return ok<{ draft: DraftPlan }>({ draft });
}

export async function makePlanAction(input: unknown) {
  return guarded(planIdInput, input, async ({ planId }, userId) => {
    const plan = await loadDraft(userId, planId);
    if (!plan) return fail(PLAN_GONE);
    // Already made (a double tap or a reload): hand back the stored one, no second AI call.
    if (plan.draft) return ok<{ draft: DraftPlan }>({ draft: plan.draft });
    if (!plan.basics) return fail("Choose the plan length and your time first.");
    return makeAndStore(userId, plan);
  });
}

export async function remakePlanAction(input: unknown) {
  return guarded(planIdInput, input, async ({ planId }, userId) => {
    const plan = await loadDraft(userId, planId);
    if (!plan) return fail(PLAN_GONE);
    if (!plan.basics) return fail("Choose the plan length and your time first.");
    return makeAndStore(userId, plan);
  });
}

export async function saveReviewAction(input: unknown) {
  return guarded(saveReviewInput, input, async ({ planId, draft }, userId) => {
    const plan = await loadDraft(userId, planId);
    if (!plan) return fail(PLAN_GONE);
    await updateDraft(userId, planId, {
      draft,
      title: draft.title,
      step: advance(plan.step, "review"),
    });
    return ok({ planId });
  });
}

export async function deleteDraftAction(input: unknown) {
  return guarded(planIdInput, input, async ({ planId }, userId) => {
    if (!(await deleteDraft(userId, planId))) return fail(PLAN_GONE);
    refresh();
    return ok({ planId });
  });
}

// ---------------------------------------------------------------------------------------------
// Saving tasks

/** The dates a saved task may hold: from today up to six months ahead. */
function datesInReach(tasks: DraftTask[], today: string): boolean {
  const max = addDaysIso(today, PLAN_WINDOW_DAYS);
  return tasks.every((t) =>
    [t.dueDate, t.repeatUntil].every((d) => d === null || (d >= today && d <= max)),
  );
}

/**
 * Creates the plan's tasks (and subtasks) in `listId`. Every top-level id is pushed to `sink` as
 * soon as it exists, so a rollback after a failure can find them. Throws on the first failure.
 */
async function createPlanTasks(
  userId: string,
  planId: string,
  listId: string,
  tasks: DraftTask[],
  planEnd: string,
  sink: string[],
  /** Receives the ids of the tasks made from milestone cards (the plan page marks them). */
  milestones: string[] = [],
): Promise<void> {
  for (const t of tasks) {
    // A card cut in the review is never saved, even if the page sends it.
    if (t.cut) continue;
    // A milestone is a checkpoint: always high priority.
    const priority = t.milestone ? 3 : t.priority;
    const repeats = t.repeat !== "none" && t.dueDate !== null;
    const created = await createTask(userId, {
      listId,
      title: t.title,
      notes: composeNotes(t.estimateMinutes, t.notes),
      priority,
      dueDate: t.dueDate,
      recurrenceRule: repeats && t.dueDate ? ruleForRepeat(t.repeat, t.dueDate) : null,
      recurrenceMode: "fixed",
      recurrenceUntil: repeats ? (t.repeatUntil ?? planEnd) : null,
      planId,
      planPhase: t.phaseId,
    });
    if (!created) throw new Error("task not created");
    sink.push(created.id);
    if (t.milestone) milestones.push(created.id);
    if (!repeats) {
      for (const title of t.subtasks) {
        const sub = await createTask(userId, { listId, parentId: created.id, title });
        if (!sub) throw new Error("subtask not created");
      }
    }
  }
}

export async function addPlanAction(input: unknown) {
  return guarded(addPlanInput, input, async ({ planId, draft, list }, userId) => {
    const plan = await loadDraft(userId, planId);
    if (!plan) return fail(PLAN_GONE);

    // 1. Check everything before writing anything.
    if (draft.tasks.every((t) => t.cut)) return fail("Keep at least one task.");
    const settings = await getUserSettings(userId);
    const today = todayIn(settings.timezone);
    const max = addDaysIso(today, PLAN_WINDOW_DAYS);
    if (draft.endDate < today || draft.endDate > max || !datesInReach(draft.tasks, today)) {
      return fail(`Dates must be from today to ${PLAN_WINDOW_DAYS} days ahead.`);
    }
    let existing: { id: string; name: string } | null = null;
    if (list.kind === "existing") {
      const found = await getList(userId, list.listId);
      if (!found) return fail("That list no longer exists. Pick another.");
      existing = found;
    }

    // 2. Save in order, taking everything back on the first failure. The draft stays as it was.
    const made = {
      listId: existing?.id ?? null,
      listCreated: false,
      taskIds: [] as string[],
      milestoneIds: [] as string[],
    };
    let listName = existing?.name ?? "";
    try {
      if (list.kind === "new") {
        const created = await createList(userId, { name: list.name, targetDate: draft.endDate });
        made.listId = created.id;
        made.listCreated = true;
        listName = created.name;
      }
      if (!made.listId) throw new Error("no list");
      await createPlanTasks(
        userId,
        planId,
        made.listId,
        draft.tasks,
        draft.endDate,
        made.taskIds,
        made.milestoneIds,
      );
      const activated = await activatePlan(userId, planId, {
        title: draft.title,
        summary: draft.summary,
        startDate: draft.startDate,
        endDate: draft.endDate,
        phases: draft.phases,
        resources: draft.resources,
        listId: made.listId,
        listCreated: made.listCreated,
        milestoneTaskIds: made.milestoneIds,
      });
      if (!activated) throw new Error("plan not activated");
    } catch (error) {
      console.error(
        "Plan save failed, taking it back:",
        error instanceof Error ? error.message : error,
      );
      await removePlanWork(userId, planId, {
        taskIds: made.taskIds,
        listId: made.listId,
        deleteListIfEmpty: made.listCreated,
      });
      return fail("Couldn't save. Nothing was added; try again.");
    }

    refresh();
    const receipt: PlanReceipt = {
      planId,
      listId: made.listId,
      listName,
      listCreated: made.listCreated,
      taskIds: made.taskIds,
      summary: `Added ${plural(made.taskIds.length)} to ${listName}`,
      draft,
    };
    return ok<PlanReceipt>(receipt);
  });
}

export async function undoAddPlanAction(input: unknown) {
  return guarded(planReceiptSchema, input, async (receipt, userId) => {
    const plan = await getPlan(userId, receipt.planId);
    if (!plan || plan.status !== "active" || plan.listId !== receipt.listId) {
      return fail("This plan has changed, so it can't be undone here.");
    }
    await removePlanWork(userId, plan.id, {
      taskIds: receipt.taskIds,
      listId: receipt.listId,
      deleteListIfEmpty: plan.listCreated && receipt.listCreated,
    });
    // The work is not lost: the plan goes back to the review with its cards as they were.
    const back = await revertToDraft(userId, plan.id, receipt.draft);
    if (!back) return fail(PLAN_GONE);
    refresh();
    return ok({ planId: plan.id });
  });
}

// ---------------------------------------------------------------------------------------------
// Living plans

export async function moreTasksAction(input: unknown) {
  return guarded(planIdInput, input, async ({ planId }, userId) => {
    const plan = await getPlan(userId, planId);
    if (!plan || plan.status !== "active") return fail(PLAN_GONE);
    const outcome = await moreTasksForUser(userId, plan);
    if (!outcome.ok) return fail(PLANNER_MESSAGES[outcome.failure]);
    return ok<{ tasks: DraftTask[] }>({ tasks: outcome.data });
  });
}

export async function addMoreTasksAction(input: unknown) {
  return guarded(addMoreTasksInput, input, async ({ planId, tasks }, userId) => {
    const plan = await getPlan(userId, planId);
    if (!plan || plan.status !== "active") return fail(PLAN_GONE);
    const phaseIds = new Set(plan.phases.map((p) => p.id));
    if (!tasks.every((t) => phaseIds.has(t.phaseId))) return fail("One of the tasks has no phase.");
    const settings = await getUserSettings(userId);
    const today = todayIn(settings.timezone);
    if (!datesInReach(tasks, today)) {
      return fail(`Dates must be from today to ${PLAN_WINDOW_DAYS} days ahead.`);
    }
    // The plan's own list; if it was deleted since, the tasks go to General rather than being lost.
    const own = plan.listId ? await getList(userId, plan.listId) : null;
    const list = own ?? (await getInbox(userId));
    const planEnd =
      plan.endDate && plan.endDate >= today ? plan.endDate : addDaysIso(today, PLAN_WINDOW_DAYS);

    const ids: string[] = [];
    const milestoneIds: string[] = [];
    try {
      await createPlanTasks(userId, planId, list.id, tasks, planEnd, ids, milestoneIds);
      await addPlanMilestones(userId, planId, milestoneIds);
    } catch (error) {
      console.error(
        "Add more failed, taking it back:",
        error instanceof Error ? error.message : error,
      );
      await removePlanWork(userId, planId, { taskIds: ids });
      return fail("Couldn't save. Nothing was added; try again.");
    }
    refresh();
    return ok<MoreReceipt>({
      planId,
      taskIds: ids,
      summary: `Added ${plural(ids.length)} to ${plan.title}`,
    });
  });
}

export async function undoAddMoreTasksAction(input: unknown) {
  return guarded(moreReceiptSchema, input, async (receipt, userId) => {
    const plan = await getPlan(userId, receipt.planId);
    if (!plan) return fail(PLAN_GONE);
    await removePlanWork(userId, plan.id, { taskIds: receipt.taskIds });
    refresh();
    return ok({ planId: plan.id });
  });
}

export async function renamePlanAction(input: unknown) {
  return guarded(renamePlanInput, input, async ({ planId, title }, userId) => {
    if (!(await renamePlan(userId, planId, title))) return fail(PLAN_GONE);
    refresh();
    return ok({ planId });
  });
}

export async function setPlanStatusAction(input: unknown) {
  return guarded(setPlanStatusInput, input, async ({ planId, status }, userId) => {
    if (!(await setPlanStatus(userId, planId, status))) return fail(PLAN_GONE);
    refresh();
    return ok({ planId });
  });
}

export async function reschedulePlanAction(input: unknown) {
  return guarded(reschedulePlanInput, input, async ({ planId, schedule }, userId) => {
    const result = await reschedulePlan(userId, planId, schedule);
    if (!result.ok) {
      return fail(
        result.reason === "bad_end_date" ? PLANNER_MESSAGES.bad_dates : PLAN_GONE,
        result.reason === "bad_end_date" ? { endDate: PLANNER_MESSAGES.bad_dates } : undefined,
      );
    }
    refresh();
    return ok({ endDate: result.plan.endDate, moved: result.moved });
  });
}

export async function deletePlanAction(input: unknown) {
  return guarded(deletePlanInput, input, async ({ planId, withTasks }, userId) => {
    const plan = await getPlan(userId, planId);
    if (!plan) return fail(PLAN_GONE);
    // A draft has no tasks to keep: it is erased at once (deleteDraftAction).
    if (plan.status === "draft") return fail("Delete a draft with deleteDraftAction.");
    if (!(await trashPlan(userId, planId, { withTasks }))) return fail(PLAN_GONE);
    refresh();
    return ok({ planId, title: plan.title, withTasks });
  });
}

export async function restorePlanAction(input: unknown) {
  return guarded(planIdInput, input, async ({ planId }, userId) => {
    if (!(await restorePlan(userId, planId))) return fail(NOT_FOUND);
    refresh();
    return ok({ planId });
  });
}

export async function updateResourcesAction(input: unknown) {
  return guarded(updateResourcesInput, input, async ({ planId, resources }, userId) => {
    const saved: PlanResource[] = resources;
    if (!(await updatePlanResources(userId, planId, saved))) return fail(PLAN_GONE);
    refresh();
    return ok({ planId });
  });
}
