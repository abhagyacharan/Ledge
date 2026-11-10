import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import {
  categoryTotals,
  createEmiSeries,
  createEntry,
  emiStatusTotals,
  getEntry,
  listEntries,
  markEmiPaid,
  monthlyTotals,
  paymentMethodTotals,
  restoreEntry,
  trashEntry,
  updateEntry,
  type EntryFilters,
  type EntryInput,
} from "@/server/data/finance";
import {
  deleteTrashedEntryForever,
  emptyTrash,
  listTrash,
  purgeExpiredTrash,
} from "@/server/data/trash";
import { db } from "@/server/db/client";
import { financeEntries } from "@/server/db/schema";
import { dbError, PG } from "../helpers/data";
import { createUser, resetAuthData, type TestUser } from "../helpers/fast-users";

let a: TestUser;
let b: TestUser;

beforeEach(async () => {
  process.env.ALLOW_SIGNUP = "true";
  await resetAuthData();
  a = await createUser("a@example.com", "A");
  b = await createUser("b@example.com", "B");
});

const ALL: EntryFilters = { sort: "newest", category: null, q: "" };
const NOV = { from: "2026-11-01", to: "2026-11-30" };
const YEAR = { from: "2026-01-01", to: "2026-12-31" };

const income = (over: Partial<EntryInput> = {}): EntryInput => ({
  kind: "income",
  entryDate: "2026-11-01",
  title: "Salary",
  category: "Salary",
  amountMinor: 2_500_000,
  ...over,
});
const expense = (over: Partial<EntryInput> = {}): EntryInput => ({
  kind: "expense",
  entryDate: "2026-11-02",
  title: "Cab",
  category: "Transportation",
  paymentMethod: "UPI",
  amountMinor: 400_000,
  ...over,
});
const emi = (over: Partial<EntryInput> = {}): EntryInput => ({
  kind: "emi",
  entryDate: "2026-11-05",
  title: "Home loan",
  category: "Home loan",
  lender: "HDFC",
  emiType: "Fixed EMI",
  status: "scheduled",
  amountMinor: 814_200,
  ...over,
});
const investment = (over: Partial<EntryInput> = {}): EntryInput => ({
  kind: "investment",
  entryDate: "2026-11-03",
  title: "Index fund",
  category: "Mutual fund",
  platform: "Groww",
  amountMinor: 500_000,
  ...over,
});

describe("creating entries", () => {
  it("stores each kind with only its own columns", async () => {
    const i = await createEntry(a.id, income({ notes: "November" }));
    const e = await createEntry(a.id, expense());
    const m = await createEntry(a.id, emi());
    const v = await createEntry(a.id, investment());
    expect(i).toMatchObject({
      kind: "income",
      notes: "November",
      paymentMethod: null,
      status: null,
    });
    expect(e).toMatchObject({
      kind: "expense",
      paymentMethod: "UPI",
      lender: null,
      platform: null,
    });
    expect(m).toMatchObject({
      kind: "emi",
      lender: "HDFC",
      emiType: "Fixed EMI",
      status: "scheduled",
    });
    expect(v).toMatchObject({ kind: "investment", platform: "Groww", paymentMethod: null });
  });

  it("clears columns that do not belong to the kind, even if they are passed", async () => {
    const sneaky = await createEntry(a.id, {
      ...income(),
      paymentMethod: "UPI",
      lender: "X",
      status: "paid",
      paidOn: "2026-11-01",
      platform: "Y",
    });
    expect(sneaky).toMatchObject({
      paymentMethod: null,
      lender: null,
      status: null,
      paidOn: null,
      platform: null,
    });
  });

  it("keeps amounts as exact integer paise", async () => {
    const e = await createEntry(a.id, expense({ amountMinor: 1999 }));
    expect(e.amountMinor).toBe(1999);
    expect(typeof e.amountMinor).toBe("number");
    const big = await createEntry(a.id, income({ amountMinor: 99_999_999_999 }));
    expect(big.amountMinor).toBe(99_999_999_999);
  });

  it("an EMI starts as scheduled with no paid-on date unless it is paid", async () => {
    const scheduled = await createEntry(a.id, emi({ status: undefined, paidOn: "2026-11-05" }));
    expect(scheduled).toMatchObject({ status: "scheduled", paidOn: null });
    const paid = await createEntry(a.id, emi({ status: "paid", paidOn: "2026-11-04" }));
    expect(paid).toMatchObject({ status: "paid", paidOn: "2026-11-04" });
  });
});

