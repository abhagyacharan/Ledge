import { describe, expect, it } from "vitest";
import { EXPENSE_CATEGORIES } from "./categories";
import { breakdownPdf, cashFlowPdf, reportFileName } from "./report-pdf";
import { annualTrend, expenseBreakdown } from "./summary";

const fmt = { currency: "INR", locale: "en-IN" };
const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

describe("breakdownPdf", () => {
  it("lists every category with its amount, share and the double-ruled total", () => {
    const { rows, total } = expenseBreakdown([
      { category: "Housing & Utilities", amountMinor: 1_850_000, count: 3 },
      { category: "Transportation", amountMinor: 400_000, count: 1 },
    ]);
    const pdf = text(
      breakdownPdf({ periodLabel: "November 2026", rows, total, fmt, madeOn: "12 Nov 2026" }),
    );
    for (const category of EXPENSE_CATEGORIES) expect(pdf).toContain(`(${category}) Tj`);
    expect(pdf).toContain("(18,500.00) Tj");
    expect(pdf).toContain("(82.2%) Tj");
    expect(pdf).toContain("(22,500.00) Tj"); // total
    expect(pdf).toContain("(November 2026 - amounts in INR) Tj");
    expect(pdf).toContain("(Made on 12 Nov 2026) Tj");
    expect(pdf).not.toContain("No expenses were recorded");
  });

  it("prints a complete sheet of zeros for a period with no entries", () => {
    const { rows, total } = expenseBreakdown([]);
    const pdf = text(
      breakdownPdf({ periodLabel: "March 2030", rows, total, fmt, madeOn: "12 Nov 2026" }),
    );
    for (const category of EXPENSE_CATEGORIES) expect(pdf).toContain(`(${category}) Tj`);
    expect(pdf.match(/\(0\.00\) Tj/g)).toHaveLength(EXPENSE_CATEGORIES.length + 1);
    expect(pdf).toContain("(No expenses were recorded for this period.) Tj");
  });
});

describe("cashFlowPdf", () => {
  it("has twelve months, the full-year total and the savings rate", () => {
    const { months, total } = annualTrend([
      { month: 1, income: 2_800_000, emi: 1_014_200, expense: 470_000, investment: 500_000 },
    ]);
    const pdf = text(cashFlowPdf({ year: 2026, months, total, fmt, madeOn: "12 Nov 2026" }));
    for (const m of ["January", "June", "December"]) expect(pdf).toContain(`(${m}) Tj`);
    expect(pdf).toContain("(Full year 2026) Tj");
    expect(pdf).toContain("(13,158.00) Tj"); // net savings
    expect(pdf).toContain("Savings rate: 47.0% of inflows.");
  });

  it("says so when a year has no inflows", () => {
    const { months, total } = annualTrend([]);
    const pdf = text(cashFlowPdf({ year: 2031, months, total, fmt, madeOn: "12 Nov 2026" }));
    expect(pdf).toContain("Savings rate: none \\(no inflows this year\\).");
  });
});

describe("reportFileName", () => {
  it("names the file after the report and the period", () => {
    expect(reportFileName("expense-breakdown", 2026, 3)).toBe(
      "ledge-expense-breakdown-2026-03.pdf",
    );
    expect(reportFileName("expense-breakdown", 2026, "all")).toBe(
      "ledge-expense-breakdown-2026.pdf",
    );
    expect(reportFileName("cash-flow", 2026)).toBe("ledge-cash-flow-2026.pdf");
  });
});
