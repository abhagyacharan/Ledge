import { addDaysIso, isIsoDate, type IsoDate } from "@/lib/dates";

/**
 * The period picker (docs/expenses-spec.md): a month of a year, or the whole year. It lives in the
 * URL as `?y=2026&m=11` (`m=all` for the whole year) and defaults to the current month in the
 * user's timezone. Dates are floating `YYYY-MM-DD` strings, as everywhere.
 */

export type Period = { year: number; month: number | "all" };

export const MIN_YEAR = 2000;
export const MAX_YEAR = 2100;

const pad = (n: number) => String(n).padStart(2, "0");

/** The current month, from a floating "today". */
export function periodFromToday(today: IsoDate): Period {
  return { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
}

type Params = Record<string, string | string[] | undefined>;

/** Reads `?y=` and `?m=`, falling back to `fallback` for anything missing or invalid. */
export function parsePeriod(params: Params, fallback: Period): Period {
  const one = (key: string) => (Array.isArray(params[key]) ? params[key][0] : params[key]);
  const y = one("y");
  const m = one("m");
  const year = y !== undefined && /^\d{4}$/.test(y) ? Number(y) : fallback.year;
  if (year < MIN_YEAR || year > MAX_YEAR) return fallback;
  if (m === undefined) return { year, month: fallback.month };
  if (m === "all") return { year, month: "all" };
  const month = /^\d{1,2}$/.test(m) ? Number(m) : NaN;
  if (month >= 1 && month <= 12) return { year, month };
  return fallback;
}

/** URL parameters for a period. */
export function periodToParams(period: Period): URLSearchParams {
  return new URLSearchParams({ y: String(period.year), m: String(period.month) });
}

/** First and last day of the period, both inclusive. */
export function periodRange(period: Period): { from: IsoDate; to: IsoDate } {
  if (period.month === "all") {
    return { from: `${period.year}-01-01`, to: `${period.year}-12-31` };
  }
  const from = `${period.year}-${pad(period.month)}-01`;
  const nextStart =
    period.month === 12 ? `${period.year + 1}-01-01` : `${period.year}-${pad(period.month + 1)}-01`;
  return { from, to: addDaysIso(nextStart, -1) };
}

/** Month before or after. For the whole-year period this moves by a year. */
export function shiftPeriod(period: Period, step: 1 | -1): Period {
  if (period.month === "all") return { year: period.year + step, month: "all" };
  const index = period.year * 12 + (period.month - 1) + step;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function inRange(period: Period): boolean {
  return period.year >= MIN_YEAR && period.year <= MAX_YEAR;
}

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "November 2026" or "2026" for the whole year. */
export function periodLabel(period: Period): string {
  return period.month === "all"
    ? String(period.year)
    : `${MONTH_NAMES[period.month - 1]} ${period.year}`;
}

/** Is `date` inside the period? */
export function dateInPeriod(date: string, period: Period): boolean {
  if (!isIsoDate(date)) return false;
  const { from, to } = periodRange(period);
  return date >= from && date <= to;
}
