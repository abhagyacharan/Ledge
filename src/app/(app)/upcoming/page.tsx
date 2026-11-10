import type { Metadata } from "next";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Upcoming" };

export default async function UpcomingPage() {
  await requireUser();
  return (
    <>
      <PageHeader title="Upcoming" />
      <EmptyState
        title="Nothing coming up"
        hint="Tasks due in the next 14 days will show up here."
      />
    </>
  );
}
