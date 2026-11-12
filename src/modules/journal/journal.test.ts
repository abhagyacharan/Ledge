import { describe, expect, it } from "vitest";
import {
  daysInMonth,
  journalDay,
  monthEnd,
  monthGrid,
  shiftMonth,
  weekdayInitials,
} from "./calendar";
import {
  buildDayFacts,
  compareToUsual,
  shortMoney,
  summaryLine,
  type DayFactsInput,
} from "./day-facts";
import { saveJournalSchema } from "./schema";

const fmt = { currency: "INR", locale: "en-IN" };

const quiet: DayFactsInput = {
  doneByList: [],
  dueTotal: 0,
  dueOpen: 0,
  expenses: [],
  usualDailySpendMinor: 0,
  incomeMinor: 0,
  emiMinor: 0,
  investedMinor: 0,
};

const busy: DayFactsInput = {
  doneByList: [
    { list: "General", count: 2 },
    { list: "Freelance", count: 2 },
  ],
  dueTotal: 4,
  dueOpen: 2,
  expenses: [
    { category: "Eating out", label: "want", amountMinor: 90_000 },
    { category: "Groceries", label: "need", amountMinor: 34_000 },
  ],
  usualDailySpendMinor: 110_000,
  incomeMinor: 0,
  emiMinor: 0,
  investedMinor: 500_000,
};

describe("journal day facts", () => {
  it("shows tasks, spending, slipped tasks and money for a full day", () => {
    const facts = buildDayFacts(busy, false, fmt);
    expect(facts.map((f) => f.kind)).toEqual(["tasks", "spent", "slipped", "money"]);
    expect(facts[0]).toMatchObject({ title: "4 done", detail: "General 2 · Freelance 2" });
    expect(facts[1]).toMatchObject({
      title: "₹1,240 spent",
      detail: "₹900 on wants · mostly Eating out · about your usual",
    });
    expect(facts[2]).toMatchObject({ title: "2 slipped", empty: false });
    expect(facts[3]).toMatchObject({ title: "₹5,000 invested" });
    expect(summaryLine(facts)).toBe("4 done · ₹1,240 spent · 2 slipped · ₹5,000 invested");
  });

  it("leaves the money card out on a day with no income, EMI or investment", () => {
    const facts = buildDayFacts({ ...busy, investedMinor: 0 }, false, fmt);
    expect(facts.map((f) => f.kind)).toEqual(["tasks", "spent", "slipped"]);
  });

  it("is kind about a quiet day, and says 'yet' while the day is still going", () => {
    const past = buildDayFacts(quiet, false, fmt);
    expect(past.map((f) => f.title)).toEqual(["A rest day", "No-spend day", "Nothing due"]);
    expect(past.every((f) => f.empty)).toBe(true);
    const today = buildDayFacts(quiet, true, fmt);
    expect(today.map((f) => f.title)).toEqual([
      "Nothing ticked off yet",
      "Nothing spent yet",
      "Nothing due",
    ]);
  });

  it("tells 'still open today' from 'slipped', and praises a cleared day", () => {
    expect(buildDayFacts(busy, true, fmt)[2].title).toBe("2 still open");
    const cleared = { ...busy, dueOpen: 0 };
    expect(buildDayFacts(cleared, true, fmt)[2].title).toBe("All caught up");
    expect(buildDayFacts(cleared, false, fmt)[2].title).toBe("Nothing slipped");
  });

  it("names more than three lists as 'more'", () => {
    const facts = buildDayFacts(
      {
        ...quiet,
        doneByList: ["A", "B", "C", "D", "E"].map((list) => ({ list, count: 1 })),
      },
      false,
      fmt,
    );
    expect(facts[0].detail).toBe("A 1 · B 1 · C 1 · 2 more");
  });

  it("only says 'mostly' when one category is at least half the day", () => {
    const spread = buildDayFacts(
      {
        ...quiet,
        expenses: [
          { category: "Fuel", label: null, amountMinor: 300 },
          { category: "Groceries", label: null, amountMinor: 400 },
          { category: "Health", label: null, amountMinor: 350 },
        ],
      },
      false,
      fmt,
    );
    expect(spread[1].detail).toBe("");
    const single = buildDayFacts(
      { ...quiet, expenses: [{ category: "Fuel", label: null, amountMinor: 300 }] },
      false,
      fmt,
    );
    expect(single[1].detail).toBe("Fuel");
  });

  it("lists income and EMIs after an investment, or leads with them", () => {
    const facts = buildDayFacts(
      { ...quiet, incomeMinor: 5_000_000, emiMinor: 1_200_000 },
      false,
      fmt,
    );
    expect(facts[3]).toMatchObject({ title: "₹50,000 came in", detail: "₹12,000 EMI due" });
  });

  it("compares with the usual day within a quarter either way", () => {
    expect(compareToUsual(100, 0)).toBeNull();
    expect(compareToUsual(70, 100)).toBe("below");
    expect(compareToUsual(80, 100)).toBe("about");
    expect(compareToUsual(125, 100)).toBe("about");
    expect(compareToUsual(130, 100)).toBe("above");
  });

  it("drops .00 from whole amounts only", () => {
    expect(shortMoney(124_000, fmt)).toBe("₹1,240");
    expect(shortMoney(9_950, fmt)).toBe("₹99.50");
  });
});

describe("journal calendar", () => {
  it("lays November 2026 out from Monday (the 1st is a Sunday)", () => {
    const grid = monthGrid({ year: 2026, month: 11 }, 1);
    expect(grid.leading).toBe(6);
    expect(grid.days).toHaveLength(30);
    expect(grid.days[0]).toBe("2026-11-01");
    expect(grid.days[29]).toBe("2026-11-30");
    expect(monthGrid({ year: 2026, month: 11 }, 7).leading).toBe(0);
    expect(weekdayInitials(7)).toEqual(["S", "M", "T", "W", "T", "F", "S"]);
  });

  it("knows month lengths, leap years and year ends", () => {
    expect(daysInMonth({ year: 2028, month: 2 })).toBe(29);
    expect(daysInMonth({ year: 2026, month: 2 })).toBe(28);
    expect(monthEnd({ year: 2026, month: 4 })).toBe("2026-04-30");
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });

  it("reads the day from the URL, falling back to today, never the future", () => {
    expect(journalDay("2026-11-02", "2026-11-12")).toBe("2026-11-02");
    expect(journalDay(undefined, "2026-11-12")).toBe("2026-11-12");
    expect(journalDay("2026-11-13", "2026-11-12")).toBe("2026-11-12");
    expect(journalDay("2026-02-30", "2026-11-12")).toBe("2026-11-12");
    expect(journalDay(["2026-11-01", "x"], "2026-11-12")).toBe("2026-11-01");
  });
});

describe("journal input", () => {
  it("accepts a page with an optional mood from 1 to 5", () => {
    const ok = (mood: unknown) =>
      saveJournalSchema.safeParse({ date: "2026-11-12", body: "Hi", mood }).success;
    expect(ok(null)).toBe(true);
    expect(ok(4)).toBe(true);
    expect(ok(0)).toBe(false);
    expect(ok(6)).toBe(false);
    expect(ok(2.5)).toBe(false);
    expect(
      saveJournalSchema.safeParse({ date: "2026-11-12", body: "x".repeat(20_001), mood: null })
        .success,
    ).toBe(false);
  });
});