describe("the database refuses malformed rows", () => {
  const base = {
    userId: "",
    kind: "income" as const,
    entryDate: "2026-11-01",
    title: "t",
    category: "c",
    amountMinor: 100,
  };

  it.each([
    ["a zero amount", { amountMinor: 0 }],
    ["a negative amount", { amountMinor: -5 }],
    ["an amount above the limit", { amountMinor: 100_000_000_001 }],
    ["an empty title", { title: "" }],
    ["a title over 200 characters", { title: "x".repeat(201) }],
    ["an empty category", { category: "" }],
    ["notes over 1000 characters", { notes: "x".repeat(1001) }],
    ["a payment method on income", { paymentMethod: "UPI" }],
    ["a lender on income", { lender: "HDFC" }],
    ["a status on income", { status: "paid" as const }],
    ["a platform on income", { platform: "Groww" }],
    ["an unknown kind", { kind: "gift" as never }],
  ])("rejects %s", async (_label, over) => {
    const error = await dbError(
      db.insert(financeEntries).values({ ...base, userId: a.id, ...over }),
    );
    expect(error.code).toBe(PG.checkViolation);
  });

  it("rejects an EMI without a status, and a paid-on date on an unpaid EMI", async () => {
    const noStatus = await dbError(
      db.insert(financeEntries).values({ ...base, userId: a.id, kind: "emi" }),
    );
    const paidOnUnpaid = await dbError(
      db.insert(financeEntries).values({
        ...base,
        userId: a.id,
        kind: "emi",
        status: "scheduled",
        paidOn: "2026-11-01",
      }),
    );
    expect(noStatus.code).toBe(PG.checkViolation);
    expect(paidOnUnpaid.code).toBe(PG.checkViolation);
  });

  it("rejects a payment method on a non-expense and a platform on a non-investment", async () => {
    const m = await dbError(
      db
        .insert(financeEntries)
        .values({ ...base, userId: a.id, kind: "investment", paymentMethod: "UPI" }),
    );
    const p = await dbError(
      db.insert(financeEntries).values({ ...base, userId: a.id, kind: "expense", platform: "x" }),
    );
    expect(m.code).toBe(PG.checkViolation);
    expect(p.code).toBe(PG.checkViolation);
  });

  it("removes a user's entries when the user is deleted", async () => {
    await createEntry(a.id, income());
    await resetAuthData();
    expect(await db.select().from(financeEntries)).toHaveLength(0);
  });
});

describe("updating entries", () => {
  it("changes fields and clears the paid-on date when an EMI stops being paid", async () => {
    const created = await createEntry(a.id, emi({ status: "paid", paidOn: "2026-11-04" }));
    const reopened = await updateEntry(
      a.id,
      created.id,
      emi({ status: "delayed", amountMinor: 900_000 }),
    );
    expect(reopened).toMatchObject({ status: "delayed", paidOn: null, amountMinor: 900_000 });
  });

  it("refuses to change an entry into another kind", async () => {
    const created = await createEntry(a.id, income());
    expect(await updateEntry(a.id, created.id, expense())).toBeNull();
    expect((await getEntry(a.id, created.id))?.kind).toBe("income");
  });

  it("marks an EMI paid, and only an EMI", async () => {
    const m = await createEntry(a.id, emi());
    const paid = await markEmiPaid(a.id, m.id, "2026-11-06");
    expect(paid).toMatchObject({ status: "paid", paidOn: "2026-11-06" });
    const i = await createEntry(a.id, income());
    expect(await markEmiPaid(a.id, i.id, "2026-11-06")).toBeNull();
  });
});

