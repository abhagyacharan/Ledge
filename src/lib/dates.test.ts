import { describe, expect, it } from "vitest";
import {
  addDaysIso,
  daysBetween,
  formatDue,
  formatDueDate,
  formatTime,
  isIsoDate,
  isIsoTime,
  isOverdue,
  isoWeekday,
  nextWeekStart,
  timeNowIn,
  todayIn,
  trimTime,
} from "./dates";

describe("todayIn (the date in the user's timezone)", () => {
  it("rolls over at local midnight in Asia/Kolkata (UTC+5:30)", () => {
    expect(todayIn("Asia/Kolkata", new Date("2026-03-08T18:29:59Z"))).toBe("2026-03-08");
    expect(todayIn("Asia/Kolkata", new Date("2026-03-08T18:30:00Z"))).toBe("2026-03-09");
  });

  it("rolls over at local midnight just after daylight saving starts (New York, 8 Mar 2026)", () => {
    // After the clocks jump, midnight is 04:00 UTC (EDT, UTC-4).
    expect(todayIn("America/New_York", new Date("2026-03-09T03:59:59Z"))).toBe("2026-03-08");
    expect(todayIn("America/New_York", new Date("2026-03-09T04:00:00Z"))).toBe("2026-03-09");
  });

  it("rolls over at local midnight just after daylight saving ends (New York, 1 Nov 2026)", () => {
    // After the clocks fall back, midnight is 05:00 UTC (EST, UTC-5).
    expect(todayIn("America/New_York", new Date("2026-11-02T04:59:59Z"))).toBe("2026-11-01");
    expect(todayIn("America/New_York", new Date("2026-11-02T05:00:00Z"))).toBe("2026-11-02");
  });

  it("gives different dates for the same instant in different zones", () => {
    const instant = new Date("2026-06-30T20:00:00Z");
    expect(todayIn("Asia/Kolkata", instant)).toBe("2026-07-01");
    expect(todayIn("America/Los_Angeles", instant)).toBe("2026-06-30");
  });
});

describe("timeNowIn", () => {
  it("skips the missing hour when daylight saving starts", () => {
    expect(timeNowIn("America/New_York", new Date("2026-03-08T06:59:00Z"))).toBe("01:59");
    expect(timeNowIn("America/New_York", new Date("2026-03-08T07:00:00Z"))).toBe("03:00");
  });

  it("shows midnight as 00:00, not 24:00", () => {
    expect(timeNowIn("America/New_York", new Date("2026-03-09T04:00:00Z"))).toBe("00:00");
  });

  it("includes the half-hour offset of India", () => {
    expect(timeNowIn("Asia/Kolkata", new Date("2026-03-08T12:00:00Z"))).toBe("17:30");
  });
});

describe("addDaysIso", () => {
  it.each([
    ["2026-01-31", 1, "2026-02-01"],
    ["2026-02-28", 1, "2026-03-01"],
    ["2028-02-28", 1, "2028-02-29"], // leap year
    ["2028-02-29", 1, "2028-03-01"],
    ["2026-12-31", 1, "2027-01-01"],
    ["2026-03-01", -1, "2026-02-28"],
    ["2026-03-07", 1, "2026-03-08"], // across US daylight saving start
    ["2026-03-07", 2, "2026-03-09"],
    ["2026-10-31", 2, "2026-11-02"], // across US daylight saving end
    ["2026-11-10", 14, "2026-11-24"],
    ["2026-11-10", 0, "2026-11-10"],
  ])("%s plus %i days is %s", (start, days, expected) => {
    expect(addDaysIso(start, days)).toBe(expected);
  });

  it("throws for an invalid date instead of guessing", () => {
    expect(() => addDaysIso("not-a-date", 1)).toThrow();
  });
});

