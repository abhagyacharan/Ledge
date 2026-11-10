import { addMonths, format, parseISO } from "date-fns";
import type { IsoDate } from "@/lib/dates";

export const MAX_EXTRA_MONTHS = 60;

/**
 * Due dates for an EMI that repeats monthly: the first date, then `extraMonths` more, each counted
 * from the FIRST date so a 31st does not drift (31 Jan, 28 Feb, 31 Mar, 30 Apr, and so on).
 */
export function emiSeriesDates(first: IsoDate, extraMonths: number): IsoDate[] {
  const count = Math.max(0, Math.min(MAX_EXTRA_MONTHS, Math.floor(extraMonths)));
  const start = parseISO(first);
  return Array.from({ length: count + 1 }, (_, i) => format(addMonths(start, i), "yyyy-MM-dd"));
}
