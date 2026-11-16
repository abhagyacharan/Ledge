import type { Metadata } from "next";
import { JournalLockSettings } from "@/modules/journal/components/journal-lock-settings";
import { getUserSettings } from "@/server/data/settings";
import { journalLock } from "@/server/journal-lock";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Journal lock" };

/** Journal lock settings (docs/new_design.md screen 7f; docs/journal-spec.md, "Journal lock"). */
export default async function JournalLockPage() {
  const { userId } = await requireUser();
  const [lock, settings] = await Promise.all([journalLock(userId), getUserSettings(userId)]);
  return (
    <JournalLockSettings
      on={lock.state !== "off"}
      pinLength={lock.state === "off" ? 4 : lock.pinLength}
      relock={settings.journalRelock}
    />
  );
}
