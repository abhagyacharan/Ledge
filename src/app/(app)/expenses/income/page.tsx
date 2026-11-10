import { EntriesPage, entriesMetadata } from "@/modules/expenses/components/entries-page";

export const metadata = entriesMetadata("income");

export default function Page({ searchParams }: PageProps<"/expenses/income">) {
  return <EntriesPage kind="income" searchParams={searchParams} />;
}
