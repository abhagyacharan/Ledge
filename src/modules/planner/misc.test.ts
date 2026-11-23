import { describe, expect, it } from "vitest";
import { composeNotes, formatEstimateLine, parseEstimateLine } from "./estimate";
import { resourceSearchUrl } from "./resources";
import { makeDateMapper, newEndDate, rescheduleTasks, type ReschedulableTask } from "./reschedule";
import {
  addPlanInput,
  basicsSchema,
  canAskFollowups,
  planEndDate,
  planResourceSchema,
  type PlanBasics,
} from "./schema";

const today = "2026-11-22";

describe("estimate line", () => {
  it("formats minutes and hours", () => {
    expect(formatEstimateLine(45)).toBe("About 45 min");
    expect(formatEstimateLine(60)).toBe("About 1 hr");
    expect(formatEstimateLine(90)).toBe("About 1 hr 30 min");
    expect(formatEstimateLine(120)).toBe("About 2 hr");
    expect(formatEstimateLine(1)).toBe("About 5 min");
    expect(formatEstimateLine(9999)).toBe("About 4 hr");
  });

  it("round-trips every valid estimate", () => {
    for (let m = 5; m <= 240; m++) {
      expect(parseEstimateLine(formatEstimateLine(m)).minutes).toBe(m);
    }
  });

  it("composes notes with the line first and parses them back", () => {
    const notes = composeNotes(45, "Pick three projects.\nWhy: proof.");
    expect(notes).toBe("About 45 min\n\nPick three projects.\nWhy: proof.");
    expect(parseEstimateLine(notes)).toEqual({
      minutes: 45,
      rest: "Pick three projects.\nWhy: proof.",
    });
    expect(composeNotes(30, "  ")).toBe("About 30 min");
    expect(composeNotes(null, " just notes ")).toBe("just notes");
    expect(composeNotes(null, "")).toBeNull();
  });

  it("leaves ordinary notes alone", () => {
    expect(parseEstimateLine("About the weather")).toEqual({
      minutes: null,
      rest: "About the weather",
    });
    expect(parseEstimateLine(null)).toEqual({ minutes: null, rest: "" });
    expect(parseEstimateLine("About 3 min")).toEqual({ minutes: null, rest: "About 3 min" });
  });
});

describe("resource search links", () => {
  it("searches YouTube for a video channel and the web for anything else", () => {
    expect(resourceSearchUrl({ name: "Fireship & Co", kind: "video" })).toBe(
      "https://www.youtube.com/results?search_query=Fireship%20%26%20Co",
    );
    expect(resourceSearchUrl({ name: "The Lean Startup", kind: "book" })).toBe(
      "https://www.google.com/search?q=The%20Lean%20Startup",
    );
    for (const kind of ["course", "community", "tool", "article"] as const) {
      expect(resourceSearchUrl({ name: "x", kind })).toMatch(/^https:\/\/www\.google\.com\/search/);
    }
  });

  it("only accepts a pasted link that is http or https", () => {
    const base = { id: "r1", name: "Mine", kind: "book", why: "", used: false };
    expect(planResourceSchema.safeParse({ ...base, url: "https://example.com/a" }).success).toBe(
      true,
    );
    expect(planResourceSchema.safeParse({ ...base, url: null }).success).toBe(true);
    expect(planResourceSchema.safeParse({ ...base, url: "javascript:alert(1)" }).success).toBe(
      false,
    );
    expect(planResourceSchema.safeParse({ ...base, url: "not a link" }).success).toBe(false);
  });
});

