import { describe, expect, it } from "vitest";
import { addDaysIso } from "@/lib/dates";
import { parseRule } from "@/lib/recurrence";
import { fakeMore } from "./fake";
import {
  nearestPhase,
  planLastDate,
  resolveMoreTasks,
  resolvePhases,
  resolvePlan,
  resolveQuestions,
  resolveResources,
  ruleForRepeat,
  titleFromGoal,
} from "./resolve";
import type { ModelPlan, ModelPlanTask } from "./schema";

const today = "2026-11-22"; // a Sunday
const end = "2026-12-21"; // a month: 30 days

const task = (over: Partial<ModelPlanTask> = {}): ModelPlanTask => ({
  title: "Take 5 portraits",
  notes: null,
  phaseId: "p1",
  dueDate: "2026-11-25",
  priority: "none",
  repeat: "none",
  repeatUntil: null,
  estimateMinutes: null,
  milestone: false,
  subtasks: [],
  ...over,
});

const phases = [
  { id: "p1", name: "Start", startDate: today, endDate: "2026-12-01" },
  { id: "p2", name: "Middle", startDate: "2026-12-02", endDate: "2026-12-11" },
  { id: "p3", name: "Finish", startDate: "2026-12-12", endDate: end },
];

const plan = (tasks: ModelPlanTask[], over: Partial<ModelPlan> = {}): ModelPlan => ({
  title: "Photography",
  listName: "Photography",
  summary: "A month.",
  phases,
  tasks,
  resources: [],
  ...over,
});

const resolve = (p: ModelPlan, planEnd = end) => resolvePlan(p, { today, end: planEnd });

const q = (over: Partial<Parameters<typeof resolveQuestions>[0]["questions"][number]> = {}) => ({
  id: "x",
  kind: "single" as const,
  text: "Which area?",
  options: ["a", "b", "c"],
  scaleLow: null,
  scaleHigh: null,
  because: null,
  ...over,
});

describe("resolveQuestions", () => {
  it("caps at 6 questions and 6 options and numbers them itself", () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      q({ id: `x${i}`, text: `Question ${i}?`, options: ["a", "b", "c", "d", "e", "f", "g", "h"] }),
    );
    const out = resolveQuestions({ questions: many });
    expect(out).toHaveLength(6);
    expect(out.map((x) => x.id)).toEqual(["q1", "q2", "q3", "q4", "q5", "q6"]);
    expect(out.every((x) => x.options.length === 6)).toBe(true);
  });

  it("turns a choice question that cannot be tapped into a text question", () => {
    const [one, level, none] = resolveQuestions({
      questions: [
        q({ text: "One option only?", options: ["Yes"] }),
        q({ text: "  " }),
        q({ text: "Level?", options: ["Beginner", "beginner", " ", "Expert"] }),
      ],
    });
    expect(one).toMatchObject({ kind: "text", options: [] });
    expect(level).toMatchObject({ id: "q2", text: "Level?", options: ["Beginner", "Expert"] });
    expect(none).toBeUndefined();
  });

  it("gives a scale labels and ignores options and because outside their kind", () => {
    const [scale, text] = resolveQuestions({
      questions: [
        q({ kind: "scale", options: ["x", "y"], scaleLow: "Never", scaleHigh: null, because: "b" }),
        q({ kind: "text", options: ["x", "y"] }),
      ],
    });
    expect(scale).toMatchObject({
      kind: "scale",
      options: [],
      scaleLabels: { low: "Never", high: "Very much" },
      because: null,
    });
    expect(text).toMatchObject({ kind: "text", options: [], scaleLabels: null });
  });

  it("allows no questions", () => {
    expect(resolveQuestions({ questions: [] })).toEqual([]);
  });

  it("follow-ups: at most 3, ids f1.., with a short because", () => {
    const out = resolveQuestions(
      { questions: Array.from({ length: 5 }, () => q({ because: `  ${"b".repeat(200)}  ` })) },
      "followups",
    );
    expect(out.map((x) => x.id)).toEqual(["f1", "f2", "f3"]);
    expect(out[0]?.because).toHaveLength(80);
  });
});

