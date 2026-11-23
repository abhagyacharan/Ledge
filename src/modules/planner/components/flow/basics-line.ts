import { addDaysIso, daysBetween, formatRowDay, isoWeekday } from "@/lib/dates";
import { planEndDate, type PlanBasics } from "../../schema";

/** Minutes a weekend day counts for when the choice is "Weekends only". */
const WEEKEND_DAY_MINUTES = 60;

/** Total time the plan asks for, in minutes, from `today` to its last day; null for a bad date. */
export function basicsMinutes(basics: PlanBasics, today: string): number | null {
  const end = planEndDate(basics, today);
  if (!end) return null;
  const days = daysBetween(today, end) + 1;
  if (basics.minutesPerDay !== "weekends") return days * basics.minutesPerDay;
  let weekendDays = 0;
  for (let i = 0; i < days; i++) {
    if (isoWeekday(addDaysIso(today, i)) >= 6) weekendDays += 1;
  }
  return weekendDays * WEEKEND_DAY_MINUTES;
}

/** "14 hours", "1 hour" or "40 minutes". */
export function formatTotalTime(minutes: number): string {
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  const hours = Math.round(minutes / 60);
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

/** The live line under the basics: "About 14 hours in all, Mon 23 Nov to Mon 21 Dec." */
export function basicsLine(
  basics: PlanBasics,
  today: string,
  locale: string,
): { amount: string; range: string } | null {
  const end = planEndDate(basics, today);
  const minutes = basicsMinutes(basics, today);
  if (!end || minutes === null) return null;
  return {
    amount: formatTotalTime(minutes),
    range: `${formatRowDay(today, today, locale)} to ${formatRowDay(end, today, locale)}`,
  };
}
