import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { SignOutButton } from "@/components/shell/sign-out-button";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user } = await requireUser();
  return (
    <>
      <PageHeader title="Settings" />
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
    </>
  );
}
