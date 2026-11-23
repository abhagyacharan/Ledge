import { and, eq, isNull } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDaysIso, todayIn } from "@/lib/dates";
import { parseEstimateLine } from "@/modules/planner/estimate";
import type { DraftPlan, PlanQuestion } from "@/modules/planner/schema";
import { recordAiUsage, getAiUsageSummary, getPlanAiUsage } from "@/server/data/ai-usage";
import { exportEverything } from "@/server/data/export";
import { getInbox, listLists } from "@/server/data/lists";
import { getPlan, getPlanTasks, listPlans, reschedulePlan, trashPlan } from "@/server/data/plans";
import { createTask, setTaskDone } from "@/server/data/tasks";
import { listTrash, purgeExpiredTrash } from "@/server/data/trash";
import { db } from "@/server/db/client";
import { aiUsage, lists, plans, tasks } from "@/server/db/schema";
import { resetVoiceLimits } from "@/server/voice-limit";
import { testAuth } from "../helpers/action-session";
import { makeList, makeTask } from "../helpers/data";
import { createUser, resetAuthData, type TestUser } from "../helpers/fast-users";

vi.mock("@/server/session", async () => (await import("../helpers/action-session")).sessionModule);
vi.mock("next/headers", async () => (await import("../helpers/action-session")).headersModule);
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const actions = await import("@/modules/planner/actions");
const { deletePlanForeverAction } = await import("@/modules/todos/actions/trash");

/** The Plans module's actions and data functions in fake mode (docs/plans-module-spec.md). */

let a: TestUser;
let b: TestUser;
const today = todayIn("Asia/Kolkata");

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

/** Unwraps a successful result or fails the test with its error. */
function data<T>(result: { ok: true; data: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(`Expected ok, got: ${result.error}`);
  return result.data;
}

const BASICS = { length: "1m", minutesPerDay: 30 } as const;

/** Runs the whole making flow in fake mode up to the review. */
async function makeDraft(goal = "I want to start freelancing as a developer") {
  const { planId } = data(await actions.startPlanAction({ goal }));
  data(await actions.saveBasicsAction({ planId, basics: BASICS }));
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

const newList = (name = "Freelancing") => ({ kind: "new", name }) as const;

/** A plan that is added (active), with its receipt. */
async function addedPlan(listName = "Freelancing") {
  const { planId, draft } = await makeDraft();
  const receipt = data(await actions.addPlanAction({ planId, draft, list: newList(listName) }));
  return { planId, draft, receipt };
}

const taskRows = (userId: string, planId: string) =>
  db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.planId, planId)));

