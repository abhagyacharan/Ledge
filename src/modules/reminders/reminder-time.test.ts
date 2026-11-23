import { describe, expect, it } from "vitest";
import {
  effectiveChoice,
  isInQuietHours,
  localDateTime,
  reminderBody,
  reminderMoment,
  roundKey,
  rowToChoice,
  sendDecision,
  snoozeMoment,
  snoozeTooOld,
  zonedTimeToUtc,
  type ReminderTimeInput,
} from "./reminder-time";

const base: ReminderTimeInput = {
  taskId: "t1",
  dueDate: "2026-11-24",
  dueTime: "17:00",
  choice: { kind: "at_due" },
  morningTime: "09:00:00",
  timeZone: "Asia/Kolkata",
  quietStart: null,
  quietEnd: null,
};

const at = (input: Partial<ReminderTimeInput>) => reminderMoment({ ...base, ...input });
const iso = (input: Partial<ReminderTimeInput>) => at(input)?.at.toISOString();

describe("zonedTimeToUtc", () => {
  it("reads a floating time in Asia/Kolkata (UTC+5:30, no DST)", () => {
    expect(zonedTimeToUtc("2026-11-24", "17:00", "Asia/Kolkata").toISOString()).toBe(
      "2026-11-24T11:30:00.000Z",
    );
    expect(zonedTimeToUtc("2026-11-24", "00:15:00", "Asia/Kolkata").toISOString()).toBe(
      "2026-11-23T18:45:00.000Z",
    );
  });

  it("moves a time in the spring-forward gap on by the gap (New York)", () => {
    // 8 Mar 2026: 02:00 EST jumps to 03:00 EDT, so 02:30 does not exist.
    expect(zonedTimeToUtc("2026-03-08", "02:30", "America/New_York").toISOString()).toBe(
      "2026-03-08T07:30:00.000Z",
    );
    expect(zonedTimeToUtc("2026-03-08", "03:30", "America/New_York").toISOString()).toBe(
      "2026-03-08T07:30:00.000Z",
    );
    expect(zonedTimeToUtc("2026-03-08", "01:30", "America/New_York").toISOString()).toBe(
      "2026-03-08T06:30:00.000Z",
    );
  });

  it("takes the first of a time that happens twice (New York, clocks back)", () => {
    // 1 Nov 2026: 02:00 EDT goes back to 01:00 EST, so 01:30 happens twice.
    expect(zonedTimeToUtc("2026-11-01", "01:30", "America/New_York").toISOString()).toBe(
      "2026-11-01T05:30:00.000Z",
    );
    expect(zonedTimeToUtc("2026-11-01", "02:30", "America/New_York").toISOString()).toBe(
      "2026-11-01T07:30:00.000Z",
    );
  });

  it("handles London's gap and overlap", () => {
    // 29 Mar 2026: 01:00 GMT jumps to 02:00 BST. 25 Oct 2026: 02:00 BST back to 01:00 GMT.
    expect(zonedTimeToUtc("2026-03-29", "01:30", "Europe/London").toISOString()).toBe(
      "2026-03-29T01:30:00.000Z",
    );
    expect(zonedTimeToUtc("2026-10-25", "01:30", "Europe/London").toISOString()).toBe(
      "2026-10-25T00:30:00.000Z",
    );
    expect(zonedTimeToUtc("2026-07-01", "09:00", "Europe/London").toISOString()).toBe(
      "2026-07-01T08:00:00.000Z",
    );
  });

  it("round-trips through localDateTime", () => {
    const instant = zonedTimeToUtc("2026-12-31", "23:45", "America/New_York");
    expect(localDateTime(instant, "America/New_York")).toEqual({
      date: "2026-12-31",
      time: "23:45",
    });
  });
});

