import type { Metadata } from "next";
import { SectionHeader } from "@/modules/account/components/ui";
import { JournalLockSettings } from "@/modules/journal/components/journal-lock-settings";
import { getUserSettings } from "@/server/data/settings";
import { getSignInMethods } from "@/server/data/sign-in-methods";
import { journalLock } from "@/server/journal-lock";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Journal lock" };

/** Settings › Journal lock (screen 9l, which replaced 7f; docs/journal-spec.md). */
export default async function JournalLockPage() {
  const { userId } = await requireUser();
  const [lock, settings, methods] = await Promise.all([
    journalLock(userId),
    getUserSettings(userId),
    getSignInMethods(userId),
  ]);
  return (
    <>
      <SectionHeader title="Journal lock" />
      <JournalLockSettings
        on={lock.state !== "off"}
        pinLength={lock.state === "off" ? 4 : lock.pinLength}
        relock={settings.journalRelock}
        hasPassword={methods.password}
      />
    </>
  );
}
