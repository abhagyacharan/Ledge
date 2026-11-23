import {
  addDaysIso,
  formatDue,
  formatDueDate,
  formatTime,
  todayIn,
  trimTime,
  type IsoDate,
  type IsoTime,
} from "@/lib/dates";
import { parseReminderDefault, type ReminderChoice } from "./schema";

/**
 * When a reminder goes out (docs/reminders-spec.md §3 to §7, §9, §10). Pure: no server imports,
 * no clock of its own. The scheduler works the moment out on every tick from what was chosen, the
 * task's floating due date and time, and the user's timezone, so moving a due date, a repeat
 * moving to its next round, or a timezone change all move the reminder with no extra step.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** A reminder up to this late is still sent, marked late; an older one is skipped (§9). */
export const LATE_LIMIT_MS = 6 * HOUR;

/** A send this soon after its moment counts as on time (the tick runs every 30 seconds). */
export const ON_TIME_GRACE_MS = 5 * MINUTE;

/** Snooze sends the same reminder again this long after it was pressed (§7). */
export const SNOOZE_MS = 10 * MINUTE;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** Wall-clock fields of `instant` (ms) in `timeZone`, as if they were UTC (ms, whole seconds). */
function wallClockMs(instant: number, timeZone: string): number {
  const parts = formatterFor(timeZone).formatToParts(new Date(instant));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
}

/** How far `timeZone` is ahead of UTC at `instant`, in ms. */
function offsetAt(instant: number, timeZone: string): number {
  return wallClockMs(instant, timeZone) - Math.floor(instant / 1000) * 1000;
}

/**
 * The instant when the floating `date` and `time` happen in `timeZone`. A time that happens twice
 * (clocks going back) gives the first; a time that does not exist (clocks going forward) moves on
 * by the length of the gap (02:30 becomes 03:30), as calendars and Temporal do.
 */
export function zonedTimeToUtc(date: IsoDate, time: IsoTime, timeZone: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = trimTime(time).split(":").map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  const early = wall - offsetAt(wall - 12 * HOUR, timeZone);
  const late = wall - offsetAt(wall + 12 * HOUR, timeZone);
  const valid = (t: number) => wallClockMs(t, timeZone) === wall;
  const earlyOk = valid(early);
  const lateOk = valid(late);
  if (earlyOk && lateOk) return new Date(Math.min(early, late));
  if (lateOk) return new Date(late);
  // Valid with the offset before the change, or a gap: the offset before it pushes the time on.
  return new Date(early);
}

