import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NotificationsSection } from "@/modules/account/components/notifications-section";
import { SectionHeader } from "@/modules/account/components/ui";
import { shortDate } from "@/modules/account/settings-data";
import { getReminderSettings, listLiveSubscriptions } from "@/server/data/reminders";
import { getUserSettings } from "@/server/data/settings";
import { pushConfigured, vapidPublicKey } from "@/server/push";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Notifications" };

/** Settings › Notifications: task reminders as phone and desktop notifications (docs/reminders-spec.md). */
export default async function NotificationsPage() {
  const { userId } = await requireUser();
  const publicKey = vapidPublicKey();
  // Without the VAPID settings reminders are off and the section does not exist.
  if (!pushConfigured() || !publicKey) notFound();
  const [subs, reminder, settings] = await Promise.all([
    listLiveSubscriptions(userId),
    getReminderSettings(userId),
    getUserSettings(userId),
  ]);
  if (!reminder) notFound();
  return (
    <>
      <SectionHeader title="Notifications" />
      <NotificationsSection
        publicKey={publicKey}
        devices={subs.map((s) => ({
          id: s.id,
          endpoint: s.endpoint,
          label: s.deviceLabel,
          added: shortDate(s.createdAt, settings.locale, settings.timezone) ?? "",
        }))}
        settings={reminder}
      />
    </>
  );
}
