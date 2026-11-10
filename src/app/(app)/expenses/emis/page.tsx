import { EntriesPage, entriesMetadata } from "@/modules/expenses/components/entries-page";

export const metadata = entriesMetadata("emi");

export default function Page({ searchParams }: PageProps<"/expenses/emis">) {
  return <EntriesPage kind="emi" searchParams={searchParams} />;
}
