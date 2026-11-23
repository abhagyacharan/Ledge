import "server-only";
import { getAiUsageSummary } from "@/server/data/ai-usage";
import { listLiveSubscriptions } from "@/server/data/reminders";
import { pushConfigured } from "@/server/push";
import { listArchivedLists } from "@/server/data/lists";
import { getUserSettings } from "@/server/data/settings";
import { getSignInMethods } from "@/server/data/sign-in-methods";
import { journalLock } from "@/server/journal-lock";
import { formatInr, microsToPaise } from "@/lib/ai-cost";

/**
 * Whether this sign-in happened in the last 10 minutes: "Confirm with Google" on Delete account
 * (deleteAccountAction checks the same window again).
 */
export function signedInJustNow(createdAt: Date | string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 10 * 60_000;
}

/** "3 Nov 2026" in the person's own time zone and locale. */
export function shortDate(at: Date | null, locale: string, timeZone: string): string | null {
  if (!at) return null;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  }).format(at);
}

/** The short live line at the end of each row on the phone settings home (screen 9a). */
export async function homeSummaries(userId: string) {
  const [methods, settings, lock, archived, usage, subs] = await Promise.all([
    getSignInMethods(userId),
    getUserSettings(userId),
    journalLock(userId),
    listArchivedLists(userId),
    getAiUsageSummary(userId),
    pushConfigured() ? listLiveSubscriptions(userId) : Promise.resolve([]),
  ]);
  // The device count: this phone's own state is only known in the browser, so the home says how
  // many devices have reminders on.
  const pushSummary =
    subs.length === 0 ? "Off" : `On for ${subs.length} ${subs.length === 1 ? "device" : "devices"}`;
  const signIn =
    methods.google && methods.password
      ? "Google and password"
      : methods.google
        ? "Google"
        : "Password";
  const theme = { system: "System", light: "Light", dark: "Dark" }[settings.theme];
  const cost = formatInr(microsToPaise(usage.thisMonth.costMicros, settings.usdToInr));
  return {
    notifications: pushSummary,
    security: signIn,
    appearance: theme,
    voice: `${cost} this month`,
    "journal-lock": lock.state === "off" ? "Off" : "On",
    tasks:
      archived.length === 0
        ? "No archived lists"
        : `${archived.length} archived ${archived.length === 1 ? "list" : "lists"}`,
    export: "PDF, JSON, CSV",
  };
}