describe("reminderMoment", () => {
  it("at due time", () => {
    expect(iso({})).toBe("2026-11-24T11:30:00.000Z");
  });

  it("before the due time", () => {
    expect(iso({ choice: { kind: "before", offsetMinutes: 30 } })).toBe("2026-11-24T11:00:00.000Z");
    expect(iso({ choice: { kind: "before", offsetMinutes: 120 } })).toBe(
      "2026-11-24T09:30:00.000Z",
    );
  });

  it("1 day before crosses the month end", () => {
    expect(
      iso({
        dueDate: "2026-12-01",
        dueTime: "08:00",
        choice: { kind: "before", offsetMinutes: 1440 },
      }),
    ).toBe("2026-11-30T02:30:00.000Z");
    expect(
      iso({
        dueDate: "2027-03-01",
        dueTime: "08:00",
        choice: { kind: "before", offsetMinutes: 1440 },
      }),
    ).toBe("2027-02-28T02:30:00.000Z");
  });

  it("1 day before keeps the clock time across a DST change", () => {
    // Due 9 Mar 2026 09:00 EDT; the day before is 8 Mar 09:00 EDT (only 23 hours earlier).
    expect(
      iso({
        dueDate: "2026-03-09",
        dueTime: "09:00",
        timeZone: "America/New_York",
        choice: { kind: "before", offsetMinutes: 1440 },
      }),
    ).toBe("2026-03-08T13:00:00.000Z");
  });

  it("a short offset counts real minutes across a DST gap", () => {
    // 03:10 EDT on 8 Mar is 07:10Z; 15 minutes earlier is 06:55Z (01:55 EST).
    expect(
      iso({
        dueDate: "2026-03-08",
        dueTime: "03:10",
        timeZone: "America/New_York",
        choice: { kind: "before", offsetMinutes: 15 },
      }),
    ).toBe("2026-03-08T06:55:00.000Z");
  });

  it("custom uses its own date and time and ignores the due date", () => {
    expect(
      iso({
        dueDate: null,
        dueTime: null,
        choice: { kind: "custom", date: "2026-11-25", time: "07:45" },
      }),
    ).toBe("2026-11-25T02:15:00.000Z");
  });

  it("a date without a time uses the morning time", () => {
    expect(iso({ dueTime: null })).toBe("2026-11-24T03:30:00.000Z");
    expect(
      iso({ dueTime: null, morningTime: "07:30", choice: { kind: "before", offsetMinutes: 30 } }),
    ).toBe("2026-11-24T01:30:00.000Z");
  });

  it("none, or no due date to count from, has no moment", () => {
    expect(at({ choice: { kind: "none" } })).toBeNull();
    expect(at({ dueDate: null, dueTime: null })).toBeNull();
  });

  it("holds a moment in a window that crosses midnight until it ends", () => {
    const late = at({ dueTime: "23:30", quietStart: "23:00", quietEnd: "07:00" });
    expect(late?.held).toBe(true);
    expect(late?.at.toISOString()).toBe("2026-11-25T01:30:00.000Z"); // 25 Nov 07:00 IST
    const early = at({ dueTime: "05:00", quietStart: "23:00:00", quietEnd: "07:00:00" });
    expect(early?.held).toBe(true);
    expect(early?.at.toISOString()).toBe("2026-11-24T01:30:00.000Z"); // 24 Nov 07:00 IST
    const outside = at({ dueTime: "07:00", quietStart: "23:00", quietEnd: "07:00" });
    expect(outside?.held).toBe(false);
  });

  it("holds a moment in a same-day window", () => {
    const held = at({ dueTime: "13:15", quietStart: "13:00", quietEnd: "14:00" });
    expect(held?.held).toBe(true);
    expect(held?.at.toISOString()).toBe("2026-11-24T08:30:00.000Z"); // 14:00 IST
    expect(at({ dueTime: "12:59", quietStart: "13:00", quietEnd: "14:00" })?.held).toBe(false);
  });

  it("the key changes with the due date, time and choice, not for a custom one", () => {
    const k = at({})?.key;
    expect(at({ dueDate: "2026-11-25" })?.key).not.toBe(k);
    expect(at({ dueTime: "17:00:00" })?.key).toBe(k);
    expect(at({ dueTime: "18:00" })?.key).not.toBe(k);
    expect(at({ choice: { kind: "before", offsetMinutes: 5 } })?.key).not.toBe(k);
    const custom = { kind: "custom", date: "2026-11-25", time: "07:45" } as const;
    expect(roundKey("t1", "2026-11-24", null, custom)).toBe(
      roundKey("t1", "2026-12-24", "10:00", custom),
    );
  });
});

describe("isInQuietHours", () => {
  it("treats the end as outside and equal times as no window", () => {
    expect(isInQuietHours("07:00", "23:00", "07:00")).toBe(false);
    expect(isInQuietHours("23:00", "23:00", "07:00")).toBe(true);
    expect(isInQuietHours("03:00", "23:00", "07:00")).toBe(true);
    expect(isInQuietHours("12:00", "23:00", "07:00")).toBe(false);
    expect(isInQuietHours("10:00", "10:00", "10:00")).toBe(false);
    expect(isInQuietHours("10:00", null, null)).toBe(false);
  });
});

describe("effectiveChoice", () => {
  const since = new Date("2026-11-20T00:00:00Z");
  const after = new Date("2026-11-21T00:00:00Z");
  const before = new Date("2026-11-19T00:00:00Z");
  const common = { reminderDefault: "before:30", reminderDefaultSince: since, dueTime: "17:00" };

  it("uses the task's own choice first, None included", () => {
    expect(effectiveChoice({ ...common, own: { kind: "none" }, taskCreatedAt: after })).toEqual({
      kind: "none",
    });
  });

  it("applies the default only to timed tasks made after it was set", () => {
    expect(effectiveChoice({ ...common, own: null, taskCreatedAt: after })).toEqual({
      kind: "before",
      offsetMinutes: 30,
    });
    expect(effectiveChoice({ ...common, own: null, taskCreatedAt: before }).kind).toBe("none");
    expect(
      effectiveChoice({ ...common, own: null, dueTime: null, taskCreatedAt: after }).kind,
    ).toBe("none");
    expect(
      effectiveChoice({ ...common, own: null, reminderDefaultSince: null, taskCreatedAt: after })
        .kind,
    ).toBe("none");
  });
});

