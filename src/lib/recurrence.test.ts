import { describe, expect, it } from "vitest";
import {
  describeRule,
  describeStored,
  formatRule,
  nextDueDate,
  parseRule,
  ruleFor,
  type RecurrenceMode,
} from "./recurrence";

const rule = (text: string) => {
  const parsed = parseRule(text);
  if (!parsed) throw new Error(`test rule did not parse: ${text}`);
  return parsed;
};

const next = (
  text: string,
  dueDate: string | null,
  completedOn: string,
  mode: RecurrenceMode = "fixed",
) => nextDueDate({ rule: rule(text), mode, dueDate, completedOn });

describe("parseRule and formatRule", () => {
  it("reads the four frequencies and defaults the interval to 1", () => {
    expect(rule("FREQ=DAILY")).toMatchObject({ freq: "daily", interval: 1 });
    expect(rule("freq=weekly;byday=mo,we")).toMatchObject({ freq: "weekly", byDay: ["MO", "WE"] });
    expect(rule("FREQ=MONTHLY;BYMONTHDAY=1")).toMatchObject({ freq: "monthly", byMonthDay: 1 });
    expect(rule("FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=29")).toMatchObject({
      byMonth: 2,
      byMonthDay: 29,
    });
  });

  it("round-trips to a canonical form (weekdays sorted, no INTERVAL=1)", () => {
    expect(formatRule(rule("FREQ=WEEKLY;BYDAY=WE,MO;INTERVAL=1"))).toBe("FREQ=WEEKLY;BYDAY=MO,WE");
    expect(formatRule(rule("FREQ=DAILY;INTERVAL=3"))).toBe("FREQ=DAILY;INTERVAL=3");
    expect(formatRule(rule("FREQ=YEARLY;BYMONTHDAY=29;BYMONTH=2"))).toBe(
      "FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=29",
    );
  });

  it("refuses anything outside the supported subset", () => {
    for (const bad of [
      "",
      "FREQ=HOURLY",
      "FREQ=DAILY;INTERVAL=0",
      "FREQ=DAILY;INTERVAL=1000",
      "FREQ=DAILY;INTERVAL=x",
      "FREQ=DAILY;COUNT=5",
      "FREQ=DAILY;BYDAY=MO", // BYDAY is weekly only
      "FREQ=WEEKLY;BYDAY=XX",
      "FREQ=WEEKLY;BYDAY=",
      "FREQ=MONTHLY;BYMONTHDAY=32",
      "FREQ=MONTHLY;BYMONTHDAY=0",
      "FREQ=MONTHLY;BYMONTH=2", // BYMONTH is yearly only
      "FREQ=DAILY;FREQ=WEEKLY",
      "INTERVAL=2",
      "just words",
    ]) {
      expect(parseRule(bad), bad).toBeNull();
    }
  });
});

describe("fixed: the next date follows the schedule", () => {
  it("daily and every N days", () => {
    expect(next("FREQ=DAILY", "2026-11-10", "2026-11-10")).toBe("2026-11-11");
    expect(next("FREQ=DAILY;INTERVAL=3", "2026-11-10", "2026-11-10")).toBe("2026-11-13");
  });

  it("completing early moves to the date after the one that was due", () => {
    expect(next("FREQ=DAILY", "2026-11-15", "2026-11-10")).toBe("2026-11-16");
    expect(next("FREQ=WEEKLY", "2026-11-17", "2026-11-10")).toBe("2026-11-24");
  });

  it("completing late skips the occurrences already missed, so it is never in the past", () => {
    expect(next("FREQ=DAILY", "2026-11-05", "2026-11-10")).toBe("2026-11-11");
    // Every 3 days from the 5th: 8th, 11th. Completed on the 10th: next is the 11th.
    expect(next("FREQ=DAILY;INTERVAL=3", "2026-11-05", "2026-11-10")).toBe("2026-11-11");
    // Every Monday, due Mon 2 Nov, completed Thu 12 Nov: next is Mon 16 Nov.
    expect(next("FREQ=WEEKLY;BYDAY=MO", "2026-11-02", "2026-11-12")).toBe("2026-11-16");
  });

  it("weekly on chosen weekdays, in order through the week", () => {
    // Mon 9 Nov: next Wednesday, then Monday again.
    expect(next("FREQ=WEEKLY;BYDAY=MO,WE", "2026-11-09", "2026-11-09")).toBe("2026-11-11");
    expect(next("FREQ=WEEKLY;BYDAY=MO,WE", "2026-11-11", "2026-11-11")).toBe("2026-11-16");
  });

  it("every two weeks keeps to the same weeks", () => {
    expect(next("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO", "2026-11-09", "2026-11-09")).toBe("2026-11-23");
    // Mon + Fri every 2 weeks: Fri of the same week, then two weeks later.
    expect(next("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,FR", "2026-11-09", "2026-11-09")).toBe(
      "2026-11-13",
    );
    expect(next("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,FR", "2026-11-13", "2026-11-13")).toBe(
      "2026-11-23",
    );
  });

  it("weekly with no weekday uses the weekday of the due date", () => {
    expect(next("FREQ=WEEKLY", "2026-11-12", "2026-11-12")).toBe("2026-11-19");
  });

  it("monthly keeps its day and uses the last day of short months without drifting", () => {
    const r = "FREQ=MONTHLY;BYMONTHDAY=31";
    expect(next(r, "2026-01-31", "2026-01-31")).toBe("2026-02-28");
    expect(next(r, "2026-02-28", "2026-02-28")).toBe("2026-03-31"); // back to the 31st
    expect(next(r, "2026-03-31", "2026-03-31")).toBe("2026-04-30");
    expect(next("FREQ=MONTHLY;BYMONTHDAY=31", "2028-01-31", "2028-01-31")).toBe("2028-02-29"); // leap year
  });

  it("monthly crosses the year end and handles every N months", () => {
    expect(next("FREQ=MONTHLY;BYMONTHDAY=15", "2026-12-15", "2026-12-15")).toBe("2027-01-15");
    expect(next("FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=1", "2026-11-01", "2026-11-01")).toBe(
      "2027-02-01",
    );
  });

  it("monthly with no day uses the day of the due date", () => {
    expect(next("FREQ=MONTHLY", "2026-11-20", "2026-11-20")).toBe("2026-12-20");
  });

  it("yearly, including 29 February", () => {
    expect(next("FREQ=YEARLY", "2026-11-10", "2026-11-10")).toBe("2027-11-10");
    const leap = "FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=29";
    expect(next(leap, "2024-02-29", "2024-02-29")).toBe("2025-02-28");
    expect(next(leap, "2027-02-28", "2027-02-28")).toBe("2028-02-29"); // back to the 29th
    expect(next("FREQ=YEARLY;INTERVAL=2", "2026-06-01", "2026-06-01")).toBe("2028-06-01");
  });

  it("with no due date, counts from the day it was completed", () => {
    expect(next("FREQ=DAILY", null, "2026-11-10")).toBe("2026-11-11");
    expect(next("FREQ=WEEKLY;BYDAY=FR", null, "2026-11-10")).toBe("2026-11-13");
  });
});

