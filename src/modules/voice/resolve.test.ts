import { describe, expect, it } from "vitest";
import { resolvePlan, type ResolveContext, unclearPlan } from "./resolve";
import type { ModelAction, PlanItem } from "./schema";

const GENERAL = "11111111-1111-4111-8111-111111111111";
const WORK = "22222222-2222-4222-8222-222222222222";
const BIKE = "33333333-3333-4333-8333-333333333333";
const HOME_LOAN = "44444444-4444-4444-8444-444444444444";

const ctx: ResolveContext = {
  today: "2026-11-15",
  currency: "INR",
  locale: "en-IN",
  lists: [
    { id: GENERAL, name: "General", isInbox: true },
    { id: WORK, name: "Work", isInbox: false },
  ],
  emis: [
    {
      ref: "E1",
      id: BIKE,
      title: "Bike loan",
      category: "Vehicle loan",
      amountMinor: 700000,
      entryDate: "2026-11-10",
    },
    {
      ref: "E2",
      id: HOME_LOAN,
      title: "Home loan",
      category: "Home loan",
      amountMinor: 2500000,
      entryDate: "2026-11-05",
    },
  ],
};

const resolve = (...actions: ModelAction[]) => resolvePlan({ actions }, ctx);

const task = (over: Partial<Extract<ModelAction, { type: "create_task" }>> = {}): ModelAction => ({
  type: "create_task",
  title: "Make blueberry cheesecake",
  list: null,
  listRef: null,
  dueDate: null,
  dueTime: null,
  priority: "none",
  notes: null,
  ...over,
});

const expense = (over: Partial<Extract<ModelAction, { type: "log_entry" }>> = {}): ModelAction => ({
  type: "log_entry",
  kind: "expense",
  amount: "500",
  title: "Petrol",
  category: "Transportation",
  categoryGuessed: true,
  paymentMethod: null,
  spendLabel: "need",
  spendLabelGuessed: true,
  date: "2026-11-15",
  currencyWord: null,
  ...over,
});

function only<T extends PlanItem["type"]>(items: PlanItem[], type: T) {
  return items.filter((i): i is Extract<PlanItem, { type: T }> => i.type === type);
}

describe("resolvePlan: tasks", () => {
  it("puts a task with no list in General", () => {
    const [item] = only(resolve(task()), "task");
    expect(item).toMatchObject({
      title: "Make blueberry cheesecake",
      listId: GENERAL,
      listKey: null,
    });
    expect(item.priority).toBe(0);
  });

  it("matches an existing list by name, ignoring case", () => {
    const [item] = only(resolve(task({ list: "  work " })), "task");
    expect(item.listId).toBe(WORK);
  });

  it("creates a list and puts its tasks in it", () => {
    const items = resolve(
      { type: "create_list", ref: "L1", name: "Photography" },
      task({ title: "Take 5 photos of the sun", listRef: "L1" }),
      task({ title: "Click 10 photos of the moon", listRef: "L1", dueDate: "2026-11-15" }),
    );
    const [list] = only(items, "list");
    expect(list.name).toBe("Photography");
    const tasks = only(items, "task");
    expect(tasks.map((t) => t.listKey)).toEqual([list.key, list.key]);
    expect(tasks.map((t) => t.listId)).toEqual([null, null]);
    expect(tasks[1].dueDate).toBe("2026-11-15");
  });

  it("does not create a list that already exists", () => {
    const items = resolve(
      { type: "create_list", ref: "L1", name: "work" },
      task({ listRef: "L1" }),
    );
    expect(only(items, "list")).toHaveLength(0);
    expect(only(items, "task")[0].listId).toBe(WORK);
  });

  it("turns an unknown spoken list into one new list, shared by its tasks", () => {
    const items = resolve(
      task({ list: "Garden" }),
      task({ title: "Water plants", list: "garden" }),
    );
    expect(only(items, "list")).toHaveLength(1);
    const [first, second] = only(items, "task");
    expect(first.listKey).toBe(second.listKey);
  });

  it("drops dates more than a year away and a time without a usable date gets today", () => {
    const [far] = only(resolve(task({ dueDate: "2031-01-01" })), "task");
    expect(far.dueDate).toBeNull();
    const [timed] = only(resolve(task({ dueTime: "17:00" })), "task");
    expect(timed).toMatchObject({ dueDate: "2026-11-15", dueTime: "17:00" });
    const [bad] = only(resolve(task({ dueDate: "2026-02-30", dueTime: "25:00" })), "task");
    expect(bad).toMatchObject({ dueDate: null, dueTime: null });
  });

  it("maps priority words", () => {
    const [high] = only(resolve(task({ priority: "high" })), "task");
    expect(high.priority).toBe(3);
  });
});

