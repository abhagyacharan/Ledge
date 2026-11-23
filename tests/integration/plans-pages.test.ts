import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DraftPlan, PlanQuestion } from "@/modules/planner/schema";
import {
  getPlan,
  getPlanTasks,
  getTaskPlanChip,
  listActivePlanLinks,
  listPlans,
} from "@/server/data/plans";
import { getTask } from "@/server/data/tasks";
import { db } from "@/server/db/client";
import { plans, tasks } from "@/server/db/schema";
import { resetVoiceLimits } from "@/server/voice-limit";
import { testAuth } from "../helpers/action-session";
import { makeList, makeTask } from "../helpers/data";
import { createUser, resetAuthData, type TestUser } from "../helpers/fast-users";

vi.mock("@/server/session", async () => (await import("../helpers/action-session")).sessionModule);
vi.mock("next/headers", async () => (await import("../helpers/action-session")).headersModule);
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const actions = await import("@/modules/planner/actions");

/**
 * What the Plans pages read (stage 15.C): milestones that persist, the plan chip on a task's
 * detail, the sidebar and palette list, and the per-phase progress. Fake mode, a real database.
 */

let a: TestUser;
let b: TestUser;

beforeEach(async () => {
  process.env.ALLOW_SIGNUP = "true";
  process.env.VOICE_FAKE = "1";
  await resetAuthData();
  resetVoiceLimits();
  a = await createUser("a@example.com", "A");
  b = await createUser("b@example.com", "B");
  testAuth.reset(a.id);
});

afterEach(() => {
  delete process.env.VOICE_FAKE;
});