describe("resolvePhases", () => {
  it("keeps the model's boundaries but makes the phases contiguous inside the window", () => {
    const { phases: out } = resolvePhases(phases, today, end);
    expect(out.map((p) => [p.id, p.startDate, p.endDate])).toEqual([
      ["p1", today, "2026-12-01"],
      ["p2", "2026-12-02", "2026-12-11"],
      ["p3", "2026-12-12", end],
    ]);
  });

  it("clamps overlong or invalid dates and always ends on the last day", () => {
    const { phases: out } = resolvePhases(
      [
        { id: "a", name: "One", startDate: "x", endDate: "2026-12-05" },
        { id: "b", name: "Two", startDate: "y", endDate: "2027-06-01" },
      ],
      today,
      end,
    );
    expect(out).toHaveLength(2);
    expect(out[0]?.startDate).toBe(today);
    expect(out[1]?.startDate).toBe("2026-12-06");
    expect(out[1]?.endDate).toBe(end);
  });

  it("caps at 6 phases and splits the window when fewer than 2 are usable", () => {
    const six = Array.from({ length: 9 }, (_, i) => ({
      id: `x${i}`,
      name: `P${i}`,
      startDate: addDaysIso(today, i + 1),
      endDate: addDaysIso(today, i + 2),
    }));
    expect(resolvePhases(six, today, end).phases.length).toBeLessThanOrEqual(6);
    const split = resolvePhases([], today, end).phases;
    expect(split).toHaveLength(2);
    expect(split[0]?.startDate).toBe(today);
    expect(split[1]?.endDate).toBe(end);
    expect(split[1]?.startDate > split[0]?.endDate).toBe(true);
    const single = resolvePhases([phases[0]], today, end).phases;
    expect(single).toHaveLength(2);
    expect(single[0]?.name).toBe("Start");
  });

  it("finds the nearest phase for a date", () => {
    const p = phases;
    expect(nearestPhase(p, "2026-12-05")).toBe("p2");
    expect(nearestPhase(p, "2025-01-01")).toBe("p1");
    expect(nearestPhase(p, "2030-01-01")).toBe("p3");
    expect(nearestPhase(p, null)).toBe("p1");
  });
});

