import { describe, expect, it } from "vitest";
import { groupCompletedByDay, groupUpcoming, splitToday } from "./day-views";

type T = {
  title: string;
  priority: number;
  dueDate: string | null;
  dueTime: string | null;
  position: string;
};
let n = 0;
const t = (title: string, over: Partial<T> = {}): T => ({
  title,
  priority: 0,
  dueDate: null,
  dueTime: null,
  position: `a${String(++n).padStart(3, "0")}`,
  ...over,
});
const names = (list: T[]) => list.map((x) => x.title);

describe("splitToday", () => {
  const info = { today: "2026-11-10", timeNow: "12:00" };

  it("puts earlier dates, and today's passed times, in the overdue block", () => {
    const { overdue, today } = splitToday(
      [
        t("yesterday", { dueDate: "2026-11-09" }),
        t("today 09:00", { dueDate: "2026-11-10", dueTime: "09:00" }),
        t("today 18:00", { dueDate: "2026-11-10", dueTime: "18:00" }),
        t("today untimed", { dueDate: "2026-11-10" }),
      ],
      info,
    );
    expect(names(overdue)).toEqual(["yesterday", "today 09:00"]);
    expect(names(today)).toEqual(["today 18:00", "today untimed"]);
  });

  it("leaves out future tasks and undated tasks", () => {
    const { overdue, today } = splitToday(
      [t("tomorrow", { dueDate: "2026-11-11" }), t("undated")],
      info,
    );
    expect(overdue).toEqual([]);
    expect(today).toEqual([]);
  });

  it("sorts overdue by date (oldest first) and today by time, then priority", () => {
    const { overdue, today } = splitToday(
      [
        t("newer", { dueDate: "2026-11-09", priority: 3 }),
        t("older", { dueDate: "2026-11-01" }),
        t("untimed high", { dueDate: "2026-11-10", priority: 3 }),
        t("untimed low", { dueDate: "2026-11-10", priority: 1 }),
        t("timed", { dueDate: "2026-11-10", dueTime: "15:00" }),
        t("timed earlier", { dueDate: "2026-11-10", dueTime: "13:00" }),
      ],
      info,
    );
    expect(names(overdue)).toEqual(["older", "newer"]);
    expect(names(today)).toEqual(["timed earlier", "timed", "untimed high", "untimed low"]);
  });

  it("a task due today with no time is never overdue, even at 23:59", () => {
    const { overdue, today } = splitToday([t("any time", { dueDate: "2026-11-10" })], {
      today: "2026-11-10",
      timeNow: "23:59",
    });
    expect(overdue).toEqual([]);
    expect(names(today)).toEqual(["any time"]);
  });
});

describe("groupUpcoming", () => {
  const today = "2026-11-10";

  it("covers tomorrow through 14 days ahead, by day, earliest first", () => {
    const groups = groupUpcoming(
      [
        t("d14", { dueDate: "2026-11-24" }),
        t("d15", { dueDate: "2026-11-25" }),
        t("today", { dueDate: "2026-11-10" }),
        t("tomorrow b", { dueDate: "2026-11-11", dueTime: "10:00" }),
        t("tomorrow a", { dueDate: "2026-11-11", dueTime: "08:00" }),
        t("overdue", { dueDate: "2026-11-01" }),
        t("undated"),
      ],
      today,
    );
    expect(groups.map((g) => g.date)).toEqual(["2026-11-11", "2026-11-24"]);
    expect(names(groups[0].tasks)).toEqual(["tomorrow a", "tomorrow b"]);
    expect(names(groups[1].tasks)).toEqual(["d14"]);
  });

  it("handles a month and year boundary", () => {
    const groups = groupUpcoming(
      [t("new year", { dueDate: "2027-01-01" }), t("in range", { dueDate: "2026-12-31" })],
      "2026-12-30",
    );
    expect(groups.map((g) => g.date)).toEqual(["2026-12-31", "2027-01-01"]);
  });

  it("returns nothing when nothing is upcoming", () => {
    expect(groupUpcoming([t("undated")], today)).toEqual([]);
  });
});

describe("groupCompletedByDay", () => {
  it("groups by the day in the user's time zone, newest first", () => {
    // 2026-11-09T19:00Z is 00:30 on 10 Nov in India but still 9 Nov in New York.
    const late = { completedAt: new Date("2026-11-09T19:00:00Z"), title: "late" };
    const morning = { completedAt: new Date("2026-11-10T04:00:00Z"), title: "morning" };
    const old = { completedAt: new Date("2026-11-05T08:00:00Z"), title: "old" };

    const india = groupCompletedByDay([old, late, morning], "Asia/Kolkata");
    expect(india.map((g) => g.date)).toEqual(["2026-11-10", "2026-11-05"]);
    expect(india[0].tasks.map((x) => x.title)).toEqual(["morning", "late"]);

    const newYork = groupCompletedByDay([old, late, morning], "America/New_York");
    expect(newYork.map((g) => g.date)).toEqual(["2026-11-09", "2026-11-05"]);
  });

  it("ignores tasks without a completion time", () => {
    expect(groupCompletedByDay([{ completedAt: null }], "Asia/Kolkata")).toEqual([]);
  });
});
