/**
 * Development seed: a demo user with realistic lists, subtasks, overdue,
 * recurring, completed and trashed tasks, so every view can be checked quickly.
 *
 * Run with `pnpm db:seed`. REFUSES to run when NODE_ENV=production.
 * Re-running replaces the demo user and everything it owns.
 */
import { config } from "dotenv";

const DEMO_EMAIL = "demo@ledge.test";
const DEMO_PASSWORD = "demo-password-123"; // dev-only demo account, never used in production
const TIMEZONE = "Asia/Kolkata";

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to seed: NODE_ENV is production.");
    process.exit(1);
  }

  config({ path: ".env", quiet: true });
  // Sign-ups may be closed in .env; the seed needs one account, for this process only.
  process.env.ALLOW_SIGNUP = "true";

  // Imported after the checks above so nothing touches the database in production.
  const { eq } = await import("drizzle-orm");
  const { generateNKeysBetween } = await import("fractional-indexing");
  const { auth } = await import("@/server/auth");
  const { db } = await import("@/server/db/client");
  const { financeEntries, lists, tasks, user } = await import("@/server/db/schema");

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date());
  const day = (offset: number): string => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  const ago = (days: number, hour = 10): Date => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - days);
    d.setUTCHours(hour, 0, 0, 0);
    return d;
  };
  const keys = (n: number) => generateNKeysBetween(null, null, n);

  // Start clean: removing the demo user cascades to everything it owns.
  await db.delete(user).where(eq(user.email, DEMO_EMAIL));

  const created = await auth.api.signUpEmail({
    body: { email: DEMO_EMAIL, password: DEMO_PASSWORD, name: "Demo User" },
  });
  const userId = created.user.id;

  // The sign-up hook already created settings and the default list, General (the inbox).
  const [inbox] = await db.select().from(lists).where(eq(lists.userId, userId));
  if (!inbox?.isInbox) throw new Error("Expected the sign-up hook to create General");

  // Lists (General sorts first; new keys go after it).
  const listSpecs = [
    { name: "Home", icon: "house", color: "#f59e0b", description: "Around the house" },
    {
      name: "Work",
      icon: "briefcase",
      color: "#3b82f6",
      description: "Day job",
    },
    {
      name: "Open source",
      icon: "sprout",
      color: "#10b981",
      description: "Goal: become a regular maintainer",
      targetDate: day(60),
    },
    {
      name: "Freelance",
      icon: "receipt",
      color: "#8b5cf6",
      description: "Goal: three steady clients",
      targetDate: day(30),
    },
  ];
  const listKeys = keys(listSpecs.length + 1).slice(1); // slot 0 belongs to General
  const insertedLists = await db
    .insert(lists)
    .values(listSpecs.map((l, i) => ({ ...l, userId, position: listKeys[i] })))
    .returning();
  const byName = Object.fromEntries(insertedLists.map((l) => [l.name, l]));
  const home = byName["Home"];
  const work = byName["Work"];
  const oss = byName["Open source"];
  const freelance = byName["Freelance"];

  type TaskSeed = {
    key: string;
    listId: string;
    title: string;
    parentKey?: string;
    notes?: string;
    priority?: number;
    dueDate?: string;
    dueTime?: string;
    done?: Date;
    rule?: string;
    mode?: "fixed" | "after_completion";
    originKey?: string;
    deletedAt?: Date;
  };

  const seeds: TaskSeed[] = [
    // General
    { key: "dentist", listId: inbox.id, title: "Call the dentist" },
    {
      key: "desk",
      listId: inbox.id,
      title: "Look into a standing desk",
      notes: "Compare 3 options",
    },
    // Home
    {
      key: "rent",
      listId: home.id,
      title: "Pay rent",
      priority: 3,
      dueDate: day(-2),
    },
    {
      key: "groceries",
      listId: home.id,
      title: "Buy groceries",
      dueDate: day(0),
      dueTime: "18:00",
    },
    // Due today with no time: always in the Today block, never overdue (the e2e tests rely on it).
    { key: "callmom", listId: home.id, title: "Call mom", dueDate: day(0) },
    {
      key: "tap",
      listId: home.id,
      title: "Fix the leaking tap",
      priority: 1,
      dueDate: day(3),
    },
    { key: "passport", listId: home.id, title: "Renew passport", priority: 2, dueDate: day(20) },
    { key: "trip", listId: home.id, title: "Plan weekend trip", dueDate: day(6) },
    { key: "train", listId: home.id, title: "Book train", parentKey: "trip", done: ago(1) },
    { key: "hotel", listId: home.id, title: "Book hotel", parentKey: "trip", dueDate: day(2) },
    { key: "pack", listId: home.id, title: "Pack bags", parentKey: "trip" },
    // Work (board)
    {
      key: "proposal",
      listId: work.id,
      title: "Write project proposal",
      priority: 3,
      dueDate: day(0),
      dueTime: "11:00",
    },
    {
      key: "prs",
      listId: work.id,
      title: "Review pull requests",
      priority: 2,
      dueDate: day(-1),
    },
    {
      key: "slides",
      listId: work.id,
      title: "Prepare Q4 slides",
      dueDate: day(5),
    },
    {
      key: "vendor",
      listId: work.id,
      title: "Reply to vendor about the contract",
    },
    { key: "backlog", listId: work.id, title: "Tidy up the backlog" },
    // Open source (a goal)
    {
      key: "triage",
      listId: oss.id,
      title: "Triage new issues",
      dueDate: day(2),
      rule: "FREQ=WEEKLY;BYDAY=MO",
      mode: "fixed",
    },
    {
      key: "guide",
      listId: oss.id,
      title: "Write a contributing guide",
      priority: 2,
      dueDate: day(10),
    },
    {
      key: "guide1",
      listId: oss.id,
      title: "Outline the sections",
      parentKey: "guide",
      done: ago(0, 8),
    },
    { key: "guide2", listId: oss.id, title: "Draft the first version", parentKey: "guide" },
    // Freelance (a goal) with an overdue recurring task and its completed snapshot
    {
      key: "invoice",
      listId: freelance.id,
      title: "Send monthly invoice",
      priority: 3,
      dueDate: day(-5),
      rule: "FREQ=MONTHLY;BYMONTHDAY=1",
      mode: "after_completion",
    },
    {
      key: "invoice-prev",
      listId: freelance.id,
      title: "Send monthly invoice",
      done: ago(35),
      originKey: "invoice",
    },
    {
      key: "pitch",
      listId: freelance.id,
      title: "Draft a pitch for a new client",
      dueDate: day(8),
    },
    // Completed in different days for the Completed view
    { key: "done-today", listId: home.id, title: "Water the plants", done: ago(0, 7) },
    { key: "done-yesterday", listId: work.id, title: "Send weekly update", done: ago(1) },
    { key: "done-earlier", listId: inbox.id, title: "Back up the laptop", done: ago(3) },
    // Trash
    { key: "trashed", listId: inbox.id, title: "Old idea (in Trash)", deletedAt: ago(2) },
  ];

  // Position keys are per (list, parent) group so ordering is independent.
  const groupOf = (s: TaskSeed) => `${s.listId}:${s.parentKey ?? ""}`;
  const counts = new Map<string, number>();
  for (const s of seeds) counts.set(groupOf(s), (counts.get(groupOf(s)) ?? 0) + 1);
  const groupKeys = new Map<string, string[]>();
  for (const [g, n] of counts) groupKeys.set(g, keys(n));
  const used = new Map<string, number>();

  const ids = new Map<string, string>();
  // Parents and origins first, so the rows they point to already exist.
  const ordered = [...seeds].sort(
    (a, b) => Number(!!a.parentKey || !!a.originKey) - Number(!!b.parentKey || !!b.originKey),
  );
  for (const s of ordered) {
    const g = groupOf(s);
    const i = used.get(g) ?? 0;
    used.set(g, i + 1);
    const [row] = await db
      .insert(tasks)
      .values({
        userId,
        listId: s.listId,
        parentId: s.parentKey ? ids.get(s.parentKey) : null,
        title: s.title,
        notes: s.notes ?? null,
        status: s.done ? "done" : "open",
        completedAt: s.done ?? null,
        priority: s.priority ?? 0,
        dueDate: s.dueDate ?? null,
        dueTime: s.dueTime ?? null,
        recurrenceRule: s.rule ?? null,
        recurrenceMode: s.mode ?? "fixed",
        recurrenceOriginId: s.originKey ? ids.get(s.originKey) : null,
        deletedAt: s.deletedAt ?? null,
        position: groupKeys.get(g)![i], // non-null: every group was sized from `seeds` above
      })
      .returning({ id: tasks.id });
    ids.set(s.key, row.id);
  }

  // Money entries. The current month matches the sample sheet: inflows 28,000.00, EMIs and loans
  // 10,142.00, living expenses 4,600.00 (so net savings 13,258.00 and a savings rate of 47.4%).
  // Earlier months of the same year get plausible numbers so the annual trend is not empty.
  const year = Number(today.slice(0, 4));
  const thisMonth = Number(today.slice(5, 7));
  const on = (month: number, dom: number) =>
    `${year}-${String(month).padStart(2, "0")}-${String(dom).padStart(2, "0")}`;
  type Entry = typeof financeEntries.$inferInsert;
  const money: Entry[] = [];
  const add = (e: Omit<Entry, "userId">) => money.push({ userId, ...e });

  add({
    kind: "income",
    entryDate: on(thisMonth, 1),
    title: "Acme Corp salary",
    category: "Salary",
    amountMinor: 2_500_000,
  });
  add({
    kind: "income",
    entryDate: on(thisMonth, 15),
    title: "Quarterly bonus",
    category: "Bonus",
    amountMinor: 300_000,
    notes: "Q3 performance bonus",
  });
  add({
    kind: "emi",
    entryDate: on(thisMonth, 5),
    title: "Home loan",
    category: "Home loan",
    lender: "HDFC Bank",
    emiType: "Fixed EMI",
    amountMinor: 650_000,
    status: "paid",
    paidOn: on(thisMonth, 5),
  });
  add({
    kind: "emi",
    entryDate: on(thisMonth, 10),
    title: "Car loan",
    category: "Vehicle loan",
    lender: "SBI",
    emiType: "Fixed EMI",
    amountMinor: 264_200,
    status: "paid",
    paidOn: on(thisMonth, 10),
  });
  add({
    kind: "emi",
    entryDate: on(thisMonth, 28),
    title: "Credit card bill",
    category: "Credit card",
    lender: "ICICI Bank",
    emiType: "Credit card bill",
    amountMinor: 100_000,
    status: "scheduled",
  });
  add({
    kind: "expense",
    entryDate: on(thisMonth, 3),
    title: "Metro pass and cabs",
    category: "Transportation",
    paymentMethod: "UPI",
    spendLabel: "need",
    amountMinor: 400_000,
  });
  add({
    kind: "expense",
    entryDate: on(thisMonth, 7),
    title: "Netflix and iCloud",
    category: "Subscriptions & Tech",
    paymentMethod: "Credit card",
    spendLabel: "want",
    amountMinor: 60_000,
    notes: "Monthly plans",
  });
  add({
    kind: "investment",
    entryDate: on(thisMonth, 6),
    title: "Index fund SIP",
    category: "Mutual fund",
    platform: "Groww",
    amountMinor: 500_000,
  });

  for (let m = 1; m < thisMonth; m++) {
    add({
      kind: "income",
      entryDate: on(m, 1),
      title: "Acme Corp salary",
      category: "Salary",
      amountMinor: 2_500_000,
    });
    if (m % 3 === 0) {
      add({
        kind: "income",
        entryDate: on(m, 20),
        title: "Freelance project",
        category: "Freelance",
        amountMinor: 400_000 + m * 10_000,
      });
    }
    add({
      kind: "emi",
      entryDate: on(m, 5),
      title: "Home loan",
      category: "Home loan",
      lender: "HDFC Bank",
      emiType: "Fixed EMI",
      amountMinor: 650_000,
      status: "paid",
      paidOn: on(m, 5),
    });
    add({
      kind: "emi",
      entryDate: on(m, 10),
      title: "Car loan",
      category: "Vehicle loan",
      lender: "SBI",
      emiType: "Fixed EMI",
      amountMinor: 264_200,
      status: "paid",
      paidOn: on(m, 11),
    });
    add({
      kind: "expense",
      entryDate: on(m, 4),
      title: "Groceries",
      category: "Food & Groceries",
      paymentMethod: "UPI",
      spendLabel: "need",
      amountMinor: 600_000 + m * 15_000,
    });
    add({
      kind: "expense",
      entryDate: on(m, 12),
      title: "Electricity and internet",
      category: "Housing & Utilities",
      paymentMethod: "Net banking",
      amountMinor: 220_000,
    });
    add({
      kind: "expense",
      entryDate: on(m, 18),
      title: "Dinner out",
      category: "Dining & Entertainment",
      paymentMethod: "Credit card",
      spendLabel: "want",
      amountMinor: 180_000 + (m % 4) * 20_000,
    });
    add({
      kind: "investment",
      entryDate: on(m, 6),
      title: "Index fund SIP",
      category: "Mutual fund",
      platform: "Groww",
      amountMinor: 500_000,
    });
  }
  await db.insert(financeEntries).values(money);

  console.log(`Seeded demo user ${DEMO_EMAIL} (password: ${DEMO_PASSWORD})`);
  console.log(
    `  ${insertedLists.length + 1} lists, ${seeds.length} tasks, ${money.length} money entries`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