describe("after completion: one interval from the day it was done", () => {
  it("ignores the old due date", () => {
    expect(next("FREQ=DAILY", "2026-10-01", "2026-11-10", "after_completion")).toBe("2026-11-11");
    expect(next("FREQ=DAILY;INTERVAL=4", "2026-10-01", "2026-11-10", "after_completion")).toBe(
      "2026-11-14",
    );
    expect(next("FREQ=WEEKLY;BYDAY=MO", "2026-10-01", "2026-11-10", "after_completion")).toBe(
      "2026-11-17",
    );
  });

  it("months and years, clamped at the end of a short month", () => {
    expect(next("FREQ=MONTHLY", null, "2026-01-31", "after_completion")).toBe("2026-02-28");
    expect(next("FREQ=MONTHLY;INTERVAL=2", null, "2026-12-15", "after_completion")).toBe(
      "2027-02-15",
    );
    expect(next("FREQ=YEARLY", null, "2028-02-29", "after_completion")).toBe("2029-02-28");
  });
});

describe("ruleFor (a new repeat anchored on the due date)", () => {
  it("weekly uses the weekday, monthly the day, yearly the day and month", () => {
    expect(formatRule(ruleFor("weekly", "2026-11-12"))).toBe("FREQ=WEEKLY;BYDAY=TH");
    expect(formatRule(ruleFor("monthly", "2026-01-31"))).toBe("FREQ=MONTHLY;BYMONTHDAY=31");
    expect(formatRule(ruleFor("yearly", "2024-02-29"))).toBe("FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=29");
    expect(formatRule(ruleFor("daily", "2026-11-12", 5))).toBe("FREQ=DAILY;INTERVAL=5");
  });
});

describe("describeRule", () => {
  it("says it in plain words", () => {
    expect(describeRule(rule("FREQ=DAILY"))).toBe("Every day");
    expect(describeRule(rule("FREQ=DAILY;INTERVAL=3"))).toBe("Every 3 days");
    expect(describeRule(rule("FREQ=WEEKLY;BYDAY=MO,WE"))).toBe("Every week on Mon, Wed");
    expect(describeRule(rule("FREQ=WEEKLY;INTERVAL=2;BYDAY=FR"))).toBe("Every 2 weeks on Fri");
    expect(describeRule(rule("FREQ=MONTHLY;BYMONTHDAY=1"))).toBe("Every month on the 1st");
    expect(describeRule(rule("FREQ=MONTHLY;BYMONTHDAY=22"))).toBe("Every month on the 22nd");
    expect(describeRule(rule("FREQ=MONTHLY;BYMONTHDAY=13"))).toBe("Every month on the 13th");
    expect(describeRule(rule("FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=29"))).toBe("Every year on 29 Feb");
  });

  it("describes after-completion repeats differently", () => {
    expect(describeRule(rule("FREQ=MONTHLY;BYMONTHDAY=1"), "after_completion")).toBe(
      "Every month after you finish it",
    );
  });

  it("describeStored ignores empty and unsupported text", () => {
    expect(describeStored(null, "fixed")).toBeNull();
    expect(describeStored("FREQ=HOURLY", "fixed")).toBeNull();
    expect(describeStored("FREQ=DAILY", "fixed")).toBe("Every day");
  });
});