describe("a draft resumes where it was left", () => {
  it("walks the steps, stores everything, and never asks the AI twice", async () => {
    const { planId } = data(
      await actions.startPlanAction({ goal: "I want to start freelancing as a developer" }),
    );
    let plan = await getPlan(a.id, planId);
    expect(plan).toMatchObject({
      status: "draft",
      step: "basics",
      questions: null,
      followups: null,
    });
    expect(plan?.title).toBe("I want to start freelancing as a");

    // A custom end date outside the reach is refused.
    expect(
      await actions.saveBasicsAction({
        planId,
        basics: { length: { date: addDaysIso(today, 400) }, minutesPerDay: 30 },
      }),
    ).toMatchObject({ ok: false });
    data(await actions.saveBasicsAction({ planId, basics: BASICS }));
    expect((await getPlan(a.id, planId))?.step).toBe("questions");

    const first = data(await actions.askQuestionsAction({ planId })).questions;
    expect(first.map((q: PlanQuestion) => q.kind)).toEqual(["single", "multi", "scale", "text"]);
    const second = data(await actions.askQuestionsAction({ planId })).questions;
    expect(second).toEqual(first);
    const rows = () => db.select().from(aiUsage).where(eq(aiUsage.userId, a.id));
    expect((await rows()).filter((r) => r.feature === "plan_questions")).toHaveLength(1);

    // Answers for questions that were never asked are refused.
    expect(
      await actions.saveAnswersAction({
        planId,
        answers: [{ questionId: "q99", question: "?", kind: "text", value: "x", custom: null }],
      }),
    ).toMatchObject({ ok: false });
    data(
      await actions.saveAnswersAction({
        planId,
        answers: [
          {
            questionId: "q1",
            question: first[0].text,
            kind: "single",
            value: "Web apps",
            custom: null,
          },
        ],
      }),
    );
    expect((await getPlan(a.id, planId))?.step).toBe("questions");
    data(
      await actions.saveAnswersAction({
        planId,
        answers: [
          {
            questionId: "q1",
            question: first[0].text,
            kind: "single",
            value: "Web apps",
            custom: null,
          },
        ],
        done: true,
      }),
    );
    expect((await getPlan(a.id, planId))?.step).toBe("followups");

    // Leaving and coming back: the draft is exactly there.
    plan = await getPlan(a.id, planId);
    expect(plan?.questions).toHaveLength(4);
    expect(plan?.basics).toEqual(BASICS);

    // One follow-up round only.
    const f1 = data(await actions.askFollowupsAction({ planId })).followups;
    expect(f1).toHaveLength(1);
    expect(f1[0]).toMatchObject({ id: "f1", because: "Because selling can be the hard part" });
    const f2 = data(await actions.askFollowupsAction({ planId })).followups;
    expect(f2).toEqual(f1);
    expect((await rows()).filter((r) => r.feature === "plan_followups")).toHaveLength(1);
    data(
      await actions.saveFollowupAnswersAction({
        planId,
        answers: [
          { questionId: "f1", question: "Pitched?", kind: "single", value: "Never", custom: null },
        ],
        done: true,
      }),
    );
    plan = await getPlan(a.id, planId);
    expect(plan?.step).toBe("making");
    // Both rounds are kept side by side.
    expect(plan?.answers.map((x) => x.questionId)).toEqual(["q1", "f1"]);

    const { draft } = data(await actions.makePlanAction({ planId }));
    plan = await getPlan(a.id, planId);
    expect(plan).toMatchObject({ step: "review", title: draft.title, startDate: today });
    expect(plan?.draft).toEqual(draft);
    // A second call hands back the stored draft without another AI request.
    expect(data(await actions.makePlanAction({ planId })).draft).toEqual(draft);
    expect((await rows()).filter((r) => r.feature === "plan_make")).toHaveLength(1);
  });

  it("changing the goal clears the questions and answers", async () => {
    const { planId } = await makeDraft();
    data(await actions.saveGoalAction({ planId, goal: "Something else entirely" }));
    expect(await getPlan(a.id, planId)).toMatchObject({
      step: "basics",
      questions: null,
      followups: null,
      draft: null,
      answers: [],
      title: "Something else entirely",
    });
  });

  it("remakes a draft, saves the review, and deletes a draft for good", async () => {
    const { planId, draft } = await makeDraft();
    const cut: DraftPlan = { ...draft, tasks: draft.tasks.slice(0, 3) };
    data(await actions.saveReviewAction({ planId, draft: cut }));
    expect((await getPlan(a.id, planId))?.draft?.tasks).toHaveLength(3);
    const again = data(await actions.remakePlanAction({ planId })).draft;
    expect(again.tasks).toHaveLength(draft.tasks.length);
    expect((await db.select().from(aiUsage).where(eq(aiUsage.feature, "plan_make"))).length).toBe(
      2,
    );
    data(await actions.deleteDraftAction({ planId }));
    expect(await getPlan(a.id, planId)).toBeNull();
    expect(await db.select().from(plans).where(eq(plans.userId, a.id))).toHaveLength(0);
  });

  it("lists drafts first", async () => {
    await addedPlan();
    const { planId } = data(await actions.startPlanAction({ goal: "A second goal here" }));
    const all = await listPlans(a.id);
    expect(all.map((p) => p.status)).toEqual(["draft", "active"]);
    expect(all[0]?.id).toBe(planId);
    expect(await listPlans(a.id, { status: "draft" })).toHaveLength(1);
  });
});