describe("repeating an EMI monthly", () => {
  it("creates the series as Scheduled, counting from the first date", async () => {
    const rows = await createEmiSeries(
      a.id,
      emi({ entryDate: "2026-11-30", status: "paid", paidOn: "2026-11-30" }),
      3,
    );
    expect(rows.map((r) => r.entryDate)).toEqual([
      "2026-11-30",
      "2026-12-30",
      "2027-01-30",
      "2027-02-28",
    ]);
    expect(rows.map((r) => r.status)).toEqual(["paid", "scheduled", "scheduled", "scheduled"]);
    expect(rows.map((r) => r.paidOn)).toEqual(["2026-11-30", null, null, null]);
  });

  it("creates just one when there are no extra months", async () => {
    expect(await createEmiSeries(a.id, emi(), 0)).toHaveLength(1);
  });
});

describe("listing entries", () => {
  it("returns one kind in a period, newest first by default", async () => {
    await createEntry(a.id, expense({ entryDate: "2026-11-02", title: "older" }));
    await createEntry(a.id, expense({ entryDate: "2026-11-20", title: "newer" }));
    await createEntry(a.id, expense({ entryDate: "2026-12-01", title: "next month" }));
    await createEntry(a.id, income({ entryDate: "2026-11-10" }));
    const rows = await listEntries(a.id, "expense", NOV, ALL);
    expect(rows.map((r) => r.title)).toEqual(["newer", "older"]);
  });

  it("includes the first and last day of the period", async () => {
    await createEntry(a.id, expense({ entryDate: "2026-11-01", title: "first" }));
    await createEntry(a.id, expense({ entryDate: "2026-11-30", title: "last" }));
    await createEntry(a.id, expense({ entryDate: "2026-10-31", title: "before" }));
    await createEntry(a.id, expense({ entryDate: "2026-12-01", title: "after" }));
    expect((await listEntries(a.id, "expense", NOV, ALL)).map((r) => r.title).sort()).toEqual([
      "first",
      "last",
    ]);
  });

  it("sorts by date or amount", async () => {
    await createEntry(a.id, expense({ title: "mid", amountMinor: 200, entryDate: "2026-11-05" }));
    await createEntry(a.id, expense({ title: "big", amountMinor: 900, entryDate: "2026-11-01" }));
    await createEntry(a.id, expense({ title: "small", amountMinor: 100, entryDate: "2026-11-09" }));
    const titles = async (sort: EntryFilters["sort"]) =>
      (await listEntries(a.id, "expense", NOV, { ...ALL, sort })).map((r) => r.title);
    expect(await titles("newest")).toEqual(["small", "mid", "big"]);
    expect(await titles("oldest")).toEqual(["big", "mid", "small"]);
    expect(await titles("highest")).toEqual(["big", "mid", "small"]);
    expect(await titles("lowest")).toEqual(["small", "mid", "big"]);
  });

  it("filters by category and searches title, notes, lender and platform", async () => {
    await createEntry(a.id, expense({ title: "Cab ride", category: "Transportation" }));
    await createEntry(
      a.id,
      expense({ title: "Netflix", category: "Subscriptions & Tech", notes: "monthly plan" }),
    );
    expect(
      (await listEntries(a.id, "expense", NOV, { ...ALL, category: "Transportation" })).map(
        (r) => r.title,
      ),
    ).toEqual(["Cab ride"]);
    expect(
      (await listEntries(a.id, "expense", NOV, { ...ALL, q: "CAB" })).map((r) => r.title),
    ).toEqual(["Cab ride"]);
    expect(
      (await listEntries(a.id, "expense", NOV, { ...ALL, q: "monthly" })).map((r) => r.title),
    ).toEqual(["Netflix"]);
    await createEntry(a.id, emi({ lender: "State Bank" }));
    expect(await listEntries(a.id, "emi", NOV, { ...ALL, q: "state bank" })).toHaveLength(1);
    await createEntry(a.id, investment({ platform: "Zerodha" }));
    expect(await listEntries(a.id, "investment", NOV, { ...ALL, q: "zerodha" })).toHaveLength(1);
  });

  it("treats % and _ in a search as plain characters", async () => {
    await createEntry(a.id, expense({ title: "50% off sale" }));
    await createEntry(a.id, expense({ title: "plain" }));
    expect(
      (await listEntries(a.id, "expense", NOV, { ...ALL, q: "50%" })).map((r) => r.title),
    ).toEqual(["50% off sale"]);
    expect(await listEntries(a.id, "expense", NOV, { ...ALL, q: "%" })).toHaveLength(1);
    expect(await listEntries(a.id, "expense", NOV, { ...ALL, q: "_" })).toHaveLength(0);
  });
});

