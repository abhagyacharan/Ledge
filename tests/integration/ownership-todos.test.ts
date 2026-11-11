import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import {
  getList,
  moveList,
  restoreList,
  setListArchived,
  trashList,
  updateList,
} from "@/server/data/lists";
import {
  createTask,
  getListTasks,
  getTaskDetail,
  moveTaskToList,
  restoreTask,
  setTaskDone,
  trashTask,
  updateTask,
} from "@/server/data/tasks";
import { db } from "@/server/db/client";
import { lists, tasks } from "@/server/db/schema";
import { makeList, makeTask } from "../helpers/data";
import { createUser, resetAuthData, type TestUser } from "../helpers/fast-users";

/**
 * Ownership for the Phase 3 data functions (CLAUDE.md §5). User B must not be able to read,
 * change, move or delete anything of user A's, and must not be able to attach their own
 * rows to A's. Every attempt must behave as if A's row did not exist.
 */

let a: TestUser;
let b: TestUser;
let aList: Awaited<ReturnType<typeof makeList>>;
let aTask: Awaited<ReturnType<typeof makeTask>>;

beforeEach(async () => {
  process.env.ALLOW_SIGNUP = "true";
  await resetAuthData();
  a = await createUser("a@example.com", "A");
  b = await createUser("b@example.com", "B");
  aList = await makeList(a.id, "A's list");
  aTask = await makeTask(a.id, aList.id, "A's task");
});

describe("lists", () => {
  it("B cannot edit, archive, move, trash or restore A's list", async () => {
    expect(await updateList(b.id, aList.id, { name: "Hijacked" })).toBeNull();
    expect(await setListArchived(b.id, aList.id, true)).toBeNull();
    expect(await moveList(b.id, aList.id, "up")).toBe(false);
    expect(await trashList(b.id, aList.id)).toBe(false);
    await trashList(a.id, aList.id);
    expect(await restoreList(b.id, aList.id)).toBe(false);
    const [row] = await db.select().from(lists).where(eq(lists.id, aList.id));
    expect(row.name).toBe("A's list");
    expect(row.isArchived).toBe(false);
    expect(row.deletedAt).not.toBeNull(); // still trashed: B could not restore it
  });

  it("B's trashed list is invisible to A's reads, and vice versa", async () => {
    expect(await getList(b.id, aList.id, { includeTrashed: true })).toBeNull();
  });
});

describe("tasks", () => {
  it("B cannot create a task or subtask in A's list or under A's task", async () => {
    expect(await createTask(b.id, { listId: aList.id, title: "Sneaky" })).toBeNull();
    expect(
      await createTask(b.id, { listId: aList.id, title: "Sneaky sub", parentId: aTask.id }),
    ).toBeNull();
    expect(await getListTasks(a.id, aList.id)).toHaveLength(1);
  });

  it("B cannot read A's task detail, update it, complete it, trash it or restore it", async () => {
    expect(await getTaskDetail(b.id, aTask.id)).toBeNull();
    expect(await updateTask(b.id, aTask.id, { title: "Hijacked", priority: 3 })).toBeNull();
    expect(await setTaskDone(b.id, aTask.id, true)).toBeNull();
    expect(await trashTask(b.id, aTask.id)).toBe(false);
    await trashTask(a.id, aTask.id);
    expect(await restoreTask(b.id, aTask.id)).toBe(false);
    const [row] = await db.select().from(tasks).where(eq(tasks.id, aTask.id));
    expect(row).toMatchObject({ title: "A's task", priority: 0, status: "open" });
    expect(row.deletedAt).not.toBeNull();
  });

  it("B cannot move A's task, nor move their own task into A's list", async () => {
    const bList = await makeList(b.id, "B's list");
    const bTask = await makeTask(b.id, bList.id, "B's task");
    expect(await moveTaskToList(b.id, aTask.id, bList.id)).toBeNull();
    expect(await moveTaskToList(b.id, bTask.id, aList.id)).toBeNull();
    expect((await getTaskDetail(a.id, aTask.id))?.task.listId).toBe(aList.id);
    expect((await getTaskDetail(b.id, bTask.id))?.task.listId).toBe(bList.id);
  });
});
