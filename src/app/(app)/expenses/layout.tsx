import { SearchButton } from "@/components/shell/search-button";
import { ExpensesTabs, PeriodPicker } from "@/modules/expenses/components/expenses-nav";
import { ExpensesPendingProvider, PendingRegion } from "@/modules/expenses/components/pending";
import { TransactionLauncher } from "@/modules/expenses/components/transaction-launcher";
import { loadMoneyContext } from "@/modules/expenses/context";
import { requireUser } from "@/server/session";

/**
 * The expense tracker's frame (docs/design.md §5c): the title, one toolbar with the five tabs and
 * the period, and the "Log a transaction" button. While a new period or filter loads, the current
 * figures stay visible, dimmed (PendingRegion).
 */
export default async function ExpensesLayout({ children }: LayoutProps<"/expenses">) {
  const { userId } = await requireUser();
  const { defaultPeriod, currency, today } = await loadMoneyContext(userId);

  return (
    <ExpensesPendingProvider>
      <TransactionLauncher currency={currency} today={today}>
        <header className="dash mb-6 flex flex-col gap-4 md:mb-8">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">Expenses</h1>
            <SearchButton />
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <ExpensesTabs />
            <PeriodPicker fallback={defaultPeriod} />
          </div>
        </header>
        <PendingRegion>{children}</PendingRegion>
      </TransactionLauncher>
    </ExpensesPendingProvider>
  );
}
