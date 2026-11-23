import { describe, expect, it } from "vitest";
import { fakeFollowups, fakeMore, fakePlan, fakeQuestions } from "./fake";
import { resolveMoreTasks, resolvePlan, resolveQuestions } from "./resolve";
import { modelMore, modelPlan, modelQuestions, planEndDate, type PlanBasics } from "./schema";

const today = "2026-11-22";
const basics: PlanBasics = { length: "1m", minutesPerDay: 30 };
const end = planEndDate(basics, today) as string;

describe("fake planner replies", () => {
  it("ask one question of each kind, all valid", () => {
    const reply = modelQuestions.parse(fakeQuestions());
    const out = resolveQuestions(reply);
    expect(out.map((q) => q.kind)).toEqual(["single", "multi", "scale", "text"]);
    expect(out[2]?.scaleLabels).toEqual({ low: "Never tried", high: "I do it for a living" });
  });

  it("ask one follow-up with a because", () => {
    const out = resolveQuestions(modelQuestions.parse(fakeFollowups()), "followups");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: "f1", because: "Because selling can be the hard part" });
  });

  it("make a plan that passes the model schema and exercises every path", () => {
    const reply = modelPlan.parse(fakePlan("Start freelancing as a developer", basics, today, end));
    const plan = resolvePlan(reply, { today, end });
    expect(plan.phases).toHaveLength(3);
    expect(plan.title).toBe("Start freelancing as a");
    expect(plan.tasks.some((t) => t.repeat === "daily")).toBe(true);
    expect(plan.tasks.filter((t) => t.milestone).length).toBeGreaterThanOrEqual(1);
    expect(plan.tasks.some((t) => t.subtasks.length > 0)).toBe(true);
    expect(plan.tasks.every((t) => t.estimateMinutes !== null)).toBe(true);
    expect(plan.resources.length).toBeGreaterThanOrEqual(3);
    expect(plan.resources.every((r) => r.url === null)).toBe(true);
    // One task is dated past the end on purpose, so a card shows its "check" note.
    expect(plan.tasks.filter((t) => t.check !== null)).toHaveLength(1);
  });

  it("fit the plan's length and the daily time", () => {
    const week: PlanBasics = { length: "1w", minutesPerDay: 15 };
    const weekEnd = planEndDate(week, today) as string;
    const reply = fakePlan("Get fitter", week, today, weekEnd);
    const plan = resolvePlan(modelPlan.parse(reply), { today, end: weekEnd });
    expect(plan.endDate).toBe("2026-11-28");
    expect(plan.phases).toHaveLength(3);
    expect(plan.tasks.some((t) => t.title === "Practise for 15 minutes")).toBe(true);
    const weekends = fakePlan(
      "Get fitter",
      { length: "2w", minutesPerDay: "weekends" },
      today,
      end,
    );
    expect(weekends.tasks.some((t) => t.title === "Practise for 60 minutes")).toBe(true);
  });

  it("make more tasks that pass the schema and keep their phases", () => {
    const plan = resolvePlan(modelPlan.parse(fakePlan("Get fitter", basics, today, end)), {
      today,
      end,
    });
    const more = resolveMoreTasks(modelMore.parse(fakeMore(today, plan.phases)), {
      today,
      planEnd: end,
      phases: plan.phases,
    });
    expect(more).toHaveLength(3);
    expect(more.every((t) => t.phaseId === "p3" && t.check === null)).toBe(true);
  });

  it("is deterministic", () => {
    expect(fakePlan("Get fitter", basics, today, end)).toEqual(
      fakePlan("Get fitter", basics, today, end),
    );
  });
});