describe("validation", () => {
  it("accepts real dates and rejects impossible ones", () => {
    expect(isIsoDate("2026-11-10")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("2026-1-1")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });

  it("accepts 24-hour times and rejects the rest", () => {
    expect(isIsoTime("00:00")).toBe(true);
    expect(isIsoTime("23:59")).toBe(true);
    expect(isIsoTime("09:30:00")).toBe(true);
    expect(isIsoTime("24:00")).toBe(false);
    expect(isIsoTime("12:60")).toBe(false);
    expect(isIsoTime("9:30")).toBe(false);
  });

  it("trims seconds", () => {
    expect(trimTime("09:30:00")).toBe("09:30");
    expect(trimTime("09:30")).toBe("09:30");
  });
});

describe("weekdays and next week", () => {
  it("numbers weekdays 1 (Monday) to 7 (Sunday)", () => {
    expect(isoWeekday("2026-11-09")).toBe(1);
    expect(isoWeekday("2026-11-10")).toBe(2);
    expect(isoWeekday("2026-11-08")).toBe(7);
  });

  it("next week starts on the next Monday, strictly after today", () => {
    expect(nextWeekStart("2026-11-10", 1)).toBe("2026-11-16"); // Tuesday
    expect(nextWeekStart("2026-11-09", 1)).toBe("2026-11-16"); // Monday itself
    expect(nextWeekStart("2026-11-08", 1)).toBe("2026-11-09"); // Sunday
  });

  it("respects a Sunday week start", () => {
    expect(nextWeekStart("2026-11-10", 7)).toBe("2026-11-15");
    expect(nextWeekStart("2026-11-15", 7)).toBe("2026-11-22");
  });

  it("counts days between dates, including across a month end", () => {
    expect(daysBetween("2026-11-10", "2026-11-12")).toBe(2);
    expect(daysBetween("2026-11-10", "2026-11-09")).toBe(-1);
    expect(daysBetween("2026-01-31", "2026-03-01")).toBe(29);
  });
});

describe("isOverdue", () => {
  const today = "2026-11-10";
  it("is overdue when the date is in the past", () => {
    expect(isOverdue({ dueDate: "2026-11-09", dueTime: null }, today, "08:00")).toBe(true);
  });
  it("is not overdue when due today with no time", () => {
    expect(isOverdue({ dueDate: today, dueTime: null }, today, "23:59")).toBe(false);
  });
  it("is overdue today only once the time has passed", () => {
    expect(isOverdue({ dueDate: today, dueTime: "09:00:00" }, today, "09:01")).toBe(true);
    expect(isOverdue({ dueDate: today, dueTime: "09:00:00" }, today, "09:00")).toBe(false);
    expect(isOverdue({ dueDate: today, dueTime: "09:00:00" }, today, "08:59")).toBe(false);
  });
  it("is not overdue in the future or with no date", () => {
    expect(isOverdue({ dueDate: "2026-11-11", dueTime: "00:00" }, today, "23:59")).toBe(false);
    expect(isOverdue({ dueDate: null, dueTime: null }, today, "23:59")).toBe(false);
  });
});

describe("labels", () => {
  const today = "2026-11-10"; // a Tuesday
  it("uses friendly names for nearby days", () => {
    expect(formatDueDate("2026-11-10", today)).toBe("Today");
    expect(formatDueDate("2026-11-11", today)).toBe("Tomorrow");
    expect(formatDueDate("2026-11-09", today)).toBe("Yesterday");
    expect(formatDueDate("2026-11-13", today)).toBe("Friday");
  });

  it("uses a short date further out, adding the year only when it differs", () => {
    expect(formatDueDate("2026-11-20", today)).toBe("20 Nov");
    expect(formatDueDate("2027-01-01", today)).toBe("1 Jan 2027");
    expect(formatDueDate("2026-11-03", today)).toBe("3 Nov");
  });

  it("formats times in 12-hour style", () => {
    expect(formatTime("17:00")).toMatch(/^5:00\s?pm$/i);
    expect(formatTime("09:05:00")).toMatch(/^9:05\s?am$/i);
  });

  it("combines date and time", () => {
    expect(formatDue("2026-11-11", "17:00", today)).toMatch(/^Tomorrow, 5:00\s?pm$/i);
    expect(formatDue("2026-11-11", null, today)).toBe("Tomorrow");
  });
});