describe("addPlanAction", () => {
  it("saves the list, tasks, subtasks, estimates, phases and resources in one go", async () => {
    const { planId, draft, receipt } = await addedPlan();
    expect(receipt).toMatchObject({ planId, listCreated: true, listName: "Freelancing" });
    expect(receipt.summary).toMatch(/^Added \d+ tasks to Freelancing$/);

    const plan = await getPlan(a.id, planId);
    expect(plan).toMatchObject({
      status: "active",
      step: null,
      draft: null,
      listId: receipt.listId,
      listCreated: true,
      endDate: draft.endDate,
      startDate: today,
    });
    expect(plan?.phases).toHaveLength(3);
    expect(plan?.resources.length).toBeGreaterThanOrEqual(3);

    const [list] = await db.select().from(lists).where(eq(lists.id, receipt.listId));
    expect(list).toMatchObject({ name: "Freelancing", targetDate: draft.endDate });

    const own = await taskRows(a.id, planId);
    expect(own.filter((t) => !t.parentId)).toHaveLength(draft.tasks.length);
    expect(own.every((t) => t.planPhase && ["p1", "p2", "p3"].includes(t.planPhase))).toBe(true);

    const first = own.find((t) => t.title === "Write down what done looks like");
    expect(first).toMatchObject({ priority: 3, planPhase: "p1", listId: receipt.listId });
    expect(parseEstimateLine(first?.notes)).toMatchObject({ minutes: 15 });
    expect(first?.notes).toContain("A clear target");
    // Its three steps are subtasks one level down (they carry no plan id themselves).
    const subs = await db
      .select()
      .from(tasks)
      .where(eq(tasks.parentId, first?.id ?? ""));
    expect(subs.map((s) => s.title)).toEqual([
      "Write the result in one sentence",
      "List what you need",
      "Pick a finish date",
    ]);

    const practice = own.find((t) => t.title === "Practise for 30 minutes");
    expect(practice).toMatchObject({
      recurrenceRule: "FREQ=DAILY",
      recurrenceMode: "fixed",
      recurrenceUntil: draft.endDate,
      dueDate: today,
    });
    // The milestone is a high-priority task; the date that was past the end was moved into it.
    expect(own.find((t) => t.title === "Finish a first version")?.priority).toBe(3);
    expect(own.find((t) => t.title === "Plan what comes next")?.dueDate).toBe(draft.endDate);
  });

  it("reads back through getPlanTasks in phase order with subtasks after their parent", async () => {
    const { planId } = await addedPlan();
    const all = await getPlanTasks(a.id, planId);
    const top = all.filter((t) => !t.parentId);
    expect(top[0]?.title).toBe("Write down what done looks like");
    expect(all[1]?.parentId).toBe(all[0]?.id);
    const phases = top.map((t) => t.planPhase);
    expect([...phases].sort()).toEqual(phases);
  });

  it("shows progress, the next task and days left, and a repeat counts once", async () => {
    const { planId } = await addedPlan();
    const [item] = await listPlans(a.id);
    const total = (await taskRows(a.id, planId)).filter((t) => !t.parentId).length;
    expect(item?.progress).toEqual({ total, done: 0 });
    expect(item?.nextTask?.dueDate).toBe(today);
    expect(item?.daysLeft).toBe(29);

    const tasksNow = await taskRows(a.id, planId);
    const repeating = tasksNow.find((t) => t.recurrenceRule);
    const plain = tasksNow.find((t) => !t.recurrenceRule && !t.parentId);
    await setTaskDone(a.id, plain?.id ?? "", true);
    const [after] = await listPlans(a.id);
    expect(after?.progress).toEqual({ total, done: 1 });
    // Finished copies of a repeat are not tasks of the plan.
    expect(repeating).toBeDefined();
    const copies = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, a.id), eq(tasks.planId, planId), eq(tasks.status, "done")));
    expect(copies).toHaveLength(1);
  });

  it("adds to one of the user's own lists without creating another", async () => {
    const own = await makeList(a.id, "Home");
    const before = (await listLists(a.id)).length;
    const { planId, draft } = await makeDraft();
    const receipt = data(
      await actions.addPlanAction({ planId, draft, list: { kind: "existing", listId: own.id } }),
    );
    expect(receipt).toMatchObject({ listId: own.id, listCreated: false });
    expect((await listLists(a.id)).length).toBe(before);
    expect((await getPlan(a.id, planId))?.listCreated).toBe(false);
  });

  it("refuses dates outside the reach, another user's list, and an unknown phase", async () => {
    const { planId, draft } = await makeDraft();
    const far: DraftPlan = {
      ...draft,
      tasks: [{ ...draft.tasks[0], dueDate: addDaysIso(today, 200) }],
    };
    expect(await actions.addPlanAction({ planId, draft: far, list: newList() })).toMatchObject({
      ok: false,
    });
    const theirs = await getInbox(b.id);
    expect(
      await actions.addPlanAction({
        planId,
        draft,
        list: { kind: "existing", listId: theirs.id },
      }),
    ).toMatchObject({ ok: false });
    const odd: DraftPlan = { ...draft, tasks: [{ ...draft.tasks[0], phaseId: "zzz" }] };
    expect(await actions.addPlanAction({ planId, draft: odd, list: newList() })).toMatchObject({
      ok: false,
    });
    expect(await db.select().from(tasks).where(eq(tasks.userId, a.id))).toHaveLength(0);
    expect((await getPlan(a.id, planId))?.status).toBe("draft");
  });

  it("is all or nothing: a failure part-way takes back the list and tasks, and the draft stays", async () => {
    const { planId, draft } = await makeDraft();
    const doomed: DraftPlan = {
      ...draft,
      tasks: [
        draft.tasks[0],
        draft.tasks[1],
        // Postgres refuses a NUL byte in text, after the first tasks were saved.
        { ...draft.tasks[2], title: "Bad\u0000title" },
      ],
    };
    const result = await actions.addPlanAction({ planId, draft: doomed, list: newList("Doomed") });
    expect(result).toMatchObject({ ok: false });
    expect(await db.select().from(tasks).where(eq(tasks.userId, a.id))).toHaveLength(0);
    const all = await db.select().from(lists).where(eq(lists.userId, a.id));
    expect(all.some((l) => l.name === "Doomed")).toBe(false);
    const plan = await getPlan(a.id, planId);
    expect(plan).toMatchObject({ status: "draft", step: "review", listId: null });
    expect(plan?.draft).toEqual(draft);
  });

  it("cannot be added twice", async () => {
    const { planId, draft } = await addedPlan();
    expect(await actions.addPlanAction({ planId, draft, list: newList("Again") })).toMatchObject({
      ok: false,
    });
  });
});

