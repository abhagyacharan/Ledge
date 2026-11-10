import type { Metadata } from "next";
import { EmptyState } from "@/components/shell/empty-state";
import { PageHeader } from "@/components/shell/page-header";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  await requireUser();
  return (
    <>
      <PageHeader title="Today" />
      <EmptyState title="Nothing for today" hint="Tasks due today will show up here." />
    </>
  );
}
