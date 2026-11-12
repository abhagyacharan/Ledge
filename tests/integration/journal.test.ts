import { beforeEach, describe, expect, it } from "vitest";
import { createEntry, trashEntry, type EntryInput } from "@/server/data/finance";
import {
  getDayFactsInput,
  getJournalDates,
  getJournalEntry,
  saveJournalEntry,
  USUAL_SPEND_DAYS,
} from "@/server/data/journal";
import { db } from "@/server/db/client";
import { financeEntries, journalEntries } from "@/server/db/schema";
import { dbError, makeList, makeTask, PG } from "../helpers/data";
import { createUser, resetAuthData, type TestUser } from "../helpers/fast-users";

let a: TestUser;
let b: TestUser;

beforeEach(async () => {
  process.env.ALLOW_SIGNUP = "true";
  await resetAuthData();
  a = await createUser("a@example.com", "A");
  b = await createUser("b@example.com", "B");
});

const TZ = "Asia/Kolkata";
const DAY = "2026-11-12";

const expense = (over: Partial<EntryInput> = {}): EntryInput => ({
  kind: "expense",
  entryDate: DAY,
  title: "Lunch",
  category: "Eating out",
  amountMinor: 50_000,
  paymentMethod: "UPI",
  ...over,
});

describe("journal pages", () => {
  it("keeps one page per day: a second save edits the same page", async () => {
    await saveJournalEntry(a.id, DAY, { body: "Morning", mood: null });
    await saveJournalEntry(a.id, DAY, { body: "Morning\nEvening", mood: 4 });
    const rows = await db.select().from(journalEntries);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ body: "Morning\nEvening", mood: 4, entryDate: DAY });
  });

  it("removes a page once it has no words and no mood", async () => {
    await saveJournalEntry(a.id, DAY, { body: "Hi", mood: 3 });
    expect(await saveJournalEntry(a.id, DAY, { body: "   ", mood: null })).toBeNull();
    expect(await getJournalEntry(a.id, DAY)).toBeNull();
    // A mood alone is still a page.
    await saveJournalEntry(a.id, DAY, { body: "", mood: 2 });
    expect((await getJournalEntry(a.id, DAY))?.mood).toBe(2);
  });

  it("lists the days with a page in a range, for the calendar dots", async () => {
    await saveJournalEntry(a.id, "2026-11-02", { body: "a", mood: null });
    await saveJournalEntry(a.id, "2026-11-12", { body: "b", mood: null });
    await saveJournalEntry(a.id, "2026-12-01", { body: "c", mood: null });
    expect(await getJournalDates(a.id, "2026-11-01", "2026-11-30")).toEqual([
      "2026-11-02",
      "2026-11-12",
    ]);
  });

  it("is private: another user can neither read, list nor overwrite your page", async () => {
    await saveJournalEntry(a.id, DAY, { body: "A's secret", mood: 5 });
    expect(await getJournalEntry(b.id, DAY)).toBeNull();
    expect(await getJournalDates(b.id, "2026-11-01", "2026-11-30")).toEqual([]);
    // B writing the same day makes B's own page; A's is untouched.
    await saveJournalEntry(b.id, DAY, { body: "B's page", mood: null });
    expect((await getJournalEntry(a.id, DAY))?.body).toBe("A's secret");
    // B clearing their page does not remove A's.
    await saveJournalEntry(b.id, DAY, { body: "", mood: null });
    expect((await getJournalEntry(a.id, DAY))?.body).toBe("A's secret");
  });

  it("rejects a mood outside 1 to 5 in the database itself", async () => {
    const error = await dbError(
      db.insert(journalEntries).values({ userId: a.id, entryDate: DAY, body: "x", mood: 9 }),
    );
    expect(error.code).toBe(PG.checkViolation);
  });
});

describe("need or want label", () => {
  it("is stored on expenses and cleared on every other kind", async () => {
    const row = await createEntry(a.id, expense({ spendLabel: "want" }));
    expect(row.spendLabel).toBe("want");
    const income = await createEntry(a.id, {
      kind: "income",
      entryDate: DAY,
      title: "Salary",
      category: "Salary",
      amountMinor: 100,
      spendLabel: "need",
    });
    expect(income.spendLabel).toBeNull();
    const error = await dbError(
      db.insert(financeEntries).values({
        userId: a.id,
        kind: "income",
        entryDate: DAY,
        title: "x",
        category: "Salary",
        amountMinor: 1,
        spendLabel: "want",
      }),
    );
    expect(error.code).toBe(PG.checkViolation);
  });
});

describe("day facts", () => {
  it("counts the day's finished tasks by the user's timezone, per list", async () => {
    const list = await makeList(a.id, "Freelance");
    // 23:30 IST on the 12th is 18:00 UTC on the 12th; 00:30 IST on the 13th is 19:00 UTC on the 12th.
    await makeTask(a.id, list.id, "Late", {
      status: "done",
      completedAt: new Date("2026-11-12T18:00:00Z"),
    });
    await makeTask(a.id, list.id, "Next day", {
      status: "done",
      completedAt: new Date("2026-11-12T19:00:00Z"),
    });
    await makeTask(a.id, list.id, "Due, open", { dueDate: DAY });
    await makeTask(a.id, list.id, "Due, done", {
      dueDate: DAY,
      status: "done",
      completedAt: new Date("2026-11-10T05:00:00Z"),
    });
    await makeTask(a.id, list.id, "Trashed", { dueDate: DAY, deletedAt: new Date() });

    const facts = await getDayFactsInput(a.id, DAY, TZ);
    expect(facts.doneByList).toEqual([{ list: "Freelance", count: 1 }]);
    expect(facts.dueTotal).toBe(2);
    expect(facts.dueOpen).toBe(1);
  });

  it("adds up the day's money and the usual day before it", async () => {
    await createEntry(a.id, expense({ amountMinor: 90_000, spendLabel: "want" }));
    await createEntry(a.id, expense({ amountMinor: 30_000, category: "Groceries" }));
    await createEntry(a.id, expense({ entryDate: "2026-11-01", amountMinor: 300_000 }));
    // Outside the window: neither the day itself nor the usual.
    await createEntry(a.id, expense({ entryDate: "2026-09-01", amountMinor: 999_999 }));
    await createEntry(a.id, {
      kind: "investment",
      entryDate: DAY,
      title: "SIP",
      category: "Mutual fund",
      amountMinor: 500_000,
    });
    const trashed = await createEntry(a.id, expense({ amountMinor: 1 }));
    await trashEntry(a.id, trashed.id);
    // Another user's spending never counts.
    await createEntry(b.id, expense({ amountMinor: 777 }));

    const facts = await getDayFactsInput(a.id, DAY, TZ);
    expect(facts.expenses.reduce((s, e) => s + e.amountMinor, 0)).toBe(120_000);
    expect(facts.expenses.find((e) => e.label === "want")?.amountMinor).toBe(90_000);
    expect(facts.investedMinor).toBe(500_000);
    expect(facts.incomeMinor).toBe(0);
    expect(facts.usualDailySpendMinor).toBe(Math.round(300_000 / USUAL_SPEND_DAYS));
  });
});
