/**
 * Development seed: a demo user with realistic lists, sections, tags, subtasks, overdue,
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
  const { lists, sections, tags, taskTags, tasks, user } = await import("@/server/db/schema");

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

  // The sign-up hook already created settings and the Inbox.
  const [inbox] = await db.select().from(lists).where(eq(lists.userId, userId));
  if (!inbox?.isInbox) throw new Error("Expected the sign-up hook to create the Inbox");

  // Lists (Inbox sorts first; new keys go after it).
  const listSpecs = [
    { name: "Home", icon: "🏠", color: "#f59e0b", description: "Around the house" },
    {
      name: "Work",
      icon: "💼",
      color: "#3b82f6",
      description: "Day job",
      viewMode: "board" as const,
    },
    {
      name: "Open source",
      icon: "🌱",
      color: "#10b981",
      description: "Goal: become a regular maintainer",
      targetDate: day(60),
    },
    {
      name: "Freelance",
      icon: "🧾",
      color: "#8b5cf6",
      description: "Goal: three steady clients",
      targetDate: day(30),
    },
  ];
  const listKeys = keys(listSpecs.length + 1).slice(1); // slot 0 belongs to the Inbox
  const insertedLists = await db
    .insert(lists)
    .values(listSpecs.map((l, i) => ({ ...l, userId, position: listKeys[i] })))
    .returning();
  const byName = Object.fromEntries(insertedLists.map((l) => [l.name, l]));
  const home = byName["Home"];
  const work = byName["Work"];
  const oss = byName["Open source"];
  const freelance = byName["Freelance"];

  // Sections (Work doubles as a board: one column per section).
  const sectionKeys = keys(3);
  const [now, next, later] = await db
    .insert(sections)
    .values(
      ["Now", "Next", "Later"].map((name, i) => ({
        userId,
        listId: work.id,
        name,
        position: sectionKeys[i],
      })),
    )
    .returning();

  // Tags.
  const tagRows = await db
    .insert(tags)
    .values([
      { userId, name: "home", color: "#f59e0b" },
      { userId, name: "bills", color: "#ef4444" },
      { userId, name: "errands", color: "#06b6d4" },
      { userId, name: "deep-work", color: "#6366f1" },
      { userId, name: "waiting", color: "#94a3b8" },
    ])
    .returning();
  const tag = Object.fromEntries(tagRows.map((t) => [t.name, t.id]));

  type TaskSeed = {
    key: string;
    listId: string;
    title: string;
    sectionId?: string;
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
    tags?: string[];
  };

  const seeds: TaskSeed[] = [
    // Inbox
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
      tags: ["bills", "home"],
    },
    {
      key: "groceries",
      listId: home.id,
      title: "Buy groceries",
      dueDate: day(0),
      dueTime: "18:00",
      tags: ["errands"],
    },
    {
      key: "tap",
      listId: home.id,
      title: "Fix the leaking tap",
      priority: 1,
      dueDate: day(3),
      tags: ["home"],
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
      sectionId: now.id,
      title: "Write project proposal",
      priority: 3,
      dueDate: day(0),
      dueTime: "11:00",
      tags: ["deep-work"],
    },
    {
      key: "prs",
      listId: work.id,
      sectionId: now.id,
      title: "Review pull requests",
      priority: 2,
      dueDate: day(-1),
    },
    {
      key: "slides",
      listId: work.id,
      sectionId: next.id,
      title: "Prepare Q4 slides",
      dueDate: day(5),
    },
    {
      key: "vendor",
      listId: work.id,
      sectionId: later.id,
      title: "Reply to vendor about the contract",
      tags: ["waiting"],
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
      tags: ["bills"],
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
        sectionId: s.sectionId ?? null,
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
    for (const name of s.tags ?? []) {
      await db.insert(taskTags).values({ userId, taskId: row.id, tagId: tag[name] });
    }
  }

  console.log(`Seeded demo user ${DEMO_EMAIL} (password: ${DEMO_PASSWORD})`);
  console.log(
    `  ${insertedLists.length + 1} lists, 3 sections, ${tagRows.length} tags, ${seeds.length} tasks`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
