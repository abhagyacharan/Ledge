import { ExpensesHeader } from "@/modules/expenses/components/expenses-header";
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
        <div className="dash">
          <ExpensesHeader fallback={defaultPeriod} />
        </div>
        <PendingRegion>{children}</PendingRegion>
      </TransactionLauncher>
    </ExpensesPendingProvider>
  );
}
