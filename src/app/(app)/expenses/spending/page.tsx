import { EntriesPage, entriesMetadata } from "@/modules/expenses/components/entries-page";

export const metadata = entriesMetadata("expense");

export default function Page({ searchParams }: PageProps<"/expenses/spending">) {
  return <EntriesPage kind="expense" searchParams={searchParams} />;
}