describe("sendDecision", () => {
  const moment = new Date("2026-11-24T11:30:00Z");
  const plus = (ms: number) => new Date(moment.getTime() + ms);
  const H = 3_600_000;

  it("waits, sends on time, sends late up to six hours, then skips", () => {
    expect(sendDecision(plus(-1000), moment, null)).toEqual({ action: "wait" });
    expect(sendDecision(plus(20_000), moment, null)).toEqual({ action: "send", late: false });
    expect(sendDecision(plus(2 * H), moment, null)).toEqual({ action: "send", late: true });
    expect(sendDecision(plus(6 * H), moment, null)).toEqual({ action: "send", late: true });
    expect(sendDecision(plus(6 * H + 1000), moment, null)).toEqual({ action: "skip" });
  });

  it("a moment already past when it was set is sent at once, not as late", () => {
    expect(sendDecision(plus(H), moment, plus(H - 30_000))).toEqual({
      action: "send",
      late: false,
    });
    expect(sendDecision(plus(7 * H), moment, plus(7 * H - 1000))).toEqual({ action: "skip" });
  });

  it("snoozes older than six hours are dropped", () => {
    expect(snoozeTooOld(plus(H), moment)).toBe(false);
    expect(snoozeTooOld(plus(7 * H), moment)).toBe(true);
  });
});

describe("reminderBody", () => {
  const body = (input: Partial<Parameters<typeof reminderBody>[0]>) =>
    reminderBody({
      dueDate: "2026-11-24",
      dueTime: "17:00",
      listName: "Home",
      held: false,
      now: new Date("2026-11-24T11:30:00Z"),
      timeZone: "Asia/Kolkata",
      locale: "en-IN",
      ...input,
    });

  it("shows the time and list", () => {
    expect(body({})).toBe("Due 5:00 pm · Home");
    expect(body({ locale: "en-US" })).toBe("Due 5:00 PM · Home");
  });

  it("says today for a date without a time, and tomorrow for a day-before reminder", () => {
    expect(body({ dueTime: null })).toBe("Due today · Home");
    expect(body({ dueDate: "2026-11-25" })).toBe("Due tomorrow, 5:00 pm · Home");
  });

  it("says overdue for a late send, and notes quiet hours", () => {
    expect(body({ now: new Date("2026-11-24T13:30:00Z") })).toBe("Overdue since 5:00 pm · Home");
    expect(body({ dueTime: "23:30", now: new Date("2026-11-25T01:30:00Z"), held: true })).toBe(
      "Overdue since yesterday, 11:30 pm · Home · Held during quiet hours",
    );
  });
});

describe("rowToChoice", () => {
  const row = (kind: "none" | "at_due" | "before" | "custom", extra = {}) => ({
    kind,
    offsetMinutes: null,
    customDate: null,
    customTime: null,
    ...extra,
  });
  it("reads each kind, trimming a custom time's seconds", () => {
    expect(rowToChoice(row("none"))).toEqual({ kind: "none" });
    expect(rowToChoice(row("at_due"))).toEqual({ kind: "at_due" });
    expect(rowToChoice(row("before", { offsetMinutes: 30 }))).toEqual({
      kind: "before",
      offsetMinutes: 30,
    });
    expect(
      rowToChoice(row("custom", { customDate: "2026-11-30", customTime: "08:15:00" })),
    ).toEqual({ kind: "custom", date: "2026-11-30", time: "08:15" });
  });
  it("reads a broken row as None", () => {
    expect(rowToChoice(row("before"))).toEqual({ kind: "none" });
    expect(rowToChoice(row("custom", { customDate: "2026-11-30" }))).toEqual({ kind: "none" });
  });
});

describe("snoozeMoment", () => {
  const until = new Date("2026-11-24T11:55:00Z"); // 17:25 in Asia/Kolkata
  const input = { until, timeZone: "Asia/Kolkata", quietStart: null, quietEnd: null };
  it("rings at the snooze time outside quiet hours", () => {
    expect(snoozeMoment(input)).toEqual({ at: until, held: false });
    expect(snoozeMoment({ ...input, quietStart: "23:00", quietEnd: "07:00" })).toEqual({
      at: until,
      held: false,
    });
  });
  it("waits for quiet hours to end, across midnight too", () => {
    expect(snoozeMoment({ ...input, quietStart: "17:00", quietEnd: "18:00" })).toEqual({
      at: new Date("2026-11-24T12:30:00Z"),
      held: true,
    });
    const late = new Date("2026-11-24T17:45:00Z"); // 23:15 IST
    expect(snoozeMoment({ ...input, until: late, quietStart: "23:00", quietEnd: "07:00" })).toEqual(
      { at: new Date("2026-11-25T01:30:00Z"), held: true },
    );
  });
});