describe("undoAddPlanAction", () => {
  it("removes the tasks and list and puts the plan back at the review, draft intact", async () => {
    const { planId, draft, receipt } = await addedPlan();
    data(await actions.undoAddPlanAction(receipt));
    expect(await db.select().from(tasks).where(eq(tasks.userId, a.id))).toHaveLength(0);
    const all = await db.select().from(lists).where(eq(lists.userId, a.id));
    expect(all.some((l) => l.id === receipt.listId)).toBe(false);
    const plan = await getPlan(a.id, planId);
    expect(plan).toMatchObject({
      status: "draft",
      step: "review",
      listId: null,
      listCreated: false,
      endDate: null,
    });
    expect(plan?.draft).toEqual(draft);
    // And it can be added again.
    data(await actions.addPlanAction({ planId, draft, list: newList() }));
  });

  it("keeps an existing list and its other tasks when undoing a plan added to it", async () => {
    const own = await makeList(a.id, "Home");
    await makeTask(a.id, own.id, "Mine");
    const { planId, draft } = await makeDraft();
    const receipt = data(
      await actions.addPlanAction({ planId, draft, list: { kind: "existing", listId: own.id } }),
    );
    data(await actions.undoAddPlanAction(receipt));
    const left = await db.select().from(tasks).where(eq(tasks.listId, own.id));
    expect(left.map((t) => t.title)).toEqual(["Mine"]);
  });

  it("keeps a made list that gained other tasks since", async () => {
    const { receipt } = await addedPlan();
    await makeTask(a.id, receipt.listId, "Added by hand");
    data(await actions.undoAddPlanAction(receipt));
    const left = await db.select().from(tasks).where(eq(tasks.listId, receipt.listId));
    expect(left.map((t) => t.title)).toEqual(["Added by hand"]);
  });

  it("does nothing when another user sends the receipt", async () => {
    const { receipt } = await addedPlan();
    testAuth.reset(b.id);
    expect(await actions.undoAddPlanAction(receipt)).toMatchObject({ ok: false });
    testAuth.reset(a.id);
    expect((await taskRows(a.id, receipt.planId)).length).toBeGreaterThan(0);
  });
});

