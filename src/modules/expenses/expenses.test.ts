import { describe, expect, it } from "vitest";
import { emiSeriesDates } from "./emi-series";
import {
  dateInPeriod,
  parsePeriod,
  periodFromToday,
  periodLabel,
  periodRange,
  shiftPeriod,
} from "./periods";
import { createEntrySchema, parseEntryFilters, updateEntrySchema } from "./schema";
import {
  annualTrend,
  emiProgress,
  expenseBreakdown,
  fillYear,
  periodTotals,
  type MonthTotals,
} from "./summary";

const m = (month: number, income = 0, emi = 0, expense = 0, investment = 0): MonthTotals => ({
  month,
  income,
  emi,
  expense,
  investment,
});

describe("period totals (the sheet's numbers)", () => {
  // November in O's sheet: inflows 28,000.00, EMIs 10,142.00, expenses 4,600.00.
  const year = [m(11, 2_800_000, 1_014_200, 460_000, 500_000)];

  it("matches the sheet for November", () => {
    const t = periodTotals(year, 11);
    expect(t.income).toBe(2_800_000);
    expect(t.emi).toBe(1_014_200);
    expect(t.expense).toBe(460_000);
    expect(t.netSavings).toBe(1_325_800); // ₹13,258.00
    expect(t.savingsRate).toBe(47.4);
    expect(t.leftAfterInvesting).toBe(825_800);
  });

  it("is zero for a month with no entries, with no savings rate", () => {
    const t = periodTotals(year, 10);
    expect(t).toMatchObject({ income: 0, emi: 0, expense: 0, netSavings: 0, savingsRate: null });
  });

  it("adds up the whole year", () => {
    const t = periodTotals([m(1, 100_000, 10_000, 20_000), m(2, 100_000, 10_000, 30_000)], "all");
    expect(t).toMatchObject({ income: 200_000, emi: 20_000, expense: 50_000, netSavings: 130_000 });
    expect(t.savingsRate).toBe(65);
  });

  it("can be negative, and the rate goes negative with it", () => {
    const t = periodTotals([m(3, 100_000, 80_000, 50_000)], 3);
    expect(t.netSavings).toBe(-30_000);
    expect(t.savingsRate).toBe(-30);
  });

  it("has no savings rate when there is spending but no income", () => {
    const t = periodTotals([m(3, 0, 0, 5_000)], 3);
    expect(t.netSavings).toBe(-5_000);
    expect(t.savingsRate).toBeNull();
  });

  it("ignores rows with a month outside 1 to 12", () => {
    expect(fillYear([m(13, 5)])).toHaveLength(12);
    expect(periodTotals([m(13, 5)], "all").income).toBe(0);
  });
});