describe("resolvePlan: money", () => {
  it("parses the amount into paise and keeps the model's category", () => {
    const [entry] = only(resolve(expense()), "entry");
    expect(entry).toMatchObject({
      amountMinor: 50000,
      category: "Transportation",
      entryDate: "2026-11-15",
      spendLabel: "need",
      guessed: { category: true, spendLabel: true },
    });
  });

  it("falls back to Miscellaneous for an unknown category and marks it guessed", () => {
    const [entry] = only(resolve(expense({ category: "Fuel", categoryGuessed: false })), "entry");
    expect(entry.category).toBe("Miscellaneous");
    expect(entry.guessed.category).toBe(true);
  });

  it("uses the last payment method, else UPI, when none was said", () => {
    expect(only(resolve(expense()), "entry")[0].paymentMethod).toBe("UPI");
    const withLast = resolvePlan({ actions: [expense()] }, { ...ctx, lastPaymentMethod: "Cash" });
    expect(only(withLast, "entry")[0].paymentMethod).toBe("Cash");
    const said = only(resolve(expense({ paymentMethod: "Credit card" })), "entry")[0];
    expect(said.paymentMethod).toBe("Credit card");
  });

  it("clears expense-only fields on income", () => {
    const [entry] = only(
      resolve(
        expense({ kind: "income", category: "Salary", paymentMethod: "UPI", spendLabel: "need" }),
      ),
      "entry",
    );
    expect(entry).toMatchObject({ kind: "income", paymentMethod: null, spendLabel: null });
  });

  it("flags an unreadable amount, a future date and a foreign currency word", () => {
    const [entry] = only(
      resolve(expense({ amount: "five hundred", date: "2026-11-20", currencyWord: "dollars" })),
      "entry",
    );
    expect(entry.amountMinor).toBe(0);
    expect(entry.hints.join(" | ")).toMatch(/Couldn't read the amount/);
    expect(entry.hints.join(" | ")).toMatch(/future/);
    expect(entry.hints.join(" | ")).toMatch(/Heard "dollars", saved as ₹/);
  });

  it("does not flag rupees", () => {
    const [entry] = only(resolve(expense({ currencyWord: "Rupees" })), "entry");
    expect(entry.hints).toEqual([]);
  });

  it("defaults the date to today", () => {
    const [entry] = only(resolve(expense({ date: null })), "entry");
    expect(entry.entryDate).toBe("2026-11-15");
  });
});

describe("resolvePlan: EMIs", () => {
  it("maps the model's reference to the real EMI", () => {
    const [item] = only(
      resolve({ type: "mark_emi_paid", emi: "E1", amount: "7000", paidOn: null }),
      "emi_paid",
    );
    expect(item).toMatchObject({ emiId: BIKE, paidOn: "2026-11-15", heardAmountMinor: 700000 });
    expect(item.hints).toEqual([]);
  });

  it("asks to pick when the heard amount differs by more than 1%", () => {
    const [item] = only(
      resolve({ type: "mark_emi_paid", emi: "E1", amount: "6500", paidOn: null }),
      "emi_paid",
    );
    expect(item.emiId).toBeNull();
    expect(item.hints[0]).toMatch(/Pick the EMI/);
  });

  it("asks to pick when nothing matched or the reference is made up", () => {
    for (const emi of [null, "E9"]) {
      const [item] = only(
        resolve({ type: "mark_emi_paid", emi, amount: null, paidOn: null }),
        "emi_paid",
      );
      expect(item.emiId).toBeNull();
      expect(item.hints).toContain("Pick which EMI you paid");
    }
  });

  it("explains when there are no unpaid EMIs", () => {
    const items = resolvePlan(
      { actions: [{ type: "mark_emi_paid", emi: "E1", amount: "7000", paidOn: null }] },
      { ...ctx, emis: [] },
    );
    expect(items[0]).toMatchObject({
      type: "unclear",
      reason: "There are no unpaid EMIs to mark paid",
    });
  });
});

describe("resolvePlan: limits and fallbacks", () => {
  it("keeps the first ten actions and says how many were left", () => {
    const items = resolve(...Array.from({ length: 12 }, (_, i) => task({ title: `Task ${i}` })));
    expect(only(items, "task")).toHaveLength(10);
    expect(items.at(-1)).toMatchObject({ type: "unclear", text: "2 more things" });
  });

  it("gives every item its own key", () => {
    const items = resolve(task(), expense(), { type: "unclear", text: "hmm", reason: "" });
    expect(new Set(items.map((i) => i.key)).size).toBe(items.length);
    expect(items[2]).toMatchObject({ type: "unclear", reason: "Not sure what to do with this" });
  });

  it("skips empty titles and names", () => {
    expect(resolve(task({ title: "  " }), { type: "create_list", ref: "L1", name: " " })).toEqual(
      [],
    );
  });

  it("unclearPlan wraps the whole transcript", () => {
    expect(unclearPlan("blah", "why")).toEqual([
      { type: "unclear", key: "v1", text: "blah", reason: "why" },
    ]);
  });
});