describe("totals", () => {
  async function seedNovember() {
    await createEntry(a.id, income({ amountMinor: 2_500_000 }));
    await createEntry(
      a.id,
      income({ title: "Bonus", category: "Bonus", amountMinor: 300_000, entryDate: "2026-11-15" }),
    );
    await createEntry(a.id, emi({ amountMinor: 814_200, status: "paid", paidOn: "2026-11-05" }));
    await createEntry(a.id, emi({ title: "Car", category: "Vehicle loan", amountMinor: 200_000 }));
    await createEntry(
      a.id,
      emi({ title: "Card", category: "Credit card", amountMinor: 0 + 1, status: "delayed" }),
    );
    await createEntry(a.id, expense({ amountMinor: 400_000 }));
    await createEntry(
      a.id,
      expense({
        title: "Netflix",
        category: "Subscriptions & Tech",
        paymentMethod: "Credit card",
        amountMinor: 60_000,
      }),
    );
    await createEntry(a.id, investment({ amountMinor: 500_000 }));
  }

  it("sums each kind per month for the year", async () => {
    await seedNovember();
    await createEntry(a.id, income({ entryDate: "2026-03-10", amountMinor: 100 }));
    await createEntry(a.id, income({ entryDate: "2025-12-31", amountMinor: 999 })); // another year
    const year = await monthlyTotals(a.id, 2026);
    const nov = year.find((m) => m.month === 11);
    expect(nov).toEqual({
      month: 11,
      income: 2_800_000,
      emi: 1_014_201,
      expense: 460_000,
      investment: 500_000,
    });
    expect(year.find((m) => m.month === 3)).toMatchObject({ income: 100, emi: 0 });
    expect(year.find((m) => m.month === 12)).toBeUndefined();
  });

  it("totals expenses by category, and by payment method", async () => {
    await seedNovember();
    const byCategory = await categoryTotals(a.id, "expense", NOV);
    expect(byCategory.sort((x, y) => y.amountMinor - x.amountMinor)).toEqual([
      { category: "Transportation", amountMinor: 400_000, count: 1 },
      { category: "Subscriptions & Tech", amountMinor: 60_000, count: 1 },
    ]);
    expect(await paymentMethodTotals(a.id, NOV)).toEqual([
      { method: "UPI", amountMinor: 400_000, count: 1 },
      { method: "Credit card", amountMinor: 60_000, count: 1 },
    ]);
    expect(await categoryTotals(a.id, "expense", { from: "2026-10-01", to: "2026-10-31" })).toEqual(
      [],
    );
  });

  it("totals EMIs by status for the period", async () => {
    await seedNovember();
    const rows = await emiStatusTotals(a.id, NOV);
    const by = Object.fromEntries(rows.map((r) => [r.status, r]));
    expect(by.paid).toMatchObject({ amountMinor: 814_200, count: 1 });
    expect(by.scheduled).toMatchObject({ amountMinor: 200_000, count: 1 });
    expect(by.delayed).toMatchObject({ amountMinor: 1, count: 1 });
  });

  it("leaves out entries in Trash, and brings them back on restore", async () => {
    const e = await createEntry(a.id, expense({ amountMinor: 700 }));
    expect((await monthlyTotals(a.id, 2026))[0].expense).toBe(700);
    await trashEntry(a.id, e.id);
    expect(await monthlyTotals(a.id, 2026)).toEqual([]);
    expect(await listEntries(a.id, "expense", YEAR, ALL)).toEqual([]);
    expect(await getEntry(a.id, e.id)).toBeNull();
    await restoreEntry(a.id, e.id);
    expect((await monthlyTotals(a.id, 2026))[0].expense).toBe(700);
  });

  it("never counts another user's entries", async () => {
    await createEntry(b.id, income({ amountMinor: 123 }));
    await createEntry(b.id, expense({ amountMinor: 456 }));
    expect(await monthlyTotals(a.id, 2026)).toEqual([]);
    expect(await categoryTotals(a.id, "expense", YEAR)).toEqual([]);
    expect(await paymentMethodTotals(a.id, YEAR)).toEqual([]);
    expect(await emiStatusTotals(a.id, YEAR)).toEqual([]);
  });
});