/** The floating date and `HH:MM` time of `instant` in `timeZone`. */
export function localDateTime(instant: Date, timeZone: string): { date: IsoDate; time: IsoTime } {
  const iso = new Date(wallClockMs(instant.getTime(), timeZone)).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

/**
 * True when the wall-clock `time` falls inside quiet hours. The window starts at `start` and ends
 * just before `end`; when `start` is later than `end` it crosses midnight. Equal times mean no
 * window.
 */
export function isInQuietHours(time: IsoTime, start: IsoTime | null, end: IsoTime | null): boolean {
  if (!start || !end) return false;
  const t = trimTime(time);
  const s = trimTime(start);
  const e = trimTime(end);
  if (s === e) return false;
  return s < e ? t >= s && t < e : t >= s || t < e;
}

/**
 * When a moment inside quiet hours is released: the window's end, on the same day or (for a
 * window that crosses midnight, held before midnight) the next day.
 */
function quietRelease(
  local: { date: IsoDate; time: IsoTime },
  start: IsoTime,
  end: IsoTime,
): { date: IsoDate; time: IsoTime } {
  const s = trimTime(start);
  const e = trimTime(end);
  const nextDay = s > e && local.time >= s;
  return { date: nextDay ? addDaysIso(local.date, 1) : local.date, time: e };
}

/** Text for a choice, used in the round key. */
function choiceKey(choice: ReminderChoice): string {
  switch (choice.kind) {
    case "none":
      return "none";
    case "at_due":
      return "at_due";
    case "before":
      return `before:${choice.offsetMinutes}`;
    case "custom":
      return `custom:${choice.date}T${trimTime(choice.time)}`;
  }
}

/**
 * Identifies one round of a reminder. A reminder is due when its moment has passed and the stored
 * `sent_key` differs from this. A custom reminder ignores the due date, so it fires once even on a
 * repeating task (§4).
 */
export function roundKey(
  taskId: string,
  dueDate: IsoDate | null,
  dueTime: IsoTime | null,
  choice: ReminderChoice,
): string {
  if (choice.kind === "custom") return `${taskId}|${choiceKey(choice)}`;
  return `${taskId}|${dueDate ?? "-"}|${dueTime ? trimTime(dueTime) : "-"}|${choiceKey(choice)}`;
}

export type ReminderTimeInput = {
  taskId: string;
  dueDate: IsoDate | null;
  dueTime: IsoTime | null;
  choice: ReminderChoice;
  /** Used as the due time for a task with a date but no time (default 09:00). */
  morningTime: IsoTime;
  timeZone: string;
  quietStart: IsoTime | null;
  quietEnd: IsoTime | null;
};

export type ReminderMoment = {
  /** When to send, in UTC, after any hold for quiet hours. */
  at: Date;
  /** The moment fell inside quiet hours and waits for them to end. */
  held: boolean;
  key: string;
};

/**
 * The moment a reminder goes out, or null when there is none (None, or no due date to count
 * from). "1 day before" keeps the clock time (5:00 pm the day before, even across a clock
 * change); the shorter offsets are counted in real minutes.
 */
export function reminderMoment(input: ReminderTimeInput): ReminderMoment | null {
  const { choice, timeZone } = input;
  let at: Date;
  if (choice.kind === "none") return null;
  if (choice.kind === "custom") {
    at = zonedTimeToUtc(choice.date, choice.time, timeZone);
  } else {
    if (!input.dueDate) return null;
    const dueTime = input.dueTime ?? input.morningTime;
    if (choice.kind === "before" && choice.offsetMinutes === 1440) {
      at = zonedTimeToUtc(addDaysIso(input.dueDate, -1), dueTime, timeZone);
    } else {
      const due = zonedTimeToUtc(input.dueDate, dueTime, timeZone);
      const offset = choice.kind === "before" ? choice.offsetMinutes * MINUTE : 0;
      at = new Date(due.getTime() - offset);
    }
  }
  let held = false;
  if (input.quietStart && input.quietEnd) {
    const local = localDateTime(at, timeZone);
    if (isInQuietHours(local.time, input.quietStart, input.quietEnd)) {
      const release = quietRelease(local, input.quietStart, input.quietEnd);
      at = zonedTimeToUtc(release.date, release.time, timeZone);
      held = true;
    }
  }
  return { at, held, key: roundKey(input.taskId, input.dueDate, input.dueTime, choice) };
}

/**
 * Which reminder applies to a task: its own choice when it has a row, otherwise the Settings
 * default, but only for a task with a due time created after the default was last changed (§5).
 */
export function effectiveChoice(input: {
  own: ReminderChoice | null;
  reminderDefault: string;
  reminderDefaultSince: Date | null;
  taskCreatedAt: Date;
  dueTime: IsoTime | null;
}): ReminderChoice {
  if (input.own) return input.own;
  if (!input.dueTime || !input.reminderDefaultSince) return { kind: "none" };
  if (input.taskCreatedAt.getTime() <= input.reminderDefaultSince.getTime()) {
    return { kind: "none" };
  }
  return parseReminderDefault(input.reminderDefault);
}

export type SendDecision =
  /** The moment has not come yet. */
  | { action: "wait" }
  /** Send now; `late` when it goes out well after its moment because the app was away. */
  | { action: "send"; late: boolean }
  /** More than six hours late: mark it sent without a notification. */
  | { action: "skip" };

/**
 * The six-hour rule (§9). A moment that had already passed when the task or its reminder was
 * last changed (for example "10 minutes before" set on a task due in 5) is sent at once and is
 * not counted as late, since it was just asked for.
 */
export function sendDecision(now: Date, at: Date, changedAt: Date | null): SendDecision {
  const lateBy = now.getTime() - at.getTime();
  if (lateBy < 0) return { action: "wait" };
  if (lateBy > LATE_LIMIT_MS) return { action: "skip" };
  const askedLate = changedAt !== null && changedAt.getTime() > at.getTime();
  return { action: "send", late: !askedLate && lateBy > ON_TIME_GRACE_MS };
}

/** True when a snooze that ended at `until` is too old to send (the same six hours). */
export function snoozeTooOld(now: Date, until: Date): boolean {
  return now.getTime() - until.getTime() > LATE_LIMIT_MS;
}

const RELATIVE_DAYS = new Set(["Today", "Tomorrow", "Yesterday"]);

/** "Today" reads "today" in the middle of a sentence; weekdays and dates keep their capitals. */
function inSentence(label: string): string {
  const [first, ...rest] = label.split(", ");
  const head = RELATIVE_DAYS.has(first) ? first.toLowerCase() : first;
  return [head, ...rest].join(", ");
}

/**
 * The notification's body (§7): "Due 5:00 pm · Home", "Due today · Home", "Overdue since
 * 5:00 pm · Home", with "Held during quiet hours" when it waited. Times use the user's locale.
 */
export function reminderBody(input: {
  dueDate: IsoDate | null;
  dueTime: IsoTime | null;
  listName: string;
  held: boolean;
  now: Date;
  timeZone: string;
  locale: string;
}): string {
  const { dueDate, dueTime, locale, timeZone, now } = input;
  const parts: string[] = [];
  if (dueDate) {
    const today = todayIn(timeZone, now);
    if (dueTime) {
      const due = zonedTimeToUtc(dueDate, dueTime, timeZone);
      const when =
        dueDate === today
          ? formatTime(dueTime, locale)
          : inSentence(formatDue(dueDate, dueTime, today, locale));
      const overdue = now.getTime() - due.getTime() > ON_TIME_GRACE_MS;
      parts.push(overdue ? `Overdue since ${when}` : `Due ${when}`);
    } else {
      const when = inSentence(formatDueDate(dueDate, today, locale));
      parts.push(dueDate < today ? `Overdue since ${when}` : `Due ${when}`);
    }
  } else {
    parts.push("Reminder");
  }
  parts.push(input.listName);
  if (input.held) parts.push("Held during quiet hours");
  return parts.join(" · ");
}
