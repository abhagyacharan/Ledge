import type { Metadata } from "next";
import { describeDevice, lastActive } from "@/modules/account/devices";
import { SecuritySection } from "@/modules/account/components/security-section";
import { shortDate } from "@/modules/account/settings-data";
import { listDevices } from "@/server/data/devices";
import { getUserSettings } from "@/server/data/settings";
import { getSignInMethods } from "@/server/data/sign-in-methods";
import { getGoogleConfig } from "@/server/env";
import { getSession, requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Sign-in & security" };

/** What Connect Google can come back with (Better Auth's link errors), in plain words. */
function linkError(code: unknown): string | null {
  if (typeof code !== "string" || !code) return null;
  if (code === "account_already_linked_to_different_user") {
    return "That Google account is already used by another Ledge account.";
  }
  if (code === "email_does_not_match") {
    return "That Google account has a different email. Use the Google account for this email.";
  }
  return "Google didn't connect. Try again.";
}

/** Settings › Sign-in & security (screens 9e to 9i). */
export default async function SecurityPage({ searchParams }: PageProps<"/settings/security">) {
  const { userId, user } = await requireUser();
  const [session, methods, settings, { error }] = await Promise.all([
    getSession(),
    getSignInMethods(userId),
    getUserSettings(userId),
    searchParams,
  ]);
  const devices = await listDevices(userId, session?.session.id ?? "");
  const now = new Date();
  return (
    <SecuritySection
      email={user.email}
      password={methods.password}
      google={methods.google}
      passwordChanged={shortDate(methods.passwordChangedAt, settings.locale, settings.timezone)}
      googleSince={shortDate(methods.googleSince, settings.locale, settings.timezone)}
      googleAvailable={getGoogleConfig() !== null}
      googleError={linkError(error)}
      devices={devices.map((d) => ({
        id: d.id,
        ...describeDevice(d.userAgent),
        lastActive: lastActive(d.lastSeen, now, settings.locale, settings.timezone),
        current: d.current,
      }))}
    />
  );
}
