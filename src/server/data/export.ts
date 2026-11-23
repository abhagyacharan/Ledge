import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { toCsv } from "@/lib/csv";
import { db } from "@/server/db/client";
import {
  aiUsage,
  financeEntries,
  journalEntries,
  lists,
  plans,
  tasks,
  userSettings,
} from "@/server/db/schema";

/**
 * Export (CLAUDE.md §6.2, P1): everything a user owns, so they can leave at any time. Every query
 * filters by `userId` (CLAUDE.md §5). Items in Trash are left out.
 */

/** Everything as one JSON document: settings, lists, tasks, money entries and journal pages. */
export async function exportEverything(userId: string) {
  const [settings, myLists, myTasks, entries, pages, myPlans, usage] = await Promise.all([
    db.select().from(userSettings).where(eq(userSettings.userId, userId)),
    db
      .select()
      .from(lists)
      .where(and(eq(lists.userId, userId), isNull(lists.deletedAt)))
      .orderBy(asc(lists.position)),
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)))
      .orderBy(asc(tasks.createdAt)),
    db
      .select()
      .from(financeEntries)
      .where(and(eq(financeEntries.userId, userId), isNull(financeEntries.deletedAt)))
      .orderBy(asc(financeEntries.entryDate)),
    db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.userId, userId))
      .orderBy(asc(journalEntries.entryDate)),
    db
      .select()
      .from(plans)
      .where(and(eq(plans.userId, userId), isNull(plans.deletedAt)))
      .orderBy(asc(plans.createdAt)),
    // Counts only (never words): what each AI request used.
    db.select().from(aiUsage).where(eq(aiUsage.userId, userId)).orderBy(asc(aiUsage.createdAt)),
  ]);
  // The PIN hash and lock counters are not data the user wrote either.
  const shownSettings = settings[0]
    ? (() => {
        const rest: Partial<(typeof settings)[number]> = { ...settings[0] };
        delete rest.journalPinHash;
        delete rest.journalPinFailures;
        delete rest.journalPinLockedUntil;
        delete rest.journalPinLength;
        delete rest.journalPinLockouts;
        return rest;
      })()
    : null;
  // The internal search column is not data the user wrote.
  const cleanTasks = myTasks.map((task) => {
    const rest: Partial<typeof task> = { ...task };
    delete rest.search;
    return rest;
  });
  return {
    app: "Ledge",
    exportedAt: new Date().toISOString(),
    note: "Money amounts are in minor units (paise for INR). Dates are the user's local days.",
    settings: shownSettings,
    lists: myLists,
    tasks: cleanTasks,
    moneyEntries: entries,
    journal: pages,
    plans: myPlans,
    aiUsage: usage,
  };
}

/** Tasks as CSV, one row per task (subtasks included, with their parent's title). */
export async function exportTasksCsv(userId: string): Promise<string> {
  const rows = await db
    .select({ task: tasks, listName: lists.name })
    .from(tasks)
    .innerJoin(lists, eq(lists.id, tasks.listId))
    .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)))
    .orderBy(asc(lists.position), asc(tasks.position));
  const titles = new Map(rows.map((r) => [r.task.id, r.task.title]));
  const priorities = ["", "Low", "Medium", "High"];
  return toCsv(
    [
      "Title",
      "List",
      "Parent task",
      "Status",
      "Priority",
      "Due date",
      "Due time",
      "Repeat",
      "Notes",
      "Completed at",
      "Created at",
    ],
    rows.map(({ task, listName }) => [
      task.title,
      listName,
      task.parentId ? (titles.get(task.parentId) ?? "") : "",
      task.status,
      priorities[task.priority] ?? "",
      task.dueDate,
      task.dueTime,
      task.recurrenceRule,
      task.notes,
      task.completedAt?.toISOString() ?? "",
      task.createdAt.toISOString(),
    ]),
  );
}