describe("resolvePlan", () => {
  it("returns the plan's frame: title, list, window and resolved phases", () => {
    const out = resolve(plan([task()]));
    expect(out).toMatchObject({
      title: "Photography",
      listName: "Photography",
      startDate: today,
      endDate: end,
    });
    expect(out.phases).toHaveLength(3);
    expect(out.tasks[0]).toMatchObject({ key: "t1", phaseId: "p1", dueDate: "2026-11-25" });
  });

  it("caps tasks at 8 per phase and 30 in all", () => {
    const many = Array.from({ length: 12 }, (_, i) => task({ title: `A${i}`, phaseId: "p1" }));
    expect(resolve(plan(many)).tasks).toHaveLength(8);
    const all = ["p1", "p2", "p3"].flatMap((id) =>
      Array.from({ length: 8 }, (_, i) => task({ title: `${id}-${i}`, phaseId: id })),
    );
    expect(resolve(plan(all)).tasks).toHaveLength(24);
    const six = Array.from({ length: 6 }, (_, p) =>
      Array.from({ length: 8 }, (_, i) => task({ title: `${p}-${i}`, phaseId: `p${p + 1}` })),
    ).flat();
    const sixPhases = Array.from({ length: 6 }, (_, p) => ({
      id: `p${p + 1}`,
      name: `P${p + 1}`,
      startDate: addDaysIso(today, p * 5),
      endDate: addDaysIso(today, p * 5 + 4),
    }));
    expect(resolve(plan(six, { phases: sixPhases })).tasks).toHaveLength(30);
  });

  it("sends a task with an unknown phase to the nearest phase by date", () => {
    const out = resolve(plan([task({ phaseId: "nope", dueDate: "2026-12-14" })]));
    expect(out.tasks[0]?.phaseId).toBe("p3");
    expect(resolve(plan([task({ phaseId: "nope", dueDate: null })])).tasks[0]?.phaseId).toBe("p1");
  });

  it("clamps dates into today..plan end and says so", () => {
    const out = resolve(
      plan([
        task({ dueDate: "2026-11-01" }),
        task({ dueDate: "2027-05-01" }),
        task({ dueDate: "soon" }),
        task({ dueDate: null }),
      ]),
    );
    expect(out.tasks.map((t) => t.dueDate)).toEqual([today, end, null, null]);
    expect(out.tasks[0]?.check).toMatch(/moved to fit/);
    expect(out.tasks[1]?.check).toMatch(/moved to fit/);
    expect(out.tasks[2]?.check).toMatch(/wasn't valid/);
    expect(out.tasks[3]?.check).toBeNull();
  });

  it("holds a short custom plan to its own end date", () => {
    const out = resolve(plan([task({ dueDate: "2026-12-10" })]), "2026-11-28");
    expect(out.endDate).toBe("2026-11-28");
    expect(out.tasks[0]?.dueDate).toBe("2026-11-28");
    expect(out.phases[out.phases.length - 1]?.endDate).toBe("2026-11-28");
  });

  it("never lets a plan reach past 183 days, even with a later end date", () => {
    const out = resolvePlan(plan([task({ dueDate: "2027-12-01" })]), {
      today,
      end: "2028-01-01",
    });
    expect(out.endDate).toBe("2027-05-24");
    expect(out.tasks[0]?.dueDate).toBe("2027-05-24");
  });

  it("gives repeats a date and an end, the plan's end by default", () => {
    const out = resolve(
      plan([
        task({ repeat: "daily", dueDate: null }),
        task({ repeat: "weekdays", dueDate: "2026-11-23", repeatUntil: "2026-12-05" }),
        task({ repeat: "weekly", dueDate: "2026-11-24", repeatUntil: "2025-01-01" }),
      ]),
    );
    expect(out.tasks[0]).toMatchObject({ dueDate: today, repeatUntil: end });
    expect(out.tasks[0]?.check).toMatch(/starts today/);
    expect(out.tasks[1]).toMatchObject({ repeatUntil: "2026-12-05", check: null });
    expect(out.tasks[2]).toMatchObject({ repeatUntil: end });
    expect(out.tasks[2]?.check).toMatch(/repeat end/);
  });

  it("forces milestones to high priority, keeps 1 to 3, and names one if none was", () => {
    const four = resolve(
      plan([1, 2, 3, 4].map((i) => task({ title: `M${i}`, milestone: true, priority: "low" }))),
    );
    expect(four.tasks.filter((t) => t.milestone)).toHaveLength(3);
    expect(four.tasks.filter((t) => t.milestone).every((t) => t.priority === 3)).toBe(true);
    expect(four.tasks[3]).toMatchObject({ milestone: false, priority: 1 });

    const none = resolve(plan([task({ title: "One" }), task({ title: "Two" })]));
    expect(none.tasks.map((t) => t.milestone)).toEqual([false, true]);
    expect(none.tasks[1]?.priority).toBe(3);
  });

  it("caps subtasks at 5, cleans them, and gives a repeating task none", () => {
    const out = resolve(
      plan([
        task({ subtasks: ["a", " b ", "", "c", "d", "e", "f", "g"] }),
        task({ repeat: "daily", subtasks: ["x"] }),
      ]),
    );
    expect(out.tasks[0]?.subtasks).toEqual(["a", "b", "c", "d", "e"]);
    expect(out.tasks[1]?.subtasks).toEqual([]);
  });

  it("clamps estimates to 5 to 240 minutes and keeps null", () => {
    const out = resolve(
      plan([
        task({ estimateMinutes: 1 }),
        task({ estimateMinutes: 1000 }),
        task({ estimateMinutes: 44.6 }),
        task({ estimateMinutes: null }),
      ]),
    );
    expect(out.tasks.map((t) => t.estimateMinutes)).toEqual([5, 240, 45, null]);
  });

  it("trims long notes to 400 characters and drops empty titles", () => {
    const out = resolve(plan([task({ notes: "n".repeat(900) }), task({ title: "   " })]));
    expect(out.tasks).toHaveLength(1);
    expect(out.tasks[0]?.notes).toHaveLength(400);
  });

  it("falls back to a name when the model gives none, and caps lengths", () => {
    const out = resolve(plan([task()], { listName: "  ", title: "T".repeat(200) }));
    expect(out.listName).toBe("My plan");
    expect(out.title).toHaveLength(80);
  });
});

describe("resolveResources", () => {
  it("caps at 8, drops repeats and never carries a link", () => {
    const raw = Array.from({ length: 12 }, (_, i) => ({
      name: `Book ${i % 10}`,
      kind: "book" as const,
      why: "Helpful",
      url: "https://evil.example/made-up",
    }));
    const out = resolveResources(raw);
    expect(out).toHaveLength(8);
    expect(out.every((r) => r.url === null && r.used === false)).toBe(true);
    expect(new Set(out.map((r) => r.name)).size).toBe(8);
  });
});

describe("resolveMoreTasks", () => {
  it("keeps up to 10 tasks in the plan's own phases, from today", () => {
    const reply = {
      tasks: Array.from({ length: 14 }, (_, i) => task({ title: `More ${i}`, phaseId: "p3" })),
    };
    const out = resolveMoreTasks(reply, { today, planEnd: end, phases });
    expect(out).toHaveLength(10);
    expect(out[0]?.key).toBe("m1");
    expect(out.every((t) => t.phaseId === "p3")).toBe(true);
  });

  it("still works when the plan has already ended", () => {
    const out = resolveMoreTasks(fakeMore(today, phases), {
      today,
      planEnd: "2026-11-01",
      phases,
    });
    expect(out).toHaveLength(3);
    expect(out.every((t) => t.check === null)).toBe(true);
  });
});

describe("repeat rules and dates", () => {
  it("turns a repeat choice into a stored rule", () => {
    expect(ruleForRepeat("none", "2026-11-22")).toBeNull();
    expect(ruleForRepeat("daily", "2026-11-22")).toBe("FREQ=DAILY");
    expect(ruleForRepeat("weekdays", "2026-11-23")).toBe("FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR");
    const weekly = ruleForRepeat("weekly", "2026-11-23");
    expect(weekly && parseRule(weekly)?.freq).toBe("weekly");
  });

  it("finds the last day a plan's tasks touch", () => {
    expect(
      planLastDate([
        { dueDate: "2026-11-25", repeat: "none", repeatUntil: null },
        { dueDate: "2026-11-23", repeat: "daily", repeatUntil: "2026-12-05" },
        { dueDate: null, repeat: "none", repeatUntil: null },
      ]),
    ).toBe("2026-12-05");
    expect(planLastDate([])).toBeNull();
  });

  it("makes a title from the goal's first words", () => {
    expect(
      titleFromGoal("i want to start freelancing, I'm a beginner!! and have no idea what"),
    ).toBe("I want to start freelancing I'm a");
    expect(titleFromGoal("???")).toBe("My plan");
  });
});

describe("capHighPriority", () => {
  it("keeps at most one task in four high, milestones first, demoting the latest", () => {
    const tasks = Array.from({ length: 8 }, (_, i) =>
      task({
        title: `Task ${i + 1}`,
        dueDate: addDaysIso(today, i + 1),
        priority: "high",
        milestone: i === 7,
      }),
    );
    const out = resolve(plan(tasks)).tasks;
    const high = out.filter((t) => t.priority === 3).map((t) => t.title);
    expect(high).toEqual(["Task 1", "Task 8"]);
    expect(out.filter((t) => t.priority === 2)).toHaveLength(6);
  });

  it("leaves a plan alone when few tasks are high", () => {
    const tasks = [task({ priority: "high" }), task({ title: "Two" }), task({ title: "Three" })];
    expect(resolve(plan(tasks)).tasks.filter((t) => t.priority === 3)).toHaveLength(1);
  });
});