function data<T>(result: { ok: true; data: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(`Expected ok, got: ${result.error}`);
  return result.data;
}

/** The whole making flow in fake mode, up to the review. */
async function makeDraft(goal = "I want to start freelancing as a developer") {
  const { planId } = data(await actions.startPlanAction({ goal }));
  data(await actions.saveBasicsAction({ planId, basics: { length: "1m", minutesPerDay: 30 } }));
  const { questions } = data(await actions.askQuestionsAction({ planId }));
  data(
    await actions.saveAnswersAction({
      planId,
      answers: questions.map((q: PlanQuestion) => ({
        questionId: q.id,
        question: q.text,
        kind: q.kind,
        value: q.kind === "single" ? (q.options[0] ?? null) : null,
        custom: null,
      })),
      done: true,
    }),
  );
  const { followups } = data(await actions.askFollowupsAction({ planId }));
  data(
    await actions.saveFollowupAnswersAction({
      planId,
      answers: followups.map((q: PlanQuestion) => ({
        questionId: q.id,
        question: q.text,
        kind: q.kind,
        value: q.options[0] ?? null,
        custom: null,
      })),
      done: true,
    }),
  );
  const { draft } = data(await actions.makePlanAction({ planId }));
  return { planId, draft };
}

/** The draft with exactly the given cards flagged as milestones. */
function withMilestones(draft: DraftPlan, keys: string[]): DraftPlan {
  return {
    ...draft,
    tasks: draft.tasks.map((t) => ({ ...t, milestone: keys.includes(t.key) })),
  };
}

describe("milestones persist", () => {
  it("saves the milestone tasks with the plan and marks them on the plan record", async () => {
    const { planId, draft } = await makeDraft();
    const keys = draft.tasks.slice(0, 2).map((t) => t.key);
    data(
      await actions.addPlanAction({
        planId,
        draft: withMilestones(draft, keys),
        list: { kind: "new", name: "Freelancing" },
      }),
    );
    const plan = await getPlan(a.id, planId);
    expect(plan?.milestoneTaskIds).toHaveLength(2);
    const marked = await db.select().from(tasks).where(eq(tasks.planId, planId));
    for (const id of plan?.milestoneTaskIds ?? []) {
      const row = marked.find((t) => t.id === id);
      expect(row?.priority).toBe(3);
      expect(row?.parentId).toBeNull();
    }
    // A plan with no milestone cards has none.
    const second = await makeDraft("I want to run a 5k by February");
    data(
      await actions.addPlanAction({
        planId: second.planId,
        draft: withMilestones(second.draft, []),
        list: { kind: "new", name: "5k" },
      }),
    );
    expect((await getPlan(a.id, second.planId))?.milestoneTaskIds).toEqual([]);
  });

  it("Undo of Add plan clears them with the draft going back to review", async () => {
    const { planId, draft } = await makeDraft();
    const receipt = data(
      await actions.addPlanAction({
        planId,
        draft: withMilestones(draft, [draft.tasks[0].key]),
        list: { kind: "new", name: "Freelancing" },
      }),
    );
    expect((await getPlan(a.id, planId))?.milestoneTaskIds).toHaveLength(1);
    data(await actions.undoAddPlanAction(receipt));
    const back = await getPlan(a.id, planId);
    expect(back).toMatchObject({ status: "draft", milestoneTaskIds: [] });
  });

  it("Add more tasks appends milestones and its Undo forgets them again", async () => {
    const { planId, draft } = await makeDraft();
    data(
      await actions.addPlanAction({
        planId,
        draft: withMilestones(draft, [draft.tasks[0].key]),
        list: { kind: "new", name: "Freelancing" },
      }),
    );
    const before = (await getPlan(a.id, planId))?.milestoneTaskIds ?? [];
    expect(before).toHaveLength(1);

    const { tasks: suggestions } = data(await actions.moreTasksAction({ planId }));
    const receipt = data(
      await actions.addMoreTasksAction({
        planId,
        tasks: suggestions.slice(0, 2).map((t, i) => ({ ...t, milestone: i === 0 })),
      }),
    );
    const after = (await getPlan(a.id, planId))?.milestoneTaskIds ?? [];
    expect(after).toHaveLength(2);
    expect(after).toEqual(expect.arrayContaining(before));
    expect(receipt.taskIds).toEqual(
      expect.arrayContaining(after.filter((id) => !before.includes(id))),
    );

    data(await actions.undoAddMoreTasksAction(receipt));
    expect((await getPlan(a.id, planId))?.milestoneTaskIds).toEqual(before);
  });
});

describe("the plan chip on a task's detail", () => {
  it("names the plan and the phase, and only for the owner", async () => {
    const { planId, draft } = await makeDraft();
    data(
      await actions.addPlanAction({
        planId,
        draft,
        list: { kind: "new", name: "Freelancing" },
      }),
    );
    const plan = await getPlan(a.id, planId);
    const [first] = (await getPlanTasks(a.id, planId)).filter((t) => t.parentId === null);
    const phaseName = plan?.phases.find((p) => p.id === first.planPhase)?.name ?? null;
    expect(phaseName).not.toBeNull();

    const chip = await getTaskPlanChip(a.id, first);
    expect(chip).toEqual({ planId, title: plan?.title, phase: phaseName });

    // Someone else's plan looks like no plan at all.
    expect(await getTaskPlanChip(b.id, first)).toBeNull();

    // A task with no plan has no chip.
    const list = await makeList(a.id, "Home");
    const plain = await makeTask(a.id, list.id, "Plain");
    expect(await getTaskPlanChip(a.id, plain)).toBeNull();
    expect(await getTaskPlanChip(a.id, { planId: null, planPhase: null })).toBeNull();
  });

  it("is gone while the plan is in Trash, and a missing phase gives the title alone", async () => {
    const { planId, draft } = await makeDraft();
    data(
      await actions.addPlanAction({ planId, draft, list: { kind: "new", name: "Freelancing" } }),
    );
    const [first] = (await getPlanTasks(a.id, planId)).filter((t) => t.parentId === null);
    const withoutPhase = await getTaskPlanChip(a.id, { planId, planPhase: "nope" });
    expect(withoutPhase?.phase).toBeNull();
    const row = await getTask(a.id, first.id);
    expect(row?.planId).toBe(planId);

    data(await actions.deletePlanAction({ planId, withTasks: false }));
    expect(await getTaskPlanChip(a.id, first)).toBeNull();
  });
});

describe("what the shell and the cards read", () => {
  it("lists a user's own active plans for the sidebar and the palette", async () => {
    const one = await makeDraft();
    // A draft is not listed.
    expect(await listActivePlanLinks(a.id)).toEqual([]);
    data(
      await actions.addPlanAction({
        planId: one.planId,
        draft: one.draft,
        list: { kind: "new", name: "Freelancing" },
      }),
    );
    const links = await listActivePlanLinks(a.id);
    expect(links).toHaveLength(1);
    expect(links[0].id).toBe(one.planId);

    expect(await listActivePlanLinks(b.id)).toEqual([]);

    data(await actions.setPlanStatusAction({ planId: one.planId, status: "archived" }));
    expect(await listActivePlanLinks(a.id)).toEqual([]);
  });

  it("gives each plan its progress per phase and when it was last touched", async () => {
    const { planId, draft } = await makeDraft();
    data(
      await actions.addPlanAction({ planId, draft, list: { kind: "new", name: "Freelancing" } }),
    );
    const [item] = await listPlans(a.id, { status: "active" });
    expect(item.phaseProgress.map((p) => p.id)).toEqual(item.phases.map((p) => p.id));
    const total = item.phaseProgress.reduce((n, p) => n + p.total, 0);
    expect(total).toBe(item.progress.total);
    expect(item.phaseProgress.every((p) => p.done === 0)).toBe(true);

    // Touching a task later than the plan makes the plan "touched" then.
    const future = new Date(Date.now() + 60_000);
    const [open] = (await getPlanTasks(a.id, planId)).filter((t) => t.parentId === null);
    await db.update(tasks).set({ updatedAt: future }).where(eq(tasks.id, open.id));
    const [again] = await listPlans(a.id, { status: "active" });
    expect(again.touchedAt.getTime()).toBe(future.getTime());
    const [row] = await db.select().from(plans).where(eq(plans.id, planId));
    expect(again.touchedAt.getTime()).toBeGreaterThan(row.updatedAt.getTime());
  });
});
