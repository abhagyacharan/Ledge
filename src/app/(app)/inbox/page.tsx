import type { Metadata } from "next";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage() {
  await requireUser();
  return (
    <>
      <PageHeader title="Inbox" />
      <EmptyState title="Your inbox is empty" hint="Adding tasks arrives in the next phase." />
    </>
  );
}
