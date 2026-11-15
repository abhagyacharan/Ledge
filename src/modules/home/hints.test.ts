import { describe, expect, it } from "vitest";
import { greeting, tasksHint, tasksSentence, type TaskCounts } from "./hints";

const TODAY = "2026-11-13"; // a Friday
const none: TaskCounts = { dueToday: 0, overdue: 0, doneToday: 0, overdueDate: null };

describe("greeting", () => {
  it("follows the time of day", () => {
    expect(greeting("08:30", "Aditi")).toBe("Good morning, Aditi");
    expect(greeting("12:00", "Aditi")).toBe("Good afternoon, Aditi");
    expect(greeting("17:00", "Aditi")).toBe("Good evening, Aditi");
    expect(greeting("02:10", "Aditi")).toBe("Good evening, Aditi");
  });

  it("works without a name", () => {
    expect(greeting("09:00", "")).toBe("Good morning");
  });
});

describe("tasksSentence", () => {
  it("counts today's tasks in words", () => {
    expect(tasksSentence({ ...none, dueToday: 2 }, TODAY)).toBe("Two tasks left today.");
    expect(tasksSentence({ ...none, dueToday: 1 }, TODAY)).toBe("One task left today.");
    expect(tasksSentence({ ...none, dueToday: 12 }, TODAY)).toBe("12 tasks left today.");
  });

  it("names the weekday of a single overdue task from this week", () => {
    const counts = { ...none, dueToday: 2, overdue: 1, overdueDate: "2026-11-11" };
    expect(tasksSentence(counts, TODAY)).toBe(
      "Two tasks left today. One from Wednesday is still open.",
    );
  });

  it("says yesterday, or older, for a single overdue task", () => {
    const yesterday = { ...none, overdue: 1, overdueDate: "2026-11-12" };
    expect(tasksSentence(yesterday, TODAY)).toBe(
      "Nothing due today. One from yesterday is still open.",
    );
    const old = { ...none, overdue: 1, overdueDate: "2026-10-01" };
    expect(tasksSentence(old, TODAY)).toBe("Nothing due today. One older task is still open.");
  });

  it("counts several overdue tasks", () => {
    expect(tasksSentence({ ...none, doneToday: 3, overdue: 4 }, TODAY)).toBe(
      "Today is done. Four older tasks are still open.",
    );
  });

  it("is encouraging when nothing is left", () => {
    expect(tasksSentence(none, TODAY)).toBe("All caught up.");
    expect(tasksSentence({ ...none, doneToday: 2 }, TODAY)).toBe("Today is done.");
  });
});

describe("tasksHint", () => {
  it("reads like the design", () => {
    expect(tasksHint({ ...none, dueToday: 2 })).toBe("2 due today");
    expect(tasksHint({ ...none, doneToday: 1 })).toBe("All done today");
    expect(tasksHint(none)).toBe("Nothing due today");
  });
});
