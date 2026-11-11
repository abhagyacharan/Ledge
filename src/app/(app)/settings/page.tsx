import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { SignOutButton } from "@/components/shell/sign-out-button";
import { ArchivedLists } from "@/modules/todos/components/archived-lists";
import { TaskPanel } from "@/modules/todos/components/task-panel";
import { listArchivedLists } from "@/server/data/lists";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Settings" };

/** Your account and your archived lists, in the same cards as the rest of the app. */
export default async function SettingsPage() {
  const { userId, user } = await requireUser();
  const archived = await listArchivedLists(userId);

  return (
    <div className="dash">
      <PageHeader title="Settings" />
      <div className="flex flex-col gap-4">
        <TaskPanel id="account" title="Account">
          <dl className="grid gap-2 text-sm">
            <div className="flex gap-3">
              <dt className="w-16 text-dash-ink-soft">Name</dt>
              <dd className="min-w-0 break-words">{user.name}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-16 text-dash-ink-soft">Email</dt>
              <dd className="min-w-0 break-all">{user.email}</dd>
            </div>
          </dl>
          <div className="mt-4">
            <SignOutButton variant="outline" />
          </div>
        </TaskPanel>

        <TaskPanel
          id="archived"
          title="Archived lists"
          subtitle="Lists you put away. Bring one back any time."
        >
          <ArchivedLists lists={archived} />
        </TaskPanel>
      </div>
    </div>
  );
}
