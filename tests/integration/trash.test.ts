import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { createList, getInbox, restoreList, trashList } from "@/server/data/lists";
import { createTask, restoreTask, trashTask } from "@/server/data/tasks";
import {
  daysLeftInTrash,
  deleteTrashedListForever,
  deleteTrashedTaskForever,
  emptyTrash,
  listTrash,
  purgeExpiredTrash,
} from "@/server/data/trash";
import { db } from "@/server/db/client";
import { lists, tasks } from "@/server/db/schema";
import { createUser, resetAuthData, type TestUser } from "../helpers/fast-users";

let a: TestUser;
let b: TestUser;

beforeEach(async () => {
  process.env.ALLOW_SIGNUP = "true";
  await resetAuthData();
  a = await createUser("a@example.com", "A");
  b = await createUser("b@example.com", "B");
});

const DAY = 24 * 60 * 60 * 1000;

async function newTask(user: TestUser, listId: string, title: string, extra = {}) {
  const task = await createTask(user.id, { listId, title, ...extra });
  if (!task) throw new Error("expected the task to be created");
  return task;
}

/** Pretend an item was trashed `days` days ago. */
async function backdate(table: "tasks" | "lists", id: string, days: number) {
  const at = new Date(Date.now() - days * DAY);
  if (table === "tasks") await db.update(tasks).set({ deletedAt: at }).where(eq(tasks.id, id));
  else await db.update(lists).set({ deletedAt: at }).where(eq(lists.id, id));
}

describe("listTrash", () => {
  it("lists trashed lists (with task counts) and trashed tasks in live lists", async () => {
    const inbox = await getInbox(a.id);
    const doomed = await createList(a.id, { name: "Doomed" });
    await newTask(a, doomed.id, "inside 1");
    await newTask(a, doomed.id, "inside 2");
    const loose = await newTask(a, inbox.id, "loose");
    await trashList(a.id, doomed.id);
    await trashTask(a.id, loose.id);

    const trash = await listTrash(a.id);
    expect(trash.lists.map((l) => [l.name, l.taskCount])).toEqual([["Doomed", 2]]);
    // The tasks inside the trashed list come back with the list, so they are not listed alone.
    expect(trash.tasks.map((t) => t.title)).toEqual(["loose"]);
    expect(trash.tasks[0]).toMatchObject({ listName: "General", parentTitle: null });
  });

  it("does not list subtasks that were trashed together with their parent", async () => {
    const inbox = await getInbox(a.id);
    const parent = await newTask(a, inbox.id, "parent");
    await newTask(a, inbox.id, "child", { parentId: parent.id });
    await trashTask(a.id, parent.id);
    expect((await listTrash(a.id)).tasks.map((t) => t.title)).toEqual(["parent"]);
  });

  it("lists a subtask trashed on its own, naming its parent", async () => {
    const inbox = await getInbox(a.id);
    const parent = await newTask(a, inbox.id, "parent");
    const child = await newTask(a, inbox.id, "child", { parentId: parent.id });
    await trashTask(a.id, child.id);
    const trash = await listTrash(a.id);
    expect(trash.tasks.map((t) => [t.title, t.parentTitle])).toEqual([["child", "parent"]]);
  });

  it("never shows another user's trash", async () => {
    const inbox = await getInbox(b.id);
    const task = await newTask(b, inbox.id, "theirs");
    await trashTask(b.id, task.id);
    const list = await createList(b.id, { name: "their list" });
    await trashList(b.id, list.id);
    expect(await listTrash(a.id)).toEqual({ lists: [], tasks: [], entries: [] });
  });

  it("restoring takes an item out of the Trash listing", async () => {
    const inbox = await getInbox(a.id);
    const task = await newTask(a, inbox.id, "back");
    const list = await createList(a.id, { name: "back list" });
    await trashTask(a.id, task.id);
    await trashList(a.id, list.id);
    await restoreTask(a.id, task.id);
    await restoreList(a.id, list.id);
    expect(await listTrash(a.id)).toEqual({ lists: [], tasks: [], entries: [] });
  });
});

