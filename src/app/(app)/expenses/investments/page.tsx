import { EntriesPage, entriesMetadata } from "@/modules/expenses/components/entries-page";

export const metadata = entriesMetadata("investment");

export default function Page({ searchParams }: PageProps<"/expenses/investments">) {
  return <EntriesPage kind="investment" searchParams={searchParams} />;
}
