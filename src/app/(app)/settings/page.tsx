import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { SignOutButton } from "@/components/shell/sign-out-button";
import { ArchivedLists } from "@/modules/todos/components/archived-lists";
import { TagManager } from "@/modules/todos/components/tag-manager";
import { listArchivedLists } from "@/server/data/lists";
import { listTags } from "@/server/data/tags";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { userId, user } = await requireUser();
  const [tags, archived] = await Promise.all([listTags(userId), listArchivedLists(userId)]);

  return (
    <>
      <PageHeader title="Settings" />
      <div className="flex flex-col gap-6">
        <section aria-labelledby="account-heading" className="rounded-xl border p-4">
          <h2 id="account-heading" className="font-medium">
            Account
          </h2>
          <dl className="mt-3 grid gap-1 text-sm">
            <div className="flex gap-2">
              <dt className="w-16 text-muted-foreground">Name</dt>
              <dd>{user.name}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-16 text-muted-foreground">Email</dt>
              <dd>{user.email}</dd>
            </div>
          </dl>
          <div className="mt-4">
            <SignOutButton variant="outline" />
          </div>
        </section>

        <section aria-labelledby="tags-heading" className="rounded-xl border p-4">
          <h2 id="tags-heading" className="mb-2 font-medium">
            Tags
          </h2>
          <TagManager tags={tags} />
        </section>

        <section aria-labelledby="archived-heading" className="rounded-xl border p-4">
          <h2 id="archived-heading" className="mb-2 font-medium">
            Archived lists
          </h2>
          <ArchivedLists lists={archived} />
        </section>
      </div>
    </>
  );
}
