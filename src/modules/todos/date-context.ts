import "server-only";
import { timeNowIn, todayIn } from "@/lib/dates";
import { getUserSettings } from "@/server/data/settings";
import type { DateContext } from "./components/types";

/** "Today" and "now" in the user's own timezone, plus their locale and week start. */
export async function loadDateContext(
  userId: string,
): Promise<{ ctx: DateContext; timeZone: string }> {
  const settings = await getUserSettings(userId);
  const now = new Date();
  return {
    timeZone: settings.timezone,
    ctx: {
      today: todayIn(settings.timezone, now),
      timeNow: timeNowIn(settings.timezone, now),
      locale: settings.locale,
      weekStartsOn: settings.weekStartsOn,
    },
  };
}
