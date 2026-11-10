import { PageHeader } from "@/components/shell/page-header";
import { ExpensesTabs, PeriodPicker } from "@/modules/expenses/components/expenses-nav";
import { loadMoneyContext } from "@/modules/expenses/context";
import { requireUser } from "@/server/session";

/** The expense tracker's frame: title, the five tabs, and the period picker shared by all of them. */
export default async function ExpensesLayout({ children }: LayoutProps<"/expenses">) {
  const { userId } = await requireUser();
  const { defaultPeriod } = await loadMoneyContext(userId);

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Income, EMIs and loans, spending and investing, month by month."
      />
      <ExpensesTabs />
      <div className="mt-4 mb-6">
        <PeriodPicker fallback={defaultPeriod} />
      </div>
      {children}
    </>
  );
}