describe("Trash for entries", () => {
  it("appears in the Trash listing, and restores", async () => {
    const e = await createEntry(a.id, expense({ title: "Oops" }));
    await trashEntry(a.id, e.id);
    expect((await listTrash(a.id)).entries.map((x) => x.title)).toEqual(["Oops"]);
    expect(await restoreEntry(a.id, e.id)).toBe(true);
    expect((await listTrash(a.id)).entries).toEqual([]);
  });

  it("can be erased for good, but only from the Trash", async () => {
    const live = await createEntry(a.id, expense({ title: "live" }));
    const gone = await createEntry(a.id, expense({ title: "gone" }));
    await trashEntry(a.id, gone.id);
    expect(await deleteTrashedEntryForever(a.id, live.id)).toBe(false);
    expect(await deleteTrashedEntryForever(a.id, gone.id)).toBe(true);
    expect(
      await db.select().from(financeEntries).where(eq(financeEntries.userId, a.id)),
    ).toHaveLength(1);
  });

  it("is erased by Empty Trash and by the 30-day clean-up", async () => {
    const old = await createEntry(a.id, expense({ title: "old" }));
    const fresh = await createEntry(a.id, expense({ title: "fresh" }));
    await trashEntry(a.id, old.id);
    await trashEntry(a.id, fresh.id);
    await db
      .update(financeEntries)
      .set({ deletedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) })
      .where(eq(financeEntries.id, old.id));
    expect(await purgeExpiredTrash(a.id)).toEqual({ lists: 0, tasks: 0, entries: 1 });
    expect((await listTrash(a.id)).entries.map((x) => x.title)).toEqual(["fresh"]);
    expect(await emptyTrash(a.id)).toEqual({ lists: 0, tasks: 0, entries: 1 });
  });
});

describe("ownership: user B cannot touch user A's entries", () => {
  it("cannot read, edit, mark paid, trash, restore or erase them", async () => {
    const e = await createEntry(a.id, expense({ title: "mine" }));
    const m = await createEntry(a.id, emi());
    expect(await getEntry(b.id, e.id)).toBeNull();
    expect(await updateEntry(b.id, e.id, expense({ title: "hijacked" }))).toBeNull();
    expect(await markEmiPaid(b.id, m.id, "2026-11-06")).toBeNull();
    expect(await trashEntry(b.id, e.id)).toBe(false);
    await trashEntry(a.id, e.id);
    expect(await restoreEntry(b.id, e.id)).toBe(false);
    expect(await deleteTrashedEntryForever(b.id, e.id)).toBe(false);
    expect((await listTrash(b.id)).entries).toEqual([]);
    const [row] = await db.select().from(financeEntries).where(eq(financeEntries.id, e.id));
    expect(row).toMatchObject({ title: "mine", userId: a.id });
    expect(row.deletedAt).not.toBeNull();
    expect((await getEntry(a.id, m.id))?.status).toBe("scheduled");
  });

  it("sees only their own entries in lists", async () => {
    await createEntry(a.id, expense({ title: "a's" }));
    await createEntry(b.id, expense({ title: "b's" }));
    expect((await listEntries(b.id, "expense", YEAR, ALL)).map((r) => r.title)).toEqual(["b's"]);
  });
});
