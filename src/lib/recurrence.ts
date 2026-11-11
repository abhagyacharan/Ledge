import { addDaysIso, daysBetween, isoWeekday, type IsoDate } from "./dates";

/**
 * Repeating tasks (CLAUDE.md §6.2). A small, honest subset of the iCalendar RRULE text, stored in
 * `tasks.recurrence_rule`:
 *
 *   FREQ=DAILY;INTERVAL=3                       every 3 days
 *   FREQ=WEEKLY;BYDAY=MO,WE                     every week on Monday and Wednesday
 *   FREQ=MONTHLY;BYMONTHDAY=31                  every month on the 31st (short months use the last day)
 *   FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=29         every year on 29 February (28 February in other years)
 *
 * Dates are floating `YYYY-MM-DD` strings with no timezone, so there are no daylight-saving
 * surprises. Everything here is pure and works on those strings.
 */

export type Freq = "daily" | "weekly" | "monthly" | "yearly";
export const WEEKDAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export type RecurrenceMode = "fixed" | "after_completion";

export type Rule = {
  freq: Freq;
  /** Every `interval` days, weeks, months or years. 1 to 999. */
  interval: number;
  /** Weekly only: which days. Empty means "the weekday of the due date". */
  byDay: Weekday[];
  /** Monthly and yearly: the day of the month (1 to 31). Null means "the day of the due date". */
  byMonthDay: number | null;
  /** Yearly: the month (1 to 12). Null means "the month of the due date". */
  byMonth: number | null;
};

export const MAX_INTERVAL = 999;

const FREQ_NAMES: Record<string, Freq> = {
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  YEARLY: "yearly",
};
const FREQ_TEXT: Record<Freq, string> = {
  daily: "DAILY",
  weekly: "WEEKLY",
  monthly: "MONTHLY",
  yearly: "YEARLY",
};

const intInRange = (text: string | undefined, min: number, max: number): number | null => {
  if (text === undefined || !/^\d{1,3}$/.test(text)) return null;
  const n = Number(text);
  return n >= min && n <= max ? n : null;
};

/** Reads rule text. Returns null for anything outside the supported subset (never guesses). */
export function parseRule(text: string): Rule | null {
  const parts = new Map<string, string>();
  for (const piece of text.trim().split(";")) {
    const [key, value, ...rest] = piece.split("=");
    if (!key || value === undefined || rest.length > 0 || parts.has(key.toUpperCase())) return null;
    parts.set(key.toUpperCase(), value.toUpperCase());
  }
  const freq = FREQ_NAMES[parts.get("FREQ") ?? ""];
  if (!freq) return null;
  const allowed = new Set(["FREQ", "INTERVAL", "BYDAY", "BYMONTHDAY", "BYMONTH"]);
  for (const key of parts.keys()) if (!allowed.has(key)) return null;

  const interval = parts.has("INTERVAL") ? intInRange(parts.get("INTERVAL"), 1, MAX_INTERVAL) : 1;
  if (interval === null) return null;

  let byDay: Weekday[] = [];
  if (parts.has("BYDAY")) {
    if (freq !== "weekly") return null;
    const days = (parts.get("BYDAY") ?? "").split(",");
    if (!days.every((d): d is Weekday => (WEEKDAYS as readonly string[]).includes(d))) return null;
    byDay = WEEKDAYS.filter((d) => days.includes(d)); // sorted Monday first, no duplicates
    if (byDay.length === 0) return null;
  }

  let byMonthDay: number | null = null;
  if (parts.has("BYMONTHDAY")) {
    if (freq !== "monthly" && freq !== "yearly") return null;
    byMonthDay = intInRange(parts.get("BYMONTHDAY"), 1, 31);
    if (byMonthDay === null) return null;
  }

  let byMonth: number | null = null;
  if (parts.has("BYMONTH")) {
    if (freq !== "yearly") return null;
    byMonth = intInRange(parts.get("BYMONTH"), 1, 12);
    if (byMonth === null) return null;
  }

  return { freq, interval, byDay, byMonthDay, byMonth };
}

/** The canonical text for a rule (what gets stored). */
export function formatRule(rule: Rule): string {
  const parts = [`FREQ=${FREQ_TEXT[rule.freq]}`];
  if (rule.interval > 1) parts.push(`INTERVAL=${rule.interval}`);
  if (rule.freq === "weekly" && rule.byDay.length > 0) parts.push(`BYDAY=${rule.byDay.join(",")}`);
  if (rule.freq === "yearly" && rule.byMonth !== null) parts.push(`BYMONTH=${rule.byMonth}`);
  if ((rule.freq === "monthly" || rule.freq === "yearly") && rule.byMonthDay !== null) {
    parts.push(`BYMONTHDAY=${rule.byMonthDay}`);
  }
  return parts.join(";");
}