describe("add more tasks", () => {
  it("suggests, saves into the plan's list and phases, and undoes", async () => {
    const { planId, receipt } = await addedPlan();
    const before = (await taskRows(a.id, planId)).length;
    const { tasks: more } = data(await actions.moreTasksAction({ planId }));
    expect(more).toHaveLength(3);
    // Nothing is saved by asking.
    expect(await taskRows(a.id, planId)).toHaveLength(before);

    const saved = data(await actions.addMoreTasksAction({ planId, tasks: more }));
    expect(saved.taskIds).toHaveLength(3);
    const rows = await taskRows(a.id, planId);
    expect(rows.filter((t) => t.listId === receipt.listId)).toHaveLength(before + 3);
    expect(rows.find((t) => t.title === "Do a second small project")?.planPhase).toBe("p3");

    data(await actions.undoAddMoreTasksAction(saved));
    expect(await taskRows(a.id, planId)).toHaveLength(before);
    expect((await db.select().from(aiUsage).where(eq(aiUsage.feature, "plan_more"))).length).toBe(
      1,
    );
  });

  it("refuses a task in a phase the plan does not have, and a draft", async () => {
    const { planId } = await addedPlan();
    const { tasks: more } = data(await actions.moreTasksAction({ planId }));
    expect(
      await actions.addMoreTasksAction({ planId, tasks: [{ ...more[0], phaseId: "zzz" }] }),
    ).toMatchObject({ ok: false });
    const { planId: draftId } = data(await actions.startPlanAction({ goal: "Another goal" }));
    expect(await actions.moreTasksAction({ planId: draftId })).toMatchObject({ ok: false });
  });
});

describe("status, rename, resources and reschedule", () => {
  it("renames, marks done, archives and goes back to active", async () => {
    const { planId } = await addedPlan();
    data(await actions.renamePlanAction({ planId, title: "  Freelance launch  " }));
    expect((await getPlan(a.id, planId))?.title).toBe("Freelance launch");
    data(await actions.setPlanStatusAction({ planId, status: "done" }));
    const done = await getPlan(a.id, planId);
    expect(done?.status).toBe("done");
    expect(done?.completedAt).not.toBeNull();
    data(await actions.setPlanStatusAction({ planId, status: "archived" }));
    expect((await getPlan(a.id, planId))?.completedAt).toBeNull();
    expect(await listPlans(a.id, { status: "archived" })).toHaveLength(1);
    data(await actions.setPlanStatusAction({ planId, status: "active" }));
    expect((await getPlan(a.id, planId))?.status).toBe("active");

    // A draft has no status to set.
    const { planId: draftId } = data(await actions.startPlanAction({ goal: "Draft goal here" }));
    expect(await actions.setPlanStatusAction({ planId: draftId, status: "done" })).toMatchObject({
      ok: false,
    });
  });

  it("updates resources and accepts only http(s) links", async () => {
    const { planId } = await addedPlan();
    const plan = await getPlan(a.id, planId);
    const [first, ...rest] = plan?.resources ?? [];
    data(
      await actions.updateResourcesAction({
        planId,
        resources: [
          { ...first, used: true, url: "https://example.com/book" },
          ...rest.slice(1),
          { id: "r99", name: "My own", kind: "article", why: "", used: false, url: null },
        ],
      }),
    );
    const after = await getPlan(a.id, planId);
    expect(after?.resources[0]).toMatchObject({ used: true, url: "https://example.com/book" });
    expect(after?.resources.some((r) => r.name === "My own")).toBe(true);
    expect(after?.resources).toHaveLength(rest.length + 1);
    expect(
      await actions.updateResourcesAction({
        planId,
        resources: [{ ...first, url: "javascript:alert(1)" }],
      }),
    ).toMatchObject({ ok: false });
  });

  it("shifts every open task, its repeat end, the end date and the list's target", async () => {
    const { planId, receipt } = await addedPlan();
    const before = await taskRows(a.id, planId);
    const done = before.find((t) => !t.recurrenceRule && !t.parentId && t.dueDate);
    await setTaskDone(a.id, done?.id ?? "", true);
    const result = data(
      await actions.reschedulePlanAction({ planId, schedule: { mode: "shift", days: 5 } }),
    );
    expect(result.endDate).toBe(addDaysIso(today, 29 + 5));
    const after = await taskRows(a.id, planId);
    const was = (id: string) => before.find((t) => t.id === id);
    for (const t of after.filter((x) => x.status === "open" && x.dueDate)) {
      expect(t.dueDate).toBe(addDaysIso(was(t.id)?.dueDate ?? "", 5));
    }
    // A finished task keeps its date.
    expect(after.find((t) => t.id === done?.id)?.dueDate).toBe(done?.dueDate);
    expect(after.find((t) => t.recurrenceRule)?.recurrenceUntil).toBe(addDaysIso(today, 34));
    const [list] = await db.select().from(lists).where(eq(lists.id, receipt.listId));
    expect(list?.targetDate).toBe(addDaysIso(today, 34));
    const plan = await getPlan(a.id, planId);
    expect(plan?.phases[2]?.endDate).toBe(addDaysIso(today, 34));
  });

  it("spreads the open tasks to a new end date and refuses a bad one", async () => {
    const { planId } = await addedPlan();
    const newEnd = addDaysIso(today, 58);
    data(
      await actions.reschedulePlanAction({ planId, schedule: { mode: "spread", endDate: newEnd } }),
    );
    const after = (await taskRows(a.id, planId)).filter((t) => t.dueDate && !t.parentId);
    expect(after.every((t) => (t.dueDate ?? "") >= today && (t.dueDate ?? "") <= newEnd)).toBe(
      true,
    );
    expect((await getPlan(a.id, planId))?.endDate).toBe(newEnd);
    for (const bad of [today, addDaysIso(today, -3), addDaysIso(today, 300)]) {
      expect(
        await actions.reschedulePlanAction({ planId, schedule: { mode: "spread", endDate: bad } }),
      ).toMatchObject({ ok: false });
    }
  });
});

