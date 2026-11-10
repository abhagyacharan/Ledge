import "server-only";
import { todayIn } from "@/lib/dates";
import { getUserSettings } from "@/server/data/settings";
import { periodFromToday, type Period } from "./periods";

/** What every expense screen needs from the user's settings: money format, and "today". */
export type MoneyContext = {
  currency: string;
  locale: string;
  timeZone: string;
  /** Today's date in the user's timezone. */
  today: string;
  /** The current month, used when the URL has no period. */
  defaultPeriod: Period;
};

export async function loadMoneyContext(userId: string): Promise<MoneyContext> {
  const settings = await getUserSettings(userId);
  const today = todayIn(settings.timezone);
  return {
    currency: settings.currency,
    locale: settings.locale,
    timeZone: settings.timezone,
    today,
    defaultPeriod: periodFromToday(today),
  };
}
