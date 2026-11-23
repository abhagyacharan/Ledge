import type { Metadata } from "next";
import { AccountContent } from "@/modules/account/account-content";
import { SettingsHome } from "@/modules/account/components/settings-home";
import { homeSummaries } from "@/modules/account/settings-data";
import { requireUser } from "@/server/session";
import { APP_VERSION } from "@/server/version";

export const metadata: Metadata = { title: "Settings" };

/**
 * /settings: on a phone the settings home (screen 9a); with a mouse Account, beside the settings
 * column (screen 9b).
 */
export default async function SettingsPage() {
  const { userId, user } = await requireUser();
  const summaries = await homeSummaries(userId);
  return (
    <>
      <SettingsHome user={user} summaries={summaries} version={APP_VERSION} />
      <div className="hidden md:contents">
        <AccountContent />
      </div>
    </>
  );
}