describe("delete, Trash and restore", () => {
  it("with its tasks: the plan's own list goes to Trash with it, and restoring brings both back", async () => {
    const { planId, receipt } = await addedPlan();
    const count = (await taskRows(a.id, planId)).filter((t) => !t.parentId).length;
    const result = data(await actions.deletePlanAction({ planId, withTasks: true }));
    expect(result).toMatchObject({ planId, withTasks: true });
    expect(await getPlan(a.id, planId)).toBeNull();
    expect(await listPlans(a.id)).toHaveLength(0);

    const trash = await listTrash(a.id);
    expect(trash.plans.map((p) => [p.id, p.taskCount])).toEqual([[planId, count]]);
    // The list that went with it is not listed separately.
    expect(trash.lists).toHaveLength(0);
    expect(trash.tasks).toHaveLength(0);
    const [gone] = await db.select().from(lists).where(eq(lists.id, receipt.listId));
    expect(gone?.deletedAt).not.toBeNull();

    data(await actions.restorePlanAction({ planId }));
    const plan = await getPlan(a.id, planId);
    expect(plan?.status).toBe("active");
    const [back] = await db.select().from(lists).where(eq(lists.id, receipt.listId));
    expect(back?.deletedAt).toBeNull();
    expect((await listPlans(a.id))[0]?.progress.total).toBe(count);
  });

  it("with its tasks, when the list is shared: each task is trashed and restored by id", async () => {
    const own = await makeList(a.id, "Home");
    const keep = await makeTask(a.id, own.id, "Mine");
    const { planId, draft } = await makeDraft();
    data(
      await actions.addPlanAction({ planId, draft, list: { kind: "existing", listId: own.id } }),
    );
    data(await actions.deletePlanAction({ planId, withTasks: true }));

    const plan = await db.select().from(plans).where(eq(plans.id, planId));
    expect(plan[0]?.deletedAt).not.toBeNull();
    const mine = await db.select().from(tasks).where(eq(tasks.planId, planId));
    expect(mine.every((t) => t.deletedAt !== null)).toBe(true);
    const [kept] = await db.select().from(tasks).where(eq(tasks.id, keep.id));
    expect(kept?.deletedAt).toBeNull();
    // They are inside the plan in Trash, not listed one by one.
    const trash = await listTrash(a.id);
    expect(trash.tasks).toHaveLength(0);
    expect(trash.plans[0]?.taskCount).toBe(mine.filter((t) => !t.parentId).length);

    data(await actions.restorePlanAction({ planId }));
    const restored = await db.select().from(tasks).where(eq(tasks.planId, planId));
    expect(restored.every((t) => t.deletedAt === null)).toBe(true);
    expect((await getPlanTasks(a.id, planId)).length).toBeGreaterThan(0);
  });

  it("delete forever removes what went in with it; usage keeps its counts", async () => {
    const { planId, receipt } = await addedPlan();
    data(await actions.deletePlanAction({ planId, withTasks: true }));
    data(await deletePlanForeverAction({ planId }));
    expect(await db.select().from(plans).where(eq(plans.id, planId))).toHaveLength(0);
    expect(await db.select().from(tasks).where(eq(tasks.userId, a.id))).toHaveLength(0);
    expect(await db.select().from(lists).where(eq(lists.id, receipt.listId))).toHaveLength(0);
    const usage = await db.select().from(aiUsage).where(eq(aiUsage.userId, a.id));
    expect(usage.length).toBeGreaterThan(0);
    expect(usage.every((u) => u.planId === null)).toBe(true);
  });

  it("without its tasks: they stay, and lose the link only when the plan is erased", async () => {
    const { planId, receipt } = await addedPlan();
    const count = (await taskRows(a.id, planId)).length;
    data(await actions.deletePlanAction({ planId, withTasks: false }));
    const [list] = await db.select().from(lists).where(eq(lists.id, receipt.listId));
    expect(list?.deletedAt).toBeNull();
    expect((await taskRows(a.id, planId)).every((t) => t.deletedAt === null)).toBe(true);
    data(await deletePlanForeverAction({ planId }));
    const left = await db.select().from(tasks).where(eq(tasks.userId, a.id));
    expect(left.filter((t) => !t.parentId)).toHaveLength(count);
    expect(left.every((t) => t.planId === null)).toBe(true);
    const plan = await db.select().from(plans).where(eq(plans.userId, a.id));
    expect(plan).toHaveLength(0);
  });

  it("only a plan in Trash can be erased or restored, and a draft cannot be trashed", async () => {
    const { planId } = await addedPlan();
    expect(await deletePlanForeverAction({ planId })).toMatchObject({ ok: false });
    expect(await actions.restorePlanAction({ planId })).toMatchObject({ ok: false });
    const { planId: draftId } = data(await actions.startPlanAction({ goal: "A draft here" }));
    expect(await actions.deletePlanAction({ planId: draftId, withTasks: true })).toMatchObject({
      ok: false,
    });
    expect(await trashPlan(a.id, draftId, { withTasks: true })).toBeNull();
  });

  it("is cleared with the 30-day purge", async () => {
    const { planId } = await addedPlan();
    data(await actions.deletePlanAction({ planId, withTasks: false }));
    const later = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
    const removed = await purgeExpiredTrash(a.id, later);
    expect(removed.plans).toBe(1);
    expect(await db.select().from(plans).where(eq(plans.id, planId))).toHaveLength(0);
  });
});