const ymd = (iso: IsoDate) => {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
};
const pad = (n: number, width = 2) => String(n).padStart(width, "0");
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** The date in month `m` (may be past 12 or below 1) of year `y`, day clamped to the month's length. */
function clampedDate(y: number, m: number, day: number): IsoDate {
  const index = y * 12 + (m - 1); // months since year 0
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${pad(year, 4)}-${pad(month)}-${pad(Math.min(day, daysInMonth(year, month)))}`;
}

/**
 * A rule for a new repeat, anchored on the task's due date: a weekly task repeats on that weekday,
 * a monthly one on that day of the month, a yearly one on that day of that month.
 */
export function ruleFor(freq: Freq, dueDate: IsoDate, interval = 1): Rule {
  const { m, d } = ymd(dueDate);
  return {
    freq,
    interval,
    byDay: freq === "weekly" ? [WEEKDAYS[isoWeekday(dueDate) - 1]] : [],
    byMonthDay: freq === "monthly" || freq === "yearly" ? d : null,
    byMonth: freq === "yearly" ? m : null,
  };
}

/** Counting from the Monday of each date's week. */
const weekStart = (iso: IsoDate) => addDaysIso(iso, -(isoWeekday(iso) - 1));

/** The first date on the schedule strictly after `after`. `anchor` is the date the schedule started from. */
function nextOnSchedule(rule: Rule, anchor: IsoDate, after: IsoDate): IsoDate {
  const a = ymd(anchor);
  switch (rule.freq) {
    case "daily": {
      const steps = Math.floor(daysBetween(anchor, after) / rule.interval) + 1;
      return addDaysIso(anchor, Math.max(1, steps) * rule.interval);
    }
    case "weekly": {
      const days = rule.byDay.length > 0 ? rule.byDay : [WEEKDAYS[isoWeekday(anchor) - 1]];
      const base = weekStart(anchor);
      for (let n = 1; n <= 7 * rule.interval + 7; n++) {
        const day = addDaysIso(after, n);
        const inRightWeek = Math.floor(daysBetween(base, weekStart(day)) / 7) % rule.interval === 0;
        if (inRightWeek && days.includes(WEEKDAYS[isoWeekday(day) - 1])) return day;
      }
      return addDaysIso(after, 7 * rule.interval);
    }
    case "monthly": {
      const day = rule.byMonthDay ?? a.d;
      for (let k = 0; k < 5000; k++) {
        const candidate = clampedDate(a.y, a.m + k * rule.interval, day);
        if (candidate > after) return candidate;
      }
      return after;
    }
    case "yearly": {
      const month = rule.byMonth ?? a.m;
      const day = rule.byMonthDay ?? a.d;
      for (let k = 0; k < 500; k++) {
        const candidate = clampedDate(a.y + k * rule.interval, month, day);
        if (candidate > after) return candidate;
      }
      return after;
    }
  }
}

/** `completedOn` plus one interval ("after completion" mode). */
function afterCompletion(rule: Rule, completedOn: IsoDate): IsoDate {
  const c = ymd(completedOn);
  switch (rule.freq) {
    case "daily":
      return addDaysIso(completedOn, rule.interval);
    case "weekly":
      return addDaysIso(completedOn, 7 * rule.interval);
    case "monthly":
      return clampedDate(c.y, c.m + rule.interval, c.d);
    case "yearly":
      return clampedDate(c.y + rule.interval, c.m, c.d);
  }
}

/**
 * The new due date after a repeating task is completed.
 *
 * - `fixed`: the next date on the schedule after the date that was due. Completing early moves to
 *   the date after the due one. Completing late skips the occurrences already missed, so the next
 *   date is never in the past.
 * - `after_completion`: one interval counted from the day it was completed.
 */
export function nextDueDate(input: {
  rule: Rule;
  mode: RecurrenceMode;
  dueDate: IsoDate | null;
  completedOn: IsoDate;
}): IsoDate {
  const { rule, mode, dueDate, completedOn } = input;
  if (mode === "after_completion") return afterCompletion(rule, completedOn);
  const anchor = dueDate ?? completedOn;
  const after = anchor > completedOn ? anchor : completedOn;
  return nextOnSchedule(rule, anchor, after);
}

const WEEKDAY_NAMES: Record<Weekday, string> = {
  MO: "Mon",
  TU: "Tue",
  WE: "Wed",
  TH: "Thu",
  FR: "Fri",
  SA: "Sat",
  SU: "Sun",
};
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function ordinal(n: number): string {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

const UNIT: Record<Freq, [string, string]> = {
  daily: ["day", "days"],
  weekly: ["week", "weeks"],
  monthly: ["month", "months"],
  yearly: ["year", "years"],
};

/** Plain words for a rule: "Every day", "Every 2 weeks on Mon, Wed", "Every month on the 31st". */
export function describeRule(rule: Rule, mode: RecurrenceMode = "fixed"): string {
  const [one, many] = UNIT[rule.freq];
  const every = rule.interval === 1 ? `Every ${one}` : `Every ${rule.interval} ${many}`;
  if (mode === "after_completion") return `${every} after you finish it`;
  if (rule.freq === "weekly" && rule.byDay.length > 0) {
    return `${every} on ${rule.byDay.map((d) => WEEKDAY_NAMES[d]).join(", ")}`;
  }
  if (rule.freq === "monthly" && rule.byMonthDay !== null) {
    return `${every} on the ${ordinal(rule.byMonthDay)}`;
  }
  if (rule.freq === "yearly" && rule.byMonth !== null && rule.byMonthDay !== null) {
    return `${every} on ${rule.byMonthDay} ${MONTH_NAMES[rule.byMonth - 1]}`;
  }
  return every;
}

/** Text for a stored rule, or null when it is empty or not a supported rule. */
export function describeStored(text: string | null, mode: RecurrenceMode): string | null {
  if (!text) return null;
  const rule = parseRule(text);
  return rule ? describeRule(rule, mode) : null;
}
