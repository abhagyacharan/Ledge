import { describe, expect, it } from "vitest";
import type { DraftTask, PlanPhase } from "../../schema";
import {
  blankTask,
  estimateWording,
  headline,
  insertInPhase,
  isCut,
  keptTasks,
  orderedTasks,
  phaseCountWording,
  phaseLabel,
  realCheck,
  setCut,
  shortTitle,
  summarize,
  swipeCommit,
  swipeLean,
  taskProblems,
} from "./review-logic";

const today = "2026-11-23";
const phases: PlanPhase[] = [
  { id: "p1", name: "Your offer", startDate: "2026-11-23", endDate: "2026-11-29" },
  { id: "p2", name: "Portfolio", startDate: "2026-11-30", endDate: "2026-12-06" },
  { id: "p3", name: "Outreach", startDate: "2026-12-07", endDate: "2026-12-21" },
];

const task = (key: string, over: Partial<DraftTask> = {}): DraftTask => ({
  key,
  title: `Task ${key}`,
  notes: "",
  phaseId: "p1",
  dueDate: "2026-11-24",
  priority: 0,
  repeat: "none",
  repeatUntil: null,
  estimateMinutes: null,
  milestone: false,
  subtasks: [],
  check: null,
  ...over,
});

describe("cut mark", () => {
  it("cuts and brings back, keeping the code's own note", () => {
    const t = task("a", { check: "Moved to the last day" });
    const cut = setCut(t, true);
    expect(isCut(cut)).toBe(true);
    expect(cut.check).toBe("Moved to the last day");
    expect(realCheck(cut)).toBe("Moved to the last day");
    const back = setCut(cut, false);
    expect(isCut(back)).toBe(false);
    expect(back.check).toBe("Moved to the last day");
  });
  it("round-trips a card with no note", () => {
    const cut = setCut(task("a"), true);
    expect(realCheck(cut)).toBeNull();
    expect(setCut(cut, false).check).toBeNull();
  });
  it("filters kept tasks", () => {
    const list = [task("a"), setCut(task("b"), true), task("c")];
    expect(keptTasks(list).map((t) => t.key)).toEqual(["a", "c"]);
  });
});

describe("order and phases", () => {
  it("groups tasks by phase in phase order", () => {
    const list = [task("a", { phaseId: "p2" }), task("b"), task("c", { phaseId: "p3" }), task("d")];
    expect(orderedTasks(list, phases).map((t) => t.key)).toEqual(["b", "d", "a", "c"]);
  });
  it("labels phases in weeks", () => {
    expect(phaseLabel(phases[0], "2026-11-23", "2026-12-21")).toBe("Week 1 · Your offer");
    expect(phaseLabel(phases[2], "2026-11-23", "2026-12-21")).toBe("Weeks 3–4 · Outreach");
  });
  it("labels phases in days for a short plan", () => {
    const short: PlanPhase = {
      id: "p",
      name: "Start",
      startDate: "2026-11-23",
      endDate: "2026-11-25",
    };
    expect(phaseLabel(short, "2026-11-23", "2026-11-29")).toBe("Days 1–3 · Start");
  });
  it("inserts a task at the end of its phase, and into an empty one in order", () => {
    const list = [task("a"), task("b"), task("c", { phaseId: "p3" })];
    const added = insertInPhase(list, task("n", { phaseId: "p1" }), phases);
    expect(added.map((t) => t.key)).toEqual(["a", "b", "n", "c"]);
    const intoEmpty = insertInPhase(list, task("m", { phaseId: "p2" }), phases);
    expect(intoEmpty.map((t) => t.key)).toEqual(["a", "b", "m", "c"]);
  });
  it("makes a valid blank card", () => {
    const blank = blankTask([task("a")], "p1", today);
    expect(blank.phaseId).toBe("p1");
    expect(blank.key).not.toBe("a");
    expect(taskProblems([blank], today)).toEqual({});
  });
});

describe("summary", () => {
  const tasks = [
    task("a", { dueDate: "2026-11-24" }),
    task("b", { dueDate: "2026-11-25", repeat: "daily" }),
    setCut(task("c"), true),
    task("d", { phaseId: "p3", dueDate: "2026-12-21", milestone: true }),
  ];
  const s = summarize({
    tasks,
    phases,
    startDate: "2026-11-23",
    endDate: "2026-12-21",
    today,
    locale: "en-GB",
  });
  it("counts and words it", () => {
    expect(s.kept).toBe(3);
    expect(s.cut).toBe(1);
    expect(s.repeating).toBe(1);
    expect(s.milestones).toBe(1);
    expect(s.headline).toBe("3 tasks over 4 weeks, 1 repeating");
    expect(s.firstLine).toBe("First task Tue 24 Nov. The milestone is Mon 21 Dec.");
    expect(s.firstDate).toBe("2026-11-24");
    expect(s.lastDate).toBe("2026-12-21");
  });
  it("counts per phase", () => {
    expect(s.perPhase.map((p) => [p.tasks, p.milestones, p.cut])).toEqual([
      [2, 0, 1],
      [0, 0, 0],
      [1, 1, 0],
    ]);
    expect(phaseCountWording(s.perPhase[0])).toBe("2 tasks");
    expect(phaseCountWording(s.perPhase[1])).toBe("No tasks");
    expect(phaseCountWording(s.perPhase[2])).toBe("1 task · 1 milestone");
  });
  it("handles singular and short plans", () => {
    expect(headline(1, 0, "2026-11-23", "2026-11-25")).toBe("1 task over 3 days");
    expect(headline(2, 0, "2026-11-23", "2026-11-29")).toBe("2 tasks over 1 week");
  });
});

describe("swipe", () => {
  it("shows the word from 40px", () => {
    expect(swipeLean(-39)).toBeNull();
    expect(swipeLean(-40)).toBe("cut");
    expect(swipeLean(60)).toBe("keep");
  });
  it("commits past a third of the width", () => {
    expect(swipeCommit(-100, 390)).toBeNull();
    expect(swipeCommit(-130, 390)).toBe("cut");
    expect(swipeCommit(130, 390)).toBe("keep");
    expect(swipeCommit(500, 0)).toBeNull();
  });
});

describe("taskProblems", () => {
  it("flags dates that have passed or are too far away", () => {
    const out = taskProblems(
      [
        task("a", { dueDate: "2026-11-01" }),
        task("b", { dueDate: "2027-12-01" }),
        task("c"),
        task("d", { title: "  " }),
        task("e", { repeat: "daily", dueDate: null }),
        task("f", { repeat: "daily", dueDate: "2026-11-30", repeatUntil: "2026-11-25" }),
      ],
      today,
    );
    expect(Object.keys(out).sort()).toEqual(["a", "b", "d", "e", "f"]);
    expect(out.a).toMatch(/passed/);
    expect(out.b).toMatch(/six months/);
    expect(out.e).toMatch(/needs a date/);
  });
});

describe("wording", () => {
  it("shortens titles", () => {
    expect(shortTitle("Pick one offer you can sell to someone", 24)).toBe(
      "Pick one offer you can…",
    );
    expect(shortTitle("Short")).toBe("Short");
  });
  it("words estimates", () => {
    expect(estimateWording(45)).toBe("about 45 min");
    expect(estimateWording(60)).toBe("about 1 hr");
    expect(estimateWording(90)).toBe("about 1 hr 30 min");
  });
});