describe("AI usage", () => {
  it("writes a row per request with the plan id, counts only, and totals them", async () => {
    const { planId } = await addedPlan();
    await actions.moreTasksAction({ planId });
    const rows = await db.select().from(aiUsage).where(eq(aiUsage.userId, a.id));
    expect(rows.map((r) => r.feature).sort()).toEqual([
      "plan_followups",
      "plan_make",
      "plan_more",
      "plan_questions",
    ]);
    expect(rows.every((r) => r.model === "fake" && r.planId === planId)).toBe(true);
    expect(rows.every((r) => r.inputTokens === 0 && r.audioSeconds === 0)).toBe(true);

    const mine = await getPlanAiUsage(a.id, planId);
    expect(mine).toMatchObject({ requests: 4, tokens: 0, costMicros: 0, unknownModels: [] });

    const summary = await getAiUsageSummary(a.id);
    expect(summary.thisMonth.requests).toBe(4);
    expect(summary.thisMonth.features.map((f) => f.feature).sort()).toEqual([
      "plan_followups",
      "plan_make",
      "plan_more",
      "plan_questions",
    ]);
    expect(summary.lastMonth.requests).toBe(0);
  });

  it("prices real models per month, in the user's own month", async () => {
    const thisMonth = today.slice(0, 7);
    const lastMonth = addDaysIso(`${thisMonth}-01`, -1).slice(0, 7);
    const mid = (month: string) => new Date(`${month}-15T08:00:00Z`);
    await db.insert(aiUsage).values([
      {
        userId: a.id,
        feature: "plan_make",
        model: "openai/gpt-oss-120b",
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        createdAt: mid(lastMonth),
      },
      {
        userId: a.id,
        feature: "voice_transcribe",
        model: "whisper-large-v3-turbo",
        audioSeconds: 3600,
        createdAt: mid(thisMonth),
      },
      {
        userId: a.id,
        feature: "voice_understand",
        model: "some-new-model",
        inputTokens: 10,
        createdAt: mid(thisMonth),
      },
    ]);
    const summary = await getAiUsageSummary(a.id, { month: thisMonth });
    expect(summary.lastMonth).toMatchObject({ month: lastMonth, requests: 1, costMicros: 750_000 });
    expect(summary.thisMonth).toMatchObject({
      requests: 2,
      audioSeconds: 3600,
      costMicros: 40_000,
      unknownModels: ["some-new-model"],
    });
    expect(summary.thisMonth.features.find((f) => f.feature === "voice_transcribe")).toMatchObject({
      requests: 1,
      costMicros: 40_000,
    });
  });

  it("never throws into a request, and drops a plan id that is not the user's", async () => {
    const { planId } = await addedPlan();
    await recordAiUsage(b.id, { feature: "plan_make", model: "fake", planId });
    const [row] = await db.select().from(aiUsage).where(eq(aiUsage.userId, b.id));
    expect(row?.planId).toBeNull();
    await expect(
      recordAiUsage("not-a-uuid", { feature: "plan_make", model: "fake" }),
    ).resolves.toBeUndefined();
  });

  it("is in the export, with the plans", async () => {
    const { planId } = await addedPlan();
    const out = await exportEverything(a.id);
    expect(out.plans.map((p) => p.id)).toEqual([planId]);
    expect(out.aiUsage.length).toBeGreaterThan(0);
    expect(out.tasks.some((t) => t.planId === planId)).toBe(true);
  });
});

