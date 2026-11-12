import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { SignOutButton } from "@/components/shell/sign-out-button";
import { ReportDownloads } from "@/modules/expenses/components/report-downloads";
import { loadMoneyContext } from "@/modules/expenses/context";
import { ArchivedLists } from "@/modules/todos/components/archived-lists";
import { TaskPanel } from "@/modules/todos/components/task-panel";
import { listArchivedLists } from "@/server/data/lists";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Settings" };

/** Your account, Expense Tracker reports and your archived lists, in the app's usual cards. */
export default async function SettingsPage() {
  const { userId, user } = await requireUser();
  const [archived, money] = await Promise.all([
    listArchivedLists(userId),
    loadMoneyContext(userId),
  ]);

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
          id="expense-reports"
          title="Expense Tracker"
          subtitle="Download a report as a PDF, for any month or year."
        >
          <ReportDownloads thisMonth={money.defaultPeriod} />
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
