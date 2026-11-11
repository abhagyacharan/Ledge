import { describe, expect, it } from "vitest";
import { applyView, filterTasks, groupTasks, sortTasks, type ViewableTask } from "./view-logic";
import { DEFAULT_VIEW_SETTINGS, type ViewSettings } from "./view-settings";

const info = { today: "2026-11-10", timeNow: "12:00" };

let n = 0;
function task(overrides: Partial<ViewableTask> & { title: string }): ViewableTask {
  n += 1;
  return {
    id: `t${n}`,
    status: "open",
    priority: 0,
    dueDate: null,
    dueTime: null,
    position: `a${String(n).padStart(3, "0")}`,
    createdAt: new Date(2026, 10, n),
    ...overrides,
  };
}

const titles = (tasks: ViewableTask[]) => tasks.map((t) => t.title);
const settings = (patch: Partial<ViewSettings>): ViewSettings => ({
  ...DEFAULT_VIEW_SETTINGS,
  ...patch,
});

describe("filterTasks", () => {
  const all = [
    task({ title: "open plain" }),
    task({ title: "done", status: "done" }),
    task({ title: "high", priority: 3, dueDate: "2026-11-11" }),
    task({ title: "low", priority: 1 }),
  ];

  it("hides finished tasks by default and shows them on request", () => {
    expect(titles(filterTasks(all, settings({})))).not.toContain("done");
    expect(titles(filterTasks(all, settings({ showCompleted: true })))).toContain("done");
  });

  it("filters by exact priority, including 'none'", () => {
    expect(titles(filterTasks(all, settings({ priority: 3 })))).toEqual(["high"]);
    expect(titles(filterTasks(all, settings({ priority: 0 })))).toEqual(["open plain"]);
  });

  it("filters by whether a due date exists", () => {
    expect(titles(filterTasks(all, settings({ hasDue: "yes" })))).toEqual(["high"]);
    expect(titles(filterTasks(all, settings({ hasDue: "no" })))).toEqual(["open plain", "low"]);
  });

  it("combines filters", () => {
    expect(titles(filterTasks(all, settings({ hasDue: "yes", priority: 1 })))).toEqual([]);
  });
});

describe("sortTasks", () => {
  it("manual: by position", () => {
    const a = task({ title: "a", position: "a2" });
    const b = task({ title: "b", position: "a1" });
    const c = task({ title: "c", position: "Zz" }); // uppercase sorts first, byte by byte
    expect(titles(sortTasks([a, b, c], "manual"))).toEqual(["c", "b", "a"]);
  });

  it("due: earlier first, undated last, timed before untimed on the same day, then priority", () => {
    const list = [
      task({ title: "undated", priority: 3 }),
      task({ title: "later", dueDate: "2026-11-20" }),
      task({ title: "today untimed", dueDate: "2026-11-10" }),
      task({ title: "today 09:00", dueDate: "2026-11-10", dueTime: "09:00:00" }),
      task({ title: "today 08:00", dueDate: "2026-11-10", dueTime: "08:00:00" }),
      task({ title: "today untimed high", dueDate: "2026-11-10", priority: 3 }),
    ];
    expect(titles(sortTasks(list, "due"))).toEqual([
      "today 08:00",
      "today 09:00",
      "today untimed high",
      "today untimed",
      "later",
      "undated",
    ]);
  });

  it("priority: high first, then earlier due date", () => {
    const list = [
      task({ title: "low", priority: 1, dueDate: "2026-11-10" }),
      task({ title: "high late", priority: 3, dueDate: "2026-11-30" }),
      task({ title: "high soon", priority: 3, dueDate: "2026-11-11" }),
      task({ title: "none" }),
    ];
    expect(titles(sortTasks(list, "priority"))).toEqual(["high soon", "high late", "low", "none"]);
  });

  it("created: newest first", () => {
    const list = [
      task({ title: "old", createdAt: new Date(2026, 0, 1) }),
      task({ title: "new", createdAt: new Date(2026, 5, 1) }),
    ];
    expect(titles(sortTasks(list, "created"))).toEqual(["new", "old"]);
  });

  it("does not change the input array", () => {
    const list = [task({ title: "b", position: "a2" }), task({ title: "a", position: "a1" })];
    sortTasks(list, "manual");
    expect(titles(list)).toEqual(["b", "a"]);
  });
});

describe("groupTasks", () => {
  it("none: one group", () => {
    const g = groupTasks([task({ title: "x" })], "none", info);
    expect(g).toHaveLength(1);
    expect(g[0].label).toBe("");
  });

  it("due: buckets in a fixed order, skipping empty ones", () => {
    const list = [
      task({ title: "none" }),
      task({ title: "later", dueDate: "2026-12-25" }),
      task({ title: "week", dueDate: "2026-11-15" }),
      task({ title: "tomorrow", dueDate: "2026-11-11" }),
      task({ title: "today pm", dueDate: "2026-11-10", dueTime: "18:00" }),
      task({ title: "today am", dueDate: "2026-11-10", dueTime: "08:00" }), // time passed
      task({ title: "old", dueDate: "2026-11-01" }),
    ];
    const g = groupTasks(list, "due", info);
    expect(g.map((x) => x.label)).toEqual([
      "Overdue",
      "Today",
      "Tomorrow",
      "Next 7 days",
      "Later",
      "No date",
    ]);
    expect(titles(g[0].tasks)).toEqual(["today am", "old"]);
    expect(titles(g[1].tasks)).toEqual(["today pm"]);
  });

  it("due: day 7 is in 'Next 7 days', day 8 is 'Later'", () => {
    const g = groupTasks(
      [task({ title: "d7", dueDate: "2026-11-17" }), task({ title: "d8", dueDate: "2026-11-18" })],
      "due",
      info,
    );
    expect(g.map((x) => [x.label, titles(x.tasks)])).toEqual([
      ["Next 7 days", ["d7"]],
      ["Later", ["d8"]],
    ]);
  });

  it("priority: high to none, skipping empty", () => {
    const g = groupTasks(
      [task({ title: "a", priority: 1 }), task({ title: "b", priority: 3 })],
      "priority",
      info,
    );
    expect(g.map((x) => x.label)).toEqual(["High priority", "Low priority"]);
  });
});

describe("applyView", () => {
  it("filters, sorts, groups, and puts finished tasks last in each group", () => {
    const list = [
      task({ title: "done high", status: "done", priority: 3 }),
      task({ title: "low", priority: 1 }),
      task({ title: "high", priority: 3 }),
    ];
    const g = applyView(list, settings({ sort: "priority", showCompleted: true }), info);
    expect(titles(g[0].tasks)).toEqual(["high", "low", "done high"]);
  });

  it("returns no groups for no tasks when grouping", () => {
    expect(applyView([], settings({ group: "priority" }), info)).toEqual([]);
  });
});