describe("ownership", () => {
  it("user B cannot read, change or delete user A's plans, tasks or usage", async () => {
    const { planId, draft, receipt } = await addedPlan();
    const { planId: draftId, draft: draftDraft } = await makeDraft("B cannot touch this draft");

    expect(await getPlan(b.id, planId)).toBeNull();
    expect(await listPlans(b.id)).toEqual([]);
    expect(await getPlanTasks(b.id, planId)).toEqual([]);
    expect(await getPlanAiUsage(b.id, planId)).toMatchObject({ requests: 0, costMicros: 0 });
    expect((await getAiUsageSummary(b.id)).thisMonth.requests).toBe(0);
    expect(await reschedulePlan(b.id, planId, { mode: "shift", days: 3 })).toMatchObject({
      ok: false,
    });
    expect(await trashPlan(b.id, planId, { withTasks: true })).toBeNull();
    // A plan link must be the user's own plan.
    const theirList = await getInbox(b.id);
    expect(await createTask(b.id, { listId: theirList.id, title: "x", planId })).toBeNull();

    testAuth.reset(b.id);
    const attempts = [
      await actions.saveBasicsAction({ planId: draftId, basics: BASICS }),
      await actions.saveGoalAction({ planId: draftId, goal: "Taken over now" }),
      await actions.askQuestionsAction({ planId: draftId }),
      await actions.askFollowupsAction({ planId: draftId }),
      await actions.makePlanAction({ planId: draftId }),
      await actions.remakePlanAction({ planId: draftId }),
      await actions.saveReviewAction({ planId: draftId, draft: draftDraft }),
      await actions.deleteDraftAction({ planId: draftId }),
      await actions.moreTasksAction({ planId }),
      await actions.addMoreTasksAction({ planId, tasks: [draft.tasks[0]] }),
      await actions.renamePlanAction({ planId, title: "Mine now" }),
      await actions.setPlanStatusAction({ planId, status: "archived" }),
      await actions.reschedulePlanAction({ planId, schedule: { mode: "shift", days: 1 } }),
      await actions.deletePlanAction({ planId, withTasks: true }),
      await actions.restorePlanAction({ planId }),
      await actions.updateResourcesAction({ planId, resources: [] }),
      await actions.undoAddPlanAction(receipt),
      await deletePlanForeverAction({ planId }),
    ];
    expect(attempts.every((r) => !r.ok)).toBe(true);

    // Adding a plan of one's own into A's list is refused too.
    const mine = data(await actions.startPlanAction({ goal: "Plan of user B here" }));
    data(await actions.saveBasicsAction({ planId: mine.planId, basics: BASICS }));
    const made = data(await actions.makePlanAction({ planId: mine.planId }));
    expect(
      await actions.addPlanAction({
        planId: mine.planId,
        draft: made.draft,
        list: { kind: "existing", listId: receipt.listId },
      }),
    ).toMatchObject({ ok: false });

    // Nothing of A's changed.
    testAuth.reset(a.id);
    const plan = await getPlan(a.id, planId);
    expect(plan).toMatchObject({ status: "active", title: draft.title });
    expect((await taskRows(a.id, planId)).every((t) => t.deletedAt === null)).toBe(true);
    expect(await getPlan(a.id, draftId)).toMatchObject({ goal: "B cannot touch this draft" });
    expect(
      await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.userId, b.id), isNull(tasks.deletedAt))),
    ).toHaveLength(0);
  });
});
