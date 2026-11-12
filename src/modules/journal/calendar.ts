import { addDaysIso, isIsoDate, isoWeekday, type IsoDate } from "@/lib/dates";

/**
 * Pure date maths for the journal's day picker (docs/journal-spec.md). Days are floating
 * `YYYY-MM-DD` strings, read in the user's timezone, like everywhere else in the app.
 */

export type Month = { year: number; month: number };

const pad = (n: number) => String(n).padStart(2, "0");

export function monthOf(day: IsoDate): Month {
  return { year: Number(day.slice(0, 4)), month: Number(day.slice(5, 7)) };
}

export function monthStart({ year, month }: Month): IsoDate {
  return `${year}-${pad(month)}-01`;
}

export function daysInMonth({ year, month }: Month): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthEnd(m: Month): IsoDate {
  return `${m.year}-${pad(m.month)}-${pad(daysInMonth(m))}`;
}

export function shiftMonth({ year, month }: Month, step: number): Month {
  const index = year * 12 + (month - 1) + step;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/**
 * The days of a month laid out as a calendar: `leading` empty cells before the 1st, so that each
 * row starts on `weekStartsOn` (1 = Monday ... 7 = Sunday), then every day of the month.
 */
export function monthGrid(m: Month, weekStartsOn = 1): { leading: number; days: IsoDate[] } {
  const first = monthStart(m);
  const leading = (isoWeekday(first) - weekStartsOn + 7) % 7;
  const days = Array.from({ length: daysInMonth(m) }, (_, i) => addDaysIso(first, i));
  return { leading, days };
}

/** Weekday initials in the order the grid shows them. */
export function weekdayInitials(weekStartsOn = 1): string[] {
  const names = ["M", "T", "W", "T", "F", "S", "S"];
  return Array.from({ length: 7 }, (_, i) => names[(weekStartsOn - 1 + i) % 7]);
}

/**
 * The day a journal URL points at: `?d=YYYY-MM-DD`, or today when it is missing, invalid or in
 * the future (there is nothing to write about tomorrow yet).
 */
export function journalDay(param: string | string[] | undefined, today: IsoDate): IsoDate {
  const value = Array.isArray(param) ? param[0] : param;
  if (!value || !isIsoDate(value) || value > today) return today;
  return value;
}