describe("annual trend", () => {
  it("returns twelve months and a full-year row", () => {
    const { months, total } = annualTrend([m(11, 2_800_000, 1_014_200, 460_000)]);
    expect(months).toHaveLength(12);
    expect(months.map((x) => x.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(months[10]).toMatchObject({ netSavings: 1_325_800, savingsRate: 47.4 });
    expect(months[0]).toMatchObject({ income: 0, netSavings: 0, savingsRate: null });
    expect(total).toMatchObject({ income: 2_800_000, netSavings: 1_325_800, savingsRate: 47.4 });
  });

  it("the full-year rate is the year's net over the year's income, not an average of rates", () => {
    const { total } = annualTrend([m(1, 100_000, 0, 0), m(2, 300_000, 300_000, 0)]);
    // Net 100,000 over income 400,000 is 25.0%. (An average of 100% and 0% would say 50%.)
    expect(total.savingsRate).toBe(25);
  });
});

describe("expense breakdown", () => {
  it("lists every category, zero where unused, with shares and totals", () => {
    const { rows, total } = expenseBreakdown([
      { category: "Transportation", amountMinor: 400_000, count: 1 },
      { category: "Subscriptions & Tech", amountMinor: 60_000, count: 1 },
    ]);
    expect(rows).toHaveLength(9);
    expect(rows[0]).toMatchObject({ category: "Housing & Utilities", amountMinor: 0, percent: 0 });
    const transport = rows.find((r) => r.category === "Transportation");
    const subs = rows.find((r) => r.category === "Subscriptions & Tech");
    expect(transport).toMatchObject({ percent: 87, count: 1 });
    expect(subs).toMatchObject({ percent: 13, count: 1 });
    expect(total).toMatchObject({ amountMinor: 460_000, count: 2 });
  });

  it("keeps the list's order and appends unknown categories", () => {
    const { rows } = expenseBreakdown([{ category: "Pets", amountMinor: 100, count: 1 }]);
    expect(rows.at(-1)?.category).toBe("Pets");
    expect(rows[1].category).toBe("Food & Groceries");
  });

  it("shows no percentages when nothing was spent", () => {
    const { rows, total } = expenseBreakdown([]);
    expect(total.amountMinor).toBe(0);
    expect(rows.every((r) => r.percent === null)).toBe(true);
  });
});

describe("EMI progress", () => {
  it("splits paid from still-to-pay", () => {
    const p = emiProgress([
      { status: "paid", amountMinor: 500_000, count: 2 },
      { status: "scheduled", amountMinor: 300_000, count: 1 },
      { status: "delayed", amountMinor: 214_200, count: 1 },
    ]);
    expect(p).toMatchObject({
      paidMinor: 500_000,
      paidCount: 2,
      remainingMinor: 514_200,
      delayedCount: 1,
    });
  });

  it("is all zero for no EMIs", () => {
    expect(emiProgress([])).toMatchObject({ paidMinor: 0, remainingMinor: 0, delayedCount: 0 });
  });
});

describe("periods", () => {
  it("starts from today's month", () => {
    expect(periodFromToday("2026-11-10")).toEqual({ year: 2026, month: 11 });
  });

  it.each([
    [{ year: 2026, month: 11 }, "2026-11-01", "2026-11-30"],
    [{ year: 2026, month: 12 }, "2026-12-01", "2026-12-31"],
    [{ year: 2026, month: 2 }, "2026-02-01", "2026-02-28"],
    [{ year: 2028, month: 2 }, "2028-02-01", "2028-02-29"], // leap year
    [{ year: 2026, month: "all" as const }, "2026-01-01", "2026-12-31"],
  ])("range of %j", (period, from, to) => {
    expect(periodRange(period)).toEqual({ from, to });
  });

  it("moves a month at a time across year ends", () => {
    expect(shiftPeriod({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftPeriod({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftPeriod({ year: 2026, month: 6 }, 1)).toEqual({ year: 2026, month: 7 });
    expect(shiftPeriod({ year: 2026, month: "all" }, -1)).toEqual({ year: 2025, month: "all" });
  });

  it("reads and validates the URL, falling back to the default", () => {
    const fallback = { year: 2026, month: 11 };
    expect(parsePeriod({ y: "2025", m: "3" }, fallback)).toEqual({ year: 2025, month: 3 });
    expect(parsePeriod({ y: "2025", m: "all" }, fallback)).toEqual({ year: 2025, month: "all" });
    expect(parsePeriod({}, fallback)).toEqual(fallback);
    expect(parsePeriod({ y: "abcd" }, fallback)).toEqual(fallback);
    expect(parsePeriod({ y: "1850" }, fallback)).toEqual(fallback);
    expect(parsePeriod({ y: "2025", m: "13" }, fallback)).toEqual(fallback);
    expect(parsePeriod({ y: "2025", m: "0" }, fallback)).toEqual(fallback);
    expect(parsePeriod({ y: "2025" }, fallback)).toEqual({ year: 2025, month: 11 });
  });

  it("labels and tests dates", () => {
    expect(periodLabel({ year: 2026, month: 11 })).toBe("November 2026");
    expect(periodLabel({ year: 2026, month: "all" })).toBe("2026");
    expect(dateInPeriod("2026-11-30", { year: 2026, month: 11 })).toBe(true);
    expect(dateInPeriod("2026-12-01", { year: 2026, month: 11 })).toBe(false);
    expect(dateInPeriod("2026-12-01", { year: 2026, month: "all" })).toBe(true);
    expect(dateInPeriod("nonsense", { year: 2026, month: "all" })).toBe(false);
  });
});

describe("EMI series dates", () => {
  it("is just the first date when there are no extra months", () => {
    expect(emiSeriesDates("2026-11-05", 0)).toEqual(["2026-11-05"]);
  });

  it("adds a month at a time, counting from the first date so the 31st does not drift", () => {
    expect(emiSeriesDates("2026-01-31", 4)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
      "2026-05-31",
    ]);
  });

  it("handles leap years and year ends", () => {
    expect(emiSeriesDates("2028-01-31", 1)).toEqual(["2028-01-31", "2028-02-29"]);
    expect(emiSeriesDates("2026-11-15", 3)).toEqual([
      "2026-11-15",
      "2026-12-15",
      "2027-01-15",
      "2027-02-15",
    ]);
  });

  it("limits the series to 60 extra months and ignores nonsense", () => {
    expect(emiSeriesDates("2026-01-01", 999)).toHaveLength(61);
    expect(emiSeriesDates("2026-01-01", -3)).toEqual(["2026-01-01"]);
    expect(emiSeriesDates("2026-01-01", 2.9)).toHaveLength(3);
  });
});

describe("entry schemas", () => {
  const income = {
    kind: "income",
    entryDate: "2026-11-01",
    title: "  Acme salary ",
    category: "Salary",
    amount: "25,000",
    notes: "",
  };

  it("turns the typed amount into paise, trims text and blanks into null", () => {
    const parsed = createEntrySchema.parse(income);
    expect(parsed).toMatchObject({ title: "Acme salary", amount: 2_500_000, notes: null });
  });

  it("refuses a zero, negative, malformed or huge amount", () => {
    for (const amount of ["0", "-5", "abc", "12.345", "", "99999999999"]) {
      expect(createEntrySchema.safeParse({ ...income, amount }).success).toBe(false);
    }
  });

  it("refuses an unknown category, a bad date and an empty name", () => {
    expect(createEntrySchema.safeParse({ ...income, category: "Lottery" }).success).toBe(false);
    expect(createEntrySchema.safeParse({ ...income, entryDate: "2026-02-30" }).success).toBe(false);
    expect(createEntrySchema.safeParse({ ...income, title: "  " }).success).toBe(false);
  });

  it("only accepts the fields for the chosen kind, and each kind's own lists", () => {
    const expense = {
      kind: "expense",
      entryDate: "2026-11-02",
      title: "Cab",
      category: "Transportation",
      paymentMethod: "UPI",
      amount: "4000",
    };
    expect(createEntrySchema.safeParse(expense).success).toBe(true);
    // An income category is not an expense category.
    expect(createEntrySchema.safeParse({ ...expense, category: "Salary" }).success).toBe(false);
    expect(createEntrySchema.safeParse({ ...expense, paymentMethod: "Barter" }).success).toBe(
      false,
    );
    expect(createEntrySchema.safeParse({ ...expense, kind: "nonsense" }).success).toBe(false);
  });

  it("validates an EMI, with a repeat count from 0 to 60", () => {
    const emi = {
      kind: "emi",
      entryDate: "2026-11-05",
      title: "Home loan",
      lender: "HDFC",
      emiType: "Fixed EMI",
      category: "Home loan",
      amount: "8142",
      status: "scheduled",
    };
    const ok = createEntrySchema.parse(emi);
    expect(ok).toMatchObject({ amount: 814_200, repeatMonths: 0 });
    expect(createEntrySchema.safeParse({ ...emi, repeatMonths: 11 }).success).toBe(true);
    expect(createEntrySchema.safeParse({ ...emi, repeatMonths: 61 }).success).toBe(false);
    expect(createEntrySchema.safeParse({ ...emi, repeatMonths: -1 }).success).toBe(false);
    expect(createEntrySchema.safeParse({ ...emi, status: "maybe" }).success).toBe(false);
  });

  it("only allows a paid-on date on a paid EMI", () => {
    const emi = {
      kind: "emi",
      entryDate: "2026-11-05",
      title: "Loan",
      emiType: "Fixed EMI",
      category: "Personal loan",
      amount: "100",
    };
    expect(
      createEntrySchema.safeParse({ ...emi, status: "scheduled", paidOn: "2026-11-05" }).success,
    ).toBe(false);
    expect(
      createEntrySchema.safeParse({ ...emi, status: "paid", paidOn: "2026-11-05" }).success,
    ).toBe(true);
  });

  it("validates an investment and an update", () => {
    const investment = {
      kind: "investment",
      entryDate: "2026-11-03",
      title: "Index fund SIP",
      category: "Mutual fund",
      platform: "Groww",
      amount: "5000",
    };
    expect(createEntrySchema.safeParse(investment).success).toBe(true);
    const id = "3f2b8c1e-5d4a-4b7e-9c1d-0a1b2c3d4e5f";
    expect(updateEntrySchema.safeParse({ id, ...investment }).success).toBe(true);
    expect(updateEntrySchema.safeParse({ id: "x", ...investment }).success).toBe(false);
  });
});

describe("tab filters from the URL", () => {
  const cats = ["Salary", "Bonus"];
  it("reads valid values and ignores the rest", () => {
    expect(parseEntryFilters({ sort: "highest", cat: "Bonus", q: " rent " }, cats)).toEqual({
      sort: "highest",
      category: "Bonus",
      q: "rent",
    });
    expect(parseEntryFilters({ sort: "sideways", cat: "Nope" }, cats)).toEqual({
      sort: "newest",
      category: null,
      q: "",
    });
  });
});
