import type { Metadata } from "next";
import { ExportSettings } from "@/modules/account/components/data-sections";
import { SectionHeader } from "@/modules/account/components/ui";
import { loadMoneyContext } from "@/modules/expenses/context";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Reports & export" };

/** Settings › Reports & export (screen 9m). */
export default async function ExportPage() {
  const { userId } = await requireUser();
  const money = await loadMoneyContext(userId);
  return (
    <>
      <SectionHeader title="Reports & export" />
      <ExportSettings thisMonth={money.defaultPeriod} />
    </>
  );
}
