import { describe, expect, it } from "vitest";
import { EXPENSE_CATEGORIES } from "./categories";
import { emiState, groupByDay, groupsByDay, presentCategories, shareRows } from "./entries-logic";

describe("emiState", () => {
  const today = "2026-11-11";
  it("reads paid and delayed straight from the status", () => {
    expect(emiState({ status: "paid", entryDate: "2026-10-01" }, today)).toBe("paid");
    expect(emiState({ status: "delayed", entryDate: "2026-12-01" }, today)).toBe("delayed");
  });
  it("calls a scheduled EMI overdue only once its due date has passed", () => {
    expect(emiState({ status: "scheduled", entryDate: "2026-11-10" }, today)).toBe("overdue");
    expect(emiState({ status: "scheduled", entryDate: "2026-11-11" }, today)).toBe("scheduled");
    expect(emiState({ status: "scheduled", entryDate: "2026-11-30" }, today)).toBe("scheduled");
  });
});

describe("groupByDay", () => {
  const e = (entryDate: string, amountMinor: number) => ({ entryDate, amountMinor });
  it("keeps the order and totals each day", () => {
    const groups = groupByDay([e("2026-11-03", 100), e("2026-11-03", 250), e("2026-11-01", 5)]);
    expect(groups.map((g) => [g.date, g.totalMinor, g.entries.length])).toEqual([
      ["2026-11-03", 350, 2],
      ["2026-11-01", 5, 1],
    ]);
  });
  it("returns nothing for an empty list", () => {
    expect(groupByDay([])).toEqual([]);
  });
  it("groups only when the list runs in date order", () => {
    expect(groupsByDay("newest")).toBe(true);
    expect(groupsByDay("oldest")).toBe(true);
    expect(groupsByDay("highest")).toBe(false);
    expect(groupsByDay("lowest")).toBe(false);
  });
});

describe("presentCategories", () => {
  it("offers only used categories, in the fixed order", () => {
    expect(presentCategories(["Shopping", "Healthcare"], EXPENSE_CATEGORIES, null)).toEqual([
      "Healthcare",
      "Shopping",
    ]);
  });
  it("always keeps the active category so it can be cleared", () => {
    expect(presentCategories([], EXPENSE_CATEGORIES, "Shopping")).toEqual(["Shopping"]);
  });
});

describe("shareRows", () => {
  it("sorts largest first and gives each its share", () => {
    expect(
      shareRows([
        { label: "UPI", amountMinor: 300 },
        { label: "Cash", amountMinor: 100 },
        { label: "Card", amountMinor: 0 },
      ]),
    ).toEqual([
      { label: "UPI", amountMinor: 300, percent: 75 },
      { label: "Cash", amountMinor: 100, percent: 25 },
    ]);
  });
  it("folds the smallest rows into one once there are too many", () => {
    const rows = ["a", "b", "c", "d"].map((label, i) => ({ label, amountMinor: (4 - i) * 10 }));
    expect(shareRows(rows, 3)).toEqual([
      { label: "a", amountMinor: 40, percent: 40 },
      { label: "b", amountMinor: 30, percent: 30 },
      { label: "Everything else", amountMinor: 30, percent: 30 },
    ]);
  });
});
