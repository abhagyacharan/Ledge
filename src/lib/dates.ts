import { addDays, differenceInCalendarDays, format, isValid, parseISO } from "date-fns";

/**
 * Due dates and times are "floating" (CLAUDE.md §6.3, §9): a date is `YYYY-MM-DD`, a time is
 * `HH:MM`, neither has a time zone, and both are read in the user's timezone setting.
 * "Now" is only ever turned into a floating value through `todayIn` / `timeNowIn`.
 * Never use `new Date("2026-03-08")` style parsing for user dates.
 */

export type IsoDate = string;
export type IsoTime = string;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

/** True for a real calendar date in `YYYY-MM-DD` form (rejects 2026-02-30). */
export function isIsoDate(value: string): boolean {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const probe = new Date(Date.UTC(y, mo - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === mo - 1 && probe.getUTCDate() === d;
}

/** True for `HH:MM` or `HH:MM:SS` on a 24-hour clock. */
export function isIsoTime(value: string): boolean {
  return TIME_RE.test(value);
}

/** `HH:MM:SS` from the database becomes `HH:MM`. */
export function trimTime(value: IsoTime): IsoTime {
  return value.slice(0, 5);
}

/** Calendar date in `timeZone` for the instant `now`. */
export function todayIn(timeZone: string, now: Date = new Date()): IsoDate {
  // The en-CA locale formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
}

/** Wall-clock time (`HH:MM`, 24-hour) in `timeZone` for the instant `now`. */
export function timeNowIn(timeZone: string, now: Date = new Date()): IsoTime {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("hour")}:${get("minute")}`;
}

function parseIsoDate(iso: IsoDate): Date {
  const parsed = parseISO(iso);
  if (!isValid(parsed)) throw new Error(`Invalid date: ${iso}`);
  return parsed;
}

/** `iso` plus `days` calendar days (negative allowed). Month ends and leap days are handled. */
export function addDaysIso(iso: IsoDate, days: number): IsoDate {
  return format(addDays(parseIsoDate(iso), days), "yyyy-MM-dd");
}

/** ISO weekday of a date: 1 = Monday ... 7 = Sunday. */
export function isoWeekday(iso: IsoDate): number {
  const jsDay = parseIsoDate(iso).getDay(); // 0 = Sunday
  return jsDay === 0 ? 7 : jsDay;
}

/** First day of next week: the next `weekStartsOn` (1 = Monday) strictly after `today`. */
export function nextWeekStart(today: IsoDate, weekStartsOn = 1): IsoDate {
  const diff = (weekStartsOn - isoWeekday(today) + 7) % 7 || 7;
  return addDaysIso(today, diff);
}

/** Whole calendar days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return differenceInCalendarDays(parseIsoDate(to), parseIsoDate(from));
}

/**
 * A task is overdue when its date is before today, or it is due today at a time that has passed.
 * A task due today with no time is not overdue until tomorrow.
 */
export function isOverdue(
  due: { dueDate: IsoDate | null; dueTime: IsoTime | null },
  today: IsoDate,
  timeNow: IsoTime,
): boolean {
  if (!due.dueDate) return false;
  if (due.dueDate < today) return true;
  if (due.dueDate === today && due.dueTime) return trimTime(due.dueTime) < timeNow;
  return false;
}

/** "5:00 pm" style label for a floating time, in the user's locale. */
export function formatTime(time: IsoTime, locale = "en-IN"): string {
  const [h, m] = trimTime(time).split(":").map(Number);
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2000, 0, 1, h, m)));
}

/**
 * Short label for a due date relative to today: "Today", "Tomorrow", "Yesterday", a weekday
 * for the coming week, otherwise "12 Mar" (with the year when it is not this year).
 */
export function formatDueDate(due: IsoDate, today: IsoDate, locale = "en-IN"): string {
  const diff = daysBetween(today, due);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  const date = parseIsoDate(due);
  const sameYear = due.slice(0, 4) === today.slice(0, 4);
  if (diff > 1 && diff < 7) {
    return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(date);
  }
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date);
}

/** Full label such as "Tomorrow, 5:00 pm" or "12 Mar". */
export function formatDue(
  dueDate: IsoDate,
  dueTime: IsoTime | null,
  today: IsoDate,
  locale = "en-IN",
): string {
  const day = formatDueDate(dueDate, today, locale);
  return dueTime ? `${day}, ${formatTime(dueTime, locale)}` : day;
}
