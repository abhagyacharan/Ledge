import { percentOf } from "@/lib/money";
import { EXPENSE_CATEGORIES } from "./categories";

/**
 * The summary tab's arithmetic (docs/expenses-spec.md), as pure functions over totals that the
 * data layer reads from the database. All amounts are integer paise.
 */

/** Totals for one calendar month, summed in the database. */
export type MonthTotals = {
  /** 1 to 12 */
  month: number;
  income: number;
  emi: number;
  expense: number;
  investment: number;
};

export type PeriodTotals = Omit<MonthTotals, "month"> & {
  /** inflows minus EMIs minus expenses */
  netSavings: number;
  /** net savings as a percent of inflows, one decimal; null when there is no income */
  savingsRate: number | null;
  /** net savings minus what was invested */
  leftAfterInvesting: number;
};

export function emptyMonth(month: number): MonthTotals {
  return { month, income: 0, emi: 0, expense: 0, investment: 0 };
}

/** Twelve months, filling any month the database returned nothing for. */
export function fillYear(rows: MonthTotals[]): MonthTotals[] {
  return Array.from(
    { length: 12 },
    (_, i) => rows.find((r) => r.month === i + 1) ?? emptyMonth(i + 1),
  );
}

function withDerived(t: Omit<MonthTotals, "month">): PeriodTotals {
  const netSavings = t.income - t.emi - t.expense;
  return {
    ...t,
    netSavings,
    savingsRate: percentOf(netSavings, t.income),
    leftAfterInvesting: netSavings - t.investment,
  };
}

/** Totals for one month of the year, or for the whole year (`"all"`). */
export function periodTotals(year: MonthTotals[], month: number | "all"): PeriodTotals {
  const months = fillYear(year);
  const picked = month === "all" ? months : months.filter((m) => m.month === month);
  return withDerived(
    picked.reduce(
      (sum, m) => ({
        income: sum.income + m.income,
        emi: sum.emi + m.emi,
        expense: sum.expense + m.expense,
        investment: sum.investment + m.investment,
      }),
      { income: 0, emi: 0, expense: 0, investment: 0 },
    ),
  );
}

export type TrendRow = PeriodTotals & { month: number };

/** The January to December table, plus the full-year total row. */
export function annualTrend(year: MonthTotals[]): { months: TrendRow[]; total: PeriodTotals } {
  const months = fillYear(year).map((m) => ({ ...withDerived(m), month: m.month }));
  return { months, total: periodTotals(year, "all") };
}

export type CategoryRow = { category: string; amountMinor: number; count: number };

export type BreakdownRow = CategoryRow & {
  /** share of the total spend, one decimal; null when nothing was spent */
  percent: number | null;
};

/**
 * Expense breakdown: every known category appears (zero when unused), as in the sheet. Categories
 * not in the list (for example from a future custom category) are added after the known ones.
 * Rows keep the list's order, so the table does not jump around between months.
 */
export function expenseBreakdown(rows: CategoryRow[]): {
  rows: BreakdownRow[];
  total: CategoryRow;
} {
  const byName = new Map(rows.map((r) => [r.category, r]));
  const known = EXPENSE_CATEGORIES.map(
    (category) => byName.get(category) ?? { category, amountMinor: 0, count: 0 },
  );
  const extra = rows.filter((r) => !(EXPENSE_CATEGORIES as readonly string[]).includes(r.category));
  const all = [...known, ...extra];
  const total = all.reduce(
    (sum, r) => ({
      ...sum,
      amountMinor: sum.amountMinor + r.amountMinor,
      count: sum.count + r.count,
    }),
    { category: "Total living expenses", amountMinor: 0, count: 0 },
  );
  return {
    rows: all.map((r) => ({ ...r, percent: percentOf(r.amountMinor, total.amountMinor) })),
    total,
  };
}

export type EmiProgress = {
  paidMinor: number;
  paidCount: number;
  scheduledMinor: number;
  scheduledCount: number;
  delayedMinor: number;
  delayedCount: number;
  /** still to pay: scheduled plus delayed */
  remainingMinor: number;
};

export function emiProgress(
  rows: { status: "scheduled" | "paid" | "delayed"; amountMinor: number; count: number }[],
): EmiProgress {
  const of = (status: string) => rows.filter((r) => r.status === status);
  const sum = (list: { amountMinor: number }[]) => list.reduce((s, r) => s + r.amountMinor, 0);
  const count = (list: { count: number }[]) => list.reduce((s, r) => s + r.count, 0);
  const paid = of("paid");
  const scheduled = of("scheduled");
  const delayed = of("delayed");
  return {
    paidMinor: sum(paid),
    paidCount: count(paid),
    scheduledMinor: sum(scheduled),
    scheduledCount: count(scheduled),
    delayedMinor: sum(delayed),
    delayedCount: count(delayed),
    remainingMinor: sum(scheduled) + sum(delayed),
  };
}
