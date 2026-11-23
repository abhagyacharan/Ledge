import { describe, expect, it } from "vitest";
import { choiceLabel, defaultChoiceFor, hasActiveReminder, rowToChoice } from "./reminders";

const since = new Date("2026-11-20T00:00:00Z");
const settings = { reminderDefault: "before:30", reminderDefaultSince: since };
const fresh = new Date("2026-11-21T00:00:00Z");
const old = new Date("2026-11-19T00:00:00Z");
const task = (over = {}) => ({
  status: "open",
  dueDate: "2026-11-25",
  dueTime: "17:00",
  createdAt: fresh,
  ...over,
});
const row = (kind: "none" | "at_due" | "before" | "custom", over = {}) => ({
  kind,
  offsetMinutes: null,
  customDate: null,
  customTime: null,
  ...over,
});

describe("defaultChoiceFor", () => {
  it("applies to a new task with a time", () => {
    expect(defaultChoiceFor(task(), settings)).toEqual({ kind: "before", offsetMinutes: 30 });
  });
  it("skips tasks without a time, older tasks, an unset date and a None default", () => {
    expect(defaultChoiceFor(task({ dueTime: null }), settings)).toBeNull();
    expect(defaultChoiceFor(task({ createdAt: old }), settings)).toBeNull();
    expect(defaultChoiceFor(task(), { ...settings, reminderDefaultSince: null })).toBeNull();
    expect(defaultChoiceFor(task(), { ...settings, reminderDefault: "none" })).toBeNull();
  });
});

describe("hasActiveReminder", () => {
  const today = "2026-11-24";
  it("is true for the default, an explicit reminder and a future custom date", () => {
    expect(hasActiveReminder(task(), null, settings, today)).toBe(true);
    expect(hasActiveReminder(task({ dueTime: null }), row("at_due"), settings, today)).toBe(true);
    expect(
      hasActiveReminder(
        task({ dueDate: null }),
        row("custom", { customDate: "2026-11-30", customTime: "08:00:00" }),
        settings,
        today,
      ),
    ).toBe(true);
  });
  it("is false for a None row, a past date, a done task and a date-only task with no row", () => {
    expect(hasActiveReminder(task(), row("none"), settings, today)).toBe(false);
    expect(hasActiveReminder(task({ dueDate: "2026-11-23" }), row("at_due"), settings, today)).toBe(
      false,
    );
    expect(hasActiveReminder(task({ status: "done" }), row("at_due"), settings, today)).toBe(false);
    expect(hasActiveReminder(task({ dueTime: null }), null, settings, today)).toBe(false);
  });
});

describe("labels", () => {
  const o = { hasTime: false, morningTime: "09:00", today: "2026-11-24", locale: "en-IN" };
  it("names At due time by the morning time for a date-only task", () => {
    expect(choiceLabel({ kind: "at_due" }, o)).toMatch(/^At 9:00/);
    expect(choiceLabel({ kind: "at_due" }, { ...o, hasTime: true })).toBe("At due time");
  });
  it("names before and custom choices", () => {
    expect(choiceLabel({ kind: "before", offsetMinutes: 1440 }, o)).toBe("1 day before");
    expect(choiceLabel({ kind: "custom", date: "2026-11-30", time: "08:00" }, o)).toContain("30");
  });
  it("turns a stored custom row into a choice without seconds", () => {
    expect(
      rowToChoice(row("custom", { customDate: "2026-11-30", customTime: "08:00:00" })),
    ).toEqual({ kind: "custom", date: "2026-11-30", time: "08:00" });
  });
});