describe("reschedule maths", () => {
  const open: ReschedulableTask[] = [
    { id: "a", dueDate: "2026-11-23", recurrenceUntil: null },
    { id: "b", dueDate: "2026-12-02", recurrenceUntil: "2026-12-12" },
    { id: "c", dueDate: "2026-12-12", recurrenceUntil: null },
    { id: "d", dueDate: null, recurrenceUntil: null },
    { id: "late", dueDate: "2026-11-10", recurrenceUntil: null },
  ];

  it("shifts every date, including repeat ends, and never before today", () => {
    const map = makeDateMapper({ mode: "shift", days: 7 }, today, "2026-12-12");
    expect(rescheduleTasks(open, map)).toEqual([
      { id: "a", dueDate: "2026-11-30", recurrenceUntil: null },
      { id: "b", dueDate: "2026-12-09", recurrenceUntil: "2026-12-19" },
      { id: "c", dueDate: "2026-12-19", recurrenceUntil: null },
      { id: "late", dueDate: today, recurrenceUntil: null },
    ]);
    const back = makeDateMapper({ mode: "shift", days: -10 }, today, null);
    expect(back("2026-11-25")).toBe(today);
  });

  it("spreads onto a new end date in proportion, keeping order", () => {
    // today..old end is 20 days; the new end is 40 days out: offsets double.
    const map = makeDateMapper({ mode: "spread", endDate: "2027-01-01" }, today, "2026-12-12");
    const out = rescheduleTasks(open, map);
    expect(out.find((t) => t.id === "a")?.dueDate).toBe("2026-11-24"); // 1 -> 2
    expect(out.find((t) => t.id === "b")?.dueDate).toBe("2026-12-12"); // 10 -> 20
    expect(out.find((t) => t.id === "b")?.recurrenceUntil).toBe("2027-01-01"); // at the old end: the new end
    expect(out.find((t) => t.id === "c")?.dueDate).toBe("2027-01-01"); // at the old end
    expect(out.find((t) => t.id === "late")?.dueDate).toBe(today);
    const dates = out.filter((t) => t.id !== "late").map((t) => t.dueDate as string);
    expect([...dates].sort()).toEqual(dates);
  });

  it("squeezes onto an earlier end", () => {
    const map = makeDateMapper({ mode: "spread", endDate: "2026-12-02" }, today, "2026-12-12");
    // 20 days to 10: offset 10 becomes 5; nothing passes the new end.
    expect(map("2026-12-02")).toBe("2026-11-27");
    expect(map("2026-12-30")).toBe("2026-12-02");
    expect(map("2026-11-01")).toBe(today);
  });

  it("works out the plan's new end", () => {
    expect(newEndDate({ mode: "shift", days: 5 }, today, "2026-12-12")).toBe("2026-12-17");
    expect(newEndDate({ mode: "spread", endDate: "2027-01-01" }, today, "2026-12-12")).toBe(
      "2027-01-01",
    );
    expect(newEndDate({ mode: "shift", days: 5 }, today, null)).toBeNull();
  });
});

describe("basics and the plan window", () => {
  it("sets the end from the length", () => {
    const end = (length: PlanBasics["length"]) => planEndDate({ length, minutesPerDay: 30 }, today);
    expect(end("1w")).toBe("2026-11-28");
    expect(end("2w")).toBe("2026-12-05");
    expect(end("1m")).toBe("2026-12-21");
    expect(end("3m")).toBe("2027-02-20");
  });

  it("accepts a custom date up to 183 days out and nothing else", () => {
    const end = (date: string) => planEndDate({ length: { date }, minutesPerDay: 15 }, today);
    expect(end("2027-05-24")).toBe("2027-05-24");
    expect(end("2027-05-25")).toBeNull();
    expect(end(today)).toBeNull();
    expect(end("2026-11-01")).toBeNull();
    expect(end("2026-11-23")).toBe("2026-11-23");
  });

  it("validates the basics shape", () => {
    expect(basicsSchema.safeParse({ length: "1m", minutesPerDay: "weekends" }).success).toBe(true);
    expect(
      basicsSchema.safeParse({ length: { date: "2026-12-30" }, minutesPerDay: 120 }).success,
    ).toBe(true);
    expect(basicsSchema.safeParse({ length: "5y", minutesPerDay: 30 }).success).toBe(false);
    expect(basicsSchema.safeParse({ length: "1m", minutesPerDay: 45 }).success).toBe(false);
  });
});

describe("one follow-up round", () => {
  it("can be asked only while it has not been asked", () => {
    expect(canAskFollowups({ followups: null })).toBe(true);
    expect(canAskFollowups({ followups: [] })).toBe(false);
    expect(
      canAskFollowups({
        followups: [
          { id: "f1", kind: "text", text: "Why?", options: [], scaleLabels: null, because: null },
        ],
      }),
    ).toBe(false);
  });

  it("needs a plan the review can add: tasks must name a real phase", () => {
    const base = {
      title: "T",
      listName: "L",
      summary: "",
      startDate: today,
      endDate: "2026-12-21",
      phases: [
        { id: "p1", name: "A", startDate: today, endDate: "2026-12-01" },
        { id: "p2", name: "B", startDate: "2026-12-02", endDate: "2026-12-21" },
      ],
      resources: [],
    };
    const task = {
      key: "t1",
      title: "Do it",
      notes: "",
      phaseId: "p1",
      dueDate: today,
      priority: 0,
      repeat: "none",
      repeatUntil: null,
      estimateMinutes: null,
      milestone: false,
      subtasks: [],
      check: null,
    };
    const planId = "0b1c9a52-8f0e-4a8a-9d0e-5a3f6f3c1b11";
    const ok = addPlanInput.safeParse({
      planId,
      draft: { ...base, tasks: [task] },
      list: { kind: "new", name: "L" },
    });
    expect(ok.success).toBe(true);
    const bad = addPlanInput.safeParse({
      planId,
      draft: { ...base, tasks: [{ ...task, phaseId: "zzz" }] },
      list: { kind: "new", name: "L" },
    });
    expect(bad.success).toBe(false);
  });
});