describe("delete forever", () => {
  it("erases a trashed task, but refuses a live one", async () => {
    const inbox = await getInbox(a.id);
    const live = await newTask(a, inbox.id, "live");
    const gone = await newTask(a, inbox.id, "gone");
    await trashTask(a.id, gone.id);
    expect(await deleteTrashedTaskForever(a.id, live.id)).toBe(false);
    expect(await deleteTrashedTaskForever(a.id, gone.id)).toBe(true);
    const left = await db.select().from(tasks).where(eq(tasks.userId, a.id));
    expect(left.map((t) => t.title)).toEqual(["live"]);
  });

  it("erases a trashed list with its tasks, but refuses a live list", async () => {
    const live = await createList(a.id, { name: "live" });
    const doomed = await createList(a.id, { name: "doomed" });
    await newTask(a, doomed.id, "inside");
    await trashList(a.id, doomed.id);
    expect(await deleteTrashedListForever(a.id, live.id)).toBe(false);
    expect(await deleteTrashedListForever(a.id, doomed.id)).toBe(true);
    expect(await db.select().from(tasks).where(eq(tasks.listId, doomed.id))).toHaveLength(0);
  });

  it("another user cannot erase my trash", async () => {
    const inbox = await getInbox(a.id);
    const task = await newTask(a, inbox.id, "mine");
    const list = await createList(a.id, { name: "mine" });
    await trashTask(a.id, task.id);
    await trashList(a.id, list.id);
    expect(await deleteTrashedTaskForever(b.id, task.id)).toBe(false);
    expect(await deleteTrashedListForever(b.id, list.id)).toBe(false);
    expect(await emptyTrash(b.id)).toEqual({ lists: 0, tasks: 0, entries: 0 });
    expect((await listTrash(a.id)).tasks).toHaveLength(1);
  });

  it("empties everything in the Trash and leaves live items alone", async () => {
    const inbox = await getInbox(a.id);
    const live = await newTask(a, inbox.id, "live");
    const t1 = await newTask(a, inbox.id, "t1");
    const list = await createList(a.id, { name: "l1" });
    await newTask(a, list.id, "in list");
    await trashTask(a.id, t1.id);
    await trashList(a.id, list.id);
    expect(await emptyTrash(a.id)).toEqual({ lists: 1, tasks: 1, entries: 0 });
    const left = await db.select().from(tasks).where(eq(tasks.userId, a.id));
    expect(left.map((t) => t.id)).toEqual([live.id]);
    expect(await listTrash(a.id)).toEqual({ lists: [], tasks: [], entries: [] });
  });
});

describe("30-day clean-up", () => {
  it("erases items trashed more than 30 days ago and keeps newer ones", async () => {
    const inbox = await getInbox(a.id);
    const old = await newTask(a, inbox.id, "old");
    const fresh = await newTask(a, inbox.id, "fresh");
    const oldList = await createList(a.id, { name: "old list" });
    const freshList = await createList(a.id, { name: "fresh list" });
    for (const t of [old, fresh]) await trashTask(a.id, t.id);
    for (const l of [oldList, freshList]) await trashList(a.id, l.id);
    await backdate("tasks", old.id, 31);
    await backdate("tasks", fresh.id, 29);
    await backdate("lists", oldList.id, 31);
    await backdate("lists", freshList.id, 29);

    expect(await purgeExpiredTrash(a.id)).toEqual({ lists: 1, tasks: 1, entries: 0 });
    const trash = await listTrash(a.id);
    expect(trash.tasks.map((t) => t.title)).toEqual(["fresh"]);
    expect(trash.lists.map((l) => l.name)).toEqual(["fresh list"]);
  });

  it("only cleans the signed-in user's own trash", async () => {
    const inbox = await getInbox(b.id);
    const task = await newTask(b, inbox.id, "old one");
    await trashTask(b.id, task.id);
    await backdate("tasks", task.id, 40);
    expect(await purgeExpiredTrash(a.id)).toEqual({ lists: 0, tasks: 0, entries: 0 });
    expect((await listTrash(b.id)).tasks).toHaveLength(1);
  });

  it("takes the clock as a parameter", async () => {
    const inbox = await getInbox(a.id);
    const task = await newTask(a, inbox.id, "later");
    await trashTask(a.id, task.id);
    expect(await purgeExpiredTrash(a.id)).toEqual({ lists: 0, tasks: 0, entries: 0 });
    const inThirtyOneDays = new Date(Date.now() + 31 * DAY);
    expect(await purgeExpiredTrash(a.id, inThirtyOneDays)).toEqual({
      lists: 0,
      tasks: 1,
      entries: 0,
    });
  });

  it("counts the days left", () => {
    const now = new Date("2026-11-10T12:00:00Z");
    expect(daysLeftInTrash(now, now)).toBe(30);
    expect(daysLeftInTrash(new Date(now.getTime() - 1 * DAY), now)).toBe(29);
    expect(daysLeftInTrash(new Date(now.getTime() - 29.5 * DAY), now)).toBe(1);
    expect(daysLeftInTrash(new Date(now.getTime() - 45 * DAY), now)).toBe(0);
  });
});
