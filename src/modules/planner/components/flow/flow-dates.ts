import { timeNowIn, todayIn } from "@/lib/dates";
import type { FlowDates } from "./types";

/** Today and the locale in the person's own timezone (the settings row), for the pages. */
export function flowDates(settings: {
  timezone: string;
  locale: string;
  weekStartsOn: number;
}): FlowDates {
  return {
    today: todayIn(settings.timezone),
    timeNow: timeNowIn(settings.timezone),
    locale: settings.locale,
    weekStartsOn: settings.weekStartsOn,
  };
}
